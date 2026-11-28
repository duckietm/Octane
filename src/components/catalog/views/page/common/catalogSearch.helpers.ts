import { IFurnitureData } from '@octane/renderer';
import { CatalogType, ICatalogNode } from '../../../../../api';

/*
 * AIR HabboCatalog search (WIN63-202610151745-318700621): onSearchInputEvent starts a 50ms timer from three characters
 * and Enter searches any text (HabboCatalog.as:1861-1899); performSearch matches furni names, keeps at most 400 offers
 * and filters the navigator to the pages that sell a match (HabboCatalog.as:1901-1968, 2004-2043).
 */
export const CATALOG_SEARCH_MIN_LENGTH = 3;
export const CATALOG_SEARCH_DEBOUNCE_MS = 50;
export const CATALOG_SEARCH_RESULT_LIMIT = 400;

/** HabboCatalog.normalizeSearchText: lower case only. */
export const normalizeCatalogSearchText = (value: string): string => (value || '').toLocaleLowerCase();

export const shouldRunCatalogSearch = (value: string): boolean => (value || '').length >= CATALOG_SEARCH_MIN_LENGTH;

export const isCatalogSearchEnterKey = (key: string, value: string): boolean => key === 'Enter' && (value || '').length > 0;

export interface CatalogSearchOffer {
    furniture: IFurnitureData;
    offerId: number;
    isRent: boolean;
}

export interface CatalogSearchMatches {
    offers: CatalogSearchOffer[];
    /** BUILDERS_CLUB: furni lines of matches that no page sells. */
    furniLines: string[];
    /** Pages that sell a match (addMatchingNodesForOffer). */
    pageIds: Set<number>;
}

type NodesByOfferId = (offerId: number) => ICatalogNode[] | null;

/** HabboCatalog.createSearchResultOffer: the offer a visible page sells, or -1. */
const getSearchOffer = (furniture: IFurnitureData, catalogType: string, nodesByOfferId: NodesByOfferId): { offerId: number; isRent: boolean } => {
    if (catalogType === CatalogType.BUILDER) {
        if (furniture.bcOfferId !== -1 && nodesByOfferId(furniture.bcOfferId)) return { offerId: furniture.bcOfferId, isRent: false };
    } else if (furniture.purchaseOfferId !== -1 && nodesByOfferId(furniture.purchaseOfferId)) {
        return { offerId: furniture.purchaseOfferId, isRent: false };
    } else if (furniture.rentOfferId !== -1 && nodesByOfferId(furniture.rentOfferId)) {
        return { offerId: furniture.rentOfferId, isRent: true };
    }

    return { offerId: -1, isRent: false };
};

/** HabboCatalog.performSearch over the furni data; searchTerms are the furni name and its product data name. */
export const findCatalogSearchMatches = (
    furnitureDatas: IFurnitureData[],
    query: string,
    catalogType: string,
    nodesByOfferId: NodesByOfferId,
    getSearchTerms: (furniture: IFurnitureData) => string[]
): CatalogSearchMatches => {
    const needle = normalizeCatalogSearchText(query);
    const offers: CatalogSearchOffer[] = [];
    const furniLines: string[] = [];
    const pageIds = new Set<number>();

    if (!needle.length || !furnitureDatas?.length) return { offers, furniLines, pageIds };

    for (const furniture of furnitureDatas) {
        if (!furniture) continue;
        if (catalogType === CatalogType.BUILDER && !furniture.availableForBuildersClub) continue;
        if (catalogType === CatalogType.NORMAL && furniture.excludeDynamic) continue;
        if (!getSearchTerms(furniture).some((term) => normalizeCatalogSearchText(term).includes(needle))) continue;

        const offer = getSearchOffer(furniture, catalogType, nodesByOfferId);

        if (offer.offerId !== -1) {
            for (const node of nodesByOfferId(offer.offerId) ?? []) pageIds.add(node.pageId);

            // isExcludedFromFurnitureSearchResults: Builders Club blocks only mark their pages.
            if (!furniture.className?.startsWith('bc_')) {
                offers.push({ furniture, ...offer });

                if (offers.length >= CATALOG_SEARCH_RESULT_LIMIT) break;
            }
        } else if (catalogType === CatalogType.BUILDER && furniture.furniLine) {
            const furniLine = normalizeCatalogSearchText(furniture.furniLine);

            if (furniLine.length && !furniLines.includes(furniLine)) furniLines.push(furniLine);
        }
    }

    return { offers, furniLines, pageIds };
};

/** CatalogNavigator.isSearchMatch: the page sells a match, or its name and caption contain the needle or a furni line. */
const isSearchMatch = (needle: string, furniLines: string[], pageIds: Set<number>, node: ICatalogNode): boolean => {
    if (pageIds.has(node.pageId)) return true;

    const hayStack = [node.pageName, node.localization].join(' ').toLowerCase().replace(/[\s_-]+/g, '');

    return hayStack.includes(needle) || furniLines.some((furniLine) => hayStack.includes(furniLine));
};

const includeVisibleSubtree = (node: ICatalogNode, marked: Set<ICatalogNode>) => {
    if (node.isVisible && node.pageId > 0) marked.add(node);

    for (const child of node.children) includeVisibleSubtree(child, marked);
};

/** CatalogNavigator.markSearchNodes: a matching page brings its whole subtree, a page above a match is kept too. */
const markSearchNodes = (needle: string, furniLines: string[], pageIds: Set<number>, node: ICatalogNode, marked: Set<ICatalogNode>): boolean => {
    if (node.isVisible && node.pageId > 0 && isSearchMatch(needle, furniLines, pageIds, node)) {
        includeVisibleSubtree(node, marked);

        return true;
    }

    let found = false;

    for (const child of node.children) {
        if (markSearchNodes(needle, furniLines, pageIds, child, marked)) found = true;
    }

    if (node.isVisible && node.pageId > 0 && found) marked.add(node);

    return found;
};

export interface CatalogSearchNode {
    node: ICatalogNode;
    /** The item template depth the row is drawn with (addSearchResultToList). */
    depth: number;
}

/** CatalogNavigator.filter + addSearchNodesToList: the marked nodes in tree order, a level deeper below each marked parent. */
export const filterCatalogSearchNodes = (query: string, furniLines: string[], pageIds: Set<number>, rootNode: ICatalogNode): CatalogSearchNode[] => {
    const marked = new Set<ICatalogNode>();
    const nodes: CatalogSearchNode[] = [];

    if (!rootNode) return nodes;

    markSearchNodes(normalizeCatalogSearchText(query), furniLines, pageIds, rootNode, marked);

    const addNodes = (node: ICatalogNode, depth: number) => {
        for (const child of node.children) {
            if (child.isVisible && marked.has(child)) {
                nodes.push({ node: child, depth: depth + 1 });
                addNodes(child, depth + 1);
            } else {
                addNodes(child, depth);
            }
        }
    };

    addNodes(rootNode, 1);

    return nodes;
};
