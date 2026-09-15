import { describe, expect, it } from 'vitest';
import { isBlockedHostname, isPrivateIPv4, isPrivateIPv6, resolvePublicAddresses, runHttpFetch } from './httpFetch.js';

describe('http.fetch guards', () => {
  it('blocks private and metadata IPv4 ranges', () => {
    expect(isPrivateIPv4('127.0.0.1')).toBe(true);
    expect(isPrivateIPv4('10.1.2.3')).toBe(true);
    expect(isPrivateIPv4('192.168.1.9')).toBe(true);
    expect(isPrivateIPv4('172.16.0.4')).toBe(true);
    expect(isPrivateIPv4('169.254.169.254')).toBe(true);
    expect(isPrivateIPv4('8.8.8.8')).toBe(false);
  });

  it('blocks loopback and unique-local IPv6', () => {
    expect(isPrivateIPv6('::1')).toBe(true);
    expect(isPrivateIPv6('fc00::1')).toBe(true);
    expect(isPrivateIPv6('fe80::1')).toBe(true);
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIPv6('2001:4860:4860::8888')).toBe(false);
  });

  it('blocks localhost-style hostnames', () => {
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('foo.internal')).toBe(true);
    expect(isBlockedHostname('metadata.google.internal')).toBe(true);
    expect(isBlockedHostname('example.com')).toBe(false);
  });

  it('rejects DNS that resolves to a private IP', async () => {
    await expect(
      resolvePublicAddresses('evil.example', async () => [{ address: '10.0.0.5', family: 4 }]),
    ).rejects.toThrow(/private/i);
  });

  it('GETs a public URL after DNS passes and caps are respected', async () => {
    const result = await runHttpFetch(
      { url: 'https://example.com/ok' },
      {
        lookupFn: async () => [{ address: '93.184.216.34', family: 4 }],
        fetchImpl: async () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } }),
      },
    );
    expect(result.status).toBe(200);
    expect(result.body).toBe('hello');
  });

  it('rejects file URLs and private host literals', async () => {
    await expect(runHttpFetch({ url: 'file:///etc/passwd' })).rejects.toThrow(/http/i);
    await expect(runHttpFetch({ url: 'http://127.0.0.1/' })).rejects.toThrow(/Blocked host/i);
  });
});
