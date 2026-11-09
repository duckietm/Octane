/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { cacheLateCatalogIndex, cacheLateCatalogPage, CatalogIndexData, CatalogPageData, catalogIndexKey, catalogPageKey } from './useCatalogQueries';

const node = (pageId: number, children: unknown[] = []) => ({
    visible: true,
    icon: 0,
    pageId,
    parentId: -1,
    pageName: `page_${pageId}`,
    localization: `Page ${pageId}`,
    children,
    offerIds: []
});

const indexReply = { catalogType: 'NORMAL', root: node(-1, [node(3)]) } as never;
const pageReply = (pageId: number) =>
    ({
        pageId,
        catalogType: 'NORMAL',
        layoutCode: 'default_3x3',
        localization: { images: [], texts: [] },
        offers: [],
        offerId: -1,
        acceptSeasonCurrencyAsCredits: false,
        frontPageItems: []
    }) as never;

const waitForever = () => new Promise<never>(() => undefined);

describe('catalog replies nobody was waiting for', () => {
    it('keeps an index that arrives after the request gave up', () => {
        const client = new QueryClient();

        expect(cacheLateCatalogIndex(client, indexReply)).toBe(true);
        expect(client.getQueryData<CatalogIndexData>(catalogIndexKey('NORMAL'))?.rootNode).toBeTruthy();
    });

    it('keeps a page that arrives after the request gave up', () => {
        const client = new QueryClient();

        expect(cacheLateCatalogPage(client, pageReply(3))).toBe(true);
        expect(client.getQueryData<CatalogPageData>(catalogPageKey('NORMAL', 3))?.page.pageId).toBe(3);
    });

    it('leaves a reply to the request still waiting for it', () => {
        const client = new QueryClient();

        void client.prefetchQuery({ queryKey: catalogPageKey('NORMAL', 3), queryFn: waitForever });

        expect(cacheLateCatalogPage(client, pageReply(3))).toBe(false);
        expect(client.getQueryData(catalogPageKey('NORMAL', 3))).toBeUndefined();
    });

    it('lets the index and the pages retry once and keeps late replies', () => {
        const queries = readFileSync('src/hooks/catalog/useCatalogQueries.ts', 'utf8');
        const effects = readFileSync('src/hooks/catalog/useCatalogEffects.ts', 'utf8');

        expect(queries).not.toContain('retry: false');
        expect(effects).toContain('cacheLateCatalogIndex(queryClient, event.getParser())');
        expect(effects).toContain('cacheLateCatalogPage(queryClient, event.getParser()');
    });
});
