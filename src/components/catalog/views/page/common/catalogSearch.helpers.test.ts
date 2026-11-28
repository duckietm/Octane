/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { CatalogNode, CatalogType, FurnitureOffer, ICatalogNode } from '../../../../../api';
import {
    CATALOG_SEARCH_DEBOUNCE_MS,
    CATALOG_SEARCH_MIN_LENGTH,
    CATALOG_SEARCH_RESULT_LIMIT,
    filterCatalogSearchNodes,
    findCatalogSearchMatches,
    isCatalogSearchEnterKey,
    normalizeCatalogSearchText,
    shouldRunCatalogSearch
} from './catalogSearch.helpers';

const furniture = (overrides: Record<string, unknown> = {}) =>
    ({
        type: 's',
        id: 1,
        name: 'Sedia classica',
        description: 'Una comoda sedia per il salotto',
        className: 'chair_classic',
        fullName: 'chair_classic',
        furniLine: 'Classic',
        purchaseOfferId: 42,
        rentOfferId: -1,
        bcOfferId: -1,
        availableForBuildersClub: true,
        excludeDynamic: false,
        ...overrides
    }) as any;

const node = (pageId: number, pageName: string, parent: ICatalogNode, visible = true, localization = pageName) => {
    const created = new CatalogNode(
        { visible, icon: 0, pageId, parentId: parent?.pageId ?? -1, pageName, localization, children: [], offerIds: [] } as any,
        parent ? parent.depth + 1 : 0,
        parent
    );

    if (parent) parent.addChild(created);

    return created;
};

const nameOnly = (item: any) => [item.name];

/** Every offer id sold on page 7, except the ones given. */
const soldOnPage = (page: ICatalogNode, unsold: number[] = []) => (offerId: number) => (unsold.includes(offerId) ? null : [page]);

describe('catalog search input (AIR HabboCatalog.onSearchInputEvent)', () => {
    it('uses the AIR threshold, timer and result limit', () => {
        expect(CATALOG_SEARCH_MIN_LENGTH).toBe(3);
        expect(CATALOG_SEARCH_DEBOUNCE_MS).toBe(50);
        expect(CATALOG_SEARCH_RESULT_LIMIT).toBe(400);
        expect(shouldRunCatalogSearch('se')).toBe(false);
        expect(shouldRunCatalogSearch('sed')).toBe(true);
    });

    it('normalises to lower case only, as normalizeSearchText does', () => {
        expect(normalizeCatalogSearchText('  Caffè_Èlite ')).toBe('  caffè_èlite ');
    });

    it('searches any non-empty text on Enter, even below three characters', () => {
        expect(isCatalogSearchEnterKey('Enter', 'se')).toBe(true);
        expect(isCatalogSearchEnterKey('Enter', '')).toBe(false);
        expect(isCatalogSearchEnterKey('Escape', 'sedia')).toBe(false);
    });
});

describe('findCatalogSearchMatches (AIR HabboCatalog.performSearch)', () => {
    const page = node(7, 'chairs', null);

    it('matches the search terms case-insensitively, not the description or class name', () => {
        const source = [furniture(), furniture({ id: 2, name: 'Lampada', className: 'mood_lamp', purchaseOfferId: 43 })];
        const ids = (query: string) => findCatalogSearchMatches(source, query, CatalogType.NORMAL, soldOnPage(page), nameOnly).offers.map((o) => o.furniture.id);

        expect(ids('SEDIA')).toEqual([1]);
        expect(ids('comoda')).toEqual([]);
        expect(ids('mood')).toEqual([]);
        expect(ids('lamp')).toEqual([2]);
    });

    it('also matches the product data name handed in as a search term', () => {
        const source = [furniture({ name: 'Old name' })];
        const terms = (item: any) => [item.name, 'Throne'];

        expect(findCatalogSearchMatches(source, 'thro', CatalogType.NORMAL, soldOnPage(page), terms).offers).toHaveLength(1);
    });

    it('picks the purchase offer before the rent offer, and the rent offer only when that is what a page sells', () => {
        const source = [
            furniture({ id: 1, purchaseOfferId: 10, rentOfferId: 11 }),
            furniture({ id: 2, purchaseOfferId: 20, rentOfferId: 21 }),
            furniture({ id: 3, purchaseOfferId: 30 })
        ];
        const matches = findCatalogSearchMatches(source, 'sedia', CatalogType.NORMAL, soldOnPage(page, [20, 30]), nameOnly);

        expect(matches.offers.map(({ furniture: f, offerId, isRent }) => [f.id, offerId, isRent])).toEqual([
            [1, 10, false],
            [2, 21, true]
        ]);
        expect([...matches.pageIds]).toEqual([7]);
    });

    it('uses the Builders Club offer in the Builders Club catalogue and keeps furni lines of unsold matches', () => {
        const source = [
            furniture({ id: 1, bcOfferId: 50 }),
            furniture({ id: 2, bcOfferId: -1, furniLine: 'Pura' }),
            furniture({ id: 3, availableForBuildersClub: false, bcOfferId: 51 })
        ];
        const matches = findCatalogSearchMatches(source, 'sedia', CatalogType.BUILDER, soldOnPage(page), nameOnly);

        expect(matches.offers.map((o) => [o.furniture.id, o.offerId])).toEqual([[1, 50]]);
        expect(matches.furniLines).toEqual(['pura']);
    });

    it('leaves out excluded furni in the normal catalogue and furni no page sells', () => {
        const source = [furniture({ id: 1, excludeDynamic: true }), furniture({ id: 2, purchaseOfferId: 99 })];

        expect(findCatalogSearchMatches(source, 'sedia', CatalogType.NORMAL, soldOnPage(page, [99]), nameOnly).offers).toEqual([]);
    });

    it('lets bc_ blocks mark their pages without becoming results', () => {
        const matches = findCatalogSearchMatches([furniture({ className: 'bc_block' })], 'sedia', CatalogType.NORMAL, soldOnPage(page), nameOnly);

        expect(matches.offers).toEqual([]);
        expect([...matches.pageIds]).toEqual([7]);
    });

    it('stops at the result limit', () => {
        const source = Array.from({ length: CATALOG_SEARCH_RESULT_LIMIT + 5 }, (_, index) => furniture({ id: index, purchaseOfferId: index }));

        expect(findCatalogSearchMatches(source, 'sedia', CatalogType.NORMAL, soldOnPage(page), nameOnly).offers).toHaveLength(CATALOG_SEARCH_RESULT_LIMIT);
    });
});

describe('filterCatalogSearchNodes (AIR CatalogNavigator.filter)', () => {
    const buildTree = () => {
        const root = node(-1, 'root', null);
        const furni = node(1, 'furni', root, true, 'Furni');
        const chairs = node(2, 'chairs', furni, true, 'Chairs');
        const thrones = node(3, 'thrones', chairs, true, 'Thrones');
        const tables = node(4, 'tables', furni, true, 'Tables');
        const hidden = node(5, 'hidden_mood', furni, false, 'Mood');
        const lights = node(6, 'mood_lights', root, true, 'Mood Lights');

        return { root, furni, chairs, thrones, tables, hidden, lights };
    };

    it('lists the pages that sell a match, their visible subtree and the pages above them, a level deeper below each', () => {
        const { root, furni, chairs, thrones } = buildTree();
        const rows = filterCatalogSearchNodes('zzz', [], new Set([2]), root);

        expect(rows.map(({ node: n, depth }) => [n, depth])).toEqual([
            [furni, 2],
            [chairs, 3],
            [thrones, 4]
        ]);
    });

    it('matches page names with spaces, underscores and dashes taken out, and leaves hidden pages out', () => {
        const { root, lights } = buildTree();

        expect(filterCatalogSearchNodes('mood', [], new Set(), root).map((row) => row.node)).toEqual([lights]);
        expect(filterCatalogSearchNodes('moodlig', [], new Set(), root).map((row) => row.node)).toEqual([lights]);
    });

    it('matches the furni lines of unsold Builders Club matches', () => {
        const { root, tables, furni } = buildTree();

        expect(filterCatalogSearchNodes('zzz', ['tables'], new Set(), root).map((row) => row.node)).toEqual([furni, tables]);
    });
});

describe('FurnitureOffer from a search match', () => {
    it('keeps the offer the search found, so buying a result asks for that offer', () => {
        const item = furniture({ purchaseOfferId: 10, rentOfferId: 11 });

        expect(new FurnitureOffer(item, 10, false)).toMatchObject({ offerId: 10, isRentOffer: false });
        expect(new FurnitureOffer(item, 11, true)).toMatchObject({ offerId: 11, isRentOffer: true });
        expect(new FurnitureOffer(furniture({ bcOfferId: 50 }), 50, false).offerId).toBe(50);
    });

    it('buys rather than rents when no offer is given and both are sold', () => {
        expect(new FurnitureOffer(furniture({ purchaseOfferId: 10, rentOfferId: 11 }))).toMatchObject({ offerId: 10, isRentOffer: false });
        expect(new FurnitureOffer(furniture({ purchaseOfferId: -1, rentOfferId: 11 }))).toMatchObject({ offerId: 11, isRentOffer: true });
    });
});
