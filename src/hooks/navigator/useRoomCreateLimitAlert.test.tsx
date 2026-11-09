import { CanCreateRoomEvent } from '@octane/renderer';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockEventDispatcher } from '../../octane-renderer.mock';

const simpleAlert = vi.fn();

vi.mock('../notification', () => ({ useNotification: () => ({ simpleAlert }) }));

import { buildRoomLimitAlert, HC_CENTER_LINK, useRoomCreateLimitAlert } from './useRoomCreateLimitAlert';

const canCreateRoom = (resultCode: number, roomLimit: number) => {
    const event = new (CanCreateRoomEvent as any)() as any;
    event.getParser = () => ({ resultCode, roomLimit });
    return event;
};

describe('useRoomCreateLimitAlert', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('offers Habbo Club to a non-VIP and nothing extra to a VIP', () => {
        const promo = buildRoomLimitAlert(25, false);

        expect(promo.message).toContain('25');
        expect(promo.clickUrl).toBe(HC_CENTER_LINK);
        expect(promo.clickUrlText).toBeTruthy();

        const vip = buildRoomLimitAlert(50, true);

        expect(vip.clickUrl).toBeNull();
        expect(vip.clickUrlText).toBeNull();
    });

    it('alerts and releases the creator lockout when the limit is reached', () => {
        const onLimit = vi.fn();

        renderHook(() => useRoomCreateLimitAlert(false, onLimit));

        act(() => {
            mockEventDispatcher.dispatchEvent(canCreateRoom(1, 25));
        });

        expect(onLimit).toHaveBeenCalledTimes(1);
        expect(simpleAlert).toHaveBeenCalledTimes(1);
        expect(simpleAlert.mock.calls[0][2]).toBe(HC_CENTER_LINK);
    });

    it('ignores an allowed answer', () => {
        const onLimit = vi.fn();

        renderHook(() => useRoomCreateLimitAlert(true, onLimit));

        act(() => {
            mockEventDispatcher.dispatchEvent(canCreateRoom(0, 25));
        });

        expect(onLimit).not.toHaveBeenCalled();
        expect(simpleAlert).not.toHaveBeenCalled();
    });
});
