import {describe,it,expect} from 'vitest';
import {chicagoDayStart,PaymentRequestSchema} from './payments';
describe('owner payment requests',()=>{
 it('uses Chicago midnight across daylight saving transitions',()=>{
  expect(new Date(chicagoDayStart(new Date('2026-03-08T20:00:00Z'))*1000).toISOString()).toBe('2026-03-08T06:00:00.000Z');
  expect(new Date(chicagoDayStart(new Date('2026-11-01T20:00:00Z'))*1000).toISOString()).toBe('2026-11-01T05:00:00.000Z');
 });
 it('rejects malformed amounts and unsafe merchant links',()=>{
  const base={merchant:'Vendor',purpose:'Subscription',amountCents:2500,currency:'usd'};
  expect(PaymentRequestSchema.safeParse(base).success).toBe(true);
  expect(PaymentRequestSchema.safeParse({...base,amountCents:25.5}).success).toBe(false);
  expect(PaymentRequestSchema.safeParse({...base,url:'javascript:alert(1)'}).success).toBe(false);
  expect(PaymentRequestSchema.safeParse({...base,url:'https://user:secret@host.com'}).success).toBe(false);
 });
});
