import { describe, expect, it } from 'vitest';
import { describeSensitiveHit, textLooksSensitive, urlLooksSensitive } from './safety.js';

describe('computer safety detector', () => {
  it('flags purchase / publish / delete / send-to-customer', () => {
    expect(textLooksSensitive('click Purchase now')).toBe(true);
    expect(textLooksSensitive('publish the book')).toBe(true);
    expect(textLooksSensitive('delete the listing')).toBe(true);
    expect(textLooksSensitive('send to a real customer')).toBe(true);
    expect(textLooksSensitive('take a screenshot')).toBe(false);
  });

  it('flags checkout URLs', () => {
    expect(urlLooksSensitive('https://shop.example/checkout')).toBe(true);
    expect(urlLooksSensitive('https://contraxis.com/pricing')).toBe(false);
  });

  it('builds a pause reason from a tool call', () => {
    const hit = describeSensitiveHit({
      name: 'computer.navigate',
      description: 'open a page',
      raw: 'https://example.com/checkout',
    });
    expect(hit).toMatch(/Paused/);
    expect(describeSensitiveHit({ name: 'computer.screenshot', raw: 'fullPage' })).toBeNull();
  });
});
