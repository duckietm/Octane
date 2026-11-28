import { GetLocalizationManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingTabId } from '../../api';
import { useHandheldStore } from '../../state/handheldStore';
import { HousekeepingPanel } from './HousekeepingPanel';
import type { HousekeepingNavGroup } from './views/shell/HousekeepingSidebar';

// Texts read as their keys.
vi.mocked(GetLocalizationManager).mockImplementation(() => ({ getValue: (key: string) => key, getValueWithParameters: (key: string) => key }) as never);

vi.mock('./views/shell/HousekeepingTabContent', () => ({
    HousekeepingTabContent: ({ activeTab }: { activeTab: string }) => <div data-testid="tab-content">{activeTab}</div>
}));
vi.mock('./views/shell/HousekeepingGlobalSearch', () => ({ HousekeepingGlobalSearch: () => <div data-testid="global-search" /> }));
vi.mock('./HousekeepingStatusBanner', () => ({ HousekeepingStatusBanner: () => <div data-testid="status-banner" /> }));
vi.mock('./HousekeepingPasswordReveal', () => ({ HousekeepingPasswordReveal: () => <div data-testid="password-reveal" /> }));
vi.mock('./HousekeepingDangerConfirmView', () => ({ HousekeepingDangerConfirmView: () => <div data-testid="danger-confirm" /> }));

const NAV: HousekeepingNavGroup[] = [
    {
        titleKey: 'housekeeping.nav.overview',
        items: [{ id: HousekeepingTabId.DASHBOARD, icon: 'icon-housekeeping', labelKey: 'housekeeping.tab.dashboard' }]
    },
    {
        titleKey: 'housekeeping.nav.moderation',
        items: [
            { id: HousekeepingTabId.USERS, icon: 'icon-friendall', labelKey: 'housekeeping.tab.users', count: 2 },
            { id: HousekeepingTabId.ROOMS, icon: 'icon-rooms', labelKey: 'housekeeping.tab.rooms' }
        ]
    },
    // A group the operator holds no section of stays out.
    { titleKey: 'housekeeping.nav.hotel', items: [] }
];

const setLayout = (active: boolean, orientation: 'portrait' | 'landscape' = 'portrait') =>
    act(() => useHandheldStore.setState({ layout: { active, orientation } }));

const renderPanel = (activeTab: HousekeepingTabId, onSelectTab = vi.fn(), onClose = vi.fn()) => {
    const utils = render(<HousekeepingPanel activeTab={activeTab} canManageSoundboard={false} navGroups={NAV} onClose={onClose} onSelectTab={onSelectTab} />);
    const rerender = (tab: HousekeepingTabId) =>
        utils.rerender(<HousekeepingPanel activeTab={tab} canManageSoundboard={false} navGroups={NAV} onClose={onClose} onSelectTab={onSelectTab} />);

    return { ...utils, rerender, onSelectTab, onClose };
};

describe('HandheldHousekeepingView', () => {
    beforeEach(() => setLayout(true, 'portrait'));

    afterEach(() => {
        cleanup();
        setLayout(false);
    });

    it('opens on the start list: search, the sections it may open with their counts, banners and the danger confirmation', () => {
        renderPanel(HousekeepingTabId.DASHBOARD);

        expect(screen.getByTestId('hk-handheld-menu')).toBeTruthy();
        expect(screen.queryByTestId('hk-handheld-page')).toBeNull();
        expect(screen.getByTestId('global-search')).toBeTruthy();
        expect(screen.getByTestId('hk-handheld-section-users').textContent).toContain('2');
        expect(screen.queryByText('housekeeping.nav.hotel')).toBeNull();
        expect(screen.getByTestId('status-banner')).toBeTruthy();
        expect(screen.getByTestId('password-reveal')).toBeTruthy();
        expect(screen.getByTestId('danger-confirm')).toBeTruthy();
    });

    it('opens a section as a page through the same tab handler, and Back returns to the list', () => {
        const { rerender, onSelectTab } = renderPanel(HousekeepingTabId.DASHBOARD);

        fireEvent.click(screen.getByTestId('hk-handheld-section-rooms'));
        expect(onSelectTab).toHaveBeenCalledWith(HousekeepingTabId.ROOMS);
        rerender(HousekeepingTabId.ROOMS);

        expect(screen.queryByTestId('hk-handheld-menu')).toBeNull();
        expect(screen.getByTestId('tab-content').textContent).toBe(HousekeepingTabId.ROOMS);

        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByTestId('hk-handheld-menu')).toBeTruthy();
        expect(screen.queryByTestId('hk-handheld-page')).toBeNull();
    });

    it('shows the page when a link or a page itself opens another section', () => {
        const { rerender } = renderPanel(HousekeepingTabId.USERS);

        // A housekeeping/user/<id> link lands on the user page, not the list.
        expect(screen.getByTestId('tab-content').textContent).toBe(HousekeepingTabId.USERS);
        fireEvent.click(screen.getByText('Back'));
        // A row on another page (or the global search) switching the section brings the page back.
        rerender(HousekeepingTabId.ROOMS);
        expect(screen.getByTestId('tab-content').textContent).toBe(HousekeepingTabId.ROOMS);
    });

    it('puts the list beside the page on its side, marking the open section', () => {
        setLayout(true, 'landscape');
        renderPanel(HousekeepingTabId.USERS);

        expect(screen.getByTestId('hk-handheld-menu')).toBeTruthy();
        expect(screen.getByTestId('hk-handheld-page')).toBeTruthy();
        expect(screen.queryByText('Back')).toBeNull();
        expect(screen.getByTestId('hk-handheld-section-users').getAttribute('aria-current')).toBe('page');
    });

    it('closes through the same handler', () => {
        const { onClose } = renderPanel(HousekeepingTabId.DASHBOARD);

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('keeps the desktop window when not on a phone', () => {
        setLayout(false);
        const { container } = renderPanel(HousekeepingTabId.USERS);

        expect(screen.queryByTestId('hk-handheld-menu')).toBeNull();
        expect(container.ownerDocument.querySelector('.octane-handheld-hk')).toBeNull();
        expect(container.ownerDocument.querySelector('.octane-housekeeping nav')).toBeTruthy();
        expect(screen.getByTestId('tab-content').textContent).toBe(HousekeepingTabId.USERS);
    });
});
