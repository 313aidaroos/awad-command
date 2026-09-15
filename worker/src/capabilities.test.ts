import { describe, expect, it } from 'vitest';
import {
  hasComputerCapability,
  inferTaskCapabilities,
  isReadOnlyComputerInstruction,
  normalizeCapabilities,
  parseCapabilities,
  workerCanClaim,
} from './capabilities.js';

describe('parseCapabilities', () => {
  it('splits a comma list and lowercases', () => {
    expect(parseCapabilities('computer, computer.screenshot')).toEqual(['computer', 'computer.screenshot']);
  });

  it('treats empty as no extra capabilities', () => {
    expect(parseCapabilities('')).toEqual([]);
    expect(parseCapabilities(undefined)).toEqual([]);
  });
});

describe('normalizeCapabilities', () => {
  it('implies computer from computer.* tools', () => {
    expect(normalizeCapabilities(['computer.navigate'])).toEqual(expect.arrayContaining(['computer', 'computer.navigate']));
  });
});

describe('workerCanClaim', () => {
  it('lets an API worker claim only empty-capability tasks', () => {
    expect(workerCanClaim([], [])).toBe(true);
    expect(workerCanClaim(['computer'], [])).toBe(false);
  });

  it('lets a computer worker claim computer and empty tasks', () => {
    expect(workerCanClaim([], ['computer'])).toBe(true);
    expect(workerCanClaim(['computer'], ['computer'])).toBe(true);
    expect(workerCanClaim(['computer'], ['computer.screenshot'])).toBe(true);
    expect(workerCanClaim(['email'], ['computer'])).toBe(false);
  });
});

describe('hasComputerCapability', () => {
  it('is true for computer or computer.*', () => {
    expect(hasComputerCapability(['computer'])).toBe(true);
    expect(hasComputerCapability(['computer.navigate'])).toBe(true);
    expect(hasComputerCapability([])).toBe(false);
  });
});

describe('inferTaskCapabilities', () => {
  it('tags screenshot / browser / KDP work as computer', () => {
    expect(inferTaskCapabilities('Screenshot Contraxis on mobile and desktop')).toEqual(['computer']);
    expect(inferTaskCapabilities("Log into KDP, download this month's royalty report")).toEqual(['computer']);
    expect(inferTaskCapabilities("Summarise today's leads")).toEqual([]);
  });
});

describe('isReadOnlyComputerInstruction', () => {
  it('treats screenshot-only as read and purchase/publish as not', () => {
    expect(isReadOnlyComputerInstruction('Take a screenshot of the current page')).toBe(true);
    expect(isReadOnlyComputerInstruction('Publish the landing page')).toBe(false);
  });
});
