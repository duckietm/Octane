import { FC, useCallback, useEffect, useRef } from 'react';
import { FaCubes, FaSave, FaSpinner, FaTrash, FaUndo } from 'react-icons/fa';
import { CatalogType, GetConfigurationValue, IPurchasableOffer, LocalizeText, localizeWithFallback, ProductTypeEnum } from '../../../../api';
import { useCatalogData, useCatalogUiState, usePurse } from '../../../../hooks';
import { CatalogStudioOfferSnapshot } from '../../admin/studio/CatalogStudioTypes';
import { useCatalogStudio } from '../../admin/studio/useCatalogStudio';
import { IEditingOfferDetails, IOfferEditData, useCatalogAdmin } from '../../CatalogAdminContext';
import { claimCatalogAdminHydration } from './CatalogAdminFormHydration';
import { CatalogAdminModalView } from './CatalogAdminModalView';
import { CatalogAdminOfferPriceView } from './CatalogAdminOfferPriceView';
import { useCatalogAdminSmartSave } from './useCatalogAdminSmartSave';

export const isCatalogAdminNewOffer = (offer: IPurchasableOffer | null): boolean =>
    offer?.offerId === -1;

export const getOfferIconUrl = (offer: IPurchasableOffer | null): string | null => {
    const product = offer?.product;
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

    if (typeof product.getIconUrl !== 'function') return null;

    return product.getIconUrl(offer) ?? null;
};

export const createCatalogAdminOfferFormState = (details: IEditingOfferDetails): IOfferEditData => ({
    offerId: details.offerId,
    pageId: details.pageId,
    itemIds: details.itemIds,
    catalogName: details.catalogName,
    costCredits: details.costCredits,
    costPoints: details.costPoints,
    pointsType: details.pointsType,
    amount: details.amount,
    clubOnly: details.clubOnly ? '1' : '0',
    extradata: details.extradata,
    haveOffer: details.haveOffer ? '1' : '0',
    offerId_group: details.offerIdGroup,
    songId: details.songId,
    limitedStack: details.limitedStack,
    orderNumber: details.orderNumber
});

export const createCatalogAdminNewOfferFormState = (pageId: number, orderNumber = 0): IOfferEditData => ({
    pageId,
    itemIds: '',
    catalogName: '',
    costCredits: 0,
    costPoints: 0,
    pointsType: 0,
    amount: 1,
    clubOnly: '0',
    extradata: '',
    haveOffer: '1',
    offerId_group: -1,
    songId: 0,
    limitedStack: 0,
    orderNumber
});

export const validateCatalogAdminOfferForm = (data: IOfferEditData, builderCatalog: boolean, limitedSells: number): string | null => {
    if (data.pageId <= 0) return 'Select a valid catalog page.';
    if (!data.catalogName.trim()) return 'Offer name is required.';

    const cleanItemIds = data.itemIds.replace(/\s+/g, '');
    if (!builderCatalog && !cleanItemIds) return 'Item IDs are required.';
    if (cleanItemIds) {
        const entries = cleanItemIds.split(/[;,]/);
        if (entries.some((entry) => !/^\d+(?::[1-9]\d*)?$/.test(entry) || Number(entry.split(':')[0]) <= 0)) {
            return 'Item IDs must use the format 123 or 123:2, separated by semicolons.';
        }
    }

    if (data.costCredits < 0 || data.costPoints < 0 || data.pointsType < 0) return 'Prices and currency type cannot be negative.';
    if (data.amount < 1 || data.amount > 10000) return 'Quantity must be between 1 and 10,000.';
    if (data.songId < 0) return 'Song ID cannot be negative.';
    if (data.limitedStack < limitedSells) return 'Limited stack cannot be lower than the number already sold.';
    return null;
};

export const resolveCatalogAdminOfferInteraction = (
    sessionReady: boolean,
    detailsReady: boolean,
    loading: boolean,
    error: string | null
) => {
    if (error) return { canSave: false, message: error };
    if (!sessionReady) return { canSave: false, message: 'Connecting to Catalog Studio...' };
    if (!detailsReady) return { canSave: false, message: 'Loading offer details...' };
    if (loading) return { canSave: false, message: 'Saving offer...' };
    return { canSave: true, message: null };
};

export const CatalogAdminOfferEditView: FC<{}> = () => {
    const { currentPage = null } = useCatalogData();
    const { currentType } = useCatalogUiState();
    const { purse } = usePurse();
    const catalogAdmin = useCatalogAdmin();
    const studio = useCatalogStudio();
    const editingOffer = catalogAdmin?.editingOffer ?? null;
    const editingOfferDetails = catalogAdmin?.editingOfferDetails ?? null;
    const setEditingOffer = catalogAdmin?.setEditingOffer;
    const saveOffer = catalogAdmin?.saveOffer;
    const deleteOffer = catalogAdmin?.deleteOffer;
    const createOffer = catalogAdmin?.createOffer;
    const loading = catalogAdmin?.loading ?? false;
    const lastError = catalogAdmin?.lastError ?? null;
    const lastMutationResult = catalogAdmin?.lastMutationResult ?? null;
    const studioSessionReady = catalogAdmin?.studioSessionReady ?? false;

    const initializationClaimRef = useRef({ current: null as string | null });
    const detailsClaimRef = useRef({ current: null as string | null });
    const catalogNameInputRef = useRef<HTMLInputElement>(null);
    const itemIdsInputRef = useRef<HTMLInputElement>(null);
    const limitedStackInputRef = useRef<HTMLInputElement>(null);
    const formTargetKey = editingOffer
        ? `offer:${currentType}:${editingOffer.offerId}:${editingOffer.offerId === -1 ? currentPage?.pageId || 0 : editingOffer.offerId}`
        : null;
    const closeForm = useCallback(() => setEditingOffer?.(null), [setEditingOffer]);
    const smartSave = useCatalogAdminSmartSave<IOfferEditData>({
        initial: createCatalogAdminNewOfferFormState(0),
        acknowledgement: lastMutationResult,
        submit: draft => draft.offerId == null
            ? createOffer?.(draft) ?? null
            : saveOffer?.(draft) ?? null,
        canSubmit: draft => {
            const builderCatalog = currentType === CatalogType.BUILDER;
            const sold = draft.offerId == null ? 0 : editingOfferDetails?.limitedSells || 0;
            return studioSessionReady && !validateCatalogAdminOfferForm(draft, builderCatalog, sold);
        },
        toCommitted: acknowledgement => {
            if(!acknowledgement.entity) return null;
            const offer = acknowledgement.entity as CatalogStudioOfferSnapshot;
            return {
                offerId: offer.offerId,
                pageId: offer.pageId,
                itemIds: offer.itemIds,
                catalogName: offer.catalogName,
                costCredits: offer.costCredits,
                costPoints: offer.costPoints,
                pointsType: offer.pointsType,
                amount: offer.amount,
                clubOnly: offer.clubOnly ? '1' : '0',
                extradata: offer.extradata,
                haveOffer: offer.haveOffer ? '1' : '0',
                offerId_group: offer.offerIdClient,
                songId: offer.songId,
                limitedStack: offer.limitedStack,
                orderNumber: offer.orderNumber
            };
        },
        onClose: closeForm
    });
    const {
        itemIds, catalogName, costCredits, costPoints, pointsType, amount, clubOnly,
        extradata, haveOffer, offerId_group: offerId, songId = 0, limitedStack, orderNumber
    } = smartSave.draft;
    const patchForm = smartSave.patch;
    const setItemIds = (value: string) => patchForm({ itemIds: value });
    const setCatalogName = (value: string) => patchForm({ catalogName: value });
    const setCostCredits = (value: number) => patchForm({ costCredits: value });
    const setCostPoints = (value: number) => patchForm({ costPoints: value });
    const setPointsType = (value: number) => patchForm({ pointsType: value });
    const setAmount = (value: number) => patchForm({ amount: value });
    const setClubOnly = (value: string) => patchForm({ clubOnly: value });
    const setExtradata = (value: string) => patchForm({ extradata: value });
    const setHaveOffer = (value: string) => patchForm({ haveOffer: value });
    const setOfferIdGroup = (value: number) => patchForm({ offerId_group: value });
    const setSongId = (value: number) => patchForm({ songId: value });
    const setLimitedStack = (value: number) => patchForm({ limitedStack: value });
    const setOrderNumber = (value: number) => patchForm({ orderNumber: value });
    const effectiveOfferId = smartSave.draft.offerId ?? editingOffer?.offerId ?? -1;
    const isNewOffer = isCatalogAdminNewOffer(editingOffer) && smartSave.baseline.offerId == null;

    useEffect(() => {
        if (!editingOffer) {
            claimCatalogAdminHydration(initializationClaimRef.current, null);
            claimCatalogAdminHydration(detailsClaimRef.current, null);
            return;
        }

        if (editingOffer.offerId === -1 && !studio.session) return;
        if (!claimCatalogAdminHydration(initializationClaimRef.current, formTargetKey)) return;

        claimCatalogAdminHydration(detailsClaimRef.current, null);

        if (editingOffer.offerId === -1) {
            const pageId = currentPage?.pageId || 0;
            const catalogType = currentType === CatalogType.BUILDER ? 'BUILDER' : 'NORMAL';
            const siblingOrders = (studio.session?.offers ?? [])
                .filter((offer) => offer.catalogType === catalogType && offer.pageId === pageId)
                .map((offer) => offer.orderNumber);
            const form = createCatalogAdminNewOfferFormState(pageId, siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0);
            smartSave.hydrate(form);
        } else {
            smartSave.hydrate({
                offerId: editingOffer.offerId,
                pageId: currentPage?.pageId || 0,
                itemIds: editingOffer.itemIds || '',
                catalogName: editingOffer.localizationName || '',
                costCredits: editingOffer.priceInCredits,
                costPoints: editingOffer.priceInActivityPoints,
                pointsType: editingOffer.activityPointType,
                amount: editingOffer.product?.productCount || 1,
                clubOnly: editingOffer.clubLevel > 0 ? '1' : '0',
                extradata: editingOffer.product?.extraParam || '',
                haveOffer: editingOffer.haveOffer ? '1' : '0',
                offerId_group: 0,
                songId: 0,
                limitedStack: 0,
                orderNumber: 0
            });
        }
    }, [editingOffer, currentPage?.pageId, currentType, formTargetKey, smartSave.hydrate, studio.session]);

    useEffect(() => {
        if (!editingOfferDetails) return;
        if (!editingOffer || editingOfferDetails.offerId !== editingOffer.offerId) return;
        if (!claimCatalogAdminHydration(detailsClaimRef.current, `${formTargetKey}:details`)) return;

        const form = createCatalogAdminOfferFormState(editingOfferDetails);
        smartSave.hydrate(form);
    }, [editingOffer, editingOfferDetails, formTargetKey, smartSave.hydrate]);

    useEffect(() => {
        if(smartSave.fieldErrors.catalogName) catalogNameInputRef.current?.focus();
        else if(smartSave.fieldErrors.itemIds) itemIdsInputRef.current?.focus();
        else if(smartSave.fieldErrors.limitedStack) limitedStackInputRef.current?.focus();
    }, [smartSave.fieldErrors]);

    if (!editingOffer) return null;

    const detailsReady = isNewOffer || editingOfferDetails?.offerId === effectiveOfferId;
    const smartSaveError = lastMutationResult?.success === false ? null : lastError;
    const interaction = resolveCatalogAdminOfferInteraction(
        studioSessionReady, detailsReady, loading && smartSave.status !== 'saving', smartSaveError);
    const limitedSells = isNewOffer ? 0 : editingOfferDetails?.limitedSells || 0;
    const formData = smartSave.draft;
    const validationError = detailsReady ? validateCatalogAdminOfferForm(formData, currentType === CatalogType.BUILDER, limitedSells) : null;
    const currencyTypes = Array.from(new Set([0, 5, 101, pointsType, ...Array.from(purse?.activityPoints?.keys?.() || [])]))
        .filter((type) => type >= 0)
        .sort((left, right) => left - right);

    const saveStatusText = smartSave.status === 'saving'
        ? 'Saving...'
        : smartSave.status === 'dirty'
          ? 'Unsaved changes'
          : smartSave.status === 'conflict'
            ? (smartSave.message || 'The catalog changed. Review and save again.')
            : smartSave.status === 'error'
              ? (smartSave.message || 'Save failed')
              : smartSave.lastSavedAt
                ? `Saved · ${new Date(smartSave.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Saved';
    const canSubmit = interaction.canSave && !validationError && (smartSave.isDirty || !!smartSave.inFlight);

    const handleSave = (closeAfter = false) => {
        if (!saveOffer || !createOffer || !interaction.canSave) return;
        if (validationError) return;
        smartSave.save(closeAfter);
    };

    const handleDelete = () => {
        if (isNewOffer || !deleteOffer || !confirm(LocalizeText('catalog.admin.delete.offer.confirm'))) return;

        deleteOffer(effectiveOfferId);
    };

    const inputClass = 'octane-catalog-admin-input';
    const previewIconUrl = isNewOffer ? null : getOfferIconUrl(editingOffer);
    const previewName =
        catalogName || editingOffer.localizationName || (isNewOffer ? localizeWithFallback('catalog.admin.offer.new', 'New offer') : `#${effectiveOfferId}`);
    const previewFallbackIcon = !isNewOffer && typeof editingOffer.product?.getIconUrl === 'function'
        ? editingOffer.product.getIconUrl(editingOffer)
        : null;

    return (
        <CatalogAdminModalView
            title={isNewOffer ? LocalizeText('catalog.admin.offer.new') : localizeWithFallback('catalog.admin.edit.offer', 'Edit offer')}
            widthClassName="w-[500px]"
            onClose={smartSave.requestClose}
        >
            <div className="octane-catalog-admin-form">
                <div className="octane-catalog-admin-form-sheet">
                    <div className="octane-catalog-admin-form-scroll">
                        <div className="octane-catalog-admin-form-hero">
                            <span className="octane-catalog-admin-offer-preview-icon">
                                {previewIconUrl ? (
                                    <img
                                        alt=""
                                        draggable={false}
                                        src={previewIconUrl}
                                        onError={(event) => {
                                            if (previewFallbackIcon && event.currentTarget.src !== previewFallbackIcon)
                                                event.currentTarget.src = previewFallbackIcon;
                                            else event.currentTarget.style.visibility = 'hidden';
                                        }}
                                    />
                                ) : (
                                    <FaCubes className="octane-catalog-admin-offer-preview-icon-empty" />
                                )}
                            </span>
                            <div className="octane-catalog-admin-offer-preview-info">
                                <span className="octane-catalog-admin-offer-preview-name" title={previewName}>
                                    {previewName}
                                </span>
                                <span className="octane-catalog-admin-offer-preview-sub">
                                    {isNewOffer
                                        ? localizeWithFallback('catalog.admin.offer.new', 'New offer')
                                        : `${localizeWithFallback('catalog.admin.offer.id', 'Offer ID')} #${effectiveOfferId}`}
                                    {amount > 1 ? ` · x${amount}` : ''}
                                </span>
                                <span className="octane-catalog-admin-offer-preview-price">
                                    <CatalogAdminOfferPriceView credits={costCredits} points={costPoints} pointsType={pointsType} />
                                    {costCredits <= 0 && costPoints <= 0 && <span className="is-free">{localizeWithFallback('generic.free', 'Free')}</span>}
                                </span>
                            </div>
                        </div>

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{localizeWithFallback('catalog.admin.offer.section.details', 'Details')}</div>
                            <div className="octane-catalog-admin-form-field">
                                <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.name')}</label>
                                <input
                                    ref={catalogNameInputRef}
                                    aria-invalid={!!smartSave.fieldErrors.catalogName}
                                    className={inputClass}
                                    placeholder={localizeWithFallback('catalog.admin.offer.name.placeholder', 'e.g. rare_dragon_lamp')}
                                    type="text"
                                    value={catalogName}
                                    onChange={(e) => setCatalogName(e.target.value)}
                                />
                                {smartSave.fieldErrors.catalogName && <span className="octane-catalog-admin-field-error">{smartSave.fieldErrors.catalogName}</span>}
                            </div>
                            <div className="octane-catalog-admin-form-grid is-3col">
                                <div className="octane-catalog-admin-form-field is-span-3">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.offer.item.ids', 'Item IDs')}
                                    </label>
                                    <input
                                        ref={itemIdsInputRef}
                                        aria-invalid={!!smartSave.fieldErrors.itemIds}
                                        className={inputClass}
                                        placeholder={localizeWithFallback('catalog.admin.offer.item.ids.placeholder', '1234 or 100;200')}
                                        type="text"
                                        value={itemIds}
                                        onChange={(e) => setItemIds(e.target.value)}
                                    />
                                    {smartSave.fieldErrors.itemIds && <span className="octane-catalog-admin-field-error">{smartSave.fieldErrors.itemIds}</span>}
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.quantity')}</label>
                                    <input
                                        ref={limitedStackInputRef}
                                        aria-invalid={!!smartSave.fieldErrors.limitedStack}
                                        className={inputClass}
                                        min={1}
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.order')}</label>
                                    <input
                                        className={inputClass}
                                        type="number"
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{localizeWithFallback('catalog.admin.offer.id', 'Offer ID')}</label>
                                    <input
                                        className={inputClass}
                                        type="number"
                                        value={offerId}
                                        onChange={(e) => setOfferIdGroup(parseInt(e.target.value) || -1)}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{LocalizeText('catalog.admin.offer.prices')}</div>
                            <div className="octane-catalog-admin-form-grid is-3col">
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.credits')}</label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={costCredits}
                                        onChange={(e) => setCostCredits(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.points')}</label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={costPoints}
                                        onChange={(e) => setCostPoints(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.points.type')}</label>
                                    <select className={inputClass} value={pointsType} onChange={(e) => setPointsType(parseInt(e.target.value))}>
                                        {currencyTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {localizeWithFallback(`purse.seasonal.currency.${type}`, `Currency ${type}`)} ({type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="octane-catalog-admin-form-section">
                            <div className="octane-catalog-admin-section-title">{LocalizeText('catalog.admin.offer.options')}</div>
                            <div className="octane-catalog-admin-form-grid is-3col">
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.club.only')}</label>
                                    <select className={inputClass} value={clubOnly} onChange={(e) => setClubOnly(e.target.value)}>
                                        <option value="0">{localizeWithFallback('generic.no', 'No')}</option>
                                        <option value="1">{localizeWithFallback('generic.yes', 'Yes')}</option>
                                    </select>
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.offer.limited.stack', 'Limited stack')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={limitedStack}
                                        onChange={(e) => setLimitedStack(parseInt(e.target.value) || 0)}
                                    />
                                    {smartSave.fieldErrors.limitedStack && <span className="octane-catalog-admin-field-error">{smartSave.fieldErrors.limitedStack}</span>}
                                </div>
                                {!isNewOffer && (
                                    <div className="octane-catalog-admin-form-field">
                                        <label className="octane-catalog-admin-label is-field">
                                            {localizeWithFallback('catalog.admin.offer.limited.sold', 'Already sold')}
                                        </label>
                                        <input className={inputClass} readOnly type="number" value={limitedSells} />
                                    </div>
                                )}
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">{LocalizeText('catalog.admin.offer.extradata')}</label>
                                    <input
                                        className={inputClass}
                                        placeholder={LocalizeText('catalog.admin.offer.extradata')}
                                        type="text"
                                        value={extradata}
                                        onChange={(e) => setExtradata(e.target.value)}
                                    />
                                </div>
                                <div className="octane-catalog-admin-form-field">
                                    <label className="octane-catalog-admin-label is-field">
                                        {localizeWithFallback('catalog.admin.offer.song.id', 'Song ID')}
                                    </label>
                                    <input
                                        className={inputClass}
                                        min={0}
                                        type="number"
                                        value={songId}
                                        onChange={(e) => setSongId(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <label className="octane-catalog-admin-form-toggle">
                                <input
                                    checked={haveOffer === '1'}
                                    id="haveOffer"
                                    type="checkbox"
                                    onChange={(e) => setHaveOffer(e.target.checked ? '1' : '0')}
                                />
                                <span>{LocalizeText('catalog.admin.offer.have.offer')}</span>
                            </label>
                        </section>
                    </div>

                    <div className={`octane-catalog-admin-savebar is-${smartSave.status}`}>
                        <div className="octane-catalog-admin-savebar-status" aria-live="polite">
                            <span>{validationError || smartSave.message || interaction.message || saveStatusText}</span>
                            <small>Ctrl+S</small>
                        </div>
                        <div className="octane-catalog-admin-savebar-actions">
                            {!isNewOffer && (
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
                            <button
                                className="octane-catalog-admin-button is-muted"
                                disabled={!canSubmit}
                                type="button"
                                onClick={() => handleSave(true)}
                            >
                                Save and close
                            </button>
                            <button
                                className="octane-catalog-admin-button is-primary"
                                disabled={!canSubmit}
                                type="button"
                                onClick={() => handleSave(false)}
                            >
                                {smartSave.status === 'saving' ? <FaSpinner className="text-[8px] animate-spin" /> : <FaSave className="text-[8px]" />}{' '}
                                {isNewOffer ? LocalizeText('catalog.admin.create') : LocalizeText('catalog.admin.save')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </CatalogAdminModalView>
    );
};
