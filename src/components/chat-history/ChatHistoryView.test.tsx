/* @vitest-environment jsdom */

import { AddLinkEventTracker, GetSessionDataManager, RoomObjectType } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatEntryType, IChatEntry } from '../../api';
import { useChatHistory } from '../../hooks';
import { ChatHistoryView } from './ChatHistoryView';
import { AUTO_SCROLL_TO_LATEST_DURATION_MS, SPRINGBACK_DURATION_MS, WHEEL_SETTLE_DELAY_MS } from './chatHistoryScroll';

const showConfirm = vi.fn();
const ignoreUser = vi.fn();
const isUserIgnored = vi.fn(() => false);

vi.mock('../../hooks', () => ({
    useChatHistory: vi.fn(),
    useOnClickChat: () => ({ onClickChat: vi.fn() }),
    useNotification: () => ({ showConfirm })
}));

const OWN_USER_ID = 99;

const roomInfoEntry = (overrides: Partial<IChatEntry> = {}): IChatEntry => ({
    id: 1,
    webId: -1,
    entityId: -1,
    name: 'Soundboard',
    roomId: 42,
    timestamp: '16:17',
    type: ChatEntryType.TYPE_ROOM_INFO,
    ...overrides
});

const chatEntry = (overrides: Partial<IChatEntry> = {}): IChatEntry => ({
    id: 2,
    webId: 12,
    entityId: 3,
    entityType: RoomObjectType.USER as unknown as number,
    name: 'Alice',
    message: 'hello there',
    roomId: 42,
    timestamp: '16:18',
    type: ChatEntryType.TYPE_CHAT,
    style: 0,
    chatType: 0,
    ...overrides
});

const renderVisibleHistory = (chatHistory: IChatEntry[]) => {
    vi.mocked(useChatHistory).mockReturnValue({ chatHistory } as ReturnType<typeof useChatHistory>);

    const view = render(<ChatHistoryView />);
    const tracker = vi.mocked(AddLinkEventTracker).mock.calls[0][0];

    act(() => tracker.linkReceived('chat-history/show'));

    return view;
};

describe('ChatHistoryView', () => {
    beforeEach(() => {
        vi.mocked(AddLinkEventTracker).mockClear();
        vi.mocked(GetSessionDataManager).mockReturnValue({ userId: OWN_USER_ID, ignoreUser, isUserIgnored } as never);
        showConfirm.mockClear();
        ignoreUser.mockClear();
        isUserIgnored.mockReset();
        isUserIgnored.mockReturnValue(false);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    describe('room information', () => {
        it('shows the playback message for a soundboard room event', () => {
            renderVisibleHistory([roomInfoEntry({ message: 'Simoleo ha riprodotto Campanella' })]);

            expect(screen.getByText('Simoleo ha riprodotto Campanella')).toBeInTheDocument();
            expect(screen.queryByText('Soundboard')).not.toBeInTheDocument();
        });

        it('keeps showing the room name when a room event has no message', () => {
            renderVisibleHistory([roomInfoEntry({ name: 'Sala da pranzo' })]);

            expect(screen.getByText('Sala da pranzo')).toBeInTheDocument();
        });
    });

    describe('ignore from the history', () => {
        it('offers to ignore another user and only ignores after the confirmation', () => {
            renderVisibleHistory([chatEntry()]);

            // The test localization returns the key, so the English fallback is what renders.
            fireEvent.click(screen.getByRole('button', { name: 'Ignore User' }));

            expect(showConfirm).toHaveBeenCalledTimes(1);
            expect(showConfirm.mock.calls[0][0]).toBe('Ignore all future chat from Alice?');
            expect(showConfirm.mock.calls[0][5]).toBe('Ignore User');
            expect(ignoreUser).not.toHaveBeenCalled();

            act(() => showConfirm.mock.calls[0][1]());

            expect(ignoreUser).toHaveBeenCalledWith('Alice');
            expect(screen.queryByRole('button', { name: 'Ignore User' })).not.toBeInTheDocument();
        });

        it('offers no ignore action for the own lines, pets, bots and users already ignored', () => {
            isUserIgnored.mockImplementation(((name: string) => name === 'Muted') as never);

            renderVisibleHistory([
                chatEntry({ id: 10, webId: OWN_USER_ID, name: 'Me' }),
                chatEntry({ id: 11, entityType: RoomObjectType.PET as unknown as number, name: 'Rex' }),
                chatEntry({ id: 12, webId: -1, name: 'Bot' }),
                chatEntry({ id: 13, name: 'Muted' })
            ]);

            expect(screen.queryByRole('button', { name: 'Ignore User' })).not.toBeInTheDocument();
        });
    });

    describe('scrolling', () => {
        const scrollHeight = vi.fn(() => 1000);
        const clientHeight = vi.fn(() => 200);

        beforeEach(() => {
            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
            scrollHeight.mockReturnValue(1000);
            Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight() });
            Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => clientHeight() });
        });

        afterEach(() => {
            delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
            delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
        });

        const getScroller = (container: HTMLElement) => container.querySelector<HTMLElement>('.octane-chat-history-scroll');

        it('opens on the latest line without an animation', () => {
            const { container } = renderVisibleHistory([chatEntry()]);

            expect(getScroller(container).scrollTop).toBe(800);
        });

        it('glides to a new line in 140 ms when the reader was already on the latest one', () => {
            const { container, rerender } = renderVisibleHistory([chatEntry()]);
            const scroller = getScroller(container);

            scrollHeight.mockReturnValue(1100);
            vi.mocked(useChatHistory).mockReturnValue({ chatHistory: [chatEntry(), chatEntry({ id: 3 })] } as ReturnType<typeof useChatHistory>);
            rerender(<ChatHistoryView />);

            expect(scroller.scrollTop).toBe(800);

            act(() => vi.advanceTimersByTime(AUTO_SCROLL_TO_LATEST_DURATION_MS / 2));

            expect(scroller.scrollTop).toBeGreaterThan(800);
            expect(scroller.scrollTop).toBeLessThan(900);

            act(() => vi.advanceTimersByTime(AUTO_SCROLL_TO_LATEST_DURATION_MS));

            expect(scroller.scrollTop).toBe(900);
        });

        it('leaves a reader who scrolled up into older history where they are', () => {
            const { container, rerender } = renderVisibleHistory([chatEntry()]);
            const scroller = getScroller(container);

            scroller.scrollTop = 300;
            fireEvent.scroll(scroller);

            scrollHeight.mockReturnValue(1100);
            vi.mocked(useChatHistory).mockReturnValue({ chatHistory: [chatEntry(), chatEntry({ id: 3 })] } as ReturnType<typeof useChatHistory>);
            rerender(<ChatHistoryView />);

            act(() => vi.advanceTimersByTime(AUTO_SCROLL_TO_LATEST_DURATION_MS * 2));

            expect(scroller.scrollTop).toBe(300);
        });

        it('springs back onto the latest line in 180 ms when a wheel scroll stops just short of it', () => {
            const { container } = renderVisibleHistory([chatEntry()]);
            const scroller = getScroller(container);

            scroller.scrollTop = 790;
            fireEvent.wheel(scroller, { deltaY: -10 });

            act(() => vi.advanceTimersByTime(WHEEL_SETTLE_DELAY_MS));

            expect(scroller.scrollTop).toBe(790);

            act(() => vi.advanceTimersByTime(SPRINGBACK_DURATION_MS + 20));

            expect(scroller.scrollTop).toBe(800);
        });

        it('does not spring back when the wheel scroll ended well inside older history', () => {
            const { container } = renderVisibleHistory([chatEntry()]);
            const scroller = getScroller(container);

            scroller.scrollTop = 500;
            fireEvent.wheel(scroller, { deltaY: -10 });

            act(() => vi.advanceTimersByTime(WHEEL_SETTLE_DELAY_MS + SPRINGBACK_DURATION_MS + 20));

            expect(scroller.scrollTop).toBe(500);
        });
    });
});
