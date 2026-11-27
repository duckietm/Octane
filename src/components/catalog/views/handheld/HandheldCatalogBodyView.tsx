import { FC, ReactNode } from 'react';
import { GetConfigurationValue, handheldCatalogLabel, ICatalogNode, ICatalogPage, LocalizeShortNumber, LocalizeText, SearchResult } from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';
import { useHandheldCatalogBrowser } from '../../../../hooks/catalog/useHandheldCatalogBrowser';
import { usePurse } from '../../../../hooks/purse/usePurse';
import { HandheldCatalogMenuView } from './HandheldCatalogMenuView';
import { HandheldCatalogTrailView } from './HandheldCatalogTrailView';

export interface HandheldCatalogBodyViewProps {
    rootNode: ICatalogNode | null;
    currentPage: ICatalogPage | null;
    activeNodes: ICatalogNode[];
    searchResult: SearchResult | null;
    isBusy: boolean;
    /** The open page as the desktop draws it (its layout); the phone css stacks it. */
    renderPage: () => ReactNode;
    /** Title of the top of the tree (the catalogue or the Builders Club warehouse). */
    rootTitle: string;
}

/** The credits and activity points, so the price of what is open can be weighed without leaving the page. */
const HandheldCatalogPurseView: FC<{}> = () => {
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);

    return (
        <div className="octane-handheld-catalog__purse">
            <span className="octane-handheld-catalog__coin">
                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
                <LayoutCurrencyIcon type={-1} />
            </span>
            {displayedCurrencies.map((type) => (
                <span key={type} className="octane-handheld-catalog__coin">
                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                    <LayoutCurrencyIcon type={type} />
                </span>
            ))}
        </div>
    );
};

/**
 * Phone catalogue: instead of the tab strip and the tree beside the page, one screen at a time. The list
 * of pages comes first; a page fills the window with its parts stacked (the phone css does that), and the
 * bar on top always goes back one step.
 */
export const HandheldCatalogBodyView: FC<HandheldCatalogBodyViewProps> = (props) => {
    const { rootNode = null, currentPage = null, activeNodes = [], searchResult = null, isBusy = false, renderPage, rootTitle } = props;
    const browser = useHandheldCatalogBrowser(rootNode);
    const isRoot = !browser.listNode || browser.listNode === rootNode;
    const listTitle = isRoot ? rootTitle : handheldCatalogLabel(browser.listNode.localization);
    const showsSearchPage = !!searchResult && (currentPage?.pageId ?? -1) === -1;
    const pageNode = activeNodes?.length ? activeNodes[activeNodes.length - 1] : null;
    const pageTitle = showsSearchPage ? LocalizeText('catalog.search.header') : handheldCatalogLabel(pageNode?.localization ?? rootTitle);

    if (browser.step === 'page') {
        return (
            <div className="octane-handheld-catalog" data-step="page">
                <HandheldCatalogTrailView backLabel={listTitle} title={pageTitle} onBack={browser.goBack} />
                <HandheldCatalogPurseView />
                <div aria-busy={isBusy} className="octane-handheld-catalog__page">
                    {renderPage()}
                </div>
            </div>
        );
    }

    const upTitle = browser.upNode ? (browser.upNode === rootNode ? rootTitle : handheldCatalogLabel(browser.upNode.localization)) : null;

    return (
        <div className="octane-handheld-catalog" data-step="menu">
            <HandheldCatalogTrailView backLabel={upTitle} title={listTitle} onBack={browser.upNode ? browser.goBack : undefined} />
            <HandheldCatalogMenuView
                listNode={browser.listNode}
                rootNode={rootNode}
                searchResult={searchResult}
                onOpenListPage={browser.openListPage}
                onOpenRow={browser.openRow}
                onShowResults={browser.showPage}
            />
        </div>
    );
};
