/* @vitest-environment jsdom */

import { CreateLinkEvent, GetEventDispatcher, GetSessionDataManager, GetTicker, TextureUtils } from '@octane/renderer';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessageComposer = vi.fn();
const tryVisitRoom = vi.fn();
const openUrl = vi.fn();
const setIsVisible = vi.fn();
const setActiveTab = vi.fn();
const sendExpressionMessage = vi.fn();
const sendChatMessage = vi.fn();
const sendKickMessage = vi.fn();
const sendMuteMessage = vi.fn();
const sendAmbassadorAlertMessage = vi.fn();
const sendRoomUsersClassificationMessage = vi.fn();
const sendPeerUsersClassificationMessage = vi.fn();
const ignoreUser = vi.fn();
const unignoreUser = vi.fn();
const sendSpecialCommandMessage = vi.fn();
const setWiredTrigger = vi.fn();
const switchWiredPlayTestMode = vi.fn((_wiredWhisperDisabled: boolean) => ({ isPlayTestMode: true, notification: 'play-test on' }));
const applyTextTranslationLocale = vi.fn((_code: string) => Promise.resolve());
const isPerkAllowedNow = vi.fn((_perk: string) => true);
const setFpsCounterEnabled = vi.fn();
const showSingleBubble = vi.fn();
const showConfirm = vi.fn();

const configuration: Record<string, unknown> = {};

const roomSession = {
    roomId: 7,
    ownRoomIndex: 3,
    controllerLevel: 0,
    isRoomOwner: false,
    sendExpressionMessage,
    sendChatMessage,
    sendKickMessage,
    sendMuteMessage,
    sendAmbassadorAlertMessage,
    sendRoomUsersClassificationMessage,
    sendPeerUsersClassificationMessage,
    userDataManager: {
        getUserDataByName: (name: string) => (name === 'Alice' ? { name: 'Alice', webID: 12 } : null),
        getUserDataByIndex: () => null
    }
};

vi.mock('../../../api', () => ({
    ChatMessageTypeEnum: { CHAT_DEFAULT: 0, CHAT_SHOUT: 1, CHAT_WHISPER: 2 },
    GetClubMemberLevel: () => 0,
    GetConfigurationValue: (key: string, fallback: unknown) => (key in configuration ? configuration[key] : fallback),
    LocalizeText: (key: string) => key,
    NotificationBubbleType: { INFO: 'info' },
    OpenUrl: (url: string) => openUrl(url),
    SendMessageComposer: (composer: unknown) => sendMessageComposer(composer),
    TryVisitRoom: (roomId: number) => tryVisitRoom(roomId)
}));

vi.mock('../../notification', () => ({
    useNotification: () => ({ showOctaneAlert: vi.fn(), showConfirm, showSingleBubble })
}));

vi.mock('../../translation', () => ({
    useTranslation: () => ({ settings: { enabled: false }, translateOutgoing: vi.fn(), enqueueOutgoingTranslation: vi.fn() }),
    applyTextTranslationLocale: (code: string) => applyTextTranslationLocale(code)
}));

vi.mock('../../navigator', () => ({
    useNavigatorData: () => ({ navigatorData: { enteredGuestRoom: { roomName: 'My Room' } } })
}));

vi.mock('../../wired', () => ({
    useWired: () => ({ setTrigger: setWiredTrigger }),
    switchWiredPlayTestMode: (disabled: boolean) => switchWiredPlayTestMode(disabled)
}));

vi.mock('../../chat', () => ({
    useWiredWhisperDisabled: () => [false, vi.fn()]
}));

vi.mock('../../session/usePerkAllowances', () => ({
    isPerkAllowedNow: (perk: string) => isPerkAllowedNow(perk)
}));

vi.mock('./useFpsCounter', () => ({
    setFpsCounterEnabled: (enabled: boolean) => setFpsCounterEnabled(enabled)
}));

vi.mock('../useRoom', () => ({
    useRoom: () => ({ roomSession })
}));

vi.mock('../../../components/wired-tools/wiredCreatorToolsUiStore', () => ({
    useWiredCreatorToolsUiStore: { getState: () => ({ setIsVisible, setActiveTab }) }
}));

import { useChatInputActions } from './useChatInputActions';

const sendCommand = (text: string) => {
    const { result } = renderHook(() => useChatInputActions());

    result.current.sendChat(text, 0);
};

const setSession = (overrides: Partial<{ isModerator: boolean; securityLevel: number; isAmbassador: boolean }> = {}) => {
    vi.mocked(GetSessionDataManager).mockReturnValue({
        ignoreUser,
        unignoreUser,
        sendSpecialCommandMessage,
        isModerator: false,
        securityLevel: 0,
        isAmbassador: false,
        ...overrides
    } as never);
};

describe('useChatInputActions official chat commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setSession();
        roomSession.controllerLevel = 0;
        roomSession.isRoomOwner = false;
        for (const key of Object.keys(configuration)) delete configuration[key];
        isPerkAllowedNow.mockReturnValue(true);
        switchWiredPlayTestMode.mockReturnValue({ isPlayTestMode: true, notification: 'play-test on' });
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

    it('opens the camera with :cam only when the CAMERA perk is allowed', () => {
        sendCommand(':cam');

        expect(CreateLinkEvent).toHaveBeenCalledWith('camera/show');
        expect(isPerkAllowedNow).toHaveBeenCalledWith('CAMERA');

        vi.mocked(CreateLinkEvent).mockClear();
        isPerkAllowedNow.mockReturnValue(false);
        sendCommand(':cam');

        expect(CreateLinkEvent).not.toHaveBeenCalled();
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

    it('waves for :link, :rewardtrack and :q like the official handler', () => {
        sendCommand(':link');
        sendCommand(':rewardtrack');
        sendCommand(':q');

        expect(sendExpressionMessage).toHaveBeenCalledTimes(3);
    });

    it('lets room controllers kick and mute by name, visitors do nothing, staff reach the server', () => {
        sendCommand(':kick Alice');
        sendCommand(':mute Alice');

        expect(sendKickMessage).not.toHaveBeenCalled();
        expect(sendMuteMessage).not.toHaveBeenCalled();
        expect(sendChatMessage).not.toHaveBeenCalled();

        roomSession.controllerLevel = 1;
        sendCommand(':kick Alice');
        sendCommand(':shutup Alice');
        sendCommand(':mute Nobody');

        expect(sendKickMessage).toHaveBeenCalledWith(12);
        expect(sendMuteMessage).toHaveBeenCalledTimes(1);
        expect(sendMuteMessage).toHaveBeenCalledWith(12, 2);

        setSession({ securityLevel: 4 });
        sendCommand(':kick Alice');

        expect(sendKickMessage).toHaveBeenCalledTimes(1);
        expect(sendChatMessage).toHaveBeenCalledWith(':kick Alice', 0);
    });

    it('drops the hand item with :drop and :dropitem', () => {
        sendCommand(':drop');
        sendCommand(':dropitem');

        expect(sendMessageComposer).toHaveBeenCalledTimes(2);
        expect(sendMessageComposer.mock.calls[0][0].constructor.name).toBe('RoomUnitDropHandItemComposer');
    });

    it('reserves the ambassador commands to ambassadors and staff', () => {
        sendCommand(':aalert Alice');
        sendCommand(':anew');
        sendCommand(':avisit');

        expect(sendAmbassadorAlertMessage).not.toHaveBeenCalled();
        expect(sendRoomUsersClassificationMessage).not.toHaveBeenCalled();
        expect(CreateLinkEvent).not.toHaveBeenCalled();

        setSession({ isAmbassador: true });
        sendCommand(':aalert Alice');
        sendCommand(':anew');
        sendCommand(':avisit');
        sendCommand(':avisit group');

        expect(sendAmbassadorAlertMessage).toHaveBeenCalledWith(12);
        expect(sendRoomUsersClassificationMessage).toHaveBeenCalledWith('new');
        expect(vi.mocked(CreateLinkEvent).mock.calls.map(([link]) => link)).toEqual([
            'navigator/goto/predefined_noob_lobby',
            'navigator/goto/predefined_group_lobby'
        ]);
    });

    it('classifies users with :uc for staff only', () => {
        sendCommand(':uc spam');

        expect(sendRoomUsersClassificationMessage).not.toHaveBeenCalled();

        setSession({ securityLevel: 4 });
        sendCommand(':uc spam');
        sendCommand(':uc hotel bots');

        expect(sendRoomUsersClassificationMessage).toHaveBeenCalledWith('spam');
        expect(sendPeerUsersClassificationMessage).toHaveBeenCalledWith('bots');
    });

    it('gates :furni on rights and keeps :chooser open without the room flag', () => {
        sendCommand(':furni');
        sendCommand(':chooser');

        expect(vi.mocked(CreateLinkEvent).mock.calls.map(([link]) => link)).toEqual(['user-chooser/']);

        roomSession.controllerLevel = 1;
        sendCommand(':furni');

        expect(CreateLinkEvent).toHaveBeenCalledWith('furni-chooser/');
    });

    it('sends the whole typed :ejectall line after the confirm', () => {
        roomSession.controllerLevel = 1;
        sendCommand(':ejectall bc');

        expect(showConfirm).toHaveBeenCalledTimes(1);

        (showConfirm.mock.calls[0][1] as () => void)();

        expect(sendSpecialCommandMessage).toHaveBeenCalledWith(':ejectall bc');
    });

    it('clamps :fps, enables the FPS counter with :showstats and posts a ping bubble', () => {
        const ticker = { maxFPS: 0 };
        vi.mocked(GetTicker).mockReturnValue(ticker as never);

        sendCommand(':fps 1');
        expect(ticker.maxFPS).toBe(5);
        sendCommand(':fps 60');
        expect(ticker.maxFPS).toBe(60);

        sendCommand(':showstats');
        expect(setFpsCounterEnabled).toHaveBeenCalledWith(true);

        const dispatchEvent = vi.spyOn(GetEventDispatcher(), 'dispatchEvent');
        sendCommand(':ping');

        const event = dispatchEvent.mock.calls.at(-1)[0] as unknown as { chatType: number; objectId: number; extraParam: number };

        expect(event.chatType).toBe(11);
        expect(event.objectId).toBe(3);
        expect(event.extraParam).toBe(-1);
        dispatchEvent.mockRestore();
    });

    it('switches the localisation with :lang and the wired tools with :wiredreset / :playtest', () => {
        sendCommand(':lang it');
        sendCommand(':lang');

        expect(applyTextTranslationLocale).toHaveBeenCalledTimes(1);
        expect(applyTextTranslationLocale).toHaveBeenCalledWith('it');

        sendCommand(':wiredreset');
        expect(setWiredTrigger).toHaveBeenCalledWith(null);

        sendCommand(':playtest');
        expect(switchWiredPlayTestMode).toHaveBeenCalledWith(false);
        expect(showSingleBubble).toHaveBeenCalledWith('play-test on', 'info');
    });

    it('opens the news and minimail web tools only when the hotel enables them', () => {
        sendCommand(':news');
        sendCommand(':mail');

        expect(openUrl).not.toHaveBeenCalled();
        expect(sendChatMessage).toHaveBeenCalledTimes(2);

        configuration['client.news.embed.enabled'] = true;
        configuration['client.news.url'] = 'https://hotel.test/news';
        configuration['client.minimail.embed.enabled'] = true;
        configuration['client.minimail.url'] = 'https://hotel.test/mail';
        sendCommand(':news');
        sendCommand(':mail');

        expect(openUrl.mock.calls.map(([url]) => url)).toEqual(['https://hotel.test/news', 'https://hotel.test/mail']);
    });

    it('names the screenshot after the entered room', async () => {
        const appendChild = vi.spyOn(document.body, 'appendChild');

        (TextureUtils as unknown as { generateImageUrl: () => Promise<string> }).generateImageUrl = async () => 'data:image/png;base64,AA==';

        sendCommand(':screenshot');
        await new Promise((resolve) => setTimeout(resolve, 0));

        const anchor = appendChild.mock.calls.map(([node]) => node).find((node) => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;

        expect(anchor?.download).toBe('My Room.png');
        appendChild.mockRestore();
    });
});
