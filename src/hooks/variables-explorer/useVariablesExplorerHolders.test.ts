import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VariablesWebApiClient, WebApiEntryPage } from '../../api';
import { useVariablesExplorerHolders, VARIABLES_EXPLORER_PAGE_SIZE } from './useVariablesExplorerHolders';

const pageOf = (page: number, count: number): WebApiEntryPage => ({
    page,
    size: VARIABLES_EXPLORER_PAGE_SIZE,
    entries: Array.from({ length: count }, (_, index) => ({ entityId: (page - 1) * 50 + index + 1, value: index, createdAt: 0, updatedAt: 0 }))
});

const fakeClient = (total: number) => {
    const listEntries = vi.fn(async (_scope: string, _name: string, _kind: string, page: number) =>
        pageOf(page, Math.max(0, Math.min(VARIABLES_EXPLORER_PAGE_SIZE, total - (page - 1) * VARIABLES_EXPLORER_PAGE_SIZE)))
    );
    const countEntries = vi.fn(async () => total);

    return { client: { listEntries, countEntries } as unknown as VariablesWebApiClient, listEntries, countEntries };
};

describe('useVariablesExplorerHolders', () => {
    it("counts holders on the first page, since Habbo's pages carry no total", async () => {
        const { client, listEntries, countEntries } = fakeClient(120);

        const { result } = renderHook(() => useVariablesExplorerHolders(client, 'user', 'score'));

        await waitFor(() => expect(result.current.page?.total).toBe(120));
        expect(result.current.lastPage).toBe(3);
        expect(result.current.page?.holders).toHaveLength(50);
        expect(listEntries).toHaveBeenCalledWith('user', 'score', 'users', 1, VARIABLES_EXPLORER_PAGE_SIZE, 'id', 'asc');
        expect(countEntries).toHaveBeenCalledTimes(1);

        act(() => void result.current.requests.requestPage(2));

        await waitFor(() => expect(result.current.page?.page).toBe(2));
        expect(result.current.page?.total).toBe(120);
        expect(countEntries).toHaveBeenCalledTimes(1);
    });

    it('counts again when the holder kind changes', async () => {
        const { client, listEntries, countEntries } = fakeClient(3);

        const { result } = renderHook(() => useVariablesExplorerHolders(client, 'furni', 'lamp'));

        await waitFor(() => expect(result.current.page?.total).toBe(3));
        expect(listEntries).toHaveBeenLastCalledWith('furni', 'lamp', 'furni', 1, VARIABLES_EXPLORER_PAGE_SIZE, 'id', 'asc');

        await waitFor(() => expect(result.current.requests.canRequestNewPage(false)).toBe(true));
        act(() => result.current.changeFilters('wall-items-bc', 'value_desc'));

        await waitFor(() => expect(countEntries).toHaveBeenCalledTimes(2));
        expect(listEntries).toHaveBeenLastCalledWith('furni', 'lamp', 'wall-items-bc', 1, VARIABLES_EXPLORER_PAGE_SIZE, 'value', 'desc');
    });
});
