import { describe, expect, it } from 'vitest';
import { TranslationCache } from './translationCache';

describe('TranslationCache', () =>
{
    it('forgets the oldest entry past its size', () =>
    {
        const cache = new TranslationCache<string>(2);

        cache.set('a', '1');
        cache.set('b', '2');
        cache.set('c', '3');

        expect(cache.size).toBe(2);
        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('c')).toBe('3');
    });

    it('keeps an entry that was read recently', () =>
    {
        const cache = new TranslationCache<string>(2);

        cache.set('a', '1');
        cache.set('b', '2');
        cache.get('a');
        cache.set('c', '3');

        expect(cache.get('a')).toBe('1');
        expect(cache.get('b')).toBeUndefined();
    });
});
