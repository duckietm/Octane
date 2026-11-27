import { FC, KeyboardEvent, useEffect, useRef } from 'react';
import { getCatalogNodeKey, handheldCatalogLabel, ICatalogNode, localizeWithFallback, SearchResult } from '../../../../api';
import { catalogListHasOverview, catalogListRows, catalogRowOpensList } from '../../../../api/handheld/handheldCatalogBrowse';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useCatalogStore } from '../../../../hooks/catalog/catalogStore';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CatalogSearchView } from '../page/common/CatalogSearchView';

export interface HandheldCatalogMenuViewProps {
    rootNode: ICatalogNode | null;
    listNode: ICatalogNode | null;
    /** The folder one level up; with it the list starts with a row that goes back there. */
    upNode: ICatalogNode | null;
    /** The name shown for the folder one level up. */
    upLabel: string | null;
    searchResult: SearchResult | null;
    onOpenRow: (node: ICatalogNode) => void;
    onOpenListPage: () => void;
    onUp: () => void;
    onShowResults: () => void;
}

const Chevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-shop__row-arrow" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

/** One row of the page list: icon, name and, for a folder, an arrow that says a tap opens more pages. */
const HandheldCatalogRow: FC<{ node: ICatalogNode; label?: string; isOverview?: boolean; isOwnPage?: boolean; onOpen: () => void }> = (props) => {
    const { node, label, isOverview = false, isOwnPage = false, onOpen } = props;
    const opensList = !isOverview && !isOwnPage && catalogRowOpensList(node);
    const isCurrent = node.isActive && !opensList;
    const rowRef = useRef<HTMLLIElement>(null);

    // The open page's row is in view when the list comes on screen (beside the page on a phone held on its side).
    useEffect(() => {
        if (isCurrent) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [isCurrent]);

    return (
        <NativeTextTree>
            <li ref={rowRef}>
            <BaseButton
                aria-current={isCurrent ? 'page' : undefined}
                className={`octane-handheld-shop__row${isOverview ? ' is-overview' : ''}${opensList ? ' is-folder' : ''}`}
                data-page-id={node.pageId}
                onClick={onOpen}
            >
                <span className="octane-handheld-shop__row-icon">
                    <CatalogIconView icon={node.iconId} />
                </span>
                <span className="octane-handheld-shop__row-label">{label ?? handheldCatalogLabel(node.localization)}</span>
                {opensList && <Chevron />}
            </BaseButton>
            </li>
        </NativeTextTree>
    );
};

/**
 * Phone catalogue: the pages of the open tab, one level of the tree at a time, as a list of large rows under the
 * search field. A folder opens its own list (its first row goes back up). While a search runs the list holds the
 * pages it found and a button that shows the results; the keyboard's enter key goes straight to them.
 */
export const HandheldCatalogMenuView: FC<HandheldCatalogMenuViewProps> = (props) => {
    const { rootNode = null, listNode = null, upNode = null, upLabel = null, searchResult = null, onOpenRow, onOpenListPage, onUp, onShowResults } = props;
    const rows: ICatalogNode[] = searchResult ? searchResult.filteredNodes.map((entry) => entry.node) : catalogListRows(listNode, rootNode);
    const showOverview = !searchResult && catalogListHasOverview(listNode, rootNode);
    const showUp = !searchResult && !!upNode && upLabel !== null;

    // CatalogSearchView runs the search on enter itself; once it has results the page with them is shown.
    const onSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' || !useCatalogStore.getState().searchResult) return;

        (event.target as HTMLElement)?.blur?.();
        onShowResults();
    };

    return (
        <NativeTextTree>
            <div className="octane-handheld-shop__menu">
                <div className="octane-handheld-shop__search" onKeyDown={onSearchKeyDown}>
                    <span aria-hidden="true" className="octane-handheld-shop__search-glass" />
                    <CatalogSearchView />
                </div>
                {searchResult && (
                    <BaseButton className="octane-handheld-shop__results" onClick={onShowResults}>
                        {localizeWithFallback('octane.handheld.catalog.results', 'Show %count% results', ['count'], [String(searchResult.offers.length)])}
                    </BaseButton>
                )}
                <ul aria-label={localizeWithFallback('octane.handheld.catalog.pages', 'Catalogue pages')} className="octane-handheld-shop__list">
                    {showUp && (
                        <li>
                            <BaseButton
                                aria-label={localizeWithFallback('octane.handheld.catalog.back', 'Back to %name%', ['name'], [upLabel])}
                                className="octane-handheld-shop__row is-up"
                                onClick={onUp}
                            >
                                <span className="octane-handheld-shop__row-icon">
                                    <Chevron back />
                                </span>
                                <span className="octane-handheld-shop__row-label">{upLabel}</span>
                            </BaseButton>
                        </li>
                    )}
                    {showOverview && listNode && (
                        <HandheldCatalogRow
                            isOverview
                            label={localizeWithFallback('octane.handheld.catalog.overview', 'All of %name%', ['name'], [handheldCatalogLabel(listNode.localization)])}
                            node={listNode}
                            onOpen={onOpenListPage}
                        />
                    )}
                    {rows.map((node, index) => (
                        <HandheldCatalogRow key={getCatalogNodeKey(node, index)} isOwnPage={node === listNode} node={node} onOpen={() => onOpenRow(node)} />
                    ))}
                </ul>
            </div>
        </NativeTextTree>
    );
};
