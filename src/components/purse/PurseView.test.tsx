import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    links: [] as string[],
    openUrl: vi.fn(),
    clearRemember: vi.fn(),
    clearToken: vi.fn(),
    config: {} as Record<string, unknown>
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@octane/renderer')>()),
    CreateLinkEvent: (link: string) => mocks.links.push(link)
}));

vi.mock('../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api')>();
    const value = (key: string, fallback: unknown) => {
        if (key in mocks.config) return mocks.config[key];
        if (key === 'system.currency.types') return [0, 5];
        if (key === 'currency.display.number.short') return false;
        if (key === 'currency.asset.icon.url') return '/currency/%type%.png';

        return fallback;
    };

    return {
        ...actual,
        GetConfigurationValue: value,
        GetOptionalConfigurationValue: value,
        LocalizeText: (key: string) => key,
        localizeWithFallback: (_key: string, fallback: string) => fallback,
        OpenUrl: mocks.openUrl,
        ClearRememberLogin: mocks.clearRemember,
        clearAccessToken: mocks.clearToken,
        SendMessageComposer: () => undefined
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
                clubLevel: 0,
                credits: 1234567,
                minutesUntilExpiration: -1
            }
        })
    };
});

import { PurseView } from './PurseView';

describe('PurseView (AIR purse_xml / PurseAreaExtension)', () => {
    afterEach(() => {
        cleanup();
        mocks.links.length = 0;
        mocks.config = {};
        mocks.openUrl.mockClear();
        mocks.clearRemember.mockClear();
        mocks.clearToken.mockClear();
        vi.unstubAllGlobals();
    });

    it('forgets the local credentials on log out even when the server never answers', async () => {
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
        render(<PurseView />);

        fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

        await vi.waitFor(() => {
            expect(mocks.clearRemember).toHaveBeenCalled();
            expect(mocks.clearToken).toHaveBeenCalled();
        });
    });

    it('shows each amount as the whole number, as AIR does', () => {
        const { container } = render(<PurseView />);
        const amounts = Array.from(container.querySelectorAll('.octane-purse-button__amount')).map((element) => element.textContent?.trim());

        expect(amounts).toEqual(['760', '1234567', '3692']);
    });

    it('opens what a currency row is about', () => {
        mocks.config['web.shop.relativeUrl'] = '/shop';
        render(<PurseView />);

        fireEvent.click(screen.getByRole('button', { name: 'Duckets: 3692' }));
        fireEvent.click(screen.getByRole('button', { name: 'Diamonds: 760' }));
        fireEvent.click(screen.getByRole('button', { name: 'Credits: 1234567' }));

        expect(mocks.links).toEqual(['catalog/open/ducket_info', 'catalog/open/loyalty_info']);
        expect(mocks.openUrl).toHaveBeenCalledWith('/shop');
    });

    it('offers to join the club without club days', () => {
        render(<PurseView />);

        expect(screen.getByText('Get')).toBeInTheDocument();
    });

    it('keeps Help / Log out / Settings in the action column and opens AIR settings rows', () => {
        const { container } = render(<PurseView />);

        const actionButtons = within(container.querySelector('.octane-purse__col--actions') as HTMLElement).getAllByRole('button');
        expect(actionButtons.map((button) => button.textContent?.trim() || button.getAttribute('aria-label'))).toEqual(['Help', 'Log out', 'Settings']);

        fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

        const rows = within(screen.getByRole('menu')).getAllByRole('menuitem');
        expect(rows.map((row) => row.textContent)).toEqual(['Sound settings', 'Chat settings', 'Other settings', 'Word filter']);

        fireEvent.click(rows[0]);
        expect(mocks.links).toEqual(['user-settings/show/audio']);
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('adds the Discord row with discord.enabled and drops the word filter without user.custom.filter.enabled', () => {
        mocks.config['discord.enabled'] = true;
        mocks.config['user.custom.filter.enabled'] = false;
        render(<PurseView />);

        fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

        const rows = within(screen.getByRole('menu')).getAllByRole('menuitem');
        expect(rows.map((row) => row.textContent)).toEqual(['Sound settings', 'Discord settings', 'Chat settings', 'Other settings']);
    });
});
