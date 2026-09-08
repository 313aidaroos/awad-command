'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#07080a',
          color: '#e6e8ec',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 360,
              padding: '20px 22px',
              textAlign: 'center',
              background: 'rgba(23,26,31,0.55)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              fontSize: 13,
              color: '#8a909a',
            }}
          >
            <p style={{ margin: 0, color: '#e6e8ec' }}>Command recovered</p>
            <p style={{ margin: '8px 0 0' }}>
              A client exception was caught. Reload to continue.
            </p>
            <button
              type="button"
              onClick={() => {
                reset();
                window.location.reload();
              }}
              style={{
                marginTop: 16,
                border: 0,
                borderRadius: 999,
                padding: '6px 14px',
                background: 'rgba(61,139,255,0.2)',
                color: '#e6e8ec',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
