import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareOrCopy } from '../../src/lib/share';

describe('shareOrCopy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });

    const result = await shareOrCopy({ title: 't', text: 'x', url: 'https://example.com' });
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalled();
  });

  it('falls back to clipboard', async () => {
    Object.assign(navigator, { share: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const onCopied = vi.fn();
    const result = await shareOrCopy({ title: 't', text: 'x', url: 'https://example.com', onCopied });
    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    expect(onCopied).toHaveBeenCalled();
  });
});
