/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ botItems: [] as unknown[], isLoaded: false }));

vi.mock('@octane/renderer', () => ({}));
vi.mock('../../../api', () => ({
    attemptBotPlacement: vi.fn(),
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    LocalizeText: (key: string) => key,
    UnseenItemCategory: { BOT: 5 }
}));
vi.mock('../../../hooks', () => ({
    useInventoryBots: () => ({ botItems: state.botItems, isLoaded: state.isLoaded, selectedBot: null, activate: () => 1, deactivate: vi.fn() }),
    useInventoryUnseenTracker: () => ({ isUnseen: () => false, removeUnseen: vi.fn() }),
    usePlayTestRestricted: () => false
}));
vi.mock('../../../layout', () => ({ OctaneButton: () => null }));
vi.mock('./InventoryCategoryEmptyView', () => ({ InventoryCategoryEmptyView: (props: { title: string }) => <div>{props.title}</div> }));

const { InventoryBotView } = await import('./bot/InventoryBotView');

afterEach(() => {
    cleanup();
    state.isLoaded = false;
});

// AIR inventory.xml: loading_container until the list arrives, empty_container only for a list that came back empty.
describe('inventory tab loading state', () => {
    it('shows the loading arrow, not the empty view, before the list arrives', () => {
        render(<InventoryBotView roomPreviewer={null} roomSession={null} />);

        expect(screen.getByRole('status', { name: 'Loading...' })).toHaveClass('octane-inventory-loading');
        expect(screen.queryByText('inventory.empty.bots.title')).toBeNull();
    });

    it('shows the empty view once an empty list has arrived', () => {
        state.isLoaded = true;
        render(<InventoryBotView roomPreviewer={null} roomSession={null} />);

        expect(screen.getByText('inventory.empty.bots.title')).toBeInTheDocument();
        expect(screen.queryByRole('status')).toBeNull();
    });
});
