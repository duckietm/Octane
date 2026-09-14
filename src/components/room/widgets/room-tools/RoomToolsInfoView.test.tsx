import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomToolsInfoView, trimRoomInfoTag } from './RoomToolsInfoView';

type RoomEnterHandler = (event: { getParser: () => unknown }) => void;

const mocks = vi.hoisted(() => ({
    config: new Map<string, unknown>(),
    createLinkEvent: vi.fn(),
    handlers: [] as RoomEnterHandler[],
    roomSession: { roomId: 5 } as { roomId: number } | null
}));

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: mocks.createLinkEvent,
    GetGuestRoomResultEvent: class {}
}));

vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, animate, exit, initial, transition, ...rest }: Record<string, unknown> & { children?: ReactNode }) => <div {...rest}>{children}</div>
    }
}));

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (mocks.config.has(key) ? mocks.config.get(key) : fallback)
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: (_event: unknown, handler: RoomEnterHandler) => {
        mocks.handlers.push(handler);
    },
    useRoom: () => ({ roomSession: mocks.roomSession })
}));

const enterRoom = (data: Partial<{ roomId: number; roomName: string; ownerName: string; showOwner: boolean; tags: string[] }> = {}, roomEnter = true) => {
    const parser = {
        roomEnter,
        data: { roomId: 5, roomName: 'Lobby', ownerName: 'Alice', showOwner: true, tags: ['fun', 'games', 'third'], ...data }
    };

    act(() => {
        for (const handler of mocks.handlers) handler({ getParser: () => parser });
    });
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    mocks.config.clear();
    mocks.handlers.length = 0;
    mocks.roomSession = { roomId: 5 };
});

describe('RoomToolsInfoView', () => {
    it('shows the room name, owner and the first two tags when the room is entered', () => {
        render(<RoomToolsInfoView isToolsOpen={true} />);

        expect(screen.queryByTestId('room-tools-info')).not.toBeInTheDocument();

        enterRoom();

        expect(screen.getByTestId('room-tools-info')).toBeInTheDocument();
        expect(screen.getByText('Lobby')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('#fun')).toBeInTheDocument();
        expect(screen.getByText('#games')).toBeInTheDocument();
        expect(screen.queryByText('#third')).not.toBeInTheDocument();
    });

    it('hides the owner when the room does not show one', () => {
        render(<RoomToolsInfoView isToolsOpen={true} />);

        enterRoom({ showOwner: false });

        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('opens the navigator tag search when a tag is clicked and closes the panel', () => {
        render(<RoomToolsInfoView isToolsOpen={true} />);

        enterRoom();
        fireEvent.click(screen.getByText('#fun'));

        expect(mocks.createLinkEvent).toHaveBeenCalledWith('navigator/tag/fun');
        expect(screen.queryByTestId('room-tools-info')).not.toBeInTheDocument();
    });

    it('collapses on its own after the configured delay', () => {
        mocks.config.set('room.enter.info.collapse.delay', 1000);

        render(<RoomToolsInfoView isToolsOpen={true} />);

        enterRoom();

        expect(screen.getByTestId('room-tools-info')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1001);
        });

        expect(screen.queryByTestId('room-tools-info')).not.toBeInTheDocument();
    });

    it('ignores room data that is not a room entry and rooms other than the current one', () => {
        render(<RoomToolsInfoView isToolsOpen={true} />);

        enterRoom({}, false);
        enterRoom({ roomId: 99 });

        expect(screen.queryByTestId('room-tools-info')).not.toBeInTheDocument();
    });

    it('stays hidden when the room enter info is disabled', () => {
        mocks.config.set('room.enter.info.enabled', false);

        render(<RoomToolsInfoView isToolsOpen={true} />);

        enterRoom();

        expect(screen.queryByTestId('room-tools-info')).not.toBeInTheDocument();
    });

    it('cuts long tags at sixteen characters like the official panel', () => {
        expect(trimRoomInfoTag('short')).toBe('short');
        expect(trimRoomInfoTag('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnop...');
    });
});
