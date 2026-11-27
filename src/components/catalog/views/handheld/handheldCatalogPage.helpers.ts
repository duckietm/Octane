import { ICatalogNode, ICatalogPage } from '../../../../api';
import { findActiveCatalogNode, isCatalogHeadingPage } from '../../../../api/catalog/CatalogCategoryIndex';
import { getCatalogLayoutDefinition } from '../page/layout/catalogLayoutRegistry';

/**
 * Whether the open page is drawn by the phone's own default layout (item grid and bottom product panel): the
 * default kind of page, unless it is a heading page that only lists its sub pages (staff editing keep the grid).
 */
export const handheldCatalogPageHasPanel = (
    page: ICatalogPage | null | undefined,
    activeNodes: ReadonlyArray<ICatalogNode> | null | undefined,
    adminMode = false
): boolean => {
    if (!page) return false;
    if (getCatalogLayoutDefinition(page.layoutCode)?.renderer !== 'default') return false;

    return adminMode || !isCatalogHeadingPage(page.offers?.length ?? 0, findActiveCatalogNode(activeNodes, page.pageId));
};
