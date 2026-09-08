import { describe, expect, it } from 'vitest';
import { parseLeadDirective } from '@/ceo/leadDirective';

describe('parseLeadDirective', () => {
  it('parses “tell Contraxis Lead to ping me”', () => {
    expect(parseLeadDirective('tell Contraxis Lead to ping me')).toEqual({
      target: 'Contraxis Lead',
      message: 'ping me',
    });
  });

  it('does not treat “tell me …” as a lead send', () => {
    expect(parseLeadDirective('tell me about Contraxis')).toBeNull();
    expect(parseLeadDirective('tell me what needs my attention')).toBeNull();
  });

  it('parses message/ping phrasing', () => {
    expect(parseLeadDirective('message contraxis: check new leads')).toEqual({
      target: 'contraxis',
      message: 'check new leads',
    });
    expect(parseLeadDirective('ping Socixis Lead')).toEqual({
      target: 'Socixis',
      message: 'Please ping Awad.',
    });
  });
});
