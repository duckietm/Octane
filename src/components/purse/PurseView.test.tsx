import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurseView } from './PurseView';

vi.mock('../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api')>();

    return {
        ...actual,
        GetConfigurationValue: (key: string, fallback: unknown) => {
            if (key === 'system.currency.types') return [0, 5];
            if (key === 'currency.display.number.short') return false;
            if (key === 'currency.asset.icon.url') return '/currency/%type%.png';

            return fallback;
        },
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string) => fallback
    };
});

vi.mock('../../hooks', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../hooks')>();

    return {
        ...actual,
        usePurse: () => ({
            hcDisabled: false,
            purse: {
                activityPoints: new Map([
                    [0, 3692],
                    [5, 760]
                ]),
                clubDays: 0,
                clubPeriods: 0,
                credits: 37,
                minutesUntilExpiration: -1
            }
        })
    };
});

describe('PurseView', () => {
    afterEach(() => cleanup());

    it('shortens large currency amounts and keeps the exact value in a tooltip', () => {
        const { container } = render(<PurseView />);
        const amounts = Array.from(container.querySelectorAll('.octane-purse-button__amount')).map((element) => element.textContent?.trim());

        expect(screen.getByText('3.7k')).toBeInTheDocument();
        expect(amounts).toContain('3.7k');
        expect(amounts).not.toContain('3 692');
        expect(screen.getByRole('tooltip')).toHaveTextContent('3 692');
    });

    it('keeps official Help / Logout / Settings inside the 77px purse and Translate in the settings menu', () => {
        const { container } = render(<PurseView />);

        const actionColumn = container.querySelector('.octane-purse__col--actions');
        expect(actionColumn).toBeTruthy();

        const actionButtons = within(actionColumn as HTMLElement).getAllByRole('button');
        expect(actionButtons.map((button) => button.textContent?.trim() || button.getAttribute('title'))).toEqual([
            'Help',
            'Log out',
            'widget.memenu.settings.title'
        ]);

        const settingsButton = container.querySelector('.octane-purse__btn--settings');
        expect(settingsButton).toBeTruthy();

        fireEvent.click(settingsButton!);

        const settingsMenu = container.querySelector('.octane-purse-menu');
        expect(settingsMenu).toBeTruthy();
        expect(within(settingsMenu as HTMLElement).getByRole('button', { name: 'Translate' })).toBeInTheDocument();
    });
});
