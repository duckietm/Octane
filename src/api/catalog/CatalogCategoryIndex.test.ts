import { describe, expect, it } from 'vitest';
import { catalogCategoryChildren, findActiveCatalogNode, isCatalogHeadingPage } from './CatalogCategoryIndex';

const node = (pageId: number, children: any[] = [], isVisible = true) => ({ pageId, children, isVisible }) as any;

describe('catalogue heading pages', () => {
    it('lists the visible sub-pages only', () => {
        const heading = node(25, [node(26), node(27, [], false), node(28)]);

        expect(catalogCategoryChildren(heading).map((child) => child.pageId)).toEqual([26, 28]);
        expect(catalogCategoryChildren(null)).toEqual([]);
    });

    it('is a heading when it sells nothing and has sub-pages', () => {
        expect(isCatalogHeadingPage(0, node(25, [node(26)]))).toBe(true);
        expect(isCatalogHeadingPage(3, node(25, [node(26)]))).toBe(false);
        expect(isCatalogHeadingPage(0, node(25))).toBe(false);
        expect(isCatalogHeadingPage(0, node(25, [node(26, [], false)]))).toBe(false);
    });

    it('finds the open page among the active nodes', () => {
        const nodes = [node(2), node(25), node(26)];

        expect(findActiveCatalogNode(nodes, 25)).toBe(nodes[1]);
        expect(findActiveCatalogNode(nodes, 99)).toBeNull();
        expect(findActiveCatalogNode(null, 25)).toBeNull();
    });
});
