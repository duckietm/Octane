/* @vitest-environment jsdom */
// Ported from plus-emulator/volt (by Dennis, GPL-3.0).
import { CreateLinkEvent } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenUrl } from './OpenUrl';

let open: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    open = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
    open.mockRestore();
    vi.clearAllMocks();
});

describe('OpenUrl', () => {
    it('opens a web link in a new tab without a handle back to the client', () => {
        OpenUrl(' https://hotel.example/news ');

        expect(open).toHaveBeenCalledWith('https://hotel.example/news', '_blank', 'noopener,noreferrer');
        expect(CreateLinkEvent).not.toHaveBeenCalled();
    });

    it('runs an `event:` link and a bare client link as client links', () => {
        OpenUrl('event:navigator/goto/12');
        OpenUrl('catalog/open/rares');

        expect(CreateLinkEvent).toHaveBeenNthCalledWith(1, 'navigator/goto/12');
        expect(CreateLinkEvent).toHaveBeenNthCalledWith(2, 'catalog/open/rares');
        expect(open).not.toHaveBeenCalled();
    });

    it('ignores scripts, data and other schemes', () => {
        for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<script>x</script>', 'vbscript:x', 'file:///etc/passwd', 'http:evil', 'event:', '']) OpenUrl(url);

        expect(open).not.toHaveBeenCalled();
        expect(CreateLinkEvent).not.toHaveBeenCalled();
    });
});
