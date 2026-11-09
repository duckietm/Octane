/* @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CatalogType } from '../../api';
import { CatalogPageData, catalogPageKey, dropCatalogCache, lastShownCatalogPage, useCatalogPageQuery } from './useCatalogQueries';

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const pageData = (pageId: number) => ({ page: { pageId, layoutCode: 'default_3x3', offers: [] } }) as unknown as CatalogPageData;

describe('useCatalogPageQuery placeholder', () => {
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        dropCatalogCache();
    });

    afterEach(() => {
        cleanup();
        client.clear();
        dropCatalogCache();
    });

    it('gives a hook mounted while the next page loads the page already shown', async () => {
        const shown = pageData(1);

        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 1), shown);

        const parent = renderHook(() => useCatalogPageQuery(CatalogType.NORMAL, 1, true), { wrapper });

        await waitFor(() => expect(lastShownCatalogPage(CatalogType.NORMAL)).toBe(shown));
        expect(parent.result.current.data).toBe(shown);

        // A layout mounting for page 2, which is not cached yet, used to get no data at all.
        const layout = renderHook(() => useCatalogPageQuery(CatalogType.NORMAL, 2, true), { wrapper });

        expect(layout.result.current.data).toBe(shown);
        expect(layout.result.current.isPlaceholderData).toBe(true);
    });

    it('keeps the last shown page per catalog type and forgets it when the cache is dropped', async () => {
        const normal = pageData(1);

        client.setQueryData(catalogPageKey(CatalogType.NORMAL, 1), normal);
        renderHook(() => useCatalogPageQuery(CatalogType.NORMAL, 1, true), { wrapper });

        await waitFor(() => expect(lastShownCatalogPage(CatalogType.NORMAL)).toBe(normal));
        expect(lastShownCatalogPage(CatalogType.BUILDER)).toBeUndefined();

        dropCatalogCache();

        expect(lastShownCatalogPage(CatalogType.NORMAL)).toBeUndefined();
    });
});
