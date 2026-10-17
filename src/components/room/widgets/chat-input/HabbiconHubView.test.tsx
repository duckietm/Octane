/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const entries = vi.hoisted(() => [
    {
        id: 1,
        name: 'Wave',
        owned: true,
        favorite: false,
        claimable: false,
        isReward: false,
        purchasable: false,
        priceCredits: 0,
        priceActivityPoints: 0,
        activityPointType: 0
    },
    {
        id: 2,
        name: 'Heart',
        owned: false,
        favorite: false,
        claimable: true,
        isReward: false,
        purchasable: false,
        priceCredits: 0,
        priceActivityPoints: 0,
        activityPointType: 0
    },
    {
        id: 3,
        name: 'Star',
        owned: false,
        favorite: false,
        claimable: false,
        isReward: false,
        purchasable: true,
        priceCredits: 5,
        priceActivityPoints: 0,
        activityPointType: 0
    }
]);

const catalog = vi.hoisted(() => ({
    enabled: true,
    bookVisible: true,
    loaded: true,
    error: '',
    assetError: false,
    pending: null as unknown,
    purchase: null as unknown,
    sets: [{ id: 's1', title: 'Set one', description: 'First', total: 3, completed: 1, entries: [] as unknown[], reward: null as unknown }],
    entries: [] as unknown[],
    ownedEntries: [] as unknown[],
    ownedSets: [] as unknown[],
    clearUnseen: vi.fn(),
    refresh: vi.fn(),
    getInfo: vi.fn(),
    toggleFavorite: vi.fn(),
    claim: vi.fn(),
    setPurchase: vi.fn(),
    setBookVisible: vi.fn(),
    retry: vi.fn()
}));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: () => 'icon-%type%.png',
    useHabbiconCatalog: () => catalog,
    localizeHabbiconName: (entry: { name: string }) => entry.name,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

import { HabbiconHubView } from './HabbiconHubView';

describe('HabbiconHubView popup', () => {
    beforeEach(() => {
        catalog.sets[0].entries = entries;
        catalog.entries = entries;
        catalog.ownedEntries = entries.filter((entry) => entry.owned);
        catalog.getInfo.mockClear();
        catalog.toggleFavorite.mockClear();
        catalog.claim.mockClear();
    });

    afterEach(() => cleanup());

    const tile = (name: string) => screen.getByLabelText(name);

    it('opens a dialog-less popup next to the clicked tile with the owned actions', async () => {
        render(<HabbiconHubView />);

        expect(screen.queryByText('Add to favourites')).toBeNull();

        fireEvent.click(tile('Wave'));

        await waitFor(() => expect(screen.getByText('Add to favourites')).toBeTruthy());

        fireEvent.click(screen.getByText('Add to favourites'));
        expect(catalog.toggleFavorite).toHaveBeenCalledWith(1);
    });

    it('offers to claim a claimable habbicon and asks for info on a locked one', async () => {
        render(<HabbiconHubView />);

        fireEvent.click(tile('Heart'));
        await waitFor(() => expect(screen.getByText('Claim')).toBeTruthy());
        fireEvent.click(screen.getByText('Claim'));
        expect(catalog.claim).toHaveBeenCalledWith(2);

        fireEvent.click(tile('Star'));
        expect(catalog.getInfo).toHaveBeenCalledWith(3);
    });

    it('closes on Escape, on an outside press and when the body scrolls', async () => {
        render(<HabbiconHubView />);

        fireEvent.click(tile('Wave'));
        await waitFor(() => expect(screen.getByText('Add to favourites')).toBeTruthy());

        fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByText('Add to favourites')).toBeNull());

        fireEvent.click(tile('Wave'));
        await waitFor(() => expect(screen.getByText('Add to favourites')).toBeTruthy());

        fireEvent.pointerDown(document.body);
        fireEvent.mouseDown(document.body);
        fireEvent.click(document.body);
        await waitFor(() => expect(screen.queryByText('Add to favourites')).toBeNull());
    });
});
