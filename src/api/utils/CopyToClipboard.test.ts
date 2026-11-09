/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CopyToClipboard } from './CopyToClipboard';

describe('CopyToClipboard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete (document as unknown as { execCommand?: unknown }).execCommand;
    });

    it('refuses non-string input', async () => {
        expect(await CopyToClipboard(42 as unknown as string)).toBe(false);
        expect(await CopyToClipboard({ toString: () => 'x' } as unknown as string)).toBe(false);
    });

    it('refuses empty and oversized input', async () => {
        expect(await CopyToClipboard('')).toBe(false);
        expect(await CopyToClipboard('a'.repeat(65537))).toBe(false);
    });

    it('copies via the legacy path and cleans the staged textarea up', async () => {
        const execCommand = vi.fn(() => true);
        (document as unknown as { execCommand: typeof execCommand }).execCommand = execCommand;

        expect(await CopyToClipboard('wf_act_toggle_state')).toBe(true);
        expect(execCommand).toHaveBeenCalledWith('copy');
        expect(document.querySelector('textarea')).toBeNull();
    });

    it('reports failure when the legacy copy is refused, still cleaning up', async () => {
        (document as unknown as { execCommand: () => boolean }).execCommand = () => false;

        expect(await CopyToClipboard('nope')).toBe(false);
        expect(document.querySelector('textarea')).toBeNull();
    });

    it('never interprets the text as HTML', async () => {
        (document as unknown as { execCommand: () => boolean }).execCommand = () => {
            const staged = document.querySelector('textarea');

            expect(staged?.value).toBe('<img src=x onerror=alert(1)>');
            expect(document.querySelector('img')).toBeNull();

            return true;
        };

        expect(await CopyToClipboard('<img src=x onerror=alert(1)>')).toBe(true);
    });
});
