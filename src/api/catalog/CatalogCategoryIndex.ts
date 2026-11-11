import { ICatalogNode } from './ICatalogNode';

/** The sub-pages a heading shows: the visible children of its node, in the catalogue's order. */
export const catalogCategoryChildren = (node: ICatalogNode | null | undefined): ICatalogNode[] =>
    (node?.children ?? []).filter((child) => !!child && child.isVisible);

/**
 * Whether a page is only a heading: it sells nothing and it has sub-pages. Such a page (for example "By type") is
 * shown as an index of its sub-pages instead of an empty item grid.
 */
export const isCatalogHeadingPage = (offerCount: number, node: ICatalogNode | null | undefined): boolean =>
    offerCount <= 0 && catalogCategoryChildren(node).length > 0;

/** The node of the open page among the active ones (the navigation's selected path). */
export const findActiveCatalogNode = (activeNodes: ReadonlyArray<ICatalogNode> | null | undefined, pageId: number): ICatalogNode | null => {
    if (!activeNodes?.length) return null;

    for (let index = activeNodes.length - 1; index >= 0; index--) {
        if (activeNodes[index]?.pageId === pageId) return activeNodes[index];
    }

    return null;
};
