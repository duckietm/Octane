import { FC, ReactNode, useMemo } from 'react';
import {
    GetConfigurationValue,
    handheldCatalogLabel,
    ICatalogNode,
    ICatalogPage,
    LocalizeShortNumber,
    LocalizeText,
    localizeWithFallback,
    SearchResult,
    visibleCatalogChildren
} from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';
import { HandheldSheetFrame } from '../../../../common/handheld/HandheldSheetFrame';
import { HandheldCatalogPageContext } from '../../../../hooks/catalog/handheldCatalogPageContext';
import { useHandheldCatalogBrowser } from '../../../../hooks/catalog/useHandheldCatalogBrowser';
import { usePurse } from '../../../../hooks/purse/usePurse';
import { handheldCatalogPageHasPanel } from './handheldCatalogPage.helpers';
import { HandheldCatalogMenuView } from './HandheldCatalogMenuView';
import { HandheldCatalogStripView } from './HandheldCatalogStripView';

export interface HandheldCatalogViewProps {
    rootNode: ICatalogNode | null;
    currentPage: ICatalogPage | null;
    activeNodes: ICatalogNode[];
    searchResult: SearchResult | null;
    isBusy: boolean;
    /** The catalogue is being edited by staff: a page without offers keeps its grid. */
    adminMode?: boolean;
    /** The top pages are tabs (the catalogue); off for the Builders Club warehouse, whose tree has no tab row. */
    useTabs: boolean;
    /** The open page as its layout draws it. */
    renderPage: () => ReactNode;
    /** Title of the window (the catalogue or the Builders Club warehouse). */
    title: string;
    onClose: () => void;
    /** Drawn over the sheet (the loading and error state). */
    children?: ReactNode;
}

/** The credits and activity points beside the title, so a price can be weighed without leaving the shop. */
const HandheldCatalogPurseView: FC<{}> = () => {
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);

    return (
        <div className="octane-handheld-shop__purse">
            <span className="octane-handheld-shop__coin">
                <LayoutCurrencyIcon type={-1} />
                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
            </span>
            {displayedCurrencies.slice(0, 2).map((type) => (
                <span key={type} className="octane-handheld-shop__coin">
                    <LayoutCurrencyIcon type={type} />
                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                </span>
            ))}
        </div>
    );
};

/**
 * The shop on a phone, in the Octane handheld look: the shared sheet frame (header, close), the top pages as a row
 * of pill tabs, and under them the list of the tab's pages and the open page. Upright one of the two is on screen
 * (tab, then list, then page; "back" in the page's bottom strip returns to the list); on its side the list is a
 * column left of the page. The default page draws its own grid and bottom product panel
 * (HandheldCatalogLayoutDefaultView); every other layout keeps its AIR content inside the sheet.
 */
export const HandheldCatalogView: FC<HandheldCatalogViewProps> = (props) => {
    const { rootNode = null, currentPage = null, activeNodes = [], searchResult = null, isBusy = false, adminMode = false, useTabs, renderPage, title, onClose, children = null } = props;
    const browser = useHandheldCatalogBrowser(rootNode, useTabs);
    const tabs = useMemo(
        () => (useTabs ? visibleCatalogChildren(rootNode).map((node) => ({ id: String(node.pageId) + ':' + node.pageName, label: handheldCatalogLabel(node.localization), node })) : []),
        [rootNode, useTabs]
    );
    const activeTab = tabs.find((tab) => tab.node === browser.tabNode)?.id ?? null;
    const nameOf = (node: ICatalogNode | null) => (!node || node === rootNode ? title : handheldCatalogLabel(node.localization));
    const showsSearchPage = !!searchResult && (currentPage?.pageId ?? -1) === -1;
    const pageNode = activeNodes?.length ? activeNodes[activeNodes.length - 1] : null;
    const pageTitle = showsSearchPage ? LocalizeText('catalog.search.header') : handheldCatalogLabel(pageNode?.localization ?? title);
    const pageContext = useMemo(() => ({ pageTitle, backLabel: nameOf(browser.listNode), onBack: browser.goBack }), [pageTitle, browser.listNode, browser.goBack, rootNode, title]);
    // The default page carries the strip in its own bottom panel; any other layout gets it from here.
    const pageOwnsStrip = handheldCatalogPageHasPanel(currentPage, activeNodes, adminMode);

    return (
        <HandheldSheetFrame
            activeTab={activeTab}
            className="octane-handheld-shop"
            headerExtra={<HandheldCatalogPurseView />}
            icon="icon-catalog"
            tabs={tabs}
            tabsLabel={localizeWithFallback('octane.handheld.catalog.tabs', 'Shop sections')}
            title={title}
            onClose={onClose}
            onTab={(id) => {
                const tab = tabs.find((entry) => entry.id === id);

                if (tab) browser.openTab(tab.node);
            }}
        >
            <div className="octane-handheld-shop__panes" data-step={browser.step}>
                <HandheldCatalogMenuView
                    listNode={browser.listNode}
                    rootNode={rootNode}
                    searchResult={searchResult}
                    upLabel={browser.upNode ? nameOf(browser.upNode) : null}
                    upNode={browser.upNode}
                    onOpenListPage={browser.openListPage}
                    onOpenRow={browser.openRow}
                    onShowResults={browser.showPage}
                    onUp={browser.goBack}
                />
                <HandheldCatalogPageContext value={pageContext}>
                    <div aria-busy={isBusy} className={`octane-handheld-shop__page${pageOwnsStrip ? ' has-panel' : ''}`}>
                        {pageOwnsStrip ? (
                            renderPage()
                        ) : (
                            <>
                                {/* A layout other than the default grid keeps its AIR content (and the AIR catalogue's rules). */}
                                <div className="octane-catalog-window octane-handheld-shop__air">
                                    <div className="octane-handheld-catalog__page">{renderPage()}</div>
                                </div>
                                <HandheldCatalogStripView />
                            </>
                        )}
                    </div>
                </HandheldCatalogPageContext>
            </div>
            {children}
        </HandheldSheetFrame>
    );
};
