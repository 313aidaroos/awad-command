'use client';

import { useEffect, useState } from 'react';
import { formatIxis } from '@/lib/ixis';
import { useWalletDeepLink } from '@/ui/useWalletDeepLink';

export function WalletPanel() {
  const href = useWalletDeepLink();
  const [data, setData] = useState<{ sold: number; redeemed: number; balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    async function pull() {
      try {
        const res = await fetch('/api/wallet/ledger', { cache: 'no-store' });
        if (!live) return;
        if (!res.ok) {
          setError(`Wallet ledger returned ${res.status}`);
          setLoading(false);
          return;
        }
        const body = await res.json() as { available: boolean; familyIxisSold?: number; familyIxisRedeemed?: number; outstandingBalance?: number; reason?: string };
        if (!body.available) {
          setError(body.reason ?? 'Wallet unavailable');
        } else {
          setData({
            sold: body.familyIxisSold ?? 0,
            redeemed: body.familyIxisRedeemed ?? 0,
            balance: body.outstandingBalance ?? 0,
          });
          setError(null);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Wallet fetch failed');
      } finally {
        if (live) setLoading(false);
      }
    }
    void pull();
    const t = window.setInterval(() => void pull(), 60_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, []);

  const tone = loading ? 'default' : error ? 'warning' : 'success';

  return (
    <section className="hq-panel">
      <h2>
        Apixis Wallet
        <span className={`hq-${tone}`}>{loading ? 'loading' : error ? 'unavailable' : 'live'}</span>
      </h2>
      {loading ? (
        <p className="hq-note">Connecting to Wallet…</p>
      ) : error ? (
        <p className="hq-note">{error}</p>
      ) : data ? (
        <>
          <dl className="hq-metrics">
            <div>
              <dt>Family Ixis sold</dt>
              <dd>{formatIxis(data.sold)}</dd>
            </div>
            <div>
              <dt>Redeemed</dt>
              <dd>{formatIxis(data.redeemed)}</dd>
            </div>
            <div>
              <dt>Outstanding balance</dt>
              <dd className="hq-success">{formatIxis(data.balance)}</dd>
            </div>
          </dl>
          <p className="hq-note">
            Customers buy Ixis in Apixis Wallet and redeem them here for Command features. 100 Ixis = $1.
          </p>
        </>
      ) : null}
      <p className="hq-note">
        <a href={href} target="_blank" rel="noopener noreferrer">Buy Ixis</a>
        {' · '}
        <a href={href} target="_blank" rel="noopener noreferrer">Open Wallet</a>
      </p>
    </section>
  );
}
