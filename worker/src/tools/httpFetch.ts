import { lookup } from 'node:dns/promises';
import { z } from 'zod';

export const HTTP_FETCH_TIMEOUT_MS = 10_000;
export const HTTP_FETCH_MAX_BYTES = 1_000_000;

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google.com',
]);

export const httpFetchInput = z.object({
  url: z.string().min(1).max(2000),
});

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const value = ipv4ToInt(ip);
  const network = ipv4ToInt(base);
  if (value === null || network === null) return false;
  const mask = bits === 0 ? 0 : (~((1 << (32 - bits)) - 1)) >>> 0;
  return (value & mask) === (network & mask);
}

export function isPrivateIPv4(ip: string): boolean {
  return (
    inCidr(ip, '0.0.0.0', 8) ||
    inCidr(ip, '10.0.0.0', 8) ||
    inCidr(ip, '127.0.0.0', 8) ||
    inCidr(ip, '169.254.0.0', 16) ||
    inCidr(ip, '172.16.0.0', 12) ||
    inCidr(ip, '192.168.0.0', 16) ||
    inCidr(ip, '100.64.0.0', 10)
  );
}

export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fec0:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '0.0.0.0') return true;
  if (isPrivateIPv4(host) || isPrivateIPv6(host)) return true;
  return false;
}

export type LookupAll = (
  hostname: string,
  options: { all: true; verbatim?: boolean },
) => Promise<Array<{ address: string; family: number }>>;

export async function resolvePublicAddresses(
  hostname: string,
  lookupFn: LookupAll = lookup as LookupAll,
): Promise<string[]> {
  const result = await lookupFn(hostname, { all: true, verbatim: true });
  const addresses = result.map((item) => item.address);
  if (addresses.length === 0) throw new Error('DNS returned no addresses');
  const blocked = addresses.filter((address) => isPrivateIPv4(address) || isPrivateIPv6(address));
  if (blocked.length > 0) {
    throw new Error(`Blocked private address (${blocked[0]})`);
  }
  return addresses;
}

export async function runHttpFetch(
  input: { url: string },
  deps: { fetchImpl?: typeof fetch; lookupFn?: LookupAll } = {},
): Promise<{ status: number; contentType: string; bytes: number; body: string }> {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) GET is allowed');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error(`Blocked host ${parsed.hostname}`);
  }
  await resolvePublicAddresses(parsed.hostname, deps.lookupFn ?? lookup);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(parsed.toString(), {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(HTTP_FETCH_TIMEOUT_MS),
    headers: { accept: 'text/html,application/json,text/plain,*/*;q=0.8' },
  });

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > HTTP_FETCH_MAX_BYTES) {
    throw new Error(`Response larger than ${HTTP_FETCH_MAX_BYTES} bytes`);
  }

  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > HTTP_FETCH_MAX_BYTES) {
        await reader.cancel();
        throw new Error(`Response larger than ${HTTP_FETCH_MAX_BYTES} bytes`);
      }
      chunks.push(value);
    }
  } else {
    const text = await response.text();
    const encoded = new TextEncoder().encode(text);
    if (encoded.byteLength > HTTP_FETCH_MAX_BYTES) {
      throw new Error(`Response larger than ${HTTP_FETCH_MAX_BYTES} bytes`);
    }
    return {
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      bytes: encoded.byteLength,
      body: text,
    };
  }

  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    bytes,
    body: new TextDecoder().decode(merged),
  };
}
