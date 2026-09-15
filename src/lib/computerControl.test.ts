import { describe, expect, it } from 'vitest';
import { stubScreenUrl } from '@/lib/computerControl';

describe('stubScreenUrl', () => {
  it('accepts only http(s) public stubs', () => {
    expect(stubScreenUrl({ NEXT_PUBLIC_COMPUTER_STUB_SCREEN_URL: 'https://files.example/stub.png' })).toBe(
      'https://files.example/stub.png',
    );
    expect(stubScreenUrl({ NEXT_PUBLIC_COMPUTER_STUB_SCREEN_URL: 'javascript:alert(1)' })).toBeNull();
  });
});
