import { getIstDateRangeUtc, toIstDateKey } from '@/lib/dateRange';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('toIstDateKey', () => {
  it('buckets a UTC timestamp well within the same IST day', () => {
    // 2024-06-15T10:00:00Z -> IST 15:30 same day
    expect(toIstDateKey('2024-06-15T10:00:00.000Z')).toBe('2024-06-15');
  });

  it('rolls a late-UTC timestamp into the next IST calendar day', () => {
    // 2024-06-15T19:00:00Z + 5.5h = 2024-06-16T00:30 IST
    expect(toIstDateKey('2024-06-15T19:00:00.000Z')).toBe('2024-06-16');
  });

  it('keeps an early-UTC timestamp on the same IST day it looks like', () => {
    // 2024-06-15T00:00:00Z + 5.5h = 2024-06-15T05:30 IST
    expect(toIstDateKey('2024-06-15T00:00:00.000Z')).toBe('2024-06-15');
  });
});

describe('getIstDateRangeUtc', () => {
  beforeEach(() => {
    // Fix "now" to 2024-06-15T10:00:00Z = 2024-06-15T15:30 IST
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('daysBack=0 covers just today in IST, as a UTC range', () => {
    const { startUtc, endUtc } = getIstDateRangeUtc(0);

    // IST midnight 2024-06-15 00:00 = UTC 2024-06-14T18:30:00.000Z
    expect(startUtc).toBe('2024-06-14T18:30:00.000Z');
    // exclusive end: IST midnight 2024-06-16 = UTC 2024-06-15T18:30:00.000Z
    expect(endUtc).toBe('2024-06-15T18:30:00.000Z');
  });

  it('daysBack=6 extends the start back 6 IST calendar days', () => {
    const { startUtc, endUtc } = getIstDateRangeUtc(6);

    // IST midnight 2024-06-09 00:00 = UTC 2024-06-08T18:30:00.000Z
    expect(startUtc).toBe('2024-06-08T18:30:00.000Z');
    expect(endUtc).toBe('2024-06-15T18:30:00.000Z');
  });
});