import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const profiles = vi.hoisted(() => [] as number[]);

vi.mock('../../../../hooks', () => ({
    useInventoryTrade: () => ({ isTrading: true, otherUser: { userId: 9, userName: 'B0b' } }),
    useFriendsState: () => ({ friends: [{ id: 3, name: 'Bob' }] }),
    useRoomUserListSnapshot: () => [
        { type: 1, webID: 9, name: 'B0b', figure: 'hd-180' },
        { type: 1, webID: 4, name: 'B.ob', figure: 'hd-180' }
    ]
}));
vi.mock('@octane/renderer', async (importOriginal) => ({ ...(await importOriginal<any>()), RoomObjectType: { USER: 1 } }));
vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    GetUserProfile: (id: number) => profiles.push(id)
}));
vi.mock('../../../../common/layout/LayoutAvatarImageView', () => ({ LayoutAvatarImageView: () => null }));
vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LayoutAvatarImageView: () => null
}));

import { InventoryTradeNameScamWarningView } from './InventoryTradeNameScamWarningView';

beforeEach(() => {
    vi.useFakeTimers();
    profiles.length = 0;
    const container = document.createElement('div');
    container.id = 'draggable-windows-container';
    document.body.appendChild(container);
    act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.body.innerHTML = '';
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('InventoryTradeNameScamWarningView on a phone', () => {
    it('is a card with the look-alike names that only closes once the countdown ran out', () => {
        render(<InventoryTradeNameScamWarningView />);

        const card = screen.getByTestId('trade-name-scam-card');
        const ok = screen.getByRole('button', { name: 'OK' });

        expect(card.textContent).toContain('B.ob');
        expect(card.textContent).toContain('Bob');
        expect(ok).toBeDisabled();
        expect(screen.getByRole('button', { name: 'generic.close' })).toBeDisabled();
        expect(screen.getByRole('status').textContent).toContain('6');

        fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
        expect(profiles).toEqual([9]);

        for (let second = 0; second < 6; second++) act(() => vi.advanceTimersByTime(1000));

        expect(ok).toBeEnabled();
        expect(screen.queryByRole('status')).toBeNull();

        fireEvent.click(ok);

        expect(screen.queryByTestId('trade-name-scam-card')).toBeNull();
    });

    it('keeps the desktop window off a phone', () => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        render(<InventoryTradeNameScamWarningView />);

        expect(screen.queryByTestId('trade-name-scam-card')).toBeNull();
        expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    });
});
