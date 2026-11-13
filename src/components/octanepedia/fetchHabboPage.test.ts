import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fetchHabboPage, isWebDocument } from './fetchHabboPage';

const reply = (text: string, ok = true) => ({ ok, text: async () => text }) as Response;
const signal = () => new AbortController().signal;

describe('fetchHabboPage', () => {
    it('takes the hotel page when there is one', async () => {
        const fetcher = vi.fn(async () => reply('Title|1;1\n<p>hotel</p>'));

        expect(await fetchHabboPage(['hotel', 'bundled'], signal(), fetcher as unknown as typeof fetch)).toContain('hotel');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('falls back to the bundled page on a missing file, a server index page or a network error', async () => {
        for (const first of [async () => reply('', false), async () => reply('<!DOCTYPE html><html></html>'), async () => Promise.reject(new Error('offline'))]) {
            const fetcher = vi.fn().mockImplementationOnce(first).mockImplementationOnce(async () => reply('Title\n<p>bundled</p>'));

            expect(await fetchHabboPage(['hotel', 'bundled'], signal(), fetcher as unknown as typeof fetch)).toContain('bundled');
        }
    });

    it('answers null when nothing has the page, and skips empty or repeated links', async () => {
        const fetcher = vi.fn(async () => reply('', false));

        expect(await fetchHabboPage(['same', null, 'same'], signal(), fetcher as unknown as typeof fetch)).toBeNull();
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('tells a web document from a help page', () => {
        expect(isWebDocument('\n<!doctype html>')).toBe(true);
        expect(isWebDocument('<html lang="en">')).toBe(true);
        expect(isWebDocument('Mystery Box FAQ|460;480\n<h2>Mystery Box</h2>')).toBe(false);
    });
});

describe('the bundled mystery box page', () => {
    it('has a title line with a size, then the page', () => {
        const [first, ...rest] = readFileSync('public/habbopages/en/mysterybox/faq.html', 'utf8').split('\n');

        expect(first).toMatch(/^[^|<]+\|\d+;\d+$/);
        expect(rest.join('\n')).toContain('<h2>Mystery Box</h2>');
    });
});
