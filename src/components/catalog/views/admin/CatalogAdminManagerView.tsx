import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
    FaArrowDown,
    FaArrowsAlt,
    FaArrowUp,
    FaCheckCircle,
    FaChevronDown,
    FaChevronRight,
    FaEdit,
    FaExclamationTriangle,
    FaEye,
    FaEyeSlash,
    FaHistory,
    FaPlus,
    FaSearch,
    FaSitemap,
    FaTrash,
    FaWrench,
} from 'react-icons/fa';
import { GetConfigurationValue, ICatalogNode, IPurchasableOffer, LocalizeText, ProductTypeEnum } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../hooks';
import { replaceCatalogPageOffers } from '../../../../hooks/catalog/useCatalog.helpers';
import { getCatalogStudioCommandState, getCatalogStudioWorkspaceTabs } from '../../admin/studio/CatalogStudioCommandCenter';
import { CatalogStudioProblemsHistoryPanel } from '../../admin/studio/CatalogStudioProblemsHistoryPanel';
import { CatalogStudioValidationIssue } from '../../admin/studio/CatalogStudioTypes';
import { CatalogStudioTransferPanel } from '../../admin/studio/CatalogStudioTransferPanel';
import { useCatalogStudio } from '../../admin/studio/useCatalogStudio';
import { useCatalogAdmin } from '../../CatalogAdminContext';
import { parseCatalogTabLabel } from '../../useCatalogWindowWidth';
import { isReadOnlyCatalogAdminLayout } from '../page/layout/catalogLayoutRegistry';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import {
    buildCatalogAdminDraftTree,
    CatalogAdminPageDropPosition,
    planCatalogAdminPageDrop,
    resolveCatalogAdminPageDropPosition
} from './CatalogAdminDraftTree';
import { CatalogAdminOfferPriceView } from './CatalogAdminOfferPriceView';

type CatalogAdminOffer = Parameters<NonNullable<ReturnType<typeof useCatalogAdmin>>['setEditingOffer']>[0];
type ManagerTab = 'catalog' | 'sql' | 'history';

const stripSwfSuffix = (label: string) => (label || '').replace(/\s*\(\D[^)]*\)\s*$/g, '').trim();
const nodeName = (node: ICatalogNode) => stripSwfSuffix(parseCatalogTabLabel(node.localization).name) || node.pageName;

const findNodeByPageId = (node: ICatalogNode | null, pageId: number): ICatalogNode | null => {
    if (!node) return null;
    if (node.pageId === pageId) return node;

    for (const child of node.children) {
        const found = findNodeByPageId(child, pageId);
        if (found) return found;
    }

    return null;
};

const subtreeMatches = (node: ICatalogNode, query: string): boolean => {
    if (!query) return true;
    if (nodeName(node).toLowerCase().includes(query)) return true;

    return node.children.some((child) => subtreeMatches(child, query));
};

const getOfferIconUrl = (offer: IPurchasableOffer): string | null => {
    const product = offer.product;
    if (!product) return null;

    if (product.productType === ProductTypeEnum.FLOOR || product.productType === ProductTypeEnum.WALL) {
        const className = product.furnitureData?.className;

        if (className?.length) {
            let param = '';

            if (product.productType === ProductTypeEnum.WALL && product.extraParam?.length) {
                param = `_${product.extraParam}`;
            } else if (product.productType === ProductTypeEnum.FLOOR && product.furnitureData?.hasIndexedColor && product.furnitureData.colorIndex > 0) {
                param = `_${product.furnitureData.colorIndex}`;
            }

            const configuredIconUrl = GetConfigurationValue<string>('furni.asset.icon.url', '');
            if (configuredIconUrl?.length) return configuredIconUrl.replace('%libname%', className).replace('%param%', param);
        }
    }

    return product.getIconUrl(offer) ?? null;
};

export const CatalogAdminManagerView: FC<{}> = () => {
    const { rootNode = null, currentPage = null, currentOffer = null } = useCatalogData();
    const { setCurrentPage, setCurrentOffer, currentType } = useCatalogUiState();
    const { activateNode = null } = useCatalogActions();
    const catalogAdmin = useCatalogAdmin();
    const studio = useCatalogStudio();
    const [activeTab, setActiveTab] = useState<ManagerTab>('catalog');
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState('');
    const [pageDropTarget, setPageDropTarget] = useState<{ pageId: number; position: CatalogAdminPageDropPosition } | null>(null);
    const [rootDropActive, setRootDropActive] = useState(false);
    const [dragOverOfferIndex, setDragOverOfferIndex] = useState<number | null>(null);
    const [selectedPageId, setSelectedPageId] = useState(currentPage?.pageId ?? -1);

    const query = search.trim().toLowerCase();
    const managerRootNode = useMemo(
        () => buildCatalogAdminDraftTree(rootNode, studio.session?.pages ?? [], currentType),
        [currentType, rootNode, studio.session?.pages]
    );
    const selectedNode = findNodeByPageId(managerRootNode, selectedPageId);
    const offers = currentPage?.pageId === selectedPageId ? (currentPage.offers ?? []) : [];
    const selectedPageLayout = useMemo(
        () => (studio.session?.pages ?? []).find((page) => page.pageId === selectedPageId)?.pageLayout ?? null,
        [studio.session?.pages, selectedPageId]
    );
    const isReadOnlyPage = isReadOnlyCatalogAdminLayout(selectedPageLayout);
    const categoryCount = managerRootNode?.children.length ?? 0;
    const validationCurrent = studio.validation
        ? studio.validation.current && studio.validation.revision === studio.revision
        : studio.session?.validationCurrent ?? false;
    const validationIssueCount = studio.validation?.issues.length ?? studio.session?.validationIssueCount ?? 0;
    const commandState = getCatalogStudioCommandState({
        sessionReady: !!studio.session,
        validationCurrent,
        validationIssueCount,
        loading: studio.loading || !!catalogAdmin?.loading
    });

    useEffect(() => {
        if (!catalogAdmin?.adminMode || !studio.session) return;
        studio.loadHistory();
    }, [catalogAdmin?.adminMode, studio.session?.draftVersionId, studio.loadHistory]);

    useEffect(() => {
        if (activeTab !== 'history' || !commandState.canValidate) return;
        studio.validate();
    }, [activeTab, commandState.canValidate, studio.validate]);

    useEffect(() => {
        if (currentPage?.pageId != null && currentPage.pageId !== selectedPageId) setSelectedPageId(currentPage.pageId);
    }, [currentPage?.pageId, selectedPageId]);

    const handleProblemSelect = useCallback((issue: CatalogStudioValidationIssue) => {
        if (issue.entityType !== 'PAGE') return;

        setSelectedPageId(issue.entityId);
        setActiveTab('catalog');
    }, []);

    const handlePageDragStart = useCallback((event: React.DragEvent, node: ICatalogNode) => {
        event.stopPropagation();
        event.dataTransfer.setData('text/plain', JSON.stringify({ pageId: node.pageId }));
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    const handlePageDragOver = useCallback((event: React.DragEvent, node: ICatalogNode) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        const bounds = event.currentTarget.getBoundingClientRect();
        const position = resolveCatalogAdminPageDropPosition(event.clientY, bounds.top, bounds.height);
        setRootDropActive(false);
        setPageDropTarget({ pageId: node.pageId, position });
    }, []);

    const handlePageDragLeave = useCallback(() => {
        setPageDropTarget(null);
    }, []);

    const handlePageDrop = useCallback(
        (event: React.DragEvent, node: ICatalogNode) => {
            event.preventDefault();
            event.stopPropagation();
            setPageDropTarget(null);

            if (!catalogAdmin || !managerRootNode) return;

            try {
                const data = JSON.parse(event.dataTransfer.getData('text/plain'));
                const dragged = findNodeByPageId(managerRootNode, Number(data.pageId));
                const bounds = event.currentTarget.getBoundingClientRect();
                const position = resolveCatalogAdminPageDropPosition(event.clientY, bounds.top, bounds.height);
                const plan = planCatalogAdminPageDrop(dragged, node, position, managerRootNode);
                if (!plan) return;

                if (position === 'inside') {
                    setExpanded((current) => new Set(current).add(node.pageId));
                }
                catalogAdmin.reorderPage(
                    plan.pageId,
                    plan.newParentId,
                    plan.newIndex,
                    `Moved page #${plan.pageId} ${position} ${nodeName(node)}`
                );
            } catch {
            }
        },
        [catalogAdmin, managerRootNode]
    );

    const handleRootDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setPageDropTarget(null);
        setRootDropActive(true);
    }, []);

    const handleRootDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setRootDropActive(false);
        if (!catalogAdmin || !managerRootNode) return;

        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            const dragged = findNodeByPageId(managerRootNode, Number(data.pageId));
            const plan = planCatalogAdminPageDrop(dragged, null, 'root', managerRootNode);
            if (!plan) return;
            catalogAdmin.reorderPage(plan.pageId, plan.newParentId, plan.newIndex, `Moved page #${plan.pageId} to catalog root`);
        } catch {
        }
    }, [catalogAdmin, managerRootNode]);

    const reorderOffersToIndex = useCallback(
        (fromIndex: number, toIndex: number) => {
            if (!catalogAdmin || !currentPage || isReadOnlyPage) return;
            if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= offers.length || toIndex >= offers.length) return;

            const reordered = [...offers];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);

            setCurrentPage(replaceCatalogPageOffers(currentPage, reordered));

            const pageLabel = selectedNode ? nodeName(selectedNode) : 'page';
            catalogAdmin.reorderOffers(
                reordered.map((offer, i) => ({ id: offer.offerId, orderNumber: i })),
                `Reordered offers on "${pageLabel}"`,
                currentPage.pageId
            );
        },
        [catalogAdmin, currentPage, isReadOnlyPage, offers, selectedNode, setCurrentPage]
    );

    const handleOfferDragStart = useCallback((event: React.DragEvent, index: number) => {
        if (isReadOnlyPage) {
            event.preventDefault();
            return;
        }
        event.stopPropagation();
        event.dataTransfer.setData('application/x-catalog-admin-offer', JSON.stringify({ index }));
        event.dataTransfer.effectAllowed = 'move';
    }, [isReadOnlyPage]);

    const handleOfferDragOver = useCallback((event: React.DragEvent, index: number) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setDragOverOfferIndex(index);
    }, []);

    const handleOfferDragLeave = useCallback(() => {
        setDragOverOfferIndex(null);
    }, []);

    const handleOfferDrop = useCallback(
        (event: React.DragEvent, dropIndex: number) => {
            event.preventDefault();
            event.stopPropagation();
            setDragOverOfferIndex(null);

            try {
                const data = JSON.parse(event.dataTransfer.getData('application/x-catalog-admin-offer'));
                if (typeof data.index !== 'number') return;

                reorderOffersToIndex(data.index, dropIndex);
            } catch {
            }
        },
        [reorderOffersToIndex]
    );

    if (!catalogAdmin?.adminMode) return null;

    const toggleExpand = (pageId: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(pageId) ? next.delete(pageId) : next.add(pageId);

            return next;
        });
    };

    const selectNode = (node: ICatalogNode) => {
        if (node.children.length) setExpanded((prev) => new Set(prev).add(node.pageId));
        if (node.pageId > -1) {
            setSelectedPageId(node.pageId);

            const liveNode = findNodeByPageId(rootNode, node.pageId);
            if (liveNode) activateNode?.(liveNode);
        }
    };

    const editPage = (node: ICatalogNode | null, isRoot: boolean) => {
        catalogAdmin.setCreatingPage(false);
        catalogAdmin.setEditingPageNode(isRoot ? null : node);
        catalogAdmin.setEditingRootPage(isRoot);
        catalogAdmin.setEditingPageData(true);
    };

    const createCategory = (parent: ICatalogNode) => {
        catalogAdmin.setCreatingPage(true);
        catalogAdmin.setEditingRootPage(false);
        catalogAdmin.setEditingPageNode(parent);
        catalogAdmin.setEditingPageData(true);
    };

    const deletePage = (node: ICatalogNode) => {
        if (confirm(LocalizeText('catalog.admin.delete.category.confirm', ['name'], [nodeName(node)]))) {
            catalogAdmin.deletePage(node.pageId, `Deleted page: ${nodeName(node)}`);
        }
    };

    const movePage = (node: ICatalogNode, direction: -1 | 1) => {
        const parent = node.parent;
        if (!parent) return;

        const siblings = parent.children;
        const index = siblings.indexOf(node);
        const target = index + direction;
        if (target < 0 || target >= siblings.length) return;

        catalogAdmin.reorderPage(node.pageId, parent.pageId, target, `Moved page: ${nodeName(node)}`);
    };

    const newOffer = () => {
        if (!currentPage || isReadOnlyPage) return;

        catalogAdmin.setEditingOffer({
            offerId: -1,
            product: { productClassId: 0, productType: 'i', productCount: 1, extraParam: '' }
        } as CatalogAdminOffer);
    };

    const deleteOffer = (offer: IPurchasableOffer) => {
        if (isReadOnlyPage) return;

        const label = offer.localizationName || `#${offer.offerId}`;
        if (confirm(`Delete offer "${label}"?`)) catalogAdmin.deleteOffer(offer.offerId, `Deleted offer: ${label}`);
    };

    const moveOffer = (index: number, direction: -1 | 1) => {
        reorderOffersToIndex(index, index + direction);
    };

    const renderNode = (node: ICatalogNode, depth: number) => {
        if (!subtreeMatches(node, query)) return null;

        const isOpen = query ? true : expanded.has(node.pageId);
        const isSelected = node.pageId === selectedPageId && selectedPageId > -1;
        const isHidden = !node.isVisible;
        const hasChildren = node.children.length > 0;
        const dropPosition = pageDropTarget?.pageId === node.pageId ? pageDropTarget.position : null;

        return (
            <div key={node.pageId} className="octane-catalog-admin-tree-branch">
                <div
                    className={`octane-catalog-admin-tree-row ${isSelected ? 'is-selected' : ''} ${isHidden ? 'is-hidden' : ''} ${dropPosition ? `is-drop-${dropPosition}` : ''}`}
                    draggable
                    role="treeitem"
                    tabIndex={0}
                    aria-expanded={hasChildren ? isOpen : undefined}
                    aria-selected={isSelected}
                    style={{ paddingLeft: `${4 + depth * 14}px` }}
                    onClick={() => selectNode(node)}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        selectNode(node);
                    }}
                    onDragLeave={handlePageDragLeave}
                    onDragOver={(event) => handlePageDragOver(event, node)}
                    onDragStart={(event) => handlePageDragStart(event, node)}
                    onDragEnd={() => {
                        setPageDropTarget(null);
                        setRootDropActive(false);
                    }}
                    onDrop={(event) => handlePageDrop(event, node)}
                >
                    <FaArrowsAlt className="octane-catalog-admin-tree-drag" title="Drag to reorder or reparent" />
                    <span className="octane-catalog-admin-tree-caret">
                        {hasChildren ? (
                            <button
                                aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${nodeName(node)}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleExpand(node.pageId);
                                }}
                            >
                                {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                            </button>
                        ) : (
                            <span className="octane-catalog-admin-tree-caret-spacer" />
                        )}
                    </span>
                    <span className="octane-catalog-admin-tree-icon">
                        {node.iconId > 0 ? <CatalogIconView icon={node.iconId} /> : <span className="octane-catalog-admin-tree-icon-empty" />}
                    </span>
                    <span className="octane-catalog-admin-tree-label">{nodeName(node)}</span>
                    <span className="octane-catalog-admin-tree-count">{node.pageId}</span>
                </div>
                {isOpen && hasChildren && <div className="octane-catalog-admin-tree-children">{node.children.map((child) => renderNode(child, depth + 1))}</div>}
            </div>
        );
    };

    const renderDetail = () => {
        if (!selectedNode) {
            return <div className="octane-catalog-admin-placeholder">Select a page from the tree to edit</div>;
        }

        const siblings = selectedNode.parent?.children ?? [];
        const index = siblings.indexOf(selectedNode);
        const isHidden = !selectedNode.isVisible;

        return (
            <div className="octane-catalog-admin-detail-inner">
                <div className="octane-catalog-admin-detail-head">
                    <span className="octane-catalog-admin-detail-icon">
                        {selectedNode.iconId > 0 ? <CatalogIconView icon={selectedNode.iconId} /> : <span className="octane-catalog-admin-tree-icon-empty" />}
                    </span>
                    <div className="octane-catalog-admin-detail-titles">
                        <span className="octane-catalog-admin-detail-title">{nodeName(selectedNode)}</span>
                        <span className="octane-catalog-admin-detail-sub">
                            Page ID {selectedNode.pageId} · {selectedNode.children.length} sub-page(s) · {offers.length} offer(s)
                        </span>
                    </div>
                </div>

                <div className="octane-catalog-admin-detail-actions">
                    <button className="octane-catalog-admin-btn is-primary" onClick={() => editPage(selectedNode, false)}>
                        <FaEdit /> <span>Edit page</span>
                    </button>
                    <button className="octane-catalog-admin-btn" onClick={() => createCategory(selectedNode)}>
                        <FaPlus /> <span>Add sub-page</span>
                    </button>
                    <button
                        className="octane-catalog-admin-btn"
                        onClick={() =>
                            catalogAdmin.togglePageVisible(selectedNode.pageId, isHidden, `${isHidden ? 'Showed' : 'Hidden'} page: ${nodeName(selectedNode)}`)
                        }
                    >
                        {isHidden ? <FaEye /> : <FaEyeSlash />} <span>{isHidden ? 'Show' : 'Hide'}</span>
                    </button>
                    <button className="octane-catalog-admin-btn" disabled={index <= 0} onClick={() => movePage(selectedNode, -1)}>
                        <FaArrowUp /> <span>Move up</span>
                    </button>
                    <button className="octane-catalog-admin-btn" disabled={index < 0 || index >= siblings.length - 1} onClick={() => movePage(selectedNode, 1)}>
                        <FaArrowDown /> <span>Move down</span>
                    </button>
                    <button className="octane-catalog-admin-btn is-danger" onClick={() => deletePage(selectedNode)}>
                        <FaTrash /> <span>Delete</span>
                    </button>
                </div>

                <div className="octane-catalog-admin-offers">
                    {isReadOnlyPage ? (
                        <div className="octane-catalog-admin-placeholder is-small">
                            This page lists each user's own recent purchases ({selectedPageLayout}), so it has no editable
                            offers. You can still edit the page settings.
                        </div>
                    ) : (
                    <>
                    <div className="octane-catalog-admin-offers-head">
                        <span className="octane-catalog-admin-offers-title">Offers ({offers.length})</span>
                        <button className="octane-catalog-admin-btn is-primary" disabled={!currentPage} onClick={newOffer}>
                            <FaPlus /> <span>New offer</span>
                        </button>
                    </div>
                    <div className="octane-catalog-admin-offers-list">
                        {!currentPage && <div className="octane-catalog-admin-placeholder is-small">Loading offers…</div>}
                        {currentPage && offers.length === 0 && <div className="octane-catalog-admin-placeholder is-small">No offers on this page</div>}
                        {offers.map((offer, index) => {
                            const iconUrl = getOfferIconUrl(offer);
                            const isSelected = currentOffer?.offerId === offer.offerId;
                            const editableProducts = (offer.products?.length ? offer.products : [ offer.product ]).filter(
                                (product) =>
                                    product?.productClassId > 0 &&
                                    (product.productType === ProductTypeEnum.FLOOR || product.productType === ProductTypeEnum.WALL)
                            );

                            return (
                                <div
                                    key={offer.offerId}
                                    className={`octane-catalog-admin-offer-row ${isSelected ? 'is-selected' : ''} ${dragOverOfferIndex === index ? 'is-drag-over' : ''}`}
                                    draggable
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={isSelected}
                                    onClick={() => setCurrentOffer(offer)}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter' && event.key !== ' ') return;
                                        event.preventDefault();
                                        setCurrentOffer(offer);
                                    }}
                                    onDragLeave={handleOfferDragLeave}
                                    onDragOver={(event) => handleOfferDragOver(event, index)}
                                    onDragStart={(event) => handleOfferDragStart(event, index)}
                                    onDrop={(event) => handleOfferDrop(event, index)}
                                >
                                    <span className="octane-catalog-admin-offer-drag" title="Drag to reorder">
                                        <FaArrowsAlt />
                                    </span>
                                    <div className="octane-catalog-admin-manager-reorder">
                                        <button disabled={index === 0} title="Move up" onClick={() => moveOffer(index, -1)}>
                                            <FaArrowUp />
                                        </button>
                                        <button disabled={index === offers.length - 1} title="Move down" onClick={() => moveOffer(index, 1)}>
                                            <FaArrowDown />
                                        </button>
                                    </div>
                                    <span className="octane-catalog-admin-offer-icon">
                                        {iconUrl ? (
                                            <img
                                                alt=""
                                                draggable={false}
                                                src={iconUrl}
                                                onError={(event) => {
                                                    const fallback = offer.product?.getIconUrl(offer);
                                                    if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                                                    else event.currentTarget.style.visibility = 'hidden';
                                                }}
                                            />
                                        ) : (
                                            <span className="octane-catalog-admin-offer-icon-empty" />
                                        )}
                                    </span>
                                    <span className="octane-catalog-admin-offer-name" title={offer.localizationName}>
                                        {offer.localizationName || `#${offer.offerId}`}
                                    </span>
                                    <CatalogAdminOfferPriceView
                                        credits={offer.priceInCredits}
                                        points={offer.priceInActivityPoints}
                                        pointsType={offer.activityPointType}
                                    />
                                    <div className="octane-catalog-admin-manager-controls">
                                        {editableProducts.map((product, productIndex) => {
                                            const productLabel = product.furnitureData?.className || `#${product.productClassId}`;

                                            return <button
                                                key={`${product.productType}-${product.productClassId}-${productIndex}`}
                                                aria-label={`Edit Furni ${productLabel}`}
                                                title={`Edit Furni: ${productLabel}`}
                                                onClick={() => window.dispatchEvent(new CustomEvent('furni-editor:open', {
                                                    detail: { spriteId: product.productClassId }
                                                }))}
                                            >
                                                <FaWrench />
                                            </button>;
                                        })}
                                        <button title="Edit offer" onClick={() => {
                                            catalogAdmin.setEditingOffer(offer);
                                        }}>
                                            <FaEdit />
                                        </button>
                                        <button className="danger" title="Delete offer" onClick={() => deleteOffer(offer)}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                    )}
                </div>
            </div>
        );
    };

    const renderInspector = () => {
        if (!selectedNode) {
            return <aside className="octane-catalog-admin-inspector"><div className="octane-catalog-admin-placeholder is-small">No page selected</div></aside>;
        }

        return (
            <aside className="octane-catalog-admin-inspector">
                <div className="octane-catalog-admin-inspector-head">
                    <strong>Inspector</strong>
                    <span>Page #{selectedNode.pageId}</span>
                </div>
                <dl className="octane-catalog-admin-inspector-data">
                    <div><dt>Name</dt><dd title={nodeName(selectedNode)}>{nodeName(selectedNode)}</dd></div>
                    <div><dt>Sub-pages</dt><dd>{selectedNode.children.length}</dd></div>
                    <div><dt>Offers</dt><dd>{offers.length}</dd></div>
                    <div><dt>Visibility</dt><dd className={selectedNode.isVisible ? 'is-positive' : 'is-muted'}>{selectedNode.isVisible ? 'Visible' : 'Hidden'}</dd></div>
                    <div><dt>Revision</dt><dd>{studio.revision}</dd></div>
                </dl>
                <div className="octane-catalog-admin-inspector-actions">
                    <button className="octane-catalog-admin-btn is-primary" onClick={() => editPage(selectedNode, false)}>
                        <FaEdit /> Edit
                    </button>
                    <button className="octane-catalog-admin-btn" onClick={() => createCategory(selectedNode)}>
                        <FaPlus /> Sub-page
                    </button>
                    <button className="octane-catalog-admin-btn" disabled={isReadOnlyPage} onClick={newOffer}>
                        <FaPlus /> Offer
                    </button>
                </div>
            </aside>
        );
    };

    const renderPagesTab = () => (
        <div className="octane-catalog-admin-pages">
            <div className="octane-catalog-admin-sidebar">
                <div className="octane-catalog-admin-search-row">
                    <span className="octane-catalog-admin-search">
                        <FaSearch />
                        <input aria-label="Search catalog pages" placeholder="Search pages..." value={search} onChange={(event) => setSearch(event.target.value)} />
                    </span>
                    <button
                        className="octane-catalog-admin-add"
                        disabled={!managerRootNode}
                        title="New root category"
                        onClick={() => managerRootNode && createCategory(managerRootNode)}
                    >
                        <FaPlus />
                    </button>
                </div>
                <div className="octane-catalog-admin-tree" role="tree" aria-label="Catalog pages">
                    <div
                        className={`octane-catalog-admin-root-drop ${rootDropActive ? 'is-active' : ''}`}
                        onDragLeave={() => setRootDropActive(false)}
                        onDragOver={handleRootDragOver}
                        onDrop={handleRootDrop}
                    >
                        <FaSitemap />
                        <span>Drop here to move to catalog root</span>
                    </div>
                    {!managerRootNode || managerRootNode.children.length === 0 ? (
                        <div className="octane-catalog-admin-placeholder is-small">No categories</div>
                    ) : (
                        managerRootNode.children.map((child) => renderNode(child, 0))
                    )}
                </div>
            </div>
            <div className="octane-catalog-admin-detail">{renderDetail()}</div>
            {renderInspector()}
        </div>
    );

    const renderHistoryTab = () => (
        <div>
            <CatalogStudioProblemsHistoryPanel
                issues={studio.validation?.issues ?? []}
                history={studio.history}
                loading={studio.loading}
                undo={studio.undo}
                revalidate={studio.validate}
                checkedAt={studio.validation?.receivedAt ?? null}
                onSelectEntity={handleProblemSelect}
            />
        </div>
    );

    const tabPresentation = {
        catalog: { label: 'Catalog', icon: <FaSitemap />, count: categoryCount },
        sql: { label: 'SQL tools', icon: <FaEdit />, count: 0 },
        history: { label: 'Problems & History', icon: <FaHistory />, count: validationIssueCount }
    };
    const tabs = getCatalogStudioWorkspaceTabs().map(id => ({ id, ...tabPresentation[id] }));

    return (
        <OctaneCardView classNames={['octane-catalog-admin-manager']} uniqueKey="catalog-admin-manager">
            <OctaneCardHeaderView headerText="Catalog Admin Editor" onCloseClick={() => catalogAdmin.setAdminMode(false)} />
            <OctaneCardContentView classNames={['octane-catalog-admin-manager-body']}>
                <div aria-live="polite" className={`octane-catalog-admin-command-bar is-${commandState.phase}`}>
                    <div className="octane-catalog-admin-command-title">
                        <strong>Catalog Manager</strong>
                        <span>Direct live catalog controls</span>
                    </div>
                    <div className="octane-catalog-admin-command-stats">
                        <span className={validationIssueCount > 0 ? 'has-error' : validationCurrent ? 'is-valid' : 'has-warning'}>
                            {validationCurrent && validationIssueCount === 0 ? <FaCheckCircle /> : <FaExclamationTriangle />}
                            {commandState.validationLabel}
                        </span>
                    </div>
                </div>
                {catalogAdmin.lastError && (
                    <div className="octane-catalog-admin-operation-error" role="alert">
                        <FaExclamationTriangle />
                        <span>{catalogAdmin.lastError}</span>
                    </div>
                )}
                <div className="octane-catalog-admin-tabs" role="tablist" aria-label="Catalog Studio sections">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            id={`catalog-studio-tab-${tab.id}`}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls="catalog-studio-active-panel"
                            className={`octane-catalog-admin-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count > 0 && <span className="octane-catalog-admin-tab-count">{tab.count}</span>}
                        </button>
                    ))}
                </div>

                <div id="catalog-studio-active-panel" className="octane-catalog-admin-panel" role="tabpanel" aria-labelledby={`catalog-studio-tab-${activeTab}`}>
                    {activeTab === 'catalog' && renderPagesTab()}
                    {activeTab === 'sql' && <CatalogStudioTransferPanel />}
                    {activeTab === 'history' && renderHistoryTab()}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
