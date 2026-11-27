import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldChatComposerStore } from '../../../../state/handheldChatComposerStore';
import { useHandheldHudStore } from '../../../../state/handheldHudStore';
import { useHandheldStore } from '../../../../state/handheldStore';

const SAY = 0;
const WHISPER = 1;
const SHOUT = 2;

const mocks = vi.hoisted(() => ({
    sendChat: vi.fn(),
    setIsTyping: vi.fn(),
    setIsIdle: vi.fn(),
    selectedUsername: '',
    users: [] as { name: string; type: number; roomIndex: number }[],
    uiEvent: null as (event: { chatMode: string; userName: string }) => void
}));

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: vi.fn(),
    GetSessionDataManager: () => ({ hasSecurity: () => false, isAmbassador: false }),
    HabboClubLevelEnum: { CLUB: 1 },
    SecurityLevel: { MODERATOR: 5 }
}));

vi.mock('../../../../api', () => ({
    GetClubMemberLevel: () => 0,
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    HasSessionPermission: () => false,
    resolveServerLength: (_settings: unknown, _key: string, fallback: number) => fallback,
    LocalizeText: (key: string) => ({ 'widgets.chatinput.mode.whisper': ':whisper', 'widgets.chatinput.mode.shout': ':shout', 'widgets.chatinput.mode.speak': ':speak', 'widgets.chatinput.default': 'Click here to chat...' })[key] ?? key,
    localizeWithFallback: (_key: string, fallback: string, parameters?: string[], replacements?: string[]) => (parameters ? fallback.replace(`%${parameters[0]}%`, replacements[0]) : fallback),
    ResolveChatStyleIds: () => [1, 2, 3],
    RoomWidgetUpdateChatInputContentEvent: { CHAT_INPUT_CONTENT: 'content', TEXT: 'text', WHISPER: 'whisper', SHOUT: 'shout' }
}));

vi.mock('../../../../api/utils/localizeWithFallback', () => ({
    localizeWithFallback: (_key: string, fallback: string, parameters?: string[], replacements?: string[]) => (parameters ? fallback.replace(`%${parameters[0]}%`, replacements[0]) : fallback)
}));

vi.mock('../../../../common', () => ({ Text: ({ children }: { children: unknown }) => <span>{children as string}</span> }));

vi.mock('../../../../state/hotelSettingsStore', () => ({ useHotelSettingsStore: (select: (state: { settings: null }) => unknown) => select({ settings: null }) }));

vi.mock('../../../../hooks', async () => {
    const chatLine = await import('../../../../hooks/handheld/useHandheldChatLine');
    const layout = await import('../../../../hooks/handheld/useHandheldLayout');

    return {
        ...chatLine,
        useIsHandheld: layout.useIsHandheld,
        useChatCommandSelector: () => ({ isVisible: false, filteredCommands: [], selectedIndex: 0, setSelectedIndex: vi.fn(), moveUp: vi.fn(), moveDown: vi.fn(), selectCurrent: (): null => null, close: vi.fn() }),
        useChatInputWidget: () => ({ selectedUsername: mocks.selectedUsername, floodBlocked: false, floodBlockedSeconds: 0, setIsTyping: mocks.setIsTyping, setIsIdle: mocks.setIsIdle, sendChat: mocks.sendChat }),
        useChatMentions: () => ({ visible: false }),
        useNuxChatReminder: () => ({ wiggling: false, reminding: false, dismiss: vi.fn() }),
        usePurchasableChatStyles: (): number[] => [],
        useRoom: () => ({ roomSession: { isSpectator: false, ownRoomIndex: 0 } }),
        useRoomUserListSnapshot: () => mocks.users,
        useSessionInfo: () => ({ chatStyleId: 3, updateChatStyleId: vi.fn() }),
        useUiEvent: (_type: string, handler: typeof mocks.uiEvent) => {
            mocks.uiEvent = handler;
        }
    };
});

vi.mock('./ChatInputCommandSelectorView', () => ({ ChatInputCommandSelectorView: (): null => null }));
vi.mock('./ChatInputMentionSelectorView', () => ({ ChatInputMentionSelectorView: (): null => null }));
vi.mock('./ChatInputStyleSelectorView', () => ({ ChatInputStyleSelectorView: () => <i data-testid="style-chooser" /> }));
vi.mock('./ChatInputHabbiconSelectorView', () => ({ ChatInputHabbiconSelectorView: () => <i data-testid="habbicons" /> }));
vi.mock('./ChatInputEmojiSelectorView', () => ({
    ChatInputEmojiSelectorView: ({ addChatEmoji }: { addChatEmoji: (emoji: string) => void }) => (
        <button type="button" onClick={() => addChatEmoji('🙂')}>
            emoji
        </button>
    )
}));

import { ChatInputView } from './ChatInputView';

const ME = { name: 'Me', type: 1, roomIndex: 0 };
const BOB = { name: 'Bob', type: 1, roomIndex: 1 };
const CAROL = { name: 'Carol', type: 1, roomIndex: 2 };
const PET = { name: 'Rex', type: 2, roomIndex: 3 };

const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
const field = () => document.querySelector<HTMLInputElement>('#toolbar-chat-input-container input');
const type = (text: string) => fireEvent.change(field(), { target: { value: text } });
const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const composer = () => useHandheldChatComposerStore.getState();

beforeEach(() => {
    document.body.innerHTML = '<div id="toolbar-chat-input-container"></div>';
    mocks.users = [ME, BOB, CAROL, PET];
    mocks.selectedUsername = '';
});

afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.clearAllMocks();
    act(() => {
        useHandheldStore.setState({ layout: DESKTOP_LAYOUT, keyboardInset: 0 });
        useHandheldHudStore.setState({ chatOpen: false });
        useHandheldChatComposerStore.setState({ draft: '', mode: 'say', recipient: '' });
    });
});

describe('ChatInputView on a phone (the composer)', () => {
    it('draws the composer with our style chooser and pickers instead of the desktop field', () => {
        phone();
        render(<ChatInputView />);

        expect(document.querySelector('#toolbar-chat-input-container .octane-handheld-composer')).not.toBeNull();
        expect(document.querySelector('.swf-chat-input')).toBeNull();
        expect(screen.getByTestId('style-chooser')).not.toBeNull();
        expect(screen.getByTestId('habbicons')).not.toBeNull();
        expect(field().getAttribute('placeholder')).toBe('Click here to chat...');
        expect(field().getAttribute('enterkeyhint')).toBe('send');
    });

    it('says the line through the shared chat input logic, with the chosen chat style, and empties the draft', () => {
        phone();
        render(<ChatInputView />);

        type('Meet you in the lobby!');

        expect(mocks.setIsTyping).toHaveBeenLastCalledWith(true);

        tap('Send');

        expect(mocks.sendChat).toHaveBeenCalledWith('Meet you in the lobby!', SAY, '', 3);
        expect(mocks.setIsTyping).toHaveBeenLastCalledWith(false);
        expect(composer().draft).toBe('');
        expect(field().value).toBe('');
    });

    it('shouts after the Shout segment was tapped, and keeps shouting', () => {
        phone();
        render(<ChatInputView />);

        tap('Shout');
        type('hey');
        tap('Send');
        type('again');
        tap('Send');

        expect(mocks.sendChat.mock.calls).toEqual([
            ['hey', SHOUT, '', 3],
            ['again', SHOUT, '', 3]
        ]);
        expect(composer().mode).toBe('shout');
    });

    it('sends with Enter as well', () => {
        phone();
        render(<ChatInputView />);

        tap('Shout');
        type('enter');
        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(mocks.sendChat).toHaveBeenCalledWith('enter', SHOUT, '', 3);
        expect(composer().draft).toBe('');
    });

    it('lets a keyword typed in the line win over the segment', () => {
        phone();
        render(<ChatInputView />);

        tap('Shout');
        type(':whisper Carol hi');
        tap('Send');

        expect(mocks.sendChat).toHaveBeenCalledWith('hi', WHISPER, 'Carol', 3);
        expect(composer().draft).toBe('');
    });

    it('asks who to whisper to when nobody is chosen, listing the other players only', () => {
        phone();
        render(<ChatInputView />);

        tap('Whisper');

        expect(composer().mode).toBe('whisper');
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Bob', 'Carol']);

        fireEvent.click(screen.getByRole('option', { name: 'Carol' }));

        expect(composer().recipient).toBe('Carol');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(field().getAttribute('placeholder')).toBe('Whisper to Carol');

        type('psst');
        tap('Send');

        expect(mocks.sendChat).toHaveBeenCalledWith('psst', WHISPER, 'Carol', 3);
        expect(composer()).toMatchObject({ draft: '', mode: 'whisper', recipient: 'Carol' });
    });

    it('whispers to the avatar that is selected in the room', () => {
        mocks.selectedUsername = 'Bob';
        phone();
        act(() => composer().setRecipient('Carol'));
        render(<ChatInputView />);

        tap('Whisper');

        expect(composer().recipient).toBe('Bob');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('keeps whoever was whispered to last when nobody is selected', () => {
        phone();
        act(() => composer().setRecipient('Carol'));
        render(<ChatInputView />);

        tap('Whisper');

        expect(composer().recipient).toBe('Carol');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('holds a whisper back and keeps the text while its recipient is missing or has left the room', () => {
        phone();
        act(() => {
            composer().setMode('whisper');
            composer().setRecipient('Gone');
        });
        render(<ChatInputView />);

        type('secret');
        tap('Send');

        expect(mocks.sendChat).not.toHaveBeenCalled();
        expect(composer().draft).toBe('secret');
        expect(screen.getByRole('listbox')).not.toBeNull();
    });

    it('opens in whisper mode for a player from the avatar menu, without touching the draft', () => {
        phone();
        act(() => composer().setDraft('half a line'));
        render(<ChatInputView />);

        act(() => mocks.uiEvent({ chatMode: 'whisper', userName: 'Bob' }));

        expect(composer()).toMatchObject({ mode: 'whisper', recipient: 'Bob', draft: 'half a line' });
        expect(useHandheldHudStore.getState().chatOpen).toBe(true);
        expect(document.activeElement).toBe(field());
        expect(screen.getByRole('button', { name: 'Whisper' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('keeps the draft and the mode when closed, and shows them again when reopened', () => {
        phone();

        const first = render(<ChatInputView />);

        act(() => useHandheldHudStore.getState().setChatOpen(true));
        tap('Shout');
        type('not sent yet');
        tap('Close chat');

        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
        expect(mocks.setIsTyping).toHaveBeenLastCalledWith(false);
        expect(mocks.sendChat).not.toHaveBeenCalled();
        expect(composer()).toMatchObject({ draft: 'not sent yet', mode: 'shout' });

        // Even a remount (another room) brings them back.
        first.unmount();
        render(<ChatInputView />);

        expect(field().value).toBe('not sent yet');
        expect(screen.getByRole('button', { name: 'Shout' }).getAttribute('aria-pressed')).toBe('true');
    });

    it('adds a picked emoji to the draft', () => {
        phone();
        render(<ChatInputView />);

        type('hi ');
        tap('emoji');

        expect(composer().draft).toBe('hi 🙂');
    });
});

describe('ChatInputView on desktop', () => {
    it('keeps the desktop field, without the composer or its store', () => {
        render(<ChatInputView />);

        expect(document.querySelector('.octane-chat-input-container.swf-chat-input .swf-chat-input-field')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-composer')).toBeNull();

        type('hello');

        expect(composer().draft).toBe('');

        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(mocks.sendChat).toHaveBeenCalledWith('hello', SAY, '', 3);
        expect(field().value).toBe('');
    });

    it('still shouts with Shift+Enter and refills the whisper keyword after a whisper', () => {
        render(<ChatInputView />);

        type('loud');
        fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true });
        type(':whisper Bob hi');
        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(mocks.sendChat.mock.calls).toEqual([
            ['loud', SHOUT, '', 3],
            ['hi', WHISPER, 'Bob', 3]
        ]);
        expect(field().value).toBe(':whisper Bob ');
    });

    it('still starts a whisper from the avatar menu by filling in the keyword', () => {
        act(() => useHandheldChatComposerStore.setState({ mode: 'shout' }));
        render(<ChatInputView />);

        act(() => mocks.uiEvent({ chatMode: 'whisper', userName: 'Bob' }));

        expect(field().value).toBe(':whisper Bob ');
        expect(composer().mode).toBe('shout');
        expect(useHandheldHudStore.getState().chatOpen).toBe(false);
    });
});
