/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    trackers: [] as { eventUrlPrefix: string; linkReceived: (url: string) => void }[],
    createLinkEvent: vi.fn(),
    send: vi.fn()
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    class OctaneSettingsEvent {
        volumeSystem = 50;
        volumeFurni = 50;
        volumeTrax = 50;
        volumeSoundboard = 50;
        oldChat = false;
        roomInvites = true;
        cameraFollow = true;
        onlineStatusVisible = true;
        friendsCanFollow = true;
        friendRequestsAllowed = true;
        wiredWhisperDisabled = false;
        chatMode = 0;
        chatBubbleWidth = 0;
        chatScrollSpeed = 0;

        clone() {
            return Object.assign(new OctaneSettingsEvent(), this);
        }
    }
    const composer = () =>
        class {
            constructor(
                public a?: unknown,
                public b?: unknown,
                public c?: unknown
            ) {}
        };

    return {
        ...(await importOriginal<Record<string, unknown>>()),
        AddLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.push(tracker),
        RemoveLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.splice(mocks.trackers.indexOf(tracker), 1),
        CreateLinkEvent: mocks.createLinkEvent,
        OctaneSettingsEvent,
        UserSettingsEvent: class UserSettingsEvent {},
        SoundboardSaveVolumeComposer: composer(),
        UserSettingsCameraFollowComposer: composer(),
        UserSettingsChatPreferencesComposer: composer(),
        UserSettingsOnlineIndicatorComposer: composer(),
        UserSettingsOldChatComposer: composer(),
        UserSettingsPrivacyComposer: composer(),
        UserSettingsRoomInvitesComposer: composer(),
        UserSettingsSoundComposer: composer()
    };
});

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    DispatchMainEvent: () => undefined,
    DispatchUiEvent: () => undefined,
    getAccessToken: () => 'token',
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: mocks.send
}));

vi.mock('../../hooks', () => ({
    useCatalogDisplayPreferences: () => ({ density: 'standard', setDensity: () => undefined, showTilePrices: true, setShowTilePrices: () => undefined }),
    useCatalogPlaceMultipleItems: () => [false, () => undefined],
    useCatalogSkipPurchaseConfirmation: () => [false, () => undefined],
    useChatWindow: () => [false, () => undefined],
    useKeyboardMovement: () => [false, () => undefined],
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useWiredToolsActions: () => ({ updateWiredWhisperDisabled: () => undefined }),
    useCustomWordFilter: () => ({ words: [], isFull: false, lastFailed: false, addWord: () => true, removeWord: () => undefined }),
    CUSTOM_FILTER_MAX_WORD_LENGTH: 32
}));

vi.mock('./SoundboardVolumeControl', () => ({ SoundboardVolumeControl: () => <div className="soundboard-volume-stub" /> }));

// The window itself is DraggableWindow's business (and tested there); here it is a plain box that shows what it was given.
vi.mock('../../common', () => ({
    DraggableWindow: ({ children, handheldSheet, handheldScale }: { children: React.ReactNode; handheldSheet?: boolean; handheldScale?: number }) => (
        <div data-scale={handheldScale ?? ''} data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

import { UserSettingsEvent, UserSettingsPrivacyComposer } from '@octane/renderer';
import { UserSettingsView } from './UserSettingsView';

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const link = (url: string) => act(() => mocks.trackers.forEach((tracker) => url.startsWith(tracker.eventUrlPrefix) && tracker.linkReceived(url)));
const receiveSettings = () =>
    act(() =>
        mocks.handlers.get(UserSettingsEvent)({
            getParser: () => ({
                volumeSystem: 50,
                volumeFurni: 60,
                volumeTrax: 70,
                volumeSoundboard: 80,
                oldChat: false,
                roomInvites: true,
                cameraFollow: true,
                onlineStatusVisible: true,
                friendsCanFollow: true,
                friendRequestsAllowed: true,
                chatMode: 0,
                chatBubbleWidth: 0,
                chatScrollSpeed: 0,
                onlineIndicatorPreference: 0
            })
        })
    );
const openSettings = (section = '') => {
    render(<UserSettingsView />);
    receiveSettings();
    link(`user-settings/show${section ? `/${section}` : ''}`);
};

beforeEach(() => {
    mocks.trackers.length = 0;
    mocks.handlers.clear();
    mocks.createLinkEvent.mockClear();
    mocks.send.mockClear();
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('UserSettingsView on a phone', () => {
    it('is a full-screen sheet in the phone frame, with the menu as rows and no way back on it', () => {
        phone();
        openSettings();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-settings.is-menu')).toBeTruthy();
        expect(document.querySelector('.octane-handheld-sheet__title')?.textContent).toBe('Settings');
        expect(document.querySelector('.air-settings-window')).toBeNull();
        expect(document.querySelector('.octane-handheld-settings__back')).toBeNull();
        expect(screen.getByTestId('handheld-settings-page').querySelectorAll('.air-settings-menu__items > button')).toHaveLength(7);
    });

    it('opens a section as a page with its rows and goes back to the menu', () => {
        phone();
        openSettings();

        fireEvent.click(screen.getByText('Game Privacy'));

        expect(document.querySelector('.octane-handheld-settings.is-privacy')).toBeTruthy();
        expect(screen.getByTestId('handheld-settings-page').querySelectorAll('.air-settings-check-row')).toHaveLength(4);

        // The rows are the desktop's own: a tap sends the same composer.
        fireEvent.click(screen.getByRole('checkbox', { name: 'My friends can follow me from one room to another' }));
        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(UserSettingsPrivacyComposer);

        fireEvent.click(document.querySelector('.octane-handheld-settings__back'));

        expect(document.querySelector('.octane-handheld-settings.is-menu')).toBeTruthy();
    });

    it('goes from the word filter back to the chat page', () => {
        phone();
        openSettings();

        fireEvent.click(screen.getByText('Chat settings'));
        fireEvent.click(screen.getByText('Word filter'));
        expect(document.querySelector('.octane-handheld-settings.is-wordfilter')).toBeTruthy();

        fireEvent.click(document.querySelector('.octane-handheld-settings__back'));
        expect(document.querySelector('.octane-handheld-settings.is-chat')).toBeTruthy();
    });

    it('closes from the header of the menu and of a section', () => {
        phone('landscape');
        openSettings();

        fireEvent.click(screen.getByText('Other settings'));
        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(screen.queryByTestId('window')).toBeNull();
    });

    it('opens the account windows from its rows', () => {
        phone();
        openSettings();

        fireEvent.click(screen.getByText('User Settings'));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('user-account-settings/show');
    });
});

describe('UserSettingsView on the desktop', () => {
    it('keeps the AIR window, scaled by the window and with Back as its last button', () => {
        openSettings('chat');

        expect(screen.getByTestId('window').dataset.sheet).toBe('false');
        expect(document.querySelector('.user-settings-window.air-settings-window--chat')).toBeTruthy();
        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();
        expect(document.querySelector('.air-settings-window__back')).toBeTruthy();
    });
});
