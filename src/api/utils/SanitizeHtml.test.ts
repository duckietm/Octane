/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SanitizeHotelHtml, SanitizeHtml, SanitizePageHtml } from './SanitizeHtml';

/**
 * SanitizeHtml is the project's shared HTML sanitiser (DOMPurify with a fixed
 * allow-list). It is the load-bearing defence wherever user/server-controlled
 * strings are rendered via `dangerouslySetInnerHTML`. These tests pin both the
 * security guarantee (no executable markup survives) and the formatting
 * guarantee (the limited markup the chat/profile UI relies on is preserved),
 * using jsdom's real parser as the oracle.
 */
const parse = (html: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.innerHTML = SanitizeHtml(html);
    return div;
};

describe('SanitizeHtml — neutralises dangerous markup', () => {
    it('removes <script> elements', () => {
        expect(parse('<script>alert(1)</script>').querySelector('script')).toBeNull();
    });

    it('removes images and their inline event handlers', () => {
        const div = parse('<img src=x onerror=alert(1)>');

        expect(div.querySelector('img')).toBeNull();
        expect(div.innerHTML.toLowerCase()).not.toContain('onerror');
    });

    it('strips inline event handlers (onerror) from the images of hotel texts', () => {
        const div = document.createElement('div');
        div.innerHTML = SanitizeHotelHtml('<img src=x onerror=alert(1)>');

        expect(div.querySelector('img')?.getAttribute('onerror')).toBeNull();
        expect(div.innerHTML.toLowerCase()).not.toContain('onerror');
    });

    it('drops javascript: URLs on anchors', () => {
        const div = parse('<a href="javascript:alert(1)">x</a>');
        expect(div.querySelector('a[href^="javascript:"]')).toBeNull();
    });

    it('removes <svg> and its onload handler', () => {
        const div = parse('<svg onload=alert(1)></svg>');
        expect(div.innerHTML.toLowerCase()).not.toContain('onload');
    });

    it('removes <iframe> elements', () => {
        expect(parse('<iframe src="https://evil.example"></iframe>').querySelector('iframe')).toBeNull();
    });

    it('leaves a plain username untouched', () => {
        expect(SanitizeHtml('CoolUser_123')).toBe('CoolUser_123');
    });
});

describe('SanitizeHtml — preserves the markup the chat/profile UI relies on', () => {
    it('keeps <b>/<i>/<u>', () => {
        const div = parse('<b>a</b><i>b</i><u>c</u>');
        expect(div.querySelector('b')).not.toBeNull();
        expect(div.querySelector('i')).not.toBeNull();
        expect(div.querySelector('u')).not.toBeNull();
    });

    it('keeps <strong>/<em> (RoomChatFormatter output)', () => {
        const div = parse('<strong>x</strong><em>y</em>');
        expect(div.querySelector('strong')).not.toBeNull();
        expect(div.querySelector('em')).not.toBeNull();
    });

    it('keeps a coloured span (RoomChatFormatter output)', () => {
        const div = parse('<span style="color:red">hi</span>');
        const span = div.querySelector('span');
        expect(span).not.toBeNull();
        expect((span as HTMLElement).style.color).toBe('red');
    });

    it('keeps <br>', () => {
        expect(parse('a<br />b').querySelectorAll('br').length).toBe(1);
    });
});

describe('SanitizeHtml — link safety', () => {
    it('forces rel="noopener noreferrer" on a target=_blank anchor', () => {
        const a = parse('<a href="https://example.com" target="_blank">x</a>').querySelector('a');
        expect(a).not.toBeNull();
        expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('overrides an attacker-supplied rel on a target=_blank anchor', () => {
        const a = parse('<a href="https://example.com" target="_blank" rel="opener">x</a>').querySelector('a');
        expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    });
});

describe('SanitizeHtml — no overlays, no foreign images, no page takeover', () => {
    it('keeps text formatting in a style and drops layout that could cover the client', () => {
        const span = parse('<span style="color:red; position:fixed; inset:0; width:100vw">hi</span>').querySelector('span') as HTMLElement;

        expect(span.style.color).toBe('red');
        expect(span.style.position).toBe('');
        expect(span.style.width).toBe('');
    });

    it('drops a style that only positions', () => {
        expect(parse('<span style="position:fixed;inset:0">x</span>').querySelector('span')?.hasAttribute('style')).toBe(false);
    });

    it('drops classes, so the client\'s own utility classes cannot lay an overlay over it', () => {
        expect(parse('<div class="fixed inset-0 z-50">x</div>').querySelector('div')?.hasAttribute('class')).toBe(false);
    });

    it('keeps a modest font size and drops one that fills the screen', () => {
        expect((parse('<span style="font-size:14px">a</span>').querySelector('span') as HTMLElement).style.fontSize).toBe('14px');
        expect(parse('<span style="font-size:900px">a</span>').querySelector('span')?.hasAttribute('style')).toBe(false);
        expect(parse('<span style="font-size:40em">a</span>').querySelector('span')?.hasAttribute('style')).toBe(false);
        expect(parse('<span style="font-size:calc(100vh)">a</span>').querySelector('span')?.hasAttribute('style')).toBe(false);
    });

    it('keeps only absolute web links', () => {
        const hrefs = ['https://example.com/a', 'http://example.com', 'https:example.com', '/relative', '#octane-event:catalog/open', 'mailto:a@b.c', 'event:navigator/goto/1'].map(
            (href) => parse(`<a href="${href}">x</a>`).querySelector('a')?.getAttribute('href') ?? null
        );

        expect(hrefs).toEqual(['https://example.com/a', 'http://example.com', null, null, null, null, null]);
    });

    it('keeps an image from the client origin in a hotel text and takes the source off one from elsewhere', () => {
        const hotel = (html: string) => {
            const div = document.createElement('div');
            div.innerHTML = SanitizeHotelHtml(html);
            return div;
        };

        expect(hotel('<img src="/c_images/a.png" class="catalog-art">').querySelector('img')?.getAttribute('src')).toBe('/c_images/a.png');
        expect(hotel('<img src="/c_images/a.png" class="catalog-art">').querySelector('img')?.getAttribute('class')).toBe('catalog-art');
        expect(hotel('<img src="https://tracker.example/p.gif">').querySelector('img')?.hasAttribute('src')).toBe(false);
        expect(hotel('<img src="//tracker.example/p.gif">').querySelector('img')?.hasAttribute('src')).toBe(false);
        expect(hotel('<img src="/x.png" style="position:fixed;inset:0">').querySelector('img')?.hasAttribute('style')).toBe(false);
    });

    it('never lets a link replace the page that embeds the client', () => {
        const a = parse('<a href="https://example.com" target="_top">x</a>').querySelector('a');

        expect(a?.getAttribute('target')).toBe('_blank');
        expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('opens a link with no target in a new tab instead of navigating the client away', () => {
        const a = parse('<a href="https://example.com">x</a>').querySelector('a');

        expect(a?.getAttribute('target')).toBe('_blank');
        expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('leaves the richer help pages to their own rules', () => {
        const div = document.createElement('div');
        div.innerHTML = SanitizePageHtml('<div style="position:absolute;left:4px">page</div>');

        expect((div.firstElementChild as HTMLElement).style.position).toBe('absolute');
    });
});

describe('names are text, not HTML', () => {
    it('renders user, bot and pet names without SanitizeHtml', () => {
        const files = [
            'src/components/room/widgets/avatar-info/menu/AvatarInfoWidgetNameView.tsx',
            'src/components/room/widgets/avatar-info/menu/AvatarInfoWidgetAvatarView.tsx',
            'src/components/room/widgets/chat/ChatWidgetWindowView.tsx',
            'src/components/help/views/SelectReportedUserView.tsx'
        ];

        for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/SanitizeHtml\(`?\$?\{?(nameInfo\.name|avatarInfo\.name|chat\.name|user\.username)/);
    });
});

describe('SanitizePageHtml', () => {
    it('keeps page layout but drops scripts, handlers and forms', () => {
        const html = SanitizePageHtml('<h2>Rules</h2><table><tr><td>1</td></tr></table><img src="a.png" onerror="alert(1)"><script>alert(2)</script><form><input></form>');

        expect(html).toContain('<h2>Rules</h2>');
        expect(html).toContain('<td>1</td>');
        expect(html).not.toContain('onerror');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('<form');
    });
});

describe('SanitizePageHtml — no overlay out of the page window', () => {
    it('drops fixed and sticky positioning and keeps the rest of the layout', () => {
        const div = document.createElement('div');
        div.innerHTML = SanitizePageHtml('<div style="position:fixed;inset:0;width:200px">a</div><div style="position: sticky; top:0">b</div><div style="position:relative;left:4px">c</div>');
        const [fixed, sticky, relative] = Array.from(div.children) as HTMLElement[];

        expect(fixed.getAttribute('style')).toBe('inset:0; width:200px');
        expect(sticky.getAttribute('style')).toBe('top:0');
        expect(relative.getAttribute('style')).toBe('position:relative; left:4px');
    });
});
