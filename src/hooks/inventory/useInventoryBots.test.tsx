/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>() }));

vi.mock('@octane/renderer', () => ({
    BotAddedToInventoryEvent: class {},
    BotInventoryMessageEvent: class {},
    BotRemovedFromInventoryEvent: class {},
    CreateLinkEvent: vi.fn(),
    GetBotInventoryComposer: class {}
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', () => ({
    cancelRoomObjectPlacement: vi.fn(),
    getPlacingItemId: () => -1,
    SendMessageComposer: vi.fn(),
    UnseenItemCategory: { BOT: 5 }
}));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../useSharedVisibility', () => ({ useSharedVisibility: () => ({ isVisible: false, activate: vi.fn(), deactivate: vi.fn() }) }));
vi.mock('./useInventoryUnseenTracker', () => ({ useInventoryUnseenTracker: () => ({ isUnseen: () => false, resetCategory: () => false }) }));

import { BotAddedToInventoryEvent, BotRemovedFromInventoryEvent } from '@octane/renderer';
import { useInventoryBots } from './useInventoryBots';

const bot = (id: number, name = `bot${id}`) => ({ id, name, figure: '', gender: 'M', motto: '' });

describe('useInventoryBots', () => {
    it('clears the selection when the last bot leaves the inventory', () => {
        const { result } = renderHook(() => useInventoryBots());

        act(() => handlers.get(BotAddedToInventoryEvent)({ getParser: () => ({ item: bot(1) }) }));

        expect(result.current.selectedBot?.botData.id).toBe(1);

        act(() => handlers.get(BotRemovedFromInventoryEvent)({ getParser: () => ({ itemId: 1 }) }));

        expect(result.current.botItems).toEqual([]);
        expect(result.current.selectedBot).toBeNull();
    });
});
