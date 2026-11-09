import { describe, expect, it } from 'vitest';
import { MENTION_ROOM_ALIASES } from '../../../../api/mentions/mentionTokens';
import { highlightMentions } from './highlightMentions';

// A generic @user tag, and a self/alias mention (strong).
const TAG = (s: string) => `<span class="mention-tag">${s}</span>`;
const SELF = (s: string) => `<span class="mention-tag mention-tag--self">${s}</span>`;

describe('highlightMentions', () => {
    it('marks the own-nick token as a self mention', () => {
        const out = highlightMentions('hello @Bob how are you', 'Bob');

        expect(out).toBe(`hello ${SELF('@Bob')} how are you`);
    });

    it('marks a room-broadcast alias token as a self mention', () => {
        const out = highlightMentions('@all party time', 'Bob');

        expect(out).toBe(`${SELF('@all')} party time`);
    });

    it('marks every configured room alias as a self mention', () => {
        for (const alias of MENTION_ROOM_ALIASES) {
            const out = highlightMentions(`hey @${alias}!`, 'Bob');

            expect(out).toBe(`hey ${SELF(`@${alias}`)}!`);
        }
    });

    it('tags other users (not me, not an alias) as generic mentions', () => {
        const out = highlightMentions('hi @Charlie and @Dave', 'Bob');

        expect(out).toBe(`hi ${TAG('@Charlie')} and ${TAG('@Dave')}`);
    });

    it('tags a cross-room user even when own username is empty', () => {
        const out = highlightMentions('hi @Charlie', '');

        expect(out).toBe(`hi ${TAG('@Charlie')}`);
    });

    it('leaves non-mention text untouched', () => {
        const text = 'just a normal sentence with no at signs';

        expect(highlightMentions(text, 'Bob')).toBe(text);
    });

    it('leaves the punctuation after a mention outside the span', () => {
        const out = highlightMentions('watch out @Bob! seriously', 'Bob');

        expect(out).toBe(`watch out ${SELF('@Bob')}! seriously`);
    });

    it('matches case-insensitively but preserves the original casing', () => {
        const out = highlightMentions('yo @bOb whatup', 'BOB');

        expect(out).toBe(`yo ${SELF('@bOb')} whatup`);
    });

    it('preserves the original spacing verbatim', () => {
        const out = highlightMentions('a   @Bob\tb', 'Bob');

        expect(out).toBe(`a   ${SELF('@Bob')}\tb`);
    });

    it('does not tag inside HTML tags produced by the formatter', () => {
        const out = highlightMentions('<strong>hi @Bob</strong>', 'Bob');

        expect(out).toBe(`<strong>hi ${SELF('@Bob')}</strong>`);
    });

    it('leaves font-colour spans and line breaks intact', () => {
        const html = '<span style="color:red">hi @Bob</span><br />bye';
        const out = highlightMentions(html, 'Bob');

        expect(out).toBe(`<span style="color:red">hi ${SELF('@Bob')}</span><br />bye`);
    });

    it('handles a self mention and a generic tag in one message', () => {
        const out = highlightMentions('@Bob and @Charlie listen', 'Bob');

        expect(out).toBe(`${SELF('@Bob')} and ${TAG('@Charlie')} listen`);
    });

    it('ignores a bare @ with no nick', () => {
        const text = 'email me @ home';

        expect(highlightMentions(text, 'Bob')).toBe(text);
    });

    it('returns input verbatim when there is no @ at all (fast path)', () => {
        const text = 'plain message';

        expect(highlightMentions(text, 'Bob')).toBe(text);
    });
});
