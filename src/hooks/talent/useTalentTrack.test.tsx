/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { octaneHandlers } = vi.hoisted(() => ({ octaneHandlers: new Map<unknown, (event?: unknown) => void>() }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    AddLinkEventTracker: vi.fn(),
    GroupInformationEvent: class {},
    PerkAllowancesMessageEvent: class {},
    RemoveLinkEventTracker: vi.fn(),
    TalentLevelUpEvent: class {},
    TalentTrackLevelMessageEvent: class {},
    TalentTrackMessageEvent: class {},
    RoomSessionEvent: { CREATED: 'RSE_CREATED' }
}));
vi.mock('../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => (typeof fallback === 'boolean' ? true : fallback),
    GetOptionalConfigurationValue: () => 1,
    SendMessageComposer: vi.fn(),
    TALENT_TRACKS: []
}));
vi.mock('../events', () => ({
    useMessageEvent: vi.fn(),
    useOctaneEvent: (type: unknown, handler: (event?: unknown) => void) => octaneHandlers.set(type, handler)
}));

import { useTalentTrack } from './useTalentTrack';

describe('useTalentTrack citizenship popup', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('opens after the delay', () => {
        const { result } = renderHook(() => useTalentTrack());

        act(() => octaneHandlers.get('RSE_CREATED')());
        act(() => vi.advanceTimersByTime(10_000));

        expect(result.current.citizenshipPopup).toBe(true);
    });

    it('drops the pending popup on unmount', () => {
        const { unmount } = renderHook(() => useTalentTrack());

        act(() => octaneHandlers.get('RSE_CREATED')());
        expect(vi.getTimerCount()).toBe(1);

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });
});
