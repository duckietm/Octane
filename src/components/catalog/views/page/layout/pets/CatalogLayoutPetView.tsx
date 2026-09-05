import {
    ApproveNameMessageComposer,
    ApproveNameMessageEvent,
    ColorConverter,
    GetRoomContentLoader,
    GetRoomEngine,
    PurchaseFromCatalogComposer,
    RoomContentLoadedEvent,
    SellablePetPaletteData
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCheck, FaLock, FaTimes } from 'react-icons/fa';
import { DispatchUiEvent, GetPetAvailableColors, GetPetIndexFromLocalization, LocalizeText, SendMessageComposer } from '../../../../../../api';
import { LayoutPetImageView } from '../../../../../../common';
import { CatalogPurchasedEvent, CatalogPurchaseFailureEvent } from '../../../../../../events';
import { useCatalogData, useCatalogUiState, useMessageEvent, useOctaneEvent, useSellablePetPalette, useUiEvent, useUserDataSnapshot } from '../../../../../../hooks';
import { CatalogScrollAreaView } from '../../common/CatalogScrollAreaView';
import { CatalogAddOnBadgeWidgetView } from '../../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogTotalPriceWidget } from '../../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import {
    buildNewPetPaletteChoices,
    buildPetPurchaseExtraData,
    filterPetPalettes,
    getPetNameMaxLength,
    isLegacyPetType,
    PetPaletteLike,
} from './petCatalog.helpers';

interface PendingPetPurchase {
    extraData: string;
    offerId: number;
    pageId: number;
}

export const CatalogLayoutPetView: FC<CatalogLayoutProps> = ({ page = null }) => {
    const [petIndex, setPetIndex] = useState(-1);
    const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(-1);
    const [selectedColorIndex, setSelectedColorIndex] = useState(-1);
    const [petName, setPetName] = useState('');
    const [approvalPending, setApprovalPending] = useState(false);
    const [purchasePending, setPurchasePending] = useState(false);
    const [approvalResult, setApprovalResult] = useState(-1);
    const pendingPurchaseRef = useRef<PendingPetPurchase | null>(null);
    const purchasePendingRef = useRef(false);
    const activePageIdRef = useRef(page?.pageId ?? -1);
    activePageIdRef.current = page?.pageId ?? -1;
    const { currentOffer = null } = useCatalogData();
    const { setCurrentOffer = null } = useCatalogUiState();
    const breed = (currentOffer?.product?.productData?.type as unknown as string) ?? '';
    const { data: petPalette = null } = useSellablePetPalette(breed);
    const legacyPet = isLegacyPetType(petIndex);
    const clubLevel = useUserDataSnapshot().clubLevel;
    const isHc = clubLevel > 0;
    // A club_only breed is shown to everyone but only selectable/buyable by HC members.
    const isBreedLocked = (palette: { clubOnly?: boolean } | null | undefined) => !!palette?.clubOnly && !isHc;
    // Prefer a hotel-provided text; fall back to a readable default when the key is unset.
    const hcOnlyText = LocalizeText('catalog.pets.breed.hc_only');
    const hcOnlyLabel = hcOnlyText === 'catalog.pets.breed.hc_only' ? 'Habbo Club only' : hcOnlyText;
    const [petAssetRefreshKey, setPetAssetRefreshKey] = useState(0);
    const petTypeName = petIndex >= 0 ? (GetRoomContentLoader().getPetNameForType(petIndex) ?? null) : null;

    const sellablePalettes = useMemo(
        () => filterPetPalettes(petIndex, petPalette?.palettes ?? []),
        [petIndex, petPalette]
    );

    const legacyBreeds = useMemo(() => {
        if (!legacyPet) return [];

        // re-run once the pet asset finishes downloading and its palettes are known
        void petAssetRefreshKey;

        const existing = sellablePalettes.filter(
            (palette) => !!GetRoomEngine().getPetColorResult(petIndex, palette.paletteId)
        );

        return existing.length ? existing : sellablePalettes;
    }, [legacyPet, petAssetRefreshKey, petIndex, sellablePalettes]);

    useEffect(() => {
        if (!petTypeName) return;

        GetRoomContentLoader().downloadAsset(petTypeName);
    }, [petTypeName]);

    useOctaneEvent<RoomContentLoadedEvent>(
        RoomContentLoadedEvent.RCLE_SUCCESS,
        (event) => {
            if (event.contentType !== petTypeName) return;

            setPetAssetRefreshKey((key) => key + 1);
        },
        !!petTypeName
    );

    const newPetChoices = useMemo(() => {
        if (legacyPet) return [];

        void petAssetRefreshKey;

        let palettes: PetPaletteLike[] = sellablePalettes as unknown as PetPaletteLike[];

        if (!palettes.length) {
            const derived: PetPaletteLike[] = [];

            for (let paletteId = 0; paletteId <= 128; paletteId++) {
                if (GetRoomEngine().getPetColorResult(petIndex, paletteId)) {
                    derived.push({ breedId: paletteId, paletteId, rare: false, sellable: true, type: petIndex, clubOnly: false });
                }
            }

            palettes = derived;
        }

        return buildNewPetPaletteChoices(petIndex, palettes, (type, paletteId) => GetRoomEngine().getPetColorResult(type, paletteId));
    }, [legacyPet, petAssetRefreshKey, petIndex, sellablePalettes]);

    const selectablePalettes = useMemo(
        () => (legacyPet ? legacyBreeds : newPetChoices.map((choice) => choice.palette)),
        [legacyPet, legacyBreeds, newPetChoices]
    );

    const legacyColors = useMemo(
        () => (legacyPet ? GetPetAvailableColors(petIndex, sellablePalettes as SellablePetPaletteData[]) : []),
        [legacyPet, petIndex, sellablePalettes]
    );

    const selectedPalette = selectedPaletteIndex >= 0 ? selectablePalettes[selectedPaletteIndex] : null;
    const selectedColor = legacyPet
        ? (legacyColors[selectedColorIndex]?.[0] ?? 0xffffff)
        : (newPetChoices[selectedPaletteIndex]?.colors[0] ?? 0xffffff);

    const purchaseExtraData = useMemo(() => {
        if (!petName || !selectedPalette) return '';
        if (legacyPet && selectedColorIndex < 0) return '';
        if ((selectedPalette as { clubOnly?: boolean }).clubOnly && !isHc) return '';

        return buildPetPurchaseExtraData(petName, petIndex, selectedPalette, selectedColor);
    }, [isHc, legacyPet, petIndex, petName, selectedColor, selectedColorIndex, selectedPalette]);

    const validationErrorMessage = useMemo(() => {
        const errorKeys: Record<number, string> = {
            1: 'catalog.alert.petname.long',
            2: 'catalog.alert.petname.short',
            3: 'catalog.alert.petname.chars',
            4: 'catalog.alert.petname.bobba'
        };
        const key = errorKeys[approvalResult];

        return key ? LocalizeText(key) : '';
    }, [approvalResult]);

    const requestPurchase = useCallback(() => {
        if (approvalPending || purchasePendingRef.current || !page || !currentOffer || !purchaseExtraData) return;

        pendingPurchaseRef.current = {
            extraData: purchaseExtraData,
            offerId: currentOffer.offerId,
            pageId: page.pageId
        };
        setApprovalPending(true);
        setApprovalResult(-1);
        SendMessageComposer(new ApproveNameMessageComposer(petName, 1));
    }, [approvalPending, currentOffer, page, petName, purchaseExtraData]);

    useMessageEvent<ApproveNameMessageEvent>(ApproveNameMessageEvent, (event) => {
        const pendingPurchase = pendingPurchaseRef.current;

        if (!pendingPurchase) return;

        if (pendingPurchase.pageId !== activePageIdRef.current) {
            pendingPurchaseRef.current = null;
            setApprovalPending(false);
            return;
        }

        const parser = event.getParser();

        pendingPurchaseRef.current = null;
        setApprovalPending(false);
        setApprovalResult(parser.result);

        if (parser.result === 0) {
            purchasePendingRef.current = true;
            setPurchasePending(true);
            SendMessageComposer(
                new PurchaseFromCatalogComposer(pendingPurchase.pageId, pendingPurchase.offerId, pendingPurchase.extraData, 1)
            );
        } else {
            DispatchUiEvent(new CatalogPurchaseFailureEvent(-1));
        }
    });

    const finishPurchase = useCallback(() => {
        if (!purchasePendingRef.current) return;

        purchasePendingRef.current = false;
        setPurchasePending(false);
    }, []);

    useUiEvent(CatalogPurchasedEvent.PURCHASE_SUCCESS, finishPurchase);
    useUiEvent(CatalogPurchaseFailureEvent.PURCHASE_FAILED, finishPurchase);

    useEffect(() => {
        if (!page?.offers.length) return;

        const offer = page.offers[0];

        setCurrentOffer(offer);
        setPetIndex(GetPetIndexFromLocalization(offer.localizationId));
    }, [page, setCurrentOffer]);

    useEffect(() => {
        pendingPurchaseRef.current = null;
        purchasePendingRef.current = false;
        setApprovalPending(false);
        setPurchasePending(false);
        setApprovalResult(-1);
        setPetName('');
    }, [page?.pageId]);

    useEffect(() => {
        setSelectedPaletteIndex(selectablePalettes.length ? 0 : -1);
    }, [selectablePalettes]);

    useEffect(() => {
        setSelectedColorIndex(legacyColors.length ? 0 : -1);
    }, [legacyColors]);

    useEffect(() => {
        if (approvalPending) return;

        setApprovalResult(-1);
    }, [approvalPending, petName]);

    if (!currentOffer) return null;

    const controlsDisabled = approvalPending || purchasePending;
    const colorLabel = LocalizeText('catalog.pets.choose.color');

    return (
        <div
            className={`octane-catalog-pet-layout ${legacyPet ? 'octane-catalog-pet-layout--legacy' : 'octane-catalog-pet-layout--new'}`}
        >
            <div className="octane-catalog-pet-preview relative h-[240px] min-h-[240px] overflow-hidden">
                {selectedPalette && (
                    <div className="octane-catalog-pet-preview-image">
                        <LayoutPetImageView
                            direction={legacyPet || petIndex === 15 ? 2 : 3}
                            paletteId={selectedPalette.paletteId}
                            petColor={legacyPet ? selectedColor : 0xffffff}
                            scale={petIndex === 15 ? 1 : 2}
                            typeId={petIndex}
                        />
                    </div>
                )}
                <CatalogAddOnBadgeWidgetView className="octane-catalog-pet-preview-badge" />
                <div className="octane-catalog-pet-preview-price">
                    <CatalogTotalPriceWidget />
                </div>
            </div>

            <div className="octane-catalog-pet-editor">
                {legacyPet ? (
                    <>
                        <div className="octane-catalog-pet-field">
                            <span>{colorLabel}</span>
                            <CatalogScrollAreaView
                                className="octane-catalog-pet-color-grid"
                                contentClassName="octane-catalog-pet-color-grid-content"
                                aria-label={colorLabel}
                                role="group"
                            >
                                {legacyColors.map((colors, index) => (
                                    <button
                                        key={`${colors[0]}-${index}`}
                                        aria-label={`${colorLabel} ${index + 1}`}
                                        aria-pressed={selectedColorIndex === index}
                                        className="octane-catalog-pet-color-swatch"
                                        disabled={controlsDisabled}
                                        style={{ backgroundColor: ColorConverter.int2rgb(colors[0]) }}
                                        type="button"
                                        onClick={() => setSelectedColorIndex(index)}
                                    />
                                ))}
                            </CatalogScrollAreaView>
                        </div>
                        {selectablePalettes.length > 1 && (
                            <label className="octane-catalog-pet-breed-selector">
                                <span>{LocalizeText('catalog.pets.choose.breed')}</span>
                                <select
                                    value={selectedPaletteIndex}
                                    disabled={controlsDisabled}
                                    onChange={(event) => setSelectedPaletteIndex(Number(event.target.value))}
                                >
                                    {selectablePalettes.map((palette, index) => {
                                        const locked = isBreedLocked(palette);

                                        return (
                                            <option key={palette.paletteId} disabled={locked} value={index}>
                                                {LocalizeText(`pet.breed.${petIndex}.${palette.breedId}`)}
                                                {locked ? ` (${hcOnlyLabel})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </label>
                        )}
                    </>
                ) : (
                    <div className="octane-catalog-pet-field">
                        <span>{colorLabel}</span>
                        <CatalogScrollAreaView
                            className="octane-catalog-pet-color-grid"
                            contentClassName="octane-catalog-pet-color-grid-content"
                            aria-label={colorLabel}
                            role="group"
                        >
                            {newPetChoices.map((choice, index) => {
                                const colors = choice.colors.map((color) => ColorConverter.int2rgb(color));
                                const style = {
                                    background:
                                        colors.length > 1
                                            ? `linear-gradient(135deg, ${colors[0]} 0 50%, ${colors[1]} 50% 100%)`
                                            : colors[0]
                                };
                                const locked = isBreedLocked(choice.palette);

                                return (
                                    <button
                                        key={choice.palette.paletteId}
                                        aria-label={locked ? `${colorLabel} ${index + 1} — ${hcOnlyLabel}` : `${colorLabel} ${index + 1}`}
                                        aria-pressed={selectedPaletteIndex === index}
                                        className={`octane-catalog-pet-color-swatch${locked ? ' octane-catalog-pet-color-swatch--locked' : ''}`}
                                        disabled={controlsDisabled || locked}
                                        style={style}
                                        title={locked ? hcOnlyLabel : undefined}
                                        type="button"
                                        onClick={() => setSelectedPaletteIndex(index)}
                                    >
                                        {locked && <FaLock className="octane-catalog-pet-swatch-lock" />}
                                    </button>
                                );
                            })}
                        </CatalogScrollAreaView>
                    </div>
                )}

                <div className="octane-catalog-pet-purchase mt-auto">
                    <label className="octane-catalog-pet-name-field">
                        <span>{LocalizeText('widgets.petpackage.name.title')}</span>
                        <span className="relative flex-1">
                            <input
                                disabled={controlsDisabled}
                                maxLength={getPetNameMaxLength(petIndex)}
                                placeholder={LocalizeText('widgets.petpackage.name.title')}
                                type="text"
                                value={petName}
                                onChange={(event) => setPetName(event.target.value)}
                            />
                            {approvalResult === 0 && <FaCheck className="octane-catalog-pet-name-status text-success" />}
                            {approvalResult > 0 && <FaTimes className="octane-catalog-pet-name-status text-danger" />}
                        </span>
                    </label>
                    {approvalResult > 0 && <span className="octane-catalog-pet-name-error">{validationErrorMessage}</span>}
                    {isBreedLocked(selectedPalette) && (
                        <span className="octane-catalog-pet-hc-note">
                            <FaLock /> {hcOnlyLabel}
                        </span>
                    )}
                    <div className="octane-catalog-pet-purchase-row">
                        <button
                            className="octane-catalog-standard-button octane-catalog-standard-buy-button"
                            disabled={controlsDisabled || !purchaseExtraData}
                            onClick={requestPurchase}
                        >
                            {LocalizeText('catalog.purchase_confirmation.buy')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
