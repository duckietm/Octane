/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setPreferences = vi.fn();
let preferences = { mode: 0, bubbleWidth: 1, scrollSpeed: 1 };

vi.mock('@octane/renderer', () => ({
    RoomChatSettings: {
        CHAT_MODE_FREE_FLOW: 0,
        CHAT_MODE_LINE_BY_LINE: 1,
        CHAT_BUBBLE_WIDTH_WIDE: 0,
        CHAT_BUBBLE_WIDTH_NORMAL: 1,
        CHAT_BUBBLE_WIDTH_THIN: 2,
        CHAT_SCROLL_SPEED_FAST: 0,
        CHAT_SCROLL_SPEED_NORMAL: 1,
        CHAT_SCROLL_SPEED_SLOW: 2
    }
}));

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => fallback
}));

vi.mock('../../hooks', () => ({
    useChatPreferences: () => [preferences, setPreferences]
}));

import { UserChatPreferencesView } from './UserChatPreferencesView';

describe('UserChatPreferencesView', () => {
    beforeEach(() => {
        setPreferences.mockClear();
        preferences = { mode: 0, bubbleWidth: 1, scrollSpeed: 1 };
    });

    afterEach(cleanup);

    it('shows the mode, bubble width and scroll speed drop-menus with the stored selections', () => {
        preferences = { mode: 1, bubbleWidth: 2, scrollSpeed: 0 };

        render(<UserChatPreferencesView />);

        expect(screen.getByRole('combobox', { name: 'Chat mode' })).toHaveValue('1');
        expect(screen.getByRole('combobox', { name: 'Bubble width' })).toHaveValue('2');
        expect(screen.getByRole('combobox', { name: 'Scroll speed' })).toHaveValue('0');
        expect(screen.getByRole('option', { name: 'Line by line' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Thin' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Slow' })).toBeInTheDocument();
    });

    it('saves each drop-menu on its own as a number', () => {
        render(<UserChatPreferencesView />);

        fireEvent.change(screen.getByRole('combobox', { name: 'Chat mode' }), { target: { value: '1' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Bubble width' }), { target: { value: '0' } });
        fireEvent.change(screen.getByRole('combobox', { name: 'Scroll speed' }), { target: { value: '2' } });

        expect(setPreferences).toHaveBeenNthCalledWith(1, { mode: 1 });
        expect(setPreferences).toHaveBeenNthCalledWith(2, { bubbleWidth: 0 });
        expect(setPreferences).toHaveBeenNthCalledWith(3, { scrollSpeed: 2 });
    });
});
