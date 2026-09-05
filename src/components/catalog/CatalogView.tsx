import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FaBars, FaCog } from 'react-icons/fa';
import { CatalogType, GetConfigurationValue, LocalizeShortNumber, LocalizeText, SanitizeHtml } from '../../api';
import { LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState, useHasPermission, usePurse } from '../../hooks';
import { CatalogStudioProvider } from './admin/studio/CatalogStudioProvider';
import { CatalogAdminProvider, useCatalogAdmin } from './CatalogAdminContext';
import { getCatalogHeaderDescription } from './catalogLocalization.helpers';
import { parseCatalogTabLabel, useCatalogWindowWidth } from './useCatalogWindowWidth';
import { CatalogAdminManagerView } from './views/admin/CatalogAdminManagerView';
import { CatalogAdminOfferEditView } from './views/admin/CatalogAdminOfferEditView';
import { CatalogAdminPageEditView } from './views/admin/CatalogAdminPageEditView';
import { CatalogLoadingStateView } from './views/CatalogLoadingStateView';
import { CatalogBuildersClubStatusView } from './views/catalog-header/CatalogBuildersClubStatusView';
import { CatalogIconView } from './views/catalog-icon/CatalogIconView';
import { CatalogGiftView } from './views/gift/CatalogGiftView';
import { CatalogBreadcrumbView } from './views/navigation/CatalogBreadcrumbView';
import { CatalogNavigationView } from './views/navigation/CatalogNavigationView';
import { CatalogSearchView } from './views/page/common/CatalogSearchView';
import { GetCatalogLayout } from './views/page/layout/GetCatalogLayout';
import { MarketplacePostOfferView } from './views/page/layout/marketplace/MarketplacePostOfferView';

const CatalogViewInner: FC<{}> = () => {
    const { rootNode = null, currentPage = null, searchResult = null, isBusy = false, catalogLoadError = null } = useCatalogData();
    const {
        isVisible = false,
        setIsVisible = null,
        navigationHidden = false,
        setNavigationHidden = null,
        activeNodes = [],
        setSearchResult = null,
        currentType = CatalogType.NORMAL
    } = useCatalogUiState();
    const {
        openPageById = null,
        openPageByName = null,
        openPageByOfferId = null,
        activateNode = null,
        openCatalogByType = null,
        toggleCatalogByType = null,
        retryCurrentPage = null
    } = useCatalogActions();
    const catalogAdmin = useCatalogAdmin();
    const adminMode = catalogAdmin?.adminMode ?? false;
    const setAdminMode = catalogAdmin?.setAdminMode ?? (() => {});

    const isMod = useHasPermission('acc_catalogfurni');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { purse = null } = usePurse();
    const displayedCurrencies = GetConfigurationValue<number[]>('system.currency.types', []);
    const activeCatalogNode = activeNodes?.[activeNodes.length - 1] ?? null;
    const buildersClubEnabled = GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true));
    // Strip technical suffixes like "(BC)" or "(Hot)" but keep the
    // pageId hint the gameserver appends when the viewer has
    // ACC_CATALOG_IDS - that's a pure-numeric "(6)" trailer.
    const stripSwfTabSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
    const getSwfTabLabel = (label: string) => stripSwfTabSuffix(parseCatalogTabLabel(label).name);
    const tabsShellRef = useRef<HTMLDivElement>(null);

    const visibleRootTabCount = useMemo(() => {
        if (!rootNode?.children?.length) return 0;

        return rootNode.children.filter((child) => {
            if (!child.isVisible) return false;

            return true;
        }).length;
    }, [rootNode]);

    const catalogWindowStyle = useCatalogWindowWidth(
        tabsShellRef,
        isVisible,
        visibleRootTabCount,
        adminMode,
        isMod,
        currentType,
        rootNode?.pageId,
        activeCatalogNode?.pageId
    );

    useEffect(() => {
        const getCatalogTypeFromLink = (type?: string) => {
            switch ((type || '').toLowerCase()) {
                case 'bc':
                case 'builder':
                case 'buildersclub':
                case 'builders_club':
                    return buildersClubEnabled ? CatalogType.BUILDER : CatalogType.NORMAL;
                default:
                    return CatalogType.NORMAL;
            }
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts.length > 2) {
                            openCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        if (parts.length > 2) {
                            toggleCatalogByType(getCatalogTypeFromLink(parts[2]));

                            return;
                        }

                        setIsVisible((prevValue) => !prevValue);
                        return;
                    case 'open':
                        if (parts.length > 2) {
                            if (parts.length === 4) {
                                switch (parts[2]) {
                                    case 'offerId':
                                        openPageByOfferId(parseInt(parts[3]));
                                        return;
                                }
                            } else {
                                const pageId = Number(parts[2]);

                                if (Number.isInteger(pageId) && pageId > 0) openPageById(pageId);
                                else openPageByName(parts[2]);
                            }
                        } else {
                            setIsVisible(true);
                        }

                        return;
                }
            },
            eventUrlPrefix: 'catalog/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [setIsVisible, openPageById, openPageByOfferId, openPageByName, openCatalogByType, toggleCatalogByType, buildersClubEnabled]);

    return (
        <>
            {isVisible && (
                <OctaneCardView
                    classNames={['octane-catalog-window']}
                    dragStyle={catalogWindowStyle}
                    isResizable={false}
                    style={catalogWindowStyle}
                    uniqueKey="catalog"
                >
                    <OctaneCardHeaderView
                        className={currentType === CatalogType.BUILDER ? 'builders-club-card-header' : ''}
                        headerText={isBusy ? LocalizeText('generic.loading') || 'Loading...' : LocalizeText('catalog.title')}
                        onCloseClick={() => setIsVisible(false)}
                    />
                    <div className="octane-catalog-mobile-header">
                        {isMod && (
                            <div className="octane-catalog-mobile-burger">
                                <button className="octane-catalog-burger-btn" onClick={() => setMobileMenuOpen((value) => !value)}>
                                    <FaBars />
                                </button>
                                {mobileMenuOpen && (
                                    <div className="octane-catalog-burger-menu">
                                        <button
                                            onClick={() => {
                                                setAdminMode(!adminMode);
                                                setMobileMenuOpen(false);
                                            }}
                                        >
                                            {adminMode ? 'Exit Admin' : 'Admin'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="octane-catalog-mobile-currency">
                            <div className="octane-catalog-coin">
                                <span>{LocalizeShortNumber(purse?.credits ?? 0)}</span>
                                <LayoutCurrencyIcon type={-1} />
                            </div>
                            {displayedCurrencies.map((type) => (
                                <div key={type} className="octane-catalog-coin">
                                    <span>{LocalizeShortNumber(purse?.activityPoints?.get(type) ?? 0)}</span>
                                    <LayoutCurrencyIcon type={type} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <OctaneCardTabsView classNames={['octane-catalog-tabs-shell']} innerRef={tabsShellRef} justifyContent="start">
                        {rootNode &&
                            rootNode.children.length > 0 &&
                            rootNode.children.map((child, index) => {
                                if (!child.isVisible) return null;
                                return (
                                    <OctaneCardTabsItemView
                                        key={`${child.pageId}-${child.pageName}-${index}`}
                                        isActive={child.isActive}
                                        title={child.localization}
                                        onClick={() => {
                                            if (searchResult) setSearchResult(null);

                                            activateNode(child);
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            {child.iconId > 0 && <CatalogIconView icon={child.iconId} className="octane-catalog-tab-icon" />}
                                            <span className="octane-catalog-tab-label">{getSwfTabLabel(child.localization)}</span>
                                        </div>
                                    </OctaneCardTabsItemView>
                                );
                            })}
                        {isMod && (
                            <OctaneCardTabsItemView classNames={['octane-catalog-admin-tab']} isActive={adminMode} onClick={() => setAdminMode(!adminMode)}>
                                <FaCog className={`text-[10px] ${adminMode ? 'animate-spin' : ''}`} style={adminMode ? { animationDuration: '3s' } : {}} />
                            </OctaneCardTabsItemView>
                        )}
                    </OctaneCardTabsView>
                    <div className={`octane-catalog-standard-header ${currentType === CatalogType.BUILDER ? 'is-builder' : ''}`}>
                        <div
                            className="octane-catalog-standard-header-bg"
                            style={currentPage?.localization?.getImage(0) ? { backgroundImage: `url(${currentPage.localization.getImage(0)})` } : undefined}
                        />
                        <div className="octane-catalog-standard-header-icon">
                            <CatalogIconView icon={activeCatalogNode?.iconId ?? rootNode?.iconId ?? 1} />
                        </div>
                        <div className="octane-catalog-standard-header-copy">
                            {currentType === CatalogType.BUILDER ? (
                                <CatalogBuildersClubStatusView />
                            ) : (
                                <>
                                    <div className="octane-catalog-standard-header-title">
                                        {searchResult
                                            ? LocalizeText('catalog.search.header')
                                            : getSwfTabLabel(activeCatalogNode?.localization ?? LocalizeText('catalog.title'))}
                                    </div>
                                    <div
                                        className="octane-catalog-standard-header-description"
                                        dangerouslySetInnerHTML={{
                                            __html: SanitizeHtml(
                                                searchResult
                                                    ? LocalizeText(
                                                          'catalog.search.results',
                                                          ['count', 'needle'],
                                                          [String(searchResult.offers.length), searchResult.searchValue]
                                                      )
                                                    : getCatalogHeaderDescription(currentPage?.layoutCode, currentPage?.localization)
                                            )
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                    <OctaneCardContentView classNames={['octane-catalog-content-shell']}>
                        <div className={`octane-catalog-stage ${navigationHidden ? 'is-navigation-hidden' : ''}`}>
                            {!navigationHidden && (
                                <div className="octane-catalog-sidebar">
                                    <div className="octane-catalog-search-shell">
                                        <CatalogSearchView />
                                    </div>
                                    <div className="octane-catalog-navigation-shell">
                                        {activeNodes && activeNodes.length > 0 && <CatalogNavigationView node={activeNodes[0]} catalogType={currentType} />}
                                    </div>
                                </div>
                            )}
                            <div aria-busy={isBusy} className="octane-catalog-layout-shell">
                                <div className="octane-catalog-layout-header-shell">
                                    <CatalogBreadcrumbView />
                                    <div className="octane-catalog-layout-hero">
                                        {!!currentPage?.localization?.getImage(0) && <img alt="" src={currentPage.localization.getImage(0)} />}
                                    </div>
                                </div>
                                <div className="octane-catalog-layout-container">{GetCatalogLayout(currentPage, () => setNavigationHidden(true))}</div>
                            </div>
                        </div>
                    </OctaneCardContentView>
                    {(isBusy || catalogLoadError) && <CatalogLoadingStateView error={catalogLoadError} onRetry={retryCurrentPage} />}
                </OctaneCardView>
            )}
            <CatalogAdminManagerView />
            <CatalogAdminPageEditView />
            <CatalogAdminOfferEditView />
            <CatalogGiftView />
            <MarketplacePostOfferView />
        </>
    );
};

export const CatalogView: FC<{}> = () => {
    const { catalogLocalizationVersion = 0 } = useCatalogData();
    const { isVisible = false } = useCatalogUiState();

    const isCatalogAdmin = useHasPermission('acc_catalogfurni');

    // Opening a studio session is expensive on the server: it loads every
    // catalog item with FOR UPDATE and every items_base id, on the thread
    // serving this client. Tying it to authentication meant every staff login
    // stalled the hotel view — no room list, no catalog — until it finished.
    // The session is only needed once the catalog is actually open.
    return (
        <CatalogStudioProvider active={isCatalogAdmin && isVisible}>
            <CatalogAdminProvider>
                <div className="hidden" data-catalog-localization-version={catalogLocalizationVersion} />
                <CatalogViewInner />
            </CatalogAdminProvider>
        </CatalogStudioProvider>
    );
};
