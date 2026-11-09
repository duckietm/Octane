/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
    const deferred = () => {
        let resolve: (value: string) => void = () => undefined;
        const promise = new Promise<string>((done) => (resolve = done));

        return { promise, resolve };
    };

    return {
        deferred,
        handlers: new Map<string, (event: unknown) => void>(),
        images: new Map<string, ReturnType<typeof deferred>>(),
        users: new Map<number, unknown>(),
        addChatEntry: vi.fn((entry: { id: number; webId: number }) => entry.id),
        updateChatEntry: vi.fn()
    };
});

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    GetRoomEngine: () => ({ getRoomObject: () => ({ id: 1, model: { getValue: () => '' } }) }),
    GetGuestRoomResultEvent: class {},
    RoomChatSettingsEvent: class {},
    RoomDragEvent: class {},
    RoomSessionChatEvent: class {
        static CHAT_EVENT = 'chat';
        static CHAT_TYPE_SPEAK = 0;
        static CHAT_TYPE_WHISPER = 1;
        static CHAT_TYPE_SHOUT = 2;
        static CHAT_TYPE_RESPECT = 3;
    },
    RoomUserData: class {
        constructor(public roomIndex: number) {}
    },
    SystemChatStyleEnum: { BOT: 2 }
}));
vi.mock('../../events', () => ({
    useMessageEvent: () => undefined,
    useOctaneEvent: (type: string, handler: (event: unknown) => void) => h.handlers.set(type, handler)
}));
vi.mock('../../chat-history', () => ({ useChatHistory: () => ({ addChatEntry: h.addChatEntry, updateChatEntry: h.updateChatEntry }) }));
vi.mock('../../session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ userId: 99 }) }));
vi.mock('../../translation', () => ({
    useTranslation: () => ({ settings: { enabled: false }, translateIncoming: vi.fn(), consumeOutgoingTranslation: () => null })
}));
vi.mock('../useRoom', () => ({
    useRoom: () => ({ roomSession: { roomId: 1, userDataManager: { getUserDataByIndex: (index: number) => h.users.get(index) ?? null } } })
}));
vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ChatBubbleUtilities: {
        AVATAR_COLOR_CACHE: new Map(),
        getPetImage: vi.fn(),
        getUserImage: (figure: string) => h.images.get(figure).promise
    },
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetRoomObjectScreenLocation: () => ({ x: 0, y: 0 }),
    loadEmojiShortcodes: () => undefined,
    LocalizeText: (key: string) => key
}));

import { RoomObjectType } from '@octane/renderer';
import { useChatWidget } from './useChatWidget';

const user = (index: number, figure: string) => ({ roomIndex: index, webID: index, name: `user${index}`, figure, type: RoomObjectType.USER });
const say = (objectId: number, message: string) => ({ objectId, message, chatType: 0, style: 0 });

describe('room chat order', () => {
    beforeEach(() => {
        h.handlers.clear();
        h.images.clear();
        h.users.clear();
        h.addChatEntry.mockClear();
    });

    it('shows and records messages in the order they arrived, whoever has the slower head image', async () => {
        h.users.set(1, user(1, 'new-figure'));
        h.users.set(2, user(2, 'cached-figure'));
        h.images.set('new-figure', h.deferred());
        h.images.set('cached-figure', h.deferred());
        const { result } = renderHook(() => useChatWidget());
        const chat = h.handlers.get('chat');

        act(() => {
            chat(say(1, 'ciao'));
            chat(say(2, 'come va'));
        });
        await act(async () => h.images.get('cached-figure').resolve('cached.png'));

        expect(result.current.chatMessages.map((message) => message.text)).toEqual(['ciao', 'come va']);
        expect(h.addChatEntry.mock.calls.map(([entry]) => entry.webId)).toEqual([1, 2]);

        await act(async () => h.images.get('new-figure').resolve('new.png'));

        expect(result.current.chatMessages.map((message) => message.imageUrl)).toEqual(['new.png', 'cached.png']);
    });

    it('drops a message whose unit has no user data instead of throwing', () => {
        const { result } = renderHook(() => useChatWidget());

        expect(() => act(() => h.handlers.get('chat')(say(5, 'lost')))).not.toThrow();
        expect(result.current.chatMessages).toEqual([]);
    });
});
