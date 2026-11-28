import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHandheldHudStore } from '../../../state/handheldHudStore';

vi.mock('../../../api', () => ({
    LocalizeShortNumber: (amount: number) => `${Math.round(amount / 1000)}K`,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { formatHandheldBalance, HandheldPurseView } from './HandheldPurseView';

afterEach(() => {
    cleanup();
    act(() => useHandheldHudStore.setState({ sideOpen: false }));
});

const purse = (overrides: Partial<ComponentProps<typeof HandheldPurseView>> = {}) => {
    const props: ComponentProps<typeof HandheldPurseView> = {
        balances: [
            { type: -1, amount: 486605, onClick: vi.fn() },
            { type: 0, amount: 381450, onClick: vi.fn() },
            { type: 5, amount: 0, onClick: vi.fn() }
        ],
        short: false,
        club: { label: 'Get Habbo Club', onClick: vi.fn() },
        earnings: { label: 'Earnings', unseen: false, onClick: vi.fn() },
        help: { label: 'Help', onClick: vi.fn() },
        logout: { label: 'Log out', onClick: vi.fn() },
        settingsLabel: 'Settings',
        settingsRows: [
            { link: 'user-settings/show/audio', label: 'Sound settings' },
            { link: 'user-settings/show/chat', label: 'Chat settings' }
        ],
        onSettingsLink: vi.fn(),
        ...overrides
    };

    render(
        <HandheldPurseView {...props}>
            <div data-testid="promo" />
        </HandheldPurseView>
    );

    return props;
};

const toggle = () => document.querySelector<HTMLButtonElement>('.octane-handheld-purse__toggle');

describe('formatHandheldBalance', () => {
    it('writes the whole number with a comma between the thousands', () => {
        expect(formatHandheldBalance(0, false)).toBe('0');
        expect(formatHandheldBalance(950, false)).toBe('950');
        expect(formatHandheldBalance(486605, false)).toBe('486,605');
        expect(formatHandheldBalance(1234567, false)).toBe('1,234,567');
        expect(formatHandheldBalance(Number.NaN, false)).toBe('0');
    });

    it('uses the short form when the hotel asks for it', () => {
        expect(formatHandheldBalance(486605, true)).toBe('487k');
    });
});

describe('HandheldPurseView (phone purse chip)', () => {
    it('shows the balances in one chip: credits, duckets, diamonds', () => {
        purse();

        const balances = Array.from(document.querySelectorAll('.octane-handheld-purse__chip .octane-handheld-purse__balance'));

        expect(balances.map((balance) => balance.getAttribute('data-currency'))).toEqual(['-1', '0', '5']);
        expect(balances.map((balance) => balance.textContent)).toEqual(['486,605', '381,450', '0']);
        expect(balances.every((balance) => balance.querySelector('img.octane-handheld-purse__coin'))).toBe(true);
        expect(screen.getByRole('button', { name: 'Credits: 486605' })).not.toBeNull();
    });

    it('opens what a balance is about', () => {
        const props = purse();

        fireEvent.click(screen.getByRole('button', { name: 'Duckets: 381450' }));

        expect(props.balances[1].onClick).toHaveBeenCalledTimes(1);
        expect(props.balances[0].onClick).not.toHaveBeenCalled();
    });

    it('starts folded: no actions, the promos mounted but hidden', () => {
        purse();

        expect(toggle().getAttribute('aria-expanded')).toBe('false');
        expect(toggle().getAttribute('aria-label')).toBe('Show more');
        expect(document.querySelector('.octane-handheld-purse__panel')).toBeNull();
        expect(screen.getByTestId('promo').parentElement.hidden).toBe(true);
    });

    it('unfolds club, earnings, help, settings and log out from the arrow, and folds them again', () => {
        const props = purse();

        fireEvent.click(toggle());

        expect(useHandheldHudStore.getState().sideOpen).toBe(true);
        expect(toggle().getAttribute('aria-expanded')).toBe('true');
        expect(toggle().getAttribute('aria-label')).toBe('Show less');
        expect(screen.getByTestId('promo').parentElement.hidden).toBe(false);
        expect(Array.from(document.querySelectorAll('.octane-handheld-purse__action')).map((action) => action.getAttribute('data-action'))).toEqual([
            'club',
            'earnings',
            'help',
            'settings',
            'logout'
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Get Habbo Club' }));
        fireEvent.click(screen.getByRole('button', { name: 'Earnings' }));
        fireEvent.click(screen.getByRole('button', { name: 'Help' }));
        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

        expect(props.club.onClick).toHaveBeenCalledTimes(1);
        expect(props.earnings.onClick).toHaveBeenCalledTimes(1);
        expect(props.help.onClick).toHaveBeenCalledTimes(1);
        expect(props.logout.onClick).toHaveBeenCalledTimes(1);

        fireEvent.click(toggle());

        expect(useHandheldHudStore.getState().sideOpen).toBe(false);
        expect(document.querySelector('.octane-handheld-purse__panel')).toBeNull();
    });

    it('lists the settings windows under the settings button', () => {
        const props = purse();

        fireEvent.click(toggle());
        fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Chat settings' }));

        expect(props.onSettingsLink).toHaveBeenCalledWith('user-settings/show/chat');
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('leaves the club button out when the hotel has no club', () => {
        purse({ club: null });

        fireEvent.click(toggle());

        expect(document.querySelector('[data-action="club"]')).toBeNull();
    });
});
