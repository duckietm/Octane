/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigatorRoomSettingsBasicTabView } from './NavigatorRoomSettingsBasicTabView';

const sendMessageComposer = vi.fn();
const setSoundboardRoomEnabled = vi.fn();

vi.mock('@octane/renderer', () => ({
    RoomDeleteComposer: class {},
    RoomSettingsSaveErrorEvent: class {},
    RoomSettingsSaveErrorParser: class {},
    YouTubeRoomSettingsComposer: class {
        constructor(public enabled: boolean) {}
    },
    YouTubeRoomSettingsEvent: class {}
}));

vi.mock('../../../../api', () => ({
    CreateLinkEvent: vi.fn(),
    GetMaxVisitorsList: [25, 50],
    getYoutubeRoomEnabled: () => false,
    LocalizeText: (key: string) => ({
        'widget.room.youtube.shared': 'YouTube is being shared',
        'soundboard.room.allow': 'Allow Soundboard use in this room'
    })[key] || key,
    SendMessageComposer: (composer: unknown) => sendMessageComposer(composer),
    setYoutubeRoomEnabled: vi.fn()
}));

vi.mock('../../../../common', () => ({
    Column: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Flex: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => <div onClick={onClick}>{children}</div>,
    Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: vi.fn(),
    useNavigatorData: () => ({ categories: [] }),
    useNotification: () => ({ showConfirm: vi.fn() }),
    useSoundboard: () => ({ enabled: true, setRoomEnabled: setSoundboardRoomEnabled })
}));

const roomData = {
    roomId: 1,
    roomName: 'Test room',
    roomDescription: '',
    categoryId: 1,
    userCount: 25,
    tradeState: 0,
    tags: [],
    allowWalkthrough: false,
    allowUnderpass: false
} as any;

describe('NavigatorRoomSettingsBasicTabView room toggles', () => {
    afterEach(() => {
        cleanup();
        sendMessageComposer.mockClear();
    });

    it('renders the shared-YouTube toggle and reports changes to the server', () => {
        render(<NavigatorRoomSettingsBasicTabView handleChange={vi.fn()} roomData={roomData} onClose={vi.fn()} />);

        const toggle = screen.getByRole('checkbox', { name: 'YouTube is being shared' });

        expect(toggle).not.toBeChecked();

        fireEvent.click(toggle);

        expect(sendMessageComposer).toHaveBeenCalledTimes(1);
        expect((sendMessageComposer.mock.calls[0][0] as { enabled: boolean }).enabled).toBe(true);
    });

    it('renders one whole-room soundboard toggle and no per-sound controls', () => {
        const { container } = render(<NavigatorRoomSettingsBasicTabView handleChange={vi.fn()} roomData={roomData} onClose={vi.fn()} />);

        expect(screen.getAllByRole('checkbox', { name: 'Allow Soundboard use in this room' })).toHaveLength(1);
        expect(container.textContent).not.toContain('Block');
        expect(container.textContent).not.toContain('Minimum rank');
        expect(container.textContent).not.toContain('Save catalog');
    });
});
