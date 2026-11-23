/* @vitest-environment jsdom */

import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerPluginSlot, resetPluginSlots } from '../../api/plugin-slots';
import { PluginSlotView } from './PluginSlotView';

describe('PluginSlotView', () => {
    afterEach(() => resetPluginSlots());

    it('draws nothing while no plugin uses the slot', () => {
        const { container } = render(<PluginSlotView slot="test.empty" />);

        expect(container.firstChild).toBeNull();
    });

    it('gives each plugin a host of its own and empties it when the window closes', () => {
        const cleanup = vi.fn();
        registerPluginSlot('test.slot', (host) => {
            host.textContent = 'on duty';
            return cleanup;
        });

        const { container, unmount } = render(<PluginSlotView slot="test.slot" />);
        const host = container.querySelector('.plugin-slot__host');

        expect(host.textContent).toBe('on duty');

        unmount();

        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(host.textContent).toBe('');
    });

    it('follows a plugin that arrives or leaves while the window is open', () => {
        const { container } = render(<PluginSlotView slot="test.live" />);
        let remove: () => void;

        act(() => {
            remove = registerPluginSlot('test.live', (host) => {
                host.textContent = 'late';
            });
        });

        expect(container.textContent).toBe('late');

        act(() => remove());

        expect(container.firstChild).toBeNull();
    });

    it('keeps the window alive when a plugin throws while drawing', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        registerPluginSlot('test.broken', () => {
            throw new Error('broken');
        });
        registerPluginSlot('test.broken', (host) => {
            host.textContent = 'still here';
        });

        const { container } = render(<PluginSlotView slot="test.broken" />);

        expect(container.textContent).toBe('still here');
        expect(error).toHaveBeenCalled();
        error.mockRestore();
    });

    it('reports 0 once the last plugin leaves', () => {
        const heights: number[] = [];
        const remove = registerPluginSlot('test.height', () => undefined);

        render(<PluginSlotView slot="test.height" onHeight={(height) => heights.push(height)} />);
        act(() => remove());

        expect(heights.at(-1)).toBe(0);
    });
});
