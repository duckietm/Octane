/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HousekeepingGlobalSearch } from './HousekeepingGlobalSearch';

const mocks = vi.hoisted(() => ({
    store: {
        userSuggestions: [] as { id: number; username: string; online: boolean }[],
        roomSuggestions: [] as { id: number; name: string; ownerName: string }[],
        recentLookups: [] as { kind: 'user' | 'room'; id: number; label: string }[],
        requestUserSuggestions: vi.fn(),
        requestRoomSuggestions: vi.fn(),
        lookupUserById: vi.fn(),
        lookupRoomById: vi.fn(),
        setActiveTab: vi.fn()
    }
}));

vi.mock('../../../../api', async () => {
    const search = await vi.importActual<typeof import('../../../../api/housekeeping/HousekeepingSearch')>('../../../../api/housekeeping/HousekeepingSearch');
    const texts: Record<string, string> = {
        'housekeeping.search.placeholder': 'Search users and rooms',
        'housekeeping.search.no_results': 'Nothing found',
        'housekeeping.search.open_user': 'Open user #%id%',
        'housekeeping.search.open_room': 'Open room #%id%',
        'housekeeping.user.recent': 'Recent'
    };

    return {
        HousekeepingTabId: { USERS: 'users', ROOMS: 'rooms' },
        parseHousekeepingSearch: search.parseHousekeepingSearch,
        LocalizeText: (key: string, params: string[] = [], values: string[] = []) =>
            params.reduce((text, name, index) => text.replace(`%${name}%`, values[index]), texts[key] ?? key)
    };
});

vi.mock('../../../../hooks', () => ({ useHousekeepingStore: () => mocks.store }));

const renderSearch = () => render(<HousekeepingGlobalSearch />);

const input = () => screen.getByRole('combobox', { name: 'Search users and rooms' }) as HTMLInputElement;

const type = (value: string) => {
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value } });
};

describe('HousekeepingGlobalSearch', () => {
    beforeEach(() => {
        Object.values(mocks.store).forEach((value) => typeof value === 'function' && (value as ReturnType<typeof vi.fn>).mockClear());
        mocks.store.userSuggestions = [{ id: 7, username: 'Alice', online: true }];
        mocks.store.roomSuggestions = [{ id: 411, name: 'Alice lounge', ownerName: 'Bob' }];
        mocks.store.recentLookups = [{ kind: 'room', id: 12, label: 'Pool' }];
    });
    afterEach(() => cleanup());

    it('lists the recent lookups under a header when the box is focused empty', () => {
        renderSearch();
        fireEvent.focus(input());

        expect(screen.getByText('Recent')).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Pool/ })).toBeInTheDocument();
    });

    it('searches users and rooms for a name and lists both', () => {
        renderSearch();
        type('Ali');

        expect(mocks.store.requestUserSuggestions).toHaveBeenLastCalledWith('Ali');
        expect(mocks.store.requestRoomSuggestions).toHaveBeenLastCalledWith('Ali');
        expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Alice#7', 'Alice loungeBob']);
    });

    it('opens the highlighted row with Enter and clears the box', () => {
        renderSearch();
        type('Ali');
        fireEvent.keyDown(input(), { key: 'Enter' });

        expect(mocks.store.setActiveTab).toHaveBeenCalledWith('users');
        expect(mocks.store.lookupUserById).toHaveBeenCalledWith(7);
        expect(input().value).toBe('');
        expect(screen.queryByRole('option')).toBeNull();
    });

    it('moves the highlight with the arrow keys before Enter', () => {
        renderSearch();
        type('Ali');
        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        fireEvent.keyDown(input(), { key: 'Enter' });

        expect(mocks.store.setActiveTab).toHaveBeenCalledWith('rooms');
        expect(mocks.store.lookupRoomById).toHaveBeenCalledWith(411);
    });

    it('opens a row on click without writing its label into the box', () => {
        renderSearch();
        type('Ali');
        fireEvent.click(screen.getByRole('option', { name: /Alice lounge/ }));

        expect(mocks.store.lookupRoomById).toHaveBeenCalledWith(411);
        expect(input().value).toBe('');
    });

    it('opens a user or a room by typed id', () => {
        renderSearch();
        type('#12');
        expect(screen.getByRole('option', { name: 'Open user #12' })).toBeInTheDocument();
        fireEvent.keyDown(input(), { key: 'Enter' });
        expect(mocks.store.lookupUserById).toHaveBeenCalledWith(12);

        type('s:411');
        fireEvent.keyDown(input(), { key: 'Enter' });
        expect(mocks.store.lookupRoomById).toHaveBeenCalledWith(411);
    });

    it('says so when a name finds nothing', () => {
        renderSearch();
        mocks.store.userSuggestions = [];
        mocks.store.roomSuggestions = [];
        type('zzz');

        expect(screen.getByText('Nothing found')).toBeInTheDocument();
    });

    it('closes the list on Escape and on an outside press', () => {
        renderSearch();
        type('Ali');
        expect(screen.getAllByRole('option')).toHaveLength(2);

        fireEvent.keyDown(input(), { key: 'Escape' });
        expect(screen.queryByRole('option')).toBeNull();

        type('Alic');
        expect(screen.getAllByRole('option')).toHaveLength(2);

        fireEvent.pointerDown(document.body);
        fireEvent.mouseDown(document.body);
        fireEvent.click(document.body);
        expect(screen.queryByRole('option')).toBeNull();
    });
});
