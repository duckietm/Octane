import { FC, useCallback, useMemo } from 'react';
import { CatalogType, ICatalogNode, LocalizeText } from '../../../../api';
import { ClassicScrollAreaView } from '../../../../common';
import { useCatalogActions, useCatalogData } from '../../../../hooks';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';
import { CatalogNavigationSetView } from './CatalogNavigationSetView';

export interface CatalogNavigationViewProps {
    node: ICatalogNode;
    catalogType?: string;
}

export const CatalogNavigationView: FC<CatalogNavigationViewProps> = (props) => {
    const { node = null, catalogType = CatalogType.NORMAL } = props;
    const { searchResult = null } = useCatalogData();
    const { activateNode = null } = useCatalogActions();
    const catalogAdmin = useCatalogAdmin();
    const adminMode = catalogAdmin?.adminMode ?? false;
    const deletePage = catalogAdmin?.deletePage;
    const reorderPage = catalogAdmin?.reorderPage;
    const setCreatingPage = catalogAdmin?.setCreatingPage;
    const setEditingPageData = catalogAdmin?.setEditingPageData;
    const setEditingPageNode = catalogAdmin?.setEditingPageNode;
    const setEditingRootPage = catalogAdmin?.setEditingRootPage;

    const createSubpage = useCallback(
        (targetNode: ICatalogNode) => {
            setCreatingPage?.(true);
            setEditingRootPage?.(false);
            setEditingPageNode?.(targetNode);
            setEditingPageData?.(true);
        },
        [setCreatingPage, setEditingPageData, setEditingPageNode, setEditingRootPage]
    );

    const removePage = useCallback(
        (targetNode: ICatalogNode) => {
            if (!deletePage || !confirm(LocalizeText('catalog.admin.delete.page.confirm', ['name'], [targetNode.localization]))) return;

            deletePage(targetNode.pageId);
        },
        [deletePage]
    );

    const runtime = useMemo<CatalogNavigationRuntime>(
        () => ({
            activateNode,
            adminMode,
            createSubpage,
            deletePage: removePage,
            reorderPage: (pageId, parentId, index) => reorderPage?.(pageId, parentId, index)
        }),
        [activateNode, adminMode, createSubpage, removePage, reorderPage]
    );

    return (
        <ClassicScrollAreaView
            aria-label="Catalog categories"
            className="octane-catalog-navigation-scroll-area"
            contentClassName={`octane-catalog-navigation-list ${catalogType === CatalogType.BUILDER ? 'is-builders-club' : 'is-normal'}`}
            role="tree"
        >
            {searchResult &&
                searchResult.filteredNodes.length > 0 &&
                searchResult.filteredNodes.map((n, index) => {
                    return <CatalogNavigationItemView key={n.pageId} node={n} runtime={runtime} />;
                })}
            {!searchResult && <CatalogNavigationSetView node={node} runtime={runtime} />}
        </ClassicScrollAreaView>
    );
};
