import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertEmojiShortcodes, emojiShortcodesReady, loadEmojiShortcodes, registerEmojiShortcodes, resetEmojiShortcodes } from './emojiShortcodes';

const { loadEmojiMartData } = vi.hoisted(() => ({
    loadEmojiMartData: vi.fn(async () => ({
        emojis: {
            joy: { id: 'joy', skins: [{ native: '😂' }] }
        }
    }))
}));

vi.mock('./emojiData', () => ({ loadEmojiMartData }));

const sample = {
    emojis: {
        sob: { id: 'sob', skins: [{ native: '😭' }] },
        cry: { id: 'cry', skins: [{ native: '😢' }] },
        smiley: { id: 'smiley', skins: [{ native: '😃' }] },
        slightly_smiling_face: { id: 'slightly_smiling_face', skins: [{ native: '🙂' }] },
        confused: { id: 'confused', skins: [{ native: '😕' }] },
        '+1': { id: '+1', skins: [{ native: '👍' }] },
        laughing: { id: 'laughing', skins: [{ native: '😆' }] }
    },
    aliases: { satisfied: 'laughing' }
};

describe('convertEmojiShortcodes', () => {
    afterEach(() => resetEmojiShortcodes());

    it('leaves text alone until the emoji data is registered', () => {
        expect(emojiShortcodesReady()).toBe(false);
        expect(convertEmojiShortcodes('hi :sob:')).toBe('hi :sob:');
    });

    it('turns shortcodes, aliases and smileys into emoji', () => {
        registerEmojiShortcodes(sample);

        expect(convertEmojiShortcodes('so sad :sob: :SOB:')).toBe('so sad 😭 😭');
        expect(convertEmojiShortcodes(':+1: :satisfied:')).toBe('👍 😆');
        expect(convertEmojiShortcodes(':) hello =)')).toBe('🙂 hello 😃');
        expect(convertEmojiShortcodes("nooo :'(")).toBe('nooo 😭');
    });

    it('keeps unknown codes, times and urls as typed', () => {
        registerEmojiShortcodes(sample);

        expect(convertEmojiShortcodes('see you at 10:30:00 :nope:')).toBe('see you at 10:30:00 :nope:');
        expect(convertEmojiShortcodes('look http://hotel.test/:/path')).toBe('look http://hotel.test/:/path');
        expect(convertEmojiShortcodes('why:/')).toBe('why:/');
    });

    it('loads the emoji data on demand once', async () => {
        await loadEmojiShortcodes();
        await loadEmojiShortcodes();

        expect(loadEmojiMartData).toHaveBeenCalledTimes(1);
        expect(emojiShortcodesReady()).toBe(true);
        expect(convertEmojiShortcodes(':joy:')).toBe('😂');
    });
});
