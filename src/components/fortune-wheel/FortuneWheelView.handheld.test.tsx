/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const wheel = vi.hoisted(() => ({
    pendingPrizeId: -1,
    canManage: false,
    freeSpins: 1,
    extraSpins: 0,
    trackers: [] as { linkReceived: (url: string) => void }[],
    open: () => {},
    spin: () => {},
    buySpin: () => {},
    finishSpin: () => {},
    loadAdminPrizes: () => {},
    saveAdminPrizes: (_rows: unknown[]) => {}
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    AddLinkEventTracker: vi.fn((tracker) => wheel.trackers.push(tracker)),
    GetConfiguration: () => ({ getValue: (_key: string, value: unknown) => value }),
    RemoveLinkEventTracker: vi.fn()
}));

const prizes = [
    { id: 4, type: 'credits', spriteId: 0, badgeCode: '', amount: 100, pointsType: 0, label: '' },
    { id: 5, type: 'nothing', spriteId: 0, badgeCode: '', amount: 0, pointsType: 0, label: '' },
    { id: 6, type: 'spin', spriteId: 0, badgeCode: '', amount: 2, pointsType: 0, label: '' }
];
const adminPrizes = [{ id: 9, type: 'credits', value: '', amount: 100, pointsType: 0, weight: 3, label: 'Hundred' }];

vi.mock('../../hooks', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useHasPermission: () => wheel.canManage,
    useFortuneWheel: () => ({
        freeSpins: wheel.freeSpins,
        extraSpins: wheel.extraSpins,
        spinCost: 25,
        spinCostType: -1,
        prizes,
        recentWins: [{ username: 'Lotte', look: 'hd-180-1', prizeLabel: 'x' }],
        pendingPrizeId: wheel.pendingPrizeId,
        isSpinning: wheel.pendingPrizeId >= 0,
        isRequestPending: false,
        open: wheel.open,
        spin: wheel.spin,
        buySpin: wheel.buySpin,
        finishSpin: wheel.finishSpin,
        adminPrizes,
        loadAdminPrizes: wheel.loadAdminPrizes,
        saveAdminPrizes: wheel.saveAdminPrizes
    })
}));

import { FortuneWheelView } from './FortuneWheelView';

const show = () => act(() => wheel.trackers.forEach((tracker) => tracker.linkReceived('fortune-wheel/show')));

/** Ends the running phase of the wheel's own transform transition, as the browser does. */
const endTransition = () => {
    const disc = document.querySelector('.wheel-disc') as HTMLElement;
    const event = new Event('transitionend', { bubbles: true });

    Object.defineProperty(event, 'propertyName', { value: 'transform' });
    act(() => {
        disc.dispatchEvent(event);
    });
};

describe('FortuneWheelView on a phone', () => {
    beforeEach(() => {
        wheel.trackers = [];
        wheel.pendingPrizeId = -1;
        wheel.canManage = false;
        wheel.freeSpins = 1;
        wheel.extraSpins = 0;
        wheel.spin = vi.fn();
        wheel.buySpin = vi.fn();
        wheel.finishSpin = vi.fn();
        wheel.loadAdminPrizes = vi.fn();
        wheel.saveAdminPrizes = vi.fn();
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('draws the phone sheet with the wheel, the prizes and the winners, and spins and buys through the same actions', () => {
        render(<FortuneWheelView />);
        show();

        expect(document.querySelector('.octane-handheld-wheel')).not.toBeNull();
        expect(document.querySelector('.wheel-card')).toBeNull();
        expect(document.querySelectorAll('.octane-handheld-wheel__stage .wheel-slice-plate')).toHaveLength(3);
        expect(screen.getByTestId('wheel-prizes').children).toHaveLength(3);
        expect(screen.getByTestId('wheel-winners').textContent).toContain('Lotte');
        expect(screen.getByTestId('wheel-free-spins').textContent).toContain('1');

        fireEvent.click(screen.getByTestId('wheel-spin'));
        fireEvent.click(screen.getByTestId('wheel-buy'));

        expect(wheel.spin).toHaveBeenCalledTimes(1);
        expect(wheel.buySpin).toHaveBeenCalledTimes(1);
        // No staff right: no settings.
        expect(screen.queryByTestId('wheel-settings-open')).toBeNull();
    });

    it('keeps Spin off without spins, as on the desktop', () => {
        wheel.freeSpins = 0;

        render(<FortuneWheelView />);
        show();

        expect(screen.getByTestId('wheel-spin')).toBeDisabled();
    });

    it('lands the spin on the won slice and shows the win as a card with OK', () => {
        const { rerender } = render(<FortuneWheelView />);
        show();

        wheel.pendingPrizeId = 6;
        rerender(<FortuneWheelView />);
        expect(screen.getByTestId('wheel-spin').textContent).toContain('Spinning');

        endTransition(); // wind-back done
        endTransition(); // spin done
        endTransition(); // settle done

        expect(wheel.finishSpin).toHaveBeenCalledTimes(1);
        // The third slice is centred on 300deg: the wheel stops at a whole number of turns plus 60deg, under the pointer.
        const rotation = Number(/rotate\((-?[\d.]+)deg\)/.exec((document.querySelector('.wheel-disc') as HTMLElement).style.transform)?.[1]);
        expect(((rotation % 360) + 360) % 360).toBe(60);

        wheel.pendingPrizeId = -1;
        rerender(<FortuneWheelView />);
        expect(document.querySelector('.wheel-win-reveal.is-handheld')).not.toBeNull();

        fireEvent.click(screen.getByTestId('wheel-win-ok'));
        expect(document.querySelector('.wheel-win-reveal')).toBeNull();
    });

    it('opens the staff settings as a page with Back, keeps the wheel mounted under it, and saves through the same packet', () => {
        wheel.canManage = true;

        render(<FortuneWheelView />);
        show();

        fireEvent.click(screen.getByTestId('wheel-settings-open'));

        expect(wheel.loadAdminPrizes).toHaveBeenCalled();
        expect(screen.getByTestId('wheel-settings')).toBeInTheDocument();
        expect(screen.getByTestId('wheel-page').dataset.covered).toBe('true');
        expect(document.querySelector('.wheel-disc')).not.toBeNull();

        fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), { target: { value: 'Big win' } });
        fireEvent.click(screen.getByTestId('wheel-settings-add'));
        expect(screen.getByTestId('wheel-settings-row--1')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('wheel-settings-save'));
        expect(wheel.saveAdminPrizes).toHaveBeenCalledWith([
            { id: 9, type: 'credits', value: '', amount: 100, pointsType: 0, weight: 3, label: 'Big win' },
            { id: 0, type: 'item', value: '0', amount: 1, pointsType: 0, weight: 1, label: '' }
        ]);

        fireEvent.click(screen.getByTestId('wheel-settings-back'));
        expect(screen.queryByTestId('wheel-settings')).toBeNull();
        expect(screen.getByTestId('wheel-page').dataset.covered).toBe('false');
    });

    it('keeps the desktop window when the phone layout is off', () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));

        render(<FortuneWheelView />);
        show();

        expect(document.querySelector('.wheel-card')).not.toBeNull();
        expect(document.querySelector('.octane-handheld-wheel')).toBeNull();
        expect(document.querySelector('.wheel-stage-host .wheel-stage')).not.toBeNull();
    });
});
