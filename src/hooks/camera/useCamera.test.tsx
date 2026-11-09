import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    manager: { isLoaded: false, effects: new Map(), init: vi.fn() },
    send: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    GetRoomCameraWidgetManager: () => mocks.manager,
    InitCameraMessageEvent: class {},
    RequestCameraConfigurationComposer: class {},
    RoomCameraWidgetManagerEvent: { INITIALIZED: 'initialized' }
}));
vi.mock('@/state/useSharedHook', () => ({ registerSharedHook: vi.fn(), useSharedHook: (hook: () => unknown) => hook() }));
vi.mock('../../api', () => ({ SendMessageComposer: mocks.send }));
vi.mock('../events', () => ({ useMessageEvent: vi.fn(), useOctaneEvent: vi.fn() }));

import { useCamera } from './useCamera';

const Probe = () => {
    useCamera();

    return null;
};

beforeEach(() => {
    vi.useFakeTimers();
    mocks.manager.isLoaded = false;
    mocks.manager.init.mockReset();
    mocks.send.mockReset();
    // An idle callback that fires on the next timer turn, so fake timers drive it.
    window.requestIdleCallback = ((callback: IdleRequestCallback) => window.setTimeout(callback, 0)) as typeof window.requestIdleCallback;
    window.cancelIdleCallback = ((handle: number) => window.clearTimeout(handle)) as typeof window.cancelIdleCallback;
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useCamera effect loading', () => {
    it('asks for the camera configuration at once but loads the effects only after boot', () => {
        render(<Probe />);

        expect(mocks.send).toHaveBeenCalledOnce();
        expect(mocks.manager.init).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(10000);
        });
        expect(mocks.manager.init).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });

        expect(mocks.manager.init).toHaveBeenCalledOnce();
    });

    it('drops the pending load when unmounted', () => {
        const view = render(<Probe />);

        view.unmount();
        act(() => {
            vi.advanceTimersByTime(20000);
        });

        expect(mocks.manager.init).not.toHaveBeenCalled();
    });

    it('still asks for the configuration when the effects are already loaded', () => {
        mocks.manager.isLoaded = true;
        render(<Probe />);

        act(() => {
            vi.advanceTimersByTime(20000);
        });

        expect(mocks.send).toHaveBeenCalledOnce();
        expect(mocks.manager.init).not.toHaveBeenCalled();
    });
});
