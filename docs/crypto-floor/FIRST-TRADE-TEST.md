# CRYPTO FLOOR — FIRST PAPER TRADE TEST

## Manual verification command (requires owner auth)

Once logged in at https://awad-command.vercel.app/crypto-floor:

1. Click "Place Manual Order" button in Portfolio tab
2. Enter:
   - Symbol: `BTC/USD`
   - Side: BUY (click OK in confirm dialog)
   - Quantity: `0.001`

Expected result:
```
✅ BUY 0.001 BTC/USD placed

Order placed on Alpaca paper account.
```

## API test (programmatic, requires auth cookie)

```bash
# This will 401 without valid session cookie
curl -X POST https://awad-command.vercel.app/api/crypto-floor/place-order \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC/USD","side":"buy","qty":"0.001"}'
```

Expected response (when authenticated):
```json
{
  "success": true,
  "order": {
    "id": "...",
    "symbol": "BTCUSD",
    "qty": "0.001",
    "side": "buy",
    "type": "market",
    "status": "filled",
    "filled_avg_price": "67234.50",
    ...
  },
  "message": "BUY 0.001 BTC/USD placed"
}
```

## Verification checklist

- [ ] Alert shows success message with order details
- [ ] Refresh /crypto-floor → Open positions increases by 1
- [ ] Cash decreases by ~$67 (qty × price)
- [ ] Paper P&L shows negative (spread)
- [ ] Login to alpaca.markets → Paper Dashboard → see same order
- [ ] Order has Alpaca ID (e.g., `abc123-def456-...`)
- [ ] Status: filled (market orders fill instantly in paper)

---

**Blocked on:** Owner authentication  
**Next:** Build robot spec / notebook table (TIER 2)
