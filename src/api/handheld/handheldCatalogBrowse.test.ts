import { describe, expect, it } from 'vitest';
import { ICatalogNode } from '../catalog/ICatalogNode';
import {
    catalogListHasOverview,
    catalogListOf,
    catalogListRows,
    catalogListUpTarget,
    catalogRowOpensList,
    catalogTabOf,
    handheldCatalogLabel,
    resolveHandheldCatalogFollow,
    visibleCatalogChildren
} from './handheldCatalogBrowse';

const node = (pageId: number, parent: ICatalogNode | null, isVisible = true): ICatalogNode => {
    const created = { pageId, parent, isVisible, children: [] as ICatalogNode[], localization: `page ${pageId}` } as unknown as ICatalogNode;

    parent?.children.push(created);

    return created;
};

const root = node(-1, null);
const furni = node(1, root);
const chairs = node(10, furni);
const hidden = node(11, furni, false);
const tables = node(12, furni);
const modern = node(120, tables);

describe('handheld catalogue browsing', () => {
    it('lists only the visible sub pages and opens a list only for a folder with any', () => {
        expect(visibleCatalogChildren(furni)).toEqual([chairs, tables]);
        expect(visibleCatalogChildren(hidden)).toEqual([]);
        expect(catalogRowOpensList(furni)).toBe(true);
        expect(catalogRowOpensList(chairs)).toBe(false);
        expect(catalogRowOpensList(null)).toBe(false);
    });

    it('goes one level up, and nowhere from the top', () => {
        expect(catalogListUpTarget(tables, root)).toBe(furni);
        expect(catalogListUpTarget(furni, root)).toBe(root);
        expect(catalogListUpTarget(root, root)).toBeNull();
        expect(catalogListUpTarget(null, root)).toBeNull();
    });

    it('shows a page under its folder', () => {
        expect(catalogListOf(modern, root)).toBe(tables);
        expect(catalogListOf(furni, root)).toBe(root);
        expect(catalogListOf(null, root)).toBe(root);
    });

    it('offers the folder page of a deeper folder but not of a top-level tab', () => {
        expect(catalogListHasOverview(tables, root)).toBe(true);
        expect(catalogListHasOverview(furni, root)).toBe(false);
        expect(catalogListHasOverview(root, root)).toBe(false);
    });

    it('drops technical suffixes from page names but keeps a staff page id', () => {
        expect(handheldCatalogLabel('Chairs (BC)')).toBe('Chairs');
        expect(handheldCatalogLabel('Chairs (12)')).toBe('Chairs (12)');
        expect(handheldCatalogLabel(null)).toBe('');
    });

    it('follows pages opened elsewhere only', () => {
        const base = { leaf: chairs, ownActivation: false, ignoreAutomatic: false, searchJustEnded: false };

        expect(resolveHandheldCatalogFollow(base)).toBe('follow');
        expect(resolveHandheldCatalogFollow({ ...base, leaf: null })).toBe('ignore');
        expect(resolveHandheldCatalogFollow({ ...base, ownActivation: true })).toBe('ignore');
        expect(resolveHandheldCatalogFollow({ ...base, searchJustEnded: true })).toBe('ignore');
        expect(resolveHandheldCatalogFollow({ ...base, ignoreAutomatic: true })).toBe('consume-automatic');
    });

    it('treats the top pages as tabs when asked to', () => {
        // The list of a tab is the top: nothing above it to go back to.
        expect(catalogListUpTarget(furni, root, true)).toBeNull();
        expect(catalogListUpTarget(tables, root, true)).toBe(furni);
        // A top-level page is listed under itself, any other page under its folder.
        expect(catalogListOf(furni, root, true)).toBe(furni);
        expect(catalogListOf(modern, root, true)).toBe(tables);
        expect(catalogTabOf(modern, root)).toBe(furni);
        expect(catalogTabOf(furni, root)).toBe(furni);
        expect(catalogTabOf(root, root)).toBeNull();
    });

    it('lists a tab without sub pages as its own page', () => {
        expect(catalogListRows(furni, root)).toEqual([chairs, tables]);
        expect(catalogListRows(chairs, root)).toEqual([chairs]);
        expect(catalogListRows(root, root)).toEqual([furni]);
    });
});
