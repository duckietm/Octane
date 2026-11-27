import { FC, KeyboardEvent } from 'react';
import { FaChevronRight, FaSearch } from 'react-icons/fa';
import { getCatalogNodeKey, handheldCatalogLabel, ICatalogNode, localizeWithFallback, SearchResult, visibleCatalogChildren } from '../../../../api';
import { catalogListHasOverview, catalogRowOpensList } from '../../../../api/handheld/handheldCatalogBrowse';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useCatalogStore } from '../../../../hooks/catalog/catalogStore';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogSearchView } from '../page/common/CatalogSearchView';

export interface HandheldCatalogMenuViewProps {
    rootNode: ICatalogNode | null;
    listNode: ICatalogNode | null;
    searchResult: SearchResult | null;
    onOpenRow: (node: ICatalogNode) => void;
    onOpenListPage: () => void;
    onShowResults: () => void;
}

/** One row of the page list: icon, name and, for a folder, an arrow that says a tap opens more pages. */
const HandheldCatalogRow: FC<{ node: ICatalogNode; label?: string; isOverview?: boolean; onOpen: () => void }> = ({ node, label, isOverview = false, onOpen }) => {
    const opensList = !isOverview && catalogRowOpensList(node);

    return (
        <NativeTextTree>
            <li>
            <BaseButton
                aria-current={node.isActive && !opensList ? 'page' : undefined}
                className={`octane-handheld-catalog__row${isOverview ? ' is-overview' : ''}${opensList ? ' is-folder' : ''}`}
                data-page-id={node.pageId}
                onClick={onOpen}
            >
                <span className="octane-handheld-catalog__row-icon">
                    <CatalogIconView icon={node.iconId} />
                </span>
                <span className="octane-handheld-catalog__row-label">{label ?? handheldCatalogLabel(node.localization)}</span>
                {opensList && <FaChevronRight aria-hidden="true" className="octane-handheld-catalog__row-arrow" />}
            </BaseButton>
            </li>
        </NativeTextTree>
    );
};

/**
 * Phone catalogue: the page tree one level at a time, as a full-width list of large rows, with the search
 * field on top. While a search runs the list holds the pages it found and a row that shows the results;
 * the keyboard's enter key goes straight to them.
 */
export const HandheldCatalogMenuView: FC<HandheldCatalogMenuViewProps> = (props) => {
    const { rootNode = null, listNode = null, searchResult = null, onOpenRow, onOpenListPage, onShowResults } = props;
    const rows: ICatalogNode[] = searchResult ? searchResult.filteredNodes.map((entry) => entry.node) : visibleCatalogChildren(listNode);
    const showOverview = !searchResult && catalogListHasOverview(listNode, rootNode);

    // CatalogSearchView runs the search on enter itself; once it has results the page with them is shown.
    const onSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' || !useCatalogStore.getState().searchResult) return;

        (event.target as HTMLElement)?.blur?.();
        onShowResults();
    };

    return (
        <NativeTextTree>
            <div className="octane-handheld-catalog__menu">
                <div className="octane-handheld-catalog__search" onKeyDown={onSearchKeyDown}>
                    <CatalogSearchView />
                </div>
                {searchResult && (
                    <BaseButton className="octane-handheld-catalog__results" onClick={onShowResults}>
                        <FaSearch aria-hidden="true" />
                        <span>
                            {localizeWithFallback('octane.handheld.catalog.results', 'Show %count% results', ['count'], [String(searchResult.offers.length)])}
                        </span>
                    </BaseButton>
                )}
                <ul aria-label={localizeWithFallback('octane.handheld.catalog.pages', 'Catalogue pages')} className="octane-handheld-catalog__list">
                    {showOverview && listNode && (
                        <HandheldCatalogRow
                            isOverview
                            label={localizeWithFallback('octane.handheld.catalog.overview', 'All of %name%', ['name'], [handheldCatalogLabel(listNode.localization)])}
                            node={listNode}
                            onOpen={onOpenListPage}
                        />
                    )}
                    {rows.map((node, index) => (
                        <HandheldCatalogRow key={getCatalogNodeKey(node, index)} node={node} onOpen={() => onOpenRow(node)} />
                    ))}
                </ul>
            </div>
        </NativeTextTree>
    );
};
