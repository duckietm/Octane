import { describe, expect, it } from 'vitest';
import { readVimeoVideoId, sanitizeVimeoVideoIdInput, vimeoPlayerUrl } from './useFurnitureVimeoWidget.helpers';

describe('Vimeo furni widget helpers', () => {
    it('reads the numeric videoId of the map stuff data, 0 when missing or invalid', () => {
        expect(readVimeoVideoId({ videoId: '40036380' })).toBe(40036380);
        expect(readVimeoVideoId({ videoId: '0' })).toBe(0);
        expect(readVimeoVideoId({ videoId: 'abc' })).toBe(0);
        expect(readVimeoVideoId({ videoId: '-4' })).toBe(0);
        expect(readVimeoVideoId({})).toBe(0);
        expect(readVimeoVideoId(null)).toBe(0);
        expect(readVimeoVideoId('40036380')).toBe(0);
    });

    it('keeps only digits in the id editor, up to what the server stores', () => {
        expect(sanitizeVimeoVideoIdInput('12a3-4')).toBe('1234');
        expect(sanitizeVimeoVideoIdInput('1234567890123456')).toBe('123456789012');
        expect(sanitizeVimeoVideoIdInput('')).toBe('');
    });

    it('plays an id through the Vimeo player and nothing without one', () => {
        expect(vimeoPlayerUrl(40036380)).toBe('https://player.vimeo.com/video/40036380?autoplay=1');
        expect(vimeoPlayerUrl(0)).toBeNull();
    });
});
