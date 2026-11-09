/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { RoomChatFormatter } from './RoomChatFormatter';

/**
 * Security + behaviour suite for the chat formatter.
 *
 * The formatter output is injected into the DOM via `dangerouslySetInnerHTML`
 * in ChatWidgetMessageView, so the security contract is: after the browser
 * parses the formatted string as HTML, NO attacker-controlled executable
 * markup may survive (no <script>/<img onerror>/<svg onload>/javascript: URL,
 * no event-handler attributes). We use jsdom's real HTML parser as the oracle
 * rather than guessing how entities decode.
 */
const parse = (input: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.innerHTML = RoomChatFormatter(input);
    return div;
};

describe('RoomChatFormatter — XSS neutralisation', () => {
    it('does not produce a <script> element from a raw script tag', () => {
        const div = parse('<script>alert(1)</script>');
        expect(div.querySelector('script')).toBeNull();
    });

    it('does not produce an <img> element with an onerror handler', () => {
        const div = parse('<img src=x onerror=alert(1)>');
        const img = div.querySelector('img');
        expect(img).toBeNull();
    });

    it('does not produce an <svg> element with an onload handler', () => {
        const div = parse('<svg onload=alert(1)></svg>');
        expect(div.querySelector('svg')).toBeNull();
    });

    it('does not keep a javascript: href on an anchor', () => {
        const div = parse('<a href="javascript:alert(1)">x</a>');
        expect(div.querySelector('a[href^="javascript:"]')).toBeNull();
    });

    it('strips event-handler attributes injected via a font tag', () => {
        const div = parse('<font color="red" onload="alert(1)">hi</font>');
        expect(div.querySelector('[onload]')).toBeNull();
        expect(div.innerHTML.toLowerCase()).not.toContain('onload');
    });

    it('neutralises numeric-entity-encoded image injection (&#60;img …&#62;)', () => {
        const div = parse('&#60;img src=x onerror=alert(1)&#62;');
        expect(div.querySelector('img')).toBeNull();
    });

    it('neutralises hex-entity-encoded image injection (&#x3c;img …)', () => {
        const div = parse('&#x3c;img src=x onerror=alert(1)&#x3e;');
        expect(div.querySelector('img')).toBeNull();
    });

    it('does not allow an arbitrary style/background via font color', () => {
        const div = parse('<font color="red;background:url(javascript:alert(1))">hi</font>');
        expect(div.innerHTML.toLowerCase()).not.toContain('javascript:');
    });
});

describe('RoomChatFormatter — legitimate markup is preserved', () => {
    it('renders [b]…[/b] as <strong>', () => {
        const div = parse('[b]hello[/b]');
        const strong = div.querySelector('strong');
        expect(strong).not.toBeNull();
        expect(strong?.textContent).toBe('hello');
    });

    it('renders a whitelisted font colour as a coloured span', () => {
        const div = parse('<font color="red">hi</font>');
        const span = div.querySelector('span');
        expect(span).not.toBeNull();
        expect((span as HTMLElement).style.color).toBe('red');
        expect(span?.textContent).toBe('hi');
    });

    it('drops a non-whitelisted font colour but keeps the inner text', () => {
        const div = parse('<font color="notacolour">hi</font>');
        expect(div.textContent).toContain('hi');
        expect(div.innerHTML.toLowerCase()).not.toContain('notacolour');
    });

    it('passes plain text through unchanged', () => {
        const div = parse('just a normal message');
        expect(div.textContent).toBe('just a normal message');
    });

    it('converts newlines to <br />', () => {
        const div = parse('line1\nline2');
        expect(div.querySelectorAll('br').length).toBe(1);
    });
});

describe('RoomChatFormatter — emoji', () => {
    it('keeps an emoji intact after an accented letter', () => {
        const div = parse('café🙂');
        expect(div.textContent).toBe('café🙂');
    });

    it('keeps typed numeric entities as text, never as markup', () => {
        const div = parse('&#60;b&#62;bold&#60;/b&#62;');
        expect(div.querySelector('b')).toBeNull();
        expect(div.textContent).toBe('<b>bold</b>');
    });
});
