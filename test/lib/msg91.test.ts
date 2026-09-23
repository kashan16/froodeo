/* eslint-disable @typescript-eslint/no-explicit-any */
import { resendOtp, sendOtp, verifyOtp } from '@/lib/msg91';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('sendOtp', () => {
  it('strips a leading + and hits the OTP endpoint', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'success' }) });

    await sendOtp('+919876543210');

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('mobile=919876543210');
    expect(url).not.toContain('+');
    expect(options.headers.authkey).toBe(process.env.MSG91_AUTH_KEY);
  });

  it('throws with the API error message on failure', async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ type: 'error', message: 'Invalid mobile number' }),
    });

    await expect(sendOtp('+919876543210')).rejects.toThrow('Invalid mobile number');
  });

  it('falls back to a generic message when none is provided', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'error' }) });

    await expect(sendOtp('+919876543210')).rejects.toThrow('Failed to send OTP');
  });
});

describe('verifyOtp', () => {
  it('returns true on a successful verification', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'success' }) });

    expect(await verifyOtp('+919876543210', '123456')).toBe(true);
  });

  it('returns false on any non-success response', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'error' }) });

    expect(await verifyOtp('+919876543210', '000000')).toBe(false);
  });
});

describe('resendOtp', () => {
  it('defaults to text retry', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'success' }) });

    await resendOtp('+919876543210');

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('retrytype=text');
  });

  it('uses voice retry when requested', async () => {
    (global.fetch as any).mockResolvedValue({ json: async () => ({ type: 'success' }) });

    await resendOtp('+919876543210', true);

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('retrytype=voice');
  });

  it('throws on failure', async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ type: 'error', message: 'Retry limit exceeded' }),
    });

    await expect(resendOtp('+919876543210')).rejects.toThrow('Retry limit exceeded');
  });
});