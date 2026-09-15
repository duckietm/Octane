/* @vitest-environment jsdom */

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../events', () => ({
    useMessageEvent: vi.fn()
}));

import { isPerkAllowedNow, setPerkAllowancesForTests, usePerkAllowances } from './usePerkAllowances';

describe('usePerkAllowances (SessionDataManager.isPerkAllowed)', () => {
    beforeEach(() => setPerkAllowancesForTests(null));

    afterEach(cleanup);

    it('allows everything until the server has sent the perk list', () => {
        expect(isPerkAllowedNow('CAMERA')).toBe(true);

        const { result } = renderHook(() => usePerkAllowances());

        expect(result.current.hasReceivedPerks).toBe(false);
        expect(result.current.isPerkAllowed('CAMERA')).toBe(true);
    });

    it('follows the received allowances and denies unknown perks', () => {
        setPerkAllowancesForTests({ CAMERA: false, USE_GUIDE_TOOL: true });

        expect(isPerkAllowedNow('CAMERA')).toBe(false);
        expect(isPerkAllowedNow('USE_GUIDE_TOOL')).toBe(true);
        expect(isPerkAllowedNow('MOUSE_ZOOM')).toBe(false);

        const { result } = renderHook(() => usePerkAllowances());

        expect(result.current.hasReceivedPerks).toBe(true);
        expect(result.current.isPerkAllowed('CAMERA')).toBe(false);
    });
});
