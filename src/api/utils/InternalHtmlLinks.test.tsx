import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const links = vi.hoisted(() => [] as string[]);

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => links.push(link)
}));

import { handleInternalLinkClick, SanitizeHtmlWithInternalLinks } from './InternalHtmlLinks';

describe('internal html links (AIR link_target internal)', () => {
    beforeEach(() => {
        links.length = 0;
    });

    it('keeps event: links and opens them in the client', () => {
        const html = SanitizeHtmlWithInternalLinks('1. <a href="event:habbopages/wired_actie.html" style="color:#000;font-weight:bold;" >Wired Acties</a>.');
        const { getByText } = render(<div onClick={handleInternalLinkClick} dangerouslySetInnerHTML={{ __html: html }} />);

        fireEvent.click(getByText('Wired Acties'));

        expect(links).toEqual(['habbopages/wired_actie.html']);
    });

    it('still removes scripts and handlers', () => {
        const html = SanitizeHtmlWithInternalLinks('<a href="javascript:alert(1)" onclick="x()">x</a><script>bad()</script>');

        expect(html).not.toContain('javascript:');
        expect(html).not.toContain('onclick');
        expect(html).not.toContain('<script');
    });

    it('leaves ordinary links alone', () => {
        const html = SanitizeHtmlWithInternalLinks('<a href="https://hotel.example/">site</a>');
        const { getByText } = render(<div onClick={handleInternalLinkClick} dangerouslySetInnerHTML={{ __html: html }} />);

        fireEvent.click(getByText('site'));

        expect(links).toEqual([]);
    });
});
