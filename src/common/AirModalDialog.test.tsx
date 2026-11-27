/* @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../api/handheld/handheldLayout';
import { useHandheldStore } from '../state/handheldStore';
import { AirModalDialog } from './AirModalDialog';

vi.mock('./card', () => ({
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div>{headerText}</div>,
    OctaneCardContentView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const modalWindow = () => document.querySelector('.octane-air-modal__window') as HTMLElement;

describe('AirModalDialog in the phone layout', () => {
    beforeEach(() => {
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(580);
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        vi.restoreAllMocks();
    });

    it('keeps a fixed frame at its own width and draws it smaller on a phone', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(
            <AirModalDialog caption="Talents" handheldScale={0.6} width={800} onClose={vi.fn()}>
                stage
            </AirModalDialog>
        );

        expect(modalWindow().style.width).toBe('800px');
        expect(modalWindow().hasAttribute('data-handheld-scaled')).toBe(true);
        expect(modalWindow().style.getPropertyValue('--octane-handheld-scale')).toBe('0.6');
        // 800 x 580 at 0.6 is 480 wide: still wider than the 390 px phone, so the dialog pans.
        expect(document.querySelector('.octane-air-modal')?.hasAttribute('data-handheld-pan')).toBe(true);
    });

    it('is the desktop dialog outside the phone layout, and for dialogs without a scale', () => {
        render(
            <AirModalDialog caption="Talents" handheldScale={0.6} width={800} onClose={vi.fn()}>
                stage
            </AirModalDialog>
        );

        expect(modalWindow().style.width).toBe('min(800px, -16px + 100vw)');
        expect(modalWindow().hasAttribute('data-handheld-scaled')).toBe(false);

        cleanup();
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(
            <AirModalDialog caption="Habbo Way" width={420} onClose={vi.fn()}>
                text
            </AirModalDialog>
        );

        expect(modalWindow().style.width).toBe('min(420px, -16px + 100vw)');
        expect(modalWindow().hasAttribute('data-handheld-scaled')).toBe(false);
    });
});
