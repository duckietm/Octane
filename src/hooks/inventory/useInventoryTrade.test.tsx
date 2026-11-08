/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers, roomUsers } = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: any) => void>(),
    roomUsers: new Map<number, { webID: number; name: string }>()
}));

vi.mock('@octane/renderer', () => {
    const names = [
        'TradingAcceptComposer',
        'TradingAcceptEvent',
        'TradingCancelComposer',
        'TradingCloseComposer',
        'TradingCloseEvent',
        'TradingCloseParser',
        'TradingCompletedEvent',
        'TradingConfirmationComposer',
        'TradingConfirmationEvent',
        'TradingListItemEvent',
        'TradingListItemRemoveComposer',
        'TradingNotOpenEvent',
        'TradingOpenEvent',
        'TradingOpenFailedEvent',
        'TradingOtherNotAllowedEvent',
        'TradingUnacceptComposer',
        'TradingYouAreNotAllowedEvent'
    ];

    return {
        ...Object.fromEntries(names.map((name) => [name, class {}])),
        AdvancedMap: class {
            getValues() {
                return [];
            }
        },
        GetSessionDataManager: () => ({ userId: 1 })
    };
});
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', async () => {
    const { TradeState } = await import('../../api/inventory/TradeState');
    const { CloneObject } = await import('../../api/utils/CloneObject');

    class TradeUserData {
        userId = -1;
        userName = '';
        userItems: unknown = null;
        itemCount = 0;
        creditsCount = 0;
        accepts = false;
        canTrade = false;
    }

    return {
        CloneObject,
        GetRoomSession: () => ({ userDataManager: { getUserData: (id: number) => roomUsers.get(id) ?? null } }),
        LocalizeText: (key: string) => key,
        parseTradeItems: () => ({ getValues: () => [] }),
        SendMessageComposer: vi.fn(),
        TradeState,
        TradeUserData,
        TradingNotificationType: {}
    };
});
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert: vi.fn(), showTradeAlert: vi.fn() }) }));
vi.mock('./useInventoryFurni', () => ({ useInventoryFurni: () => ({ groupItems: [], setGroupItems: vi.fn(), activate: vi.fn(), deactivate: vi.fn() }) }));

import { TradingListItemEvent, TradingOpenEvent } from '@octane/renderer';
import { useInventoryTrade } from './useInventoryTrade';

const listItems = { getParser: () => ({ firstUserID: 1, firstUserItemArray: [], firstUserNumCredits: 0, firstUserNumItems: 0, secondUserItemArray: [], secondUserNumCredits: 0, secondUserNumItems: 0 }) };

describe('useInventoryTrade', () => {
    it('ignores an item list that arrives with no trade open', () => {
        const { result } = renderHook(() => useInventoryTrade());

        expect(() => act(() => handlers.get(TradingListItemEvent)(listItems))).not.toThrow();
        expect(result.current.ownUser).toBeNull();
        expect(result.current.otherUser).toBeNull();
    });

    it('opens the trade when the room does not list the other user', () => {
        roomUsers.clear();
        roomUsers.set(1, { webID: 1, name: 'me' });

        const { result } = renderHook(() => useInventoryTrade());

        act(() => handlers.get(TradingOpenEvent)({ getParser: () => ({ userID: 2, otherUserID: 1, userCanTrade: true, otherUserCanTrade: true }) }));

        expect(result.current.ownUser).toMatchObject({ userId: 1, userName: 'me' });
        expect(result.current.otherUser).toMatchObject({ userId: 2, userName: '' });
        expect(result.current.isTrading).toBe(true);
    });
});
