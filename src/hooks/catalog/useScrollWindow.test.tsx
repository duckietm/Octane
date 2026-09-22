/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useScrollWindow } from './useScrollWindow';

const withElement = (enabled = true) => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientHeight', { value: 200, configurable: true });
    const hook = renderHook(() => useScrollWindow(useRef(element), enabled));
    return { element, hook };
};

describe('useScrollWindow', () => {
    it('reports the viewport height on mount and follows scroll events on the next frame', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
        const { element, hook } = withElement();
        expect(hook.result.current.viewportHeight).toBe(200);
        element.scrollTop = 150;
        act(() => {
            element.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });
        expect(hook.result.current.scrollTop).toBe(150);
        vi.useRealTimers();
    });

    it('coalesces several scroll events into one update', () => {
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
        const element = document.createElement('div');
        Object.defineProperty(element, 'clientHeight', { value: 200, configurable: true });
        let renderCount = 0;
        const hook = renderHook(() => {
            renderCount++;
            return useScrollWindow(useRef(element), true);
        });
        const countAfterMount = renderCount;
        element.scrollTop = 10;
        act(() => {
            for (let i = 0; i < 5; i++) element.dispatchEvent(new Event('scroll'));
            vi.runAllTimers();
        });
        expect(renderCount).toBe(countAfterMount + 1);
        expect(hook.result.current.scrollTop).toBe(10);
        vi.useRealTimers();
    });

    it('does nothing while disabled', () => {
        const { element, hook } = withElement(false);
        element.scrollTop = 99;
        act(() => element.dispatchEvent(new Event('scroll')));
        expect(hook.result.current.scrollTop).toBe(0);
        expect(hook.result.current.viewportHeight).toBe(0);
    });

    it('removes the listener on unmount', () => {
        const { element, hook } = withElement();
        const spy = vi.spyOn(element, 'removeEventListener');
        hook.unmount();
        expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
    });
});
