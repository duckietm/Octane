/* @vitest-environment jsdom */

import { CreateLinkEvent, GetSessionDataManager } from '@octane/renderer';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessageComposer = vi.fn();
const tryVisitRoom = vi.fn();
const setIsVisible = vi.fn();
const setActiveTab = vi.fn();
const sendExpressionMessage = vi.fn();
const ignoreUser = vi.fn();
const unignoreUser = vi.fn();
const sendSpecialCommandMessage = vi.fn();

vi.mock('../../../api', () => ({
    ChatMessageTypeEnum: { CHAT_DEFAULT: 0, CHAT_SHOUT: 1, CHAT_WHISPER: 2 },
    GetClubMemberLevel: () => 0,
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key,
    SendMessageComposer: (composer: unknown) => sendMessageComposer(composer),
    TryVisitRoom: (roomId: number) => tryVisitRoom(roomId)
}));

vi.mock('../../notification', () => ({
    useNotification: () => ({ showOctaneAlert: vi.fn(), showConfirm: vi.fn() })
}));

vi.mock('../../translation', () => ({
    useTranslation: () => ({ settings: { enabled: false }, translateOutgoing: vi.fn(), enqueueOutgoingTranslation: vi.fn() })
}));

vi.mock('../useRoom', () => ({
    useRoom: () => ({
        roomSession: {
            roomId: 7,
            sendExpressionMessage,
            sendChatMessage: vi.fn(),
            userDataManager: {
                getUserDataByName: (name: string) => (name === 'Alice' ? { name: 'Alice', webID: 12 } : null),
                getUserDataByIndex: () => null
            }
        }
    })
}));

vi.mock('../../../components/wired-tools/wiredCreatorToolsUiStore', () => ({
    useWiredCreatorToolsUiStore: { getState: () => ({ setIsVisible, setActiveTab }) }
}));

import { useChatInputActions } from './useChatInputActions';

const sendCommand = (text: string) => {
    const { result } = renderHook(() => useChatInputActions());

    result.current.sendChat(text, 0);
};

describe('useChatInputActions official chat commands', () => {
    beforeEach(() => {
        vi.mocked(GetSessionDataManager).mockReturnValue({ ignoreUser, unignoreUser, sendSpecialCommandMessage, isModerator: false } as never);
        vi.mocked(CreateLinkEvent).mockClear();
        sendMessageComposer.mockClear();
        tryVisitRoom.mockClear();
        setIsVisible.mockClear();
        setActiveTab.mockClear();
        sendExpressionMessage.mockClear();
        ignoreUser.mockClear();
        unignoreUser.mockClear();
        sendSpecialCommandMessage.mockClear();
    });

    afterEach(cleanup);

    it('follows a user by name with :visit', () => {
        sendCommand(':visit Alice');

        expect(sendMessageComposer).toHaveBeenCalledTimes(1);
        expect(sendMessageComposer.mock.calls[0][0].getMessageArray()).toEqual(['Alice']);
    });

    it('enters a room by id with :roomid and ignores a non-numeric id', () => {
        sendCommand(':roomid 123');
        sendCommand(':roomid abc');

        expect(tryVisitRoom).toHaveBeenCalledTimes(1);
        expect(tryVisitRoom).toHaveBeenCalledWith(123);
    });

    it('opens the camera with :cam', () => {
        sendCommand(':cam');

        expect(CreateLinkEvent).toHaveBeenCalledWith('camera/show');
    });

    it('only ignores users who are in the room', () => {
        sendCommand(':ignore Alice');
        sendCommand(':ignore Nobody');
        sendCommand(':unignore Alice');

        expect(ignoreUser).toHaveBeenCalledTimes(1);
        expect(ignoreUser).toHaveBeenCalledWith('Alice');
        expect(unignoreUser).toHaveBeenCalledWith('Alice');
    });

    it('forwards the special server commands untouched', () => {
        sendCommand(':mutepets');
        sendCommand(':MoonWalk');
        sendCommand(':habnam');

        expect(sendSpecialCommandMessage.mock.calls.map(([command]) => command)).toEqual([':mutepets', ':moonwalk', ':habnam']);
    });

    it('opens the wired creator tools on the requested tab', () => {
        sendCommand(':wf');
        sendCommand(':var');
        sendCommand(':inspect');

        expect(setIsVisible).toHaveBeenCalledTimes(3);
        expect(setActiveTab.mock.calls.map(([tab]) => tab)).toEqual(['variables', 'inspection']);
    });

    it('toggles the mouse cursor with :hidemouse', () => {
        sendCommand(':hidemouse');

        expect(document.body.style.cursor).toBe('none');

        sendCommand(':hidemouse');

        expect(document.body.style.cursor).toBe('');
    });

    it('waves for :link like the official handler', () => {
        sendCommand(':link');

        expect(sendExpressionMessage).toHaveBeenCalledTimes(1);
    });
});
