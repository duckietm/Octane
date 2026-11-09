import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginWindowStorageKey } from '../hooks/useDraggableLoginWindow';
import { NewsWindow } from './NewsWindow';

const NEWS_WINDOW_OFFSET_KEY = loginWindowStorageKey('news');

vi.mock('../utils/i18n', () => ({
    interpolate: (value: string) => value,
    t: (_key: string, fallback: string) => fallback
}));

const newsResponse = () => ({
    ok: true,
    json: async () => ({ news: [{ id: 1, title: 'Grand opening', body: 'Come and see.' }] })
});

const renderNews = async () => {
    render(<NewsWindow newsUrl="https://hotel.test/news.json" />);

    await screen.findByText('Grand opening');

    const handle = screen.getByText('Hotel News').parentElement as HTMLElement;
    const stack = handle.closest('.login-news-stack') as HTMLElement;

    return { handle, stack };
};

describe('NewsWindow dragging', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.stubGlobal('fetch', vi.fn(async () => newsResponse()));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('moves with the title bar and remembers the spot', async () => {
        const { handle, stack } = await renderNews();

        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 140, clientY: 75 });

        expect(stack.classList.contains('is-dragging')).toBe(true);
        expect(stack.style.getPropertyValue('--login-drag-x')).toBe('40px');
        expect(stack.style.getPropertyValue('--login-drag-y')).toBe('-25px');

        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 140, clientY: 75 });

        expect(stack.classList.contains('is-dragging')).toBe(false);
        expect(JSON.parse(window.localStorage.getItem(NEWS_WINDOW_OFFSET_KEY))).toEqual({ x: 40, y: -25 });
    });

    it('starts from the remembered spot and resets on double click', async () => {
        window.localStorage.setItem(NEWS_WINDOW_OFFSET_KEY, JSON.stringify({ x: 12, y: 34 }));

        const { handle, stack } = await renderNews();

        expect(stack.style.getPropertyValue('--login-drag-x')).toBe('12px');
        expect(stack.style.getPropertyValue('--login-drag-y')).toBe('34px');

        await act(async () => {
            fireEvent.doubleClick(handle);
        });

        expect(stack.style.getPropertyValue('--login-drag-x')).toBe('0px');
        expect(window.localStorage.getItem(NEWS_WINDOW_OFFSET_KEY)).toBeNull();
    });

    it('ignores non-primary buttons', async () => {
        const { handle, stack } = await renderNews();

        fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientX: 100, clientY: 100 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 140, clientY: 75 });

        expect(stack.style.getPropertyValue('--login-drag-x')).toBe('0px');
    });
});
