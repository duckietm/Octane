import { describe, expect, it } from 'vitest';
import emojibase from 'emojibase-data/en/data.json';
import iamcal from 'emojibase-data/en/shortcodes/iamcal.json';
import { buildEmojiMartData } from './emojiData';

const tones = (hexcode: string, emoji: string) =>
    [ 1, 2, 3, 4, 5 ].map((tone) => ({ hexcode: `${hexcode}-${tone}`, emoji: `${emoji}${tone}`, tone }));

describe('buildEmojiMartData', () => {
    const data = buildEmojiMartData(
        [
            { label: 'grinning face', hexcode: '1F600', emoji: '😀', tags: [ 'smile' ], group: 0, order: 1, version: 1 },
            { label: 'waving hand', hexcode: '1F44B', emoji: '👋', tags: [ 'hello' ], group: 1, order: 2, version: 0.6, skins: tones('1F44B', '👋') },
            { label: 'handshake', hexcode: '1F91D', emoji: '🤝', group: 1, order: 3, version: 3, skins: [ { hexcode: '1F91D-1F3FB-1F3FC', emoji: '🤝🏻🏼', tone: [ 1, 2 ] } ] },
            { label: 'light skin tone', hexcode: '1F3FB', emoji: '🏻', group: 2, order: 4, version: 1 },
            { label: 'melting face', hexcode: '1FAE0', emoji: '🫠', group: 0, order: 5, version: 14 },
            { label: 'flag: Italy', hexcode: '1F1EE-1F1F9', emoji: '🇮🇹', group: 9, order: 6, version: 2 }
        ],
        { '1F600': [ 'grinning', 'grin_face' ], '1F44B': 'wave', '1FAE0': 'melting_face' }
    );

    it('keys an emoji by its first code and keeps the others as aliases', () => {
        expect(data.emojis.grinning.name).toBe('Grinning Face');
        expect(data.emojis.grinning.keywords).toEqual([ 'smile' ]);
        expect(data.aliases).toEqual({ grin_face: 'grinning' });
        expect(data.emojis.wave.skins[0]).toEqual({ unified: '1f44b', native: '👋' });
    });

    it('names an emoji that has no code from its label', () => {
        expect(data.emojis.handshake.name).toBe('Handshake');
        expect(data.emojis.flag_italy.skins[0].native).toBe('🇮🇹');
    });

    it('gives the picker six skins, or one when the tones are not single', () => {
        expect(data.emojis.wave.skins).toHaveLength(6);
        expect(data.emojis.wave.skins[3].native).toBe('👋3');
        expect(data.emojis.handshake.skins).toHaveLength(1);
    });

    it('counts the first emoji releases as version 1 and keeps the later ones', () => {
        expect(data.emojis.wave.version).toBe(1);
        expect(data.emojis.melting_face.version).toBe(14);
    });

    it('sorts the emoji into the picker categories and leaves the tone swatches out', () => {
        expect(data.categories.map((category) => category.id)).toEqual([ 'people', 'flags' ]);
        expect(data.categories[0].emojis).toEqual([ 'grinning', 'wave', 'handshake', 'melting_face' ]);
        expect(Object.keys(data.emojis)).not.toContain('light_skin_tone');
    });
});

describe('the emojibase data of the app', () => {
    const data = buildEmojiMartData(emojibase as never, iamcal as never);

    it('keeps the codes people type', () => {
        expect(data.emojis.sob.skins[0].native).toBe('😭');
        expect(data.emojis.thinking_face.skins[0].native).toBe('🤔');
        expect(data.emojis['+1'].skins[0].native).toBe('👍');
    });

    it('has every category the picker labels', () => {
        expect(data.categories.map((category) => category.id)).toEqual([ 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags' ]);
    });

    it('gives each emoji a unique id', () => {
        const ids = Object.keys(data.emojis);

        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThan(1800);
    });
});
