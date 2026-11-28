/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';
import { ChatWidgetWindowView } from './ChatWidgetWindowView';

const ROOM_ID = 7;
const state = vi.hoisted(() => ({ setChatWindowEnabled: vi.fn(), clearChatHistory: vi.fn(), scrollToIndex: vi.fn() }));

// jsdom measures every element as 0x0, so the virtualizer is replaced by one that renders every row.
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: ({ count, getItemKey }: { count: number; getItemKey: (index: number) => string }) => ({
        getTotalSize: () => count * 30,
        getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: getItemKey(index), size: 30, start: index * 30 })),
        measureElement: vi.fn(),
        scrollToIndex: state.scrollToIndex
    })
}));

vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => ({ userId: 1 }),
    RoomObjectType: { PET: 2 }
}));

vi.mock('../../../../api', () => ({
    ChatEntryType: { TYPE_CHAT: 1 },
    LocalizeText: (key: string) => key,
    SanitizeHtml: (html: string) => html,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', () => ({
    DraggableWindowPosition: { TOP_LEFT: 'top_left' },
    OctaneCardView: ({ children }: { children: ReactNode }) => <div data-testid="desktop-window">{children}</div>,
    OctaneCardHeaderView: () => null,
    OctaneCardContentView: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

const entry = (id: number, name: string, message: string, entityType = 1) => ({
    id,
    webId: 2,
    name,
    message,
    type: 1,
    roomId: ROOM_ID,
    entityType,
    timestamp: `t${id}`,
    style: 0,
    chatType: 0
});

vi.mock('../../../../hooks', () => ({
    useChatHistory: () => ({
        chatHistory: [entry(1, 'Frank', 'hello there'), entry(2, 'Anna', 'good night'), entry(3, 'Rex', 'woof', 2)],
        clearChatHistory: state.clearChatHistory
    }),
    useChatWindow: () => [true, state.setChatWindowEnabled],
    useOnClickChat: () => ({ onClickChat: vi.fn() })
}));

vi.mock('../../../../hooks/rooms', () => ({
    useRoom: () => ({ roomSession: { roomId: ROOM_ID } })
}));

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

beforeEach(() => {
    state.setChatWindowEnabled.mockClear();
    state.clearChatHistory.mockClear();
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('ChatWidgetWindowView on a phone', () => {
    it('keeps the desktop window off a phone', () => {
        render(<ChatWidgetWindowView />);

        expect(screen.getByTestId('desktop-window')).toBeInTheDocument();
        expect(screen.queryByTestId('chat-window-panel')).toBeNull();
    });

    it('shows the same rows in a panel, the filters behind their button', () => {
        phone();
        render(<ChatWidgetWindowView />);

        const panel = screen.getByTestId('chat-window-panel');

        expect(screen.queryByTestId('desktop-window')).toBeNull();
        expect(panel.textContent).toContain('hello there');
        expect(panel.textContent).toContain('woof');
        expect(screen.queryByTestId('chat-window-filters')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'widget.room.chat.hide_pets' }));

        expect(panel.textContent).not.toContain('woof');

        fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), { target: { value: 'night' } });

        expect(panel.textContent).not.toContain('hello there');
        expect(panel.textContent).toContain('good night');
    });

    it('clears and closes through the desktop handlers', () => {
        phone();
        render(<ChatWidgetWindowView />);

        fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
        fireEvent.click(screen.getByRole('button', { name: 'widget.room.chat.clear_history' }));

        expect(state.clearChatHistory).toHaveBeenCalledTimes(1);
        expect(state.setChatWindowEnabled).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));

        expect(state.setChatWindowEnabled).toHaveBeenCalledWith(false);
        expect(state.clearChatHistory).toHaveBeenCalledTimes(2);
    });
});
