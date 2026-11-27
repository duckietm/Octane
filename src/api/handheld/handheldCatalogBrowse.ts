import { ICatalogNode } from '../catalog/ICatalogNode';

/**
 * The phone catalogue: the top pages are the tabs, under them a list of pages (one level of the page tree) and the
 * open page. Upright only the list or the page is on screen; on its side the list sits beside the page. These
 * helpers decide what a row does and where "back" goes; the hook in hooks/catalog keeps the state.
 */
export type HandheldCatalogStep = 'menu' | 'page';

export const visibleCatalogChildren = (node: ICatalogNode | null | undefined): ICatalogNode[] => (node?.children ?? []).filter((child) => !!child?.isVisible);

/** A row with sub pages opens their list; any other row opens its own page. */
export const catalogRowOpensList = (node: ICatalogNode | null | undefined): boolean => visibleCatalogChildren(node).length > 0;

/**
 * A folder that has a page of its own (below the top level) lists that page first, so it stays reachable now
 * that a tap on the folder opens its list. A top-level tab is left out: the catalogue opens its first sub page
 * for it, never its own.
 */
export const catalogListHasOverview = (listNode: ICatalogNode | null | undefined, root: ICatalogNode | null | undefined): boolean =>
    !!listNode && listNode !== root && !!listNode.parent && listNode.parent !== root && listNode.pageId > -1;

/** The list one level up, or null at the top: the root of the tree, or with tabs the list of a tab. */
export const catalogListUpTarget = (listNode: ICatalogNode | null | undefined, root: ICatalogNode | null | undefined, tabs = false): ICatalogNode | null => {
    if (!listNode || !root || listNode === root) return null;
    if (tabs && (listNode.parent ?? root) === root) return null;

    return listNode.parent ?? root;
};

/** The list a page is shown under: its folder. A top-level page is listed at the top of the tree, or with tabs under itself. */
export const catalogListOf = (pageNode: ICatalogNode | null | undefined, root: ICatalogNode | null | undefined, tabs = false): ICatalogNode | null => {
    if (!pageNode) return root ?? null;

    const parent = pageNode.parent ?? root ?? null;

    return tabs && parent === root ? pageNode : parent;
};

/** The top-level page (the tab) a node sits under; the node itself when it is one. */
export const catalogTabOf = (node: ICatalogNode | null | undefined, root: ICatalogNode | null | undefined): ICatalogNode | null => {
    if (!node || node === root) return null;

    let current = node;

    while (current.parent && current.parent !== root) current = current.parent;

    return current;
};

/** The rows of a list: the visible sub pages, or for a tab without any the tab's own page. */
export const catalogListRows = (listNode: ICatalogNode | null | undefined, root: ICatalogNode | null | undefined): ICatalogNode[] => {
    const rows = visibleCatalogChildren(listNode);

    if (rows.length || !listNode || listNode === root || listNode.pageId < 0) return rows;

    return [listNode];
};

/** Page names can carry a technical suffix ("(BC)", "(Hot)"); a pure number (a page id for staff) stays. */
export const handheldCatalogLabel = (label: string | null | undefined): string => (label ?? '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();

/**
 * Whether the phone catalogue jumps to the page the store just activated. It does for a page opened from
 * elsewhere (a link, the infostand, "buy more"), not for one it opened itself, not for the first page the
 * catalogue opens by itself on its first opening, and not for the page a cleared search goes back to.
 */
export interface HandheldCatalogFollowInput {
    readonly leaf: ICatalogNode | null;
    readonly ownActivation: boolean;
    readonly ignoreAutomatic: boolean;
    readonly searchJustEnded: boolean;
}

export type HandheldCatalogFollow = 'follow' | 'ignore' | 'consume-automatic';

export const resolveHandheldCatalogFollow = (input: HandheldCatalogFollowInput): HandheldCatalogFollow => {
    if (!input.leaf) return 'ignore';
    if (input.ownActivation || input.searchJustEnded) return 'ignore';
    if (input.ignoreAutomatic) return 'consume-automatic';

    return 'follow';
};
