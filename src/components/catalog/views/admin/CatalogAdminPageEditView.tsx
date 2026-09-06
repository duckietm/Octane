import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaLanguage, FaSave, FaSpinner, FaTrash, FaUndo } from 'react-icons/fa';
import { CatalogType, LocalizeText, localizeWithFallback } from '../../../../api';
import { useCatalogData, useCatalogUiState, useTranslationActions, useTranslationState } from '../../../../hooks';
import { useCatalogStudio } from '../../admin/studio/useCatalogStudio';
import { IEditingPageDetails, IPageEditData, useCatalogAdmin } from '../../CatalogAdminContext';
import { parseCatalogTabLabel } from '../../useCatalogWindowWidth';
import { CatalogIconView } from '../catalog-icon/CatalogIconView';
import { CATALOG_STUDIO_LAYOUT_CODES, isCatalogStudioLayoutCode, isReadOnlyCatalogAdminLayout } from '../page/layout/catalogLayoutRegistry';
import { claimCatalogAdminHydration } from './CatalogAdminFormHydration';
import { CatalogAdminModalView } from './CatalogAdminModalView';
import { createCatalogAdminPageDetailsFromSnapshot } from './CatalogAdminPageState';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';

const MODE_OPTIONS = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'BUILDER', label: 'Builder' },
    { value: 'BOTH', label: 'Both' }
];

export const resolveCatalogAdminPageDisplayName = (
    formCaption: string,
    detailsCaption: string | undefined,
    nodeLocalization: string,
    nodePageName: string,
    fallback: string
) => formCaption?.trim() || detailsCaption?.trim() || parseCatalogTabLabel(nodeLocalization).name || nodePageName?.trim() || fallback;

export const resolveCatalogAdminPageInteraction = (
    sessionReady: boolean,
    detailsReady: boolean,
    editReady: boolean,
    loading: boolean,
    error: string | null
) => {
    if (error) return { canSave: false, message: error };
    if (!sessionReady) return { canSave: false, message: 'Connecting to Catalog Studio...' };
    if (!detailsReady) return { canSave: false, message: 'Loading page details...' };
    if (!editReady) return { canSave: false, message: 'Waiting for the live catalog revision...' };
    if (loading) return { canSave: false, message: 'Saving page...' };
    return { canSave: true, message: null };
};

export const createCatalogAdminPageFormState = (details: IEditingPageDetails): IPageEditData => ({
    pageId: details.pageId,
    caption: details.caption,
    captionSave: details.captionSave,
    parentId: details.parentId,
    catalogMode: details.catalogMode,
    pageLayout: details.layout,
    iconColor: details.iconColor,
    iconImage: details.iconImage,
    minRank: details.minRank,
    orderNum: details.orderNum,
    visible: details.visible ? '1' : '0',
    enabled: details.enabled ? '1' : '0',
    clubOnly: details.clubOnly ? '1' : '0',
    vipOnly: details.vipOnly ? '1' : '0',
    pageHeadline: details.headline,
    pageTeaser: details.teaser,
    pageSpecial: details.special,
    pageText1: details.textOne,
    pageText2: details.textTwo,
    pageTextDetails: details.textDetails,
    pageTextTeaser: details.textTeaser,
    roomId: details.roomId,
    includes: details.includes
});

export const createCatalogAdminNewPageFormState = (parentId: number, catalogMode: string, orderNum = 0): IPageEditData => ({
    pageId: undefined,
    caption: '',
    captionSave: '',
    parentId,
    catalogMode,
    pageLayout: 'default_3x3',
    iconColor: 1,
    iconImage: 0,
    minRank: 1,
    orderNum,
    visible: '1',
    enabled: '1',
    clubOnly: '0',
    vipOnly: '0',
    pageHeadline: '',
    pageTeaser: '',
    pageSpecial: '',
    pageText1: '',
    pageText2: '',
    pageTextDetails: '',
    pageTextTeaser: '',
    roomId: 0,
    includes: ''
});

export const validateCatalogAdminPageForm = (data: IPageEditData): string | null => {
    if (!data.caption.trim()) return 'Page caption is required.';
    if (!isCatalogStudioLayoutCode(data.pageLayout)) return 'Select a valid page layout.';
    if (data.minRank < 1) return 'Minimum rank must be at least 1.';
    if (data.iconImage < 0 || data.iconColor < 0) return 'Icon values cannot be negative.';
    if (data.parentId < -1) return 'Parent page ID is invalid.';
    if ((data.roomId || 0) < 0) return 'Room ID cannot be negative.';

    const includes = (data.includes || '').replace(/\s+/g, '');
    if (includes && includes.split(/[;,]/).some((id) => !/^[1-9]\d*$/.test(id))) {
        return 'Included page IDs must be positive numbers separated by semicolons.';
    }
    return null;
};

export const CatalogAdminPageEditView: FC<{}> = () => {
    const { currentPage = null, rootNode = null } = useCatalogData();
    const { activeNodes = [], currentType = CatalogType.NORMAL } = useCatalogUiState();
    const catalogAdmin = useCatalogAdmin();
    const studio = useCatalogStudio();
    const editingPageData = catalogAdmin?.editingPageData ?? false;
    const editingRootPage = catalogAdmin?.editingRootPage ?? false;
    const editingPageNode = catalogAdmin?.editingPageNode ?? null;
    const editingPageDetails = catalogAdmin?.editingPageDetails ?? null;

    const isReadOnlyPage = isReadOnlyCatalogAdminLayout(editingPageDetails?.layout);
    const creatingPage = catalogAdmin?.creatingPage ?? false;
    const requestPageDetails = catalogAdmin?.requestPageDetails;
    const loading = catalogAdmin?.loading ?? false;
    const lastError = catalogAdmin?.lastError ?? null;
    const lastMutationResult = catalogAdmin?.lastMutationResult ?? null;
    const studioSessionReady = catalogAdmin?.studioSessionReady ?? false;

    const [showTranslate, setShowTranslate] = useState(false);
    const [translateTargetLanguage, setTranslateTargetLanguage] = useState('en');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateError, setTranslateError] = useState<string | null>(null);
    const initializationClaimRef = useRef({ current: null as string | null });
    const detailsClaimRef = useRef({ current: null as string | null });
    const requestClaimRef = useRef({ current: null as string | null });
    const captionInputRef = useRef<HTMLInputElement>(null);
    const { supportedLanguages = [], languagesLoading = false } = useTranslationState();
    const { translateText, ensureSupportedLanguagesLoaded } = useTranslationActions();
    const targetNode = editingPageNode ? editingPageNode : editingRootPage ? rootNode : activeNodes.length > 0 ? activeNodes[activeNodes.length - 1] : null;

    const targetPageId = targetNode?.pageId ?? currentPage?.pageId;
    const isRoot = editingRootPage;
    const pageCatalogMode = currentType === CatalogType.BUILDER ? 'BUILDER' : 'NORMAL';
    const closeForm = useCallback(() => {
        catalogAdmin?.setEditingPageData(false);
        catalogAdmin?.setEditingRootPage(false);
        catalogAdmin?.setEditingPageNode(null);
        catalogAdmin?.setCreatingPage(false);
    }, [catalogAdmin]);

    const smartSave = useCatalogAdminSmartSave<IPageEditData>({
        initial: createCatalogAdminNewPageFormState(-1, pageCatalogMode),
        acknowledgement: lastMutationResult,
        submit: (draft) => (draft.pageId == null ? (catalogAdmin?.createPage(draft) ?? null) : (catalogAdmin?.savePage(draft) ?? null)),
        canSubmit: (draft) => studioSessionReady && !validateCatalogAdminPageForm(draft),
        toCommitted: (acknowledgement) =>
            acknowledgement.entity ? createCatalogAdminPageFormState(createCatalogAdminPageDetailsFromSnapshot(acknowledgement.entity as any)) : null,
        onClose: closeForm
    });
    const {
        caption,
        captionSave,
        catalogMode,
        pageLayout,
        iconColor,
        iconImage,
        minRank,
        visible,
        enabled,
        orderNum,
        parentId,
        clubOnly = '0',
        vipOnly = '0',
        pageHeadline = '',
        pageTeaser = '',
        pageSpecial = '',
        pageText1 = '',
        pageText2 = '',
        pageTextDetails = '',
        pageTextTeaser = '',
        roomId = 0,
        includes = ''
    } = smartSave.draft;
    const patchForm = smartSave.patch;
    const setCaption = (value: string) => patchForm({ caption: value });
    const setCaptionSave = (value: string) => patchForm({ captionSave: value });
    const setCatalogMode = (value: string) => patchForm({ catalogMode: value });
    const setPageLayout = (value: string) => patchForm({ pageLayout: value });
    const setIconColor = (value: number) => patchForm({ iconColor: value });
    const setIconImage = (value: number) => patchForm({ iconImage: value });
    const setMinRank = (value: number) => patchForm({ minRank: value });
    const setVisible = (value: string) => patchForm({ visible: value });
    const setEnabled = (value: string) => patchForm({ enabled: value });
    const setOrderNum = (value: number) => patchForm({ orderNum: value });
    const setParentId = (value: number) => patchForm({ parentId: value });
    const setClubOnly = (value: string) => patchForm({ clubOnly: value });
    const setVipOnly = (value: string) => patchForm({ vipOnly: value });
    const setPageHeadline = (value: string) => patchForm({ pageHeadline: value });
    const setPageTeaser = (value: string) => patchForm({ pageTeaser: value });
    const setPageSpecial = (value: string) => patchForm({ pageSpecial: value });
    const setPageText1 = (value: string) => patchForm({ pageText1: value });
    const setPageText2 = (value: string) => patchForm({ pageText2: value });
    const setPageTextDetails = (value: string) => patchForm({ pageTextDetails: value });
    const setPageTextTeaser = (value: string) => patchForm({ pageTextTeaser: value });
    const setRoomId = (value: number) => patchForm({ roomId: value });
    const setIncludes = (value: string) => patchForm({ includes: value });
    const effectivePageId = smartSave.draft.pageId ?? targetPageId;
    const isNewPage = creatingPage && smartSave.baseline.pageId == null;
    const formTargetKey =
        editingPageData && targetNode ? `page:${pageCatalogMode}:${creatingPage ? 'new' : 'edit'}:${creatingPage ? targetNode.pageId : targetPageId}` : null;

    useEffect(() => {
        if (!editingPageData || !targetNode) {
            claimCatalogAdminHydration(initializationClaimRef.current, null);
            claimCatalogAdminHydration(detailsClaimRef.current, null);
            claimCatalogAdminHydration(requestClaimRef.current, null);
            return;
        }

        if (creatingPage && !studio.session) return;
        if (!claimCatalogAdminHydration(initializationClaimRef.current, formTargetKey)) return;

        claimCatalogAdminHydration(detailsClaimRef.current, null);
        claimCatalogAdminHydration(requestClaimRef.current, null);

        if (creatingPage) {
            const mode = pageCatalogMode;
            const parentId = targetNode.pageId > 0 ? targetNode.pageId : -1;
            const siblingOrders = (studio.session?.pages ?? [])
                .filter((page) => page.catalogType === mode && page.parentId === parentId)
                .map((page) => page.orderNum);
            const nextOrder = siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
            const form = createCatalogAdminNewPageFormState(parentId, mode, nextOrder);
            smartSave.hydrate(form);
            setShowTranslate(false);
            setIsTranslating(false);
            setTranslateError(null);
            return;
        }

        const wireParentId = targetNode.parentId;
        smartSave.hydrate({
            ...createCatalogAdminNewPageFormState(
                typeof wireParentId === 'number' && wireParentId !== -1 ? wireParentId : targetNode.parent ? targetNode.parent.pageId : -1,
                pageCatalogMode
            ),
            pageId: targetPageId,
            iconImage: targetNode.iconId ?? 0,
            visible: targetNode.isVisible ? '1' : '0'
        });
        setShowTranslate(false);
        setIsTranslating(false);
        setTranslateError(null);
    }, [editingPageData, creatingPage, targetNode, formTargetKey, pageCatalogMode, studio.session, smartSave.hydrate, targetPageId]);

    useEffect(() => {
        if (!editingPageData || creatingPage || targetPageId == null || targetPageId < 0) {
            claimCatalogAdminHydration(requestClaimRef.current, null);
            return;
        }

        if (!studio.session) {
            claimCatalogAdminHydration(requestClaimRef.current, null);
            return;
        }

        const requestKey = `${studio.session.draftVersionId}:${pageCatalogMode}:${targetPageId}`;
        if (!claimCatalogAdminHydration(requestClaimRef.current, requestKey)) return;

        requestPageDetails?.(targetPageId);
    }, [creatingPage, editingPageData, pageCatalogMode, requestPageDetails, studio.session, targetPageId]);

    useEffect(() => {
        if (!editingPageDetails) return;
        if (targetPageId != null && editingPageDetails.pageId !== targetPageId) return;
        if (!claimCatalogAdminHydration(detailsClaimRef.current, `${formTargetKey}:details`)) return;

        const form = createCatalogAdminPageFormState(editingPageDetails);
        smartSave.hydrate(form);
    }, [editingPageDetails, formTargetKey, smartSave.hydrate, targetPageId]);

    useEffect(() => {
        if (smartSave.fieldErrors.caption) captionInputRef.current?.focus();
    }, [smartSave.fieldErrors.caption]);

    if (!editingPageData || !targetNode) return null;

    const inputClass = 'octane-catalog-admin-input';
    const previewName = resolveCatalogAdminPageDisplayName(
        caption,
        editingPageDetails?.caption,
        targetNode.localization,
        targetNode.pageName,
        localizeWithFallback('catalog.admin.page.untitled', 'Untitled page')
    );
    const detailsReady = isNewPage || editingPageDetails?.pageId === effectivePageId;
    const smartSaveError = lastMutationResult?.success === false ? null : lastError;
    const interaction = resolveCatalogAdminPageInteraction(
        studioSessionReady,
        detailsReady,
        studioSessionReady,
        loading && smartSave.status !== 'saving',
        smartSaveError
    );
    const formData = smartSave.draft;
    const validationError = detailsReady ? validateCatalogAdminPageForm(formData) : null;
    const saveStatusText =
        smartSave.status === 'saving'
            ? 'Saving...'
            : smartSave.status === 'dirty'
              ? 'Unsaved changes'
              : smartSave.status === 'conflict'
                ? smartSave.message || 'The catalog changed. Review and save again.'
                : smartSave.status === 'error'
                  ? smartSave.message || 'Save failed'
                  : smartSave.lastSavedAt
                    ? `Saved · ${new Date(smartSave.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Saved';
    const canSubmit = interaction.canSave && !validationError && (smartSave.isDirty || !!smartSave.inFlight);

    const handleSave = (closeAfter = false) => {
        if (!catalogAdmin?.savePage || !catalogAdmin.createPage || !interaction.canSave) return;
        if (validationError) return;
        smartSave.save(closeAfter);
    };

    const openTranslate = () => {
        const next = !showTranslate;
        setShowTranslate(next);
        setTranslateError(null);
        if (next) ensureSupportedLanguagesLoaded();
    };

    const runTranslate = async () => {
        if (!pageText1.trim().length) {
            setTranslateError(localizeWithFallback('catalog.admin.translate.empty', 'Nothing to translate yet.'));
            return;
        }

        if (!translateTargetLanguage) {
            setTranslateError(localizeWithFallback('catalog.admin.translate.pick.language', 'Pick a language first.'));
            return;
        }

        setIsTranslating(true);
        setTranslateError(null);

        try {
            const result = await translateText(pageText1, translateTargetLanguage);
            setPageText1(result?.translatedText || pageText1);
            setShowTranslate(false);
        } catch (error) {
            setTranslateError((error as Error)?.message || localizeWithFallback('catalog.admin.translate.failed', 'Translation failed.'));
        } finally {
            setIsTranslating(false);
        }
    };

    const handleDelete = async () => {
        if (!catalogAdmin?.deletePage || isRoot || isNewPage) return;
        if (!confirm(LocalizeText('catalog.admin.delete.page.confirm', ['name'], [editingPageDetails?.caption ?? '']))) return;

        catalogAdmin.deletePage(targetPageId);
        closeForm();
    };

    return (
        <CatalogAdminModalView
            title={
                isNewPage
                    ? localizeWithFallback('catalog.admin.create.page', 'Create page')
                    : isRoot
                      ? LocalizeText('catalog.admin.edit.root')
                      : localizeWithFallback('catalog.admin.edit.page', 'Edit page')
            }
            widthClassName="w-[540px]"
            onClose={smartSave.requestClose}
        >
            <div className="octane-catalog-admin-form">
                <div className="octane-catalog-admin-form-sheet">
                    <div className="octane-catalog-admin-form-scroll">
                        <div className="octane-catalog-admin-form-hero">
                            <span className="octane-catalog-admin-page-preview-icon">{iconImage > 0 ? <CatalogIconView icon={iconImage} /> : null}</span>
                            <div className="octane-catalog-admin-page-preview-info">
                                <span className="octane-catalog-admin-page-preview-name" title={previewName}>
                                    {previewName}
                                </span>
                                <span className="octane-catalog-admin-page-preview-sub">
                                    {localizeWithFallback('catalog.admin.page.id', 'Page ID')} {effectivePageId ?? '—'} · {pageLayout} · {catalogMode}
                                </span>
                            </div>
                        </div>

                        {isReadOnlyPage && (
                            <div className="octane-catalog-admin-form-note is-readonly">
                                {localizeWithFallback(
                                    'catalog.admin.page.readonly',
                                    `This page uses the "${editingPageDetails?.layout}" layout, whose offers are generated per user. Only these page settings are editable — there are no offers to manage.`
                                )}
                            </div>
                        )}

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{localizeWithFallback('catalog.admin.page.section.identity', 'Identity')}</div>
                            <div className="octane-catalog-admin-form-grid is-2col">
                                <div className="octane-catalog-admin-form-field is-span-2">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.caption', 'Caption')}
                                    </label>
                                    <input
                                        ref={captionInputRef}
                                        aria-invalid={!!smartSave.fieldErrors.caption}
                                        className={inputClass}
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                    />
                                    {smartSave.fieldErrors.caption && <span className="octane-catalog-admin-field-error">{smartSave.fieldErrors.caption}</span>}
                                </div>
                                <div className="octane-catalog-admin-form-field is-span-2">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.caption.save', 'Localisation key')}
                                    </label>
                                    <input className={inputClass} value={captionSave} onChange={(e) => setCaptionSave(e.target.value)} />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.min.rank', 'Min rank')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={1}
                                        type="number"
                                        value={minRank}
                                        onChange={(e) => setMinRank(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.icon.image', 'Icon image')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={iconImage}
                                        onChange={(e) => setIconImage(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.icon.color', 'Icon color')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={iconColor}
                                        onChange={(e) => setIconColor(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{localizeWithFallback('catalog.admin.page.section.display', 'Display')}</div>
                            <div className="octane-catalog-admin-form-grid is-3col">
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{localizeWithFallback('catalog.admin.page.mode', 'Mode')}</label>
                                    <select className={inputClass} value={catalogMode} onChange={(e) => setCatalogMode(e.target.value)}>
                                        {MODE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{localizeWithFallback('catalog.admin.page.layout', 'Layout')}</label>
                                    <select className={inputClass} value={pageLayout} onChange={(e) => setPageLayout(e.target.value)}>
                                        {CATALOG_STUDIO_LAYOUT_CODES.map((l) => (
                                            <option key={l} value={l}>
                                                {l}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.order')}</label>
                                    <input className={inputClass} type="number" value={orderNum} onChange={(e) => setOrderNum(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.parent.id', 'Parent ID')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        disabled={isRoot}
                                        type="number"
                                        value={parentId}
                                        onChange={(e) => setParentId(parseInt(e.target.value) || -1)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field is-span-2">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.visibility', 'Visibility')}
                                    </label>
                                    <div className="octane-catalog-admin-form-toggles">
                                        <label className="octane-catalog-admin-form-toggle">
                                            <input checked={visible === '1'} type="checkbox" onChange={(e) => setVisible(e.target.checked ? '1' : '0')} />
                                            {LocalizeText('catalog.admin.visible')}
                                        </label>
                                        <label className="octane-catalog-admin-form-toggle">
                                            <input checked={enabled === '1'} type="checkbox" onChange={(e) => setEnabled(e.target.checked ? '1' : '0')} />
                                            {LocalizeText('catalog.admin.enabled')}
                                        </label>
                                        <label className="octane-catalog-admin-form-toggle">
                                            <input checked={clubOnly === '1'} type="checkbox" onChange={(e) => setClubOnly(e.target.checked ? '1' : '0')} />
                                            {localizeWithFallback('catalog.admin.page.club.only', 'HC only')}
                                        </label>
                                        <label className="octane-catalog-admin-form-toggle">
                                            <input checked={vipOnly === '1'} type="checkbox" onChange={(e) => setVipOnly(e.target.checked ? '1' : '0')} />
                                            {localizeWithFallback('catalog.admin.page.vip.only', 'VIP only')}
                                        </label>
                                    </div>
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.room.id', 'Room ID')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={roomId}
                                        onChange={(e) => setRoomId(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.includes', 'Included page IDs')}
                                    </label>
                                    <input className={inputClass} placeholder="1;2;3" value={includes} onChange={(e) => setIncludes(e.target.value)} />
                                </div>
                            </div>
                        </section>

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{localizeWithFallback('catalog.admin.page.section.content', 'Content')}</div>
                            <div className="octane-catalog-admin-form-grid is-2col">
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.headline', 'Headline image')}
                                    </label>
                                    <input className={inputClass} value={pageHeadline} onChange={(e) => setPageHeadline(e.target.value)} />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.teaser', 'Teaser image')}
                                    </label>
                                    <input className={inputClass} value={pageTeaser} onChange={(e) => setPageTeaser(e.target.value)} />
                                </div>
                                <div className="octane-catalog-admin-form-field is-span-2">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.special', 'Special image')}
                                    </label>
                                    <input className={inputClass} value={pageSpecial} onChange={(e) => setPageSpecial(e.target.value)} />
                                </div>
                            </div>
                            <div className="octane-catalog-admin-form-field">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.page.text.1', 'Page text')}
                                    </label>
                                    <button
                                        className="octane-catalog-admin-button is-ghost is-compact"
                                        disabled={isTranslating || !pageText1.trim().length}
                                        title={localizeWithFallback('catalog.admin.translate.title', 'Translate via Google Translate')}
                                        type="button"
                                        onClick={openTranslate}
                                    >
                                        {isTranslating ? <FaSpinner className="text-[8px] animate-spin" /> : <FaLanguage className="text-[10px]" />}
                                        {localizeWithFallback('catalog.admin.translate.action', 'Translate')}
                                    </button>
                                </div>
                                {showTranslate && (
                                    <div className="octane-catalog-admin-translate-bar">
                                        <select
                                            className={`${inputClass} flex-1 min-w-[120px]`}
                                            disabled={isTranslating || languagesLoading}
                                            value={translateTargetLanguage}
                                            onChange={(e) => setTranslateTargetLanguage(e.target.value)}
                                        >
                                            {languagesLoading && !supportedLanguages.length && (
                                                <option value="">
                                                    {localizeWithFallback('catalog.admin.translate.loading.languages', 'Loading languages...')}
                                                </option>
                                            )}
                                            {supportedLanguages.map((lang) => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.name} ({lang.code})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className="octane-catalog-admin-button is-primary"
                                            disabled={isTranslating || !translateTargetLanguage || !pageText1.trim().length}
                                            type="button"
                                            onClick={runTranslate}
                                        >
                                            {isTranslating ? (
                                                <FaSpinner className="text-[8px] animate-spin" />
                                            ) : (
                                                localizeWithFallback('catalog.admin.translate.apply', 'Apply')
                                            )}
                                        </button>
                                        <button
                                            className="octane-catalog-admin-button is-muted"
                                            disabled={isTranslating}
                                            type="button"
                                            onClick={() => {
                                                setShowTranslate(false);
                                                setTranslateError(null);
                                            }}
                                        >
                                            {localizeWithFallback('catalog.admin.cancel', 'Cancel')}
                                        </button>
                                    </div>
                                )}
                                {translateError && <span className="octane-catalog-admin-translate-error">{translateError}</span>}
                                <textarea className={`${inputClass} min-h-[80px] resize-y`} value={pageText1} onChange={(e) => setPageText1(e.target.value)} />
                            </div>
                            <div className="octane-catalog-admin-form-field">
                                <label className="octane-catalog-admin-label is-field">
                                    {localizeWithFallback('catalog.admin.page.text.2', 'Secondary text')}
                                </label>
                                <textarea className={`${inputClass} min-h-[70px] resize-y`} value={pageText2} onChange={(e) => setPageText2(e.target.value)} />
                            </div>
                            <div className="octane-catalog-admin-form-field">
                                <label className="octane-catalog-admin-label is-field">
                                    {localizeWithFallback('catalog.admin.page.text.details', 'Details text')}
                                </label>
                                <textarea
                                    className={`${inputClass} min-h-[70px] resize-y`}
                                    value={pageTextDetails}
                                    onChange={(e) => setPageTextDetails(e.target.value)}
                                />
                            </div>
                            <div className="octane-catalog-admin-form-field">
                                <label className="octane-catalog-admin-label is-field">
                                    {localizeWithFallback('catalog.admin.page.text.teaser', 'Teaser text')}
                                </label>
                                <textarea
                                    className={`${inputClass} min-h-[70px] resize-y`}
                                    value={pageTextTeaser}
                                    onChange={(e) => setPageTextTeaser(e.target.value)}
                                />
                            </div>
                        </section>
                    </div>

                    <div className={`octane-catalog-admin-savebar is-${smartSave.status}`}>
                        <div className="octane-catalog-admin-savebar-status" aria-live="polite">
                            <span>{validationError || smartSave.message || interaction.message || saveStatusText}</span>
                            <small>Ctrl+S</small>
                        </div>
                        <div className="octane-catalog-admin-savebar-actions">
                            {!isRoot && !isNewPage && (
                                <button className="octane-catalog-admin-button is-danger" type="button" onClick={handleDelete}>
                                    <FaTrash className="text-[8px]" /> {LocalizeText('catalog.admin.delete')}
                                </button>
                            )}
                            <button
                                className="octane-catalog-admin-button is-muted"
                                disabled={!smartSave.isDirty || !!smartSave.inFlight}
                                type="button"
                                onClick={smartSave.reset}
                            >
                                <FaUndo className="text-[8px]" /> Reset
                            </button>
                            <button className="octane-catalog-admin-button is-muted" disabled={!canSubmit} type="button" onClick={() => handleSave(true)}>
                                Save and close
                            </button>
                            <button className="octane-catalog-admin-button is-primary" disabled={!canSubmit} type="button" onClick={() => handleSave(false)}>
                                {smartSave.status === 'saving' ? <FaSpinner className="text-[8px] animate-spin" /> : <FaSave className="text-[8px]" />}{' '}
                                {isNewPage ? LocalizeText('catalog.admin.create') : LocalizeText('catalog.admin.save')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </CatalogAdminModalView>
    );
};
