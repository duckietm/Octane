/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { handlers } = vi.hoisted(() => ({ handlers: new Map<unknown, (event: any) => void>() }));

vi.mock('@octane/renderer', () => ({
    ActivePrefixUpdatedEvent: class {},
    DeletePrefixComposer: class {},
    PrefixReceivedEvent: class {},
    RequestPrefixesComposer: class {},
    SetActivePrefixComposer: class {},
    UserNickIconsEvent: class {},
    UserPrefixesEvent: class {}
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', () => ({ SendMessageComposer: vi.fn(), UnseenItemCategory: { PREFIX: 7 } }));
vi.mock('../events', () => ({ useMessageEvent: (type: unknown, handler: (event: any) => void) => handlers.set(type, handler) }));
vi.mock('../useSharedVisibility', () => ({ useSharedVisibility: () => ({ isVisible: false, activate: vi.fn(), deactivate: vi.fn() }) }));
vi.mock('./useInventoryUnseenTracker', () => ({ useInventoryUnseenTracker: () => ({ isUnseen: () => false, resetCategory: () => false }) }));

import { PrefixReceivedEvent, UserNickIconsEvent, UserPrefixesEvent } from '@octane/renderer';
import { useInventoryPrefixes } from './useInventoryPrefixes';

const shortPrefix = { id: 4, text: 'VIP', color: '#FFD700', icon: '', effect: 'glow', font: '', active: true };

describe('useInventoryPrefixes', () => {
    it('keeps the catalog fields of a prefix when the short list arrives after the full one', () => {
        const { result } = renderHook(() => useInventoryPrefixes());

        act(() =>
            handlers.get(UserNickIconsEvent)({
                getParser: () => ({
                    ownedPrefixes: [{ ...shortPrefix, displayName: 'Gold VIP', isCustom: false, points: 25, pointsType: 5, catalogPrefixId: 17 }]
                })
            })
        );
        act(() => handlers.get(UserPrefixesEvent)({ getParser: () => ({ prefixes: [shortPrefix] }) }));

        expect(result.current.prefixes).toHaveLength(1);
        expect(result.current.prefixes[0]).toMatchObject({ displayName: 'Gold VIP', catalogPrefixId: 17, effect: 'glow', active: true });
        expect(result.current.activePrefix?.id).toBe(4);
    });

    it('does not list a prefix twice when it is received again', () => {
        const { result } = renderHook(() => useInventoryPrefixes());

        act(() => handlers.get(UserPrefixesEvent)({ getParser: () => ({ prefixes: [shortPrefix] }) }));
        act(() => handlers.get(PrefixReceivedEvent)({ getParser: () => ({ ...shortPrefix }) }));

        expect(result.current.prefixes.map((prefix) => prefix.id)).toEqual([4]);
    });
});
