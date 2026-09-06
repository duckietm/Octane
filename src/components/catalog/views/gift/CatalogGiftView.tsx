import {
    GetSessionDataManager,
    GiftReceiverNotFoundEvent,
    OctaneEvent,
    NotEnoughBalanceMessageEvent,
    PurchaseFromCatalogAsGiftComposer,
    SecurityLevel
} from '@octane/renderer';
import { ChangeEvent, CSSProperties, FC, KeyboardEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ColorUtils,
    GetConfigurationValue,
    GiftWrappingConfiguration,
    LocalizeText,
    MessengerFriend,
    OpenUrl,
    ProductTypeEnum,
    SendMessageComposer
} from '../../../../api';
import giftArrowLeftImage from '../../../../assets/images/catalog/air/gift/arrow-left.png';
import giftArrowRightImage from '../../../../assets/images/catalog/air/gift/arrow-right.png';
import giftCardBlankImage from '../../../../assets/images/catalog/air/gift/gift-card-blank.png';
import giftIncognitoImage from '../../../../assets/images/catalog/air/gift/incognito.png';
import giftPaletteBorderImage from '../../../../assets/images/catalog/air/gift/palette-border.png';
import giftPaletteSelectionImage from '../../../../assets/images/catalog/air/gift/palette-selection.png';
import giftSmallCoinImage from '../../../../assets/images/catalog/air/gift/small-coin.png';
import giftSmallPenImage from '../../../../assets/images/catalog/air/gift/small-pen.png';
import { LayoutAvatarImageView, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import {
    CatalogEvent,
    CatalogInitGiftEvent,
    CatalogPurchasedEvent,
    CatalogPurchaseFailureEvent,
    CatalogPurchaseNotAllowedEvent,
    CatalogPurchaseSoldOutEvent
} from '../../../../events';
import { useCatalogActions, useCatalogUiState, useFriends, useGiftConfiguration, useMessageEvent, useNotification, useUiEvent } from '../../../../hooks';
import {
    filterGiftRecipients,
    findGiftRecipientMatchIndex,
    getRandomGiftDefaultStuffType,
    limitGiftMessageToTextarea,
    resolveGiftWrappingSelection,
    wrapGiftSelectionIndex
} from './CatalogGiftView.helpers';

interface GiftPaletteColor {
    id: number;
    color: string;
}

const getValentineRibbonIndex = (configuration: GiftWrappingConfiguration): number => (configuration.ribbonTypes.length > 10 ? 10 : 0);

export const CatalogGiftView: FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [initializationSequence, setInitializationSequence] = useState(0);
    const [pageId, setPageId] = useState(0);
    const [offerId, setOfferId] = useState(0);
    const [extraData, setExtraData] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [message, setMessage] = useState('');
    const [showMyFace, setShowMyFace] = useState(true);
    const [isBuyingGift, setIsBuyingGift] = useState(false);
    const [defaultStuffType, setDefaultStuffType] = useState<number | null>(null);
    const [selectedBoxIndex, setSelectedBoxIndex] = useState(0);
    const [selectedRibbonIndex, setSelectedRibbonIndex] = useState(0);
    const [selectedColorId, setSelectedColorId] = useState(0);
    const [suggestions, setSuggestions] = useState<MessengerFriend[]>([]);
    const [isAutocompleteVisible, setIsAutocompleteVisible] = useState(false);
    const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
    const recipientInputRef = useRef<HTMLInputElement>(null);
    const messageInputRef = useRef<HTMLTextAreaElement>(null);
    const shouldFocusMessageRef = useRef(false);
    const { friends } = useFriends();
    const { data: giftConfiguration = null, refetch: refetchGiftConfiguration } = useGiftConfiguration();
    const { resetPlacedOfferData = null } = useCatalogActions();
    const { setGiftReceiver = null } = useCatalogUiState();
    const { showConfirm = null, simpleAlert = null } = useNotification();
    const sessionDataManager = GetSessionDataManager();
    const isModerator = sessionDataManager.hasSecurity(SecurityLevel.MODERATOR);

    const allFriends = useMemo(() => friends.filter((friend: MessengerFriend) => friend.id !== -1), [friends]);

    const boxTypes = useMemo(() => {
        if (!giftConfiguration || defaultStuffType === null) return [];

        return [...giftConfiguration.boxTypes, defaultStuffType];
    }, [defaultStuffType, giftConfiguration]);

    const colors = useMemo<GiftPaletteColor[]>(() => {
        if (!giftConfiguration) return [];

        const result: GiftPaletteColor[] = [];

        for (const colorId of giftConfiguration.stuffTypes) {
            const giftData = sessionDataManager.getFloorItemData(colorId);

            if (!giftData?.colors?.length) continue;

            result.push({ id: colorId, color: ColorUtils.makeColorNumberHex(giftData.colors[0]) });
        }

        return result;
    }, [giftConfiguration, sessionDataManager]);

    const resetViewState = useCallback(() => {
        setIsVisible(false);
        setPageId(0);
        setOfferId(0);
        setExtraData('');
        setReceiverName('');
        setMessage('');
        setShowMyFace(true);
        setIsBuyingGift(false);
        setDefaultStuffType(null);
        setSelectedBoxIndex(0);
        setSelectedRibbonIndex(0);
        setSelectedColorId(0);
        setSuggestions([]);
        setIsAutocompleteVisible(false);
        setHighlightedSuggestionIndex(0);
        shouldFocusMessageRef.current = false;
    }, []);

    const onClose = useCallback(() => {
        resetPlacedOfferData?.();
        resetViewState();
    }, [resetPlacedOfferData, resetViewState]);

    useEffect(() => {
        if (!isVisible || !giftConfiguration) return;

        const nextDefaultStuffType = getRandomGiftDefaultStuffType(giftConfiguration.defaultStuffTypes);
        const nextBoxTypes = [...giftConfiguration.boxTypes, nextDefaultStuffType];
        const configuredBoxIndex = Number(GetConfigurationValue('catalog.purchase.gift_wrapping.default_box_index', 0));
        const nextBoxIndex = configuredBoxIndex >= 0 && configuredBoxIndex < nextBoxTypes.length ? configuredBoxIndex : 0;
        let nextRibbonIndex = giftConfiguration.ribbonTypes[0] ?? 0;

        if (nextRibbonIndex < 0 || nextRibbonIndex >= giftConfiguration.ribbonTypes.length) nextRibbonIndex = 0;
        if (nextBoxTypes[nextBoxIndex] === 8) nextRibbonIndex = getValentineRibbonIndex(giftConfiguration);

        setDefaultStuffType(nextDefaultStuffType);
        setSelectedBoxIndex(nextBoxIndex);
        setSelectedRibbonIndex(nextRibbonIndex);
        setSelectedColorId(giftConfiguration.stuffTypes[0] ?? 0);
    }, [giftConfiguration, initializationSequence, isVisible]);

    useEffect(() => {
        if (!isVisible || defaultStuffType === null) return;

        if (shouldFocusMessageRef.current) messageInputRef.current?.focus();
        else recipientInputRef.current?.focus();
    }, [defaultStuffType, initializationSequence, isVisible]);

    const selectedBoxType = boxTypes[selectedBoxIndex] ?? 0;
    const selectedRibbonType = giftConfiguration?.ribbonTypes[selectedRibbonIndex] ?? giftConfiguration?.ribbonTypes[0] ?? 0;
    const isDefaultBox = defaultStuffType !== null && selectedBoxType === defaultStuffType;
    const isValentineBox = selectedBoxType === 8;
    const isRibbonEnabled = !isDefaultBox && !isValentineBox;
    const isColorEnabled = isRibbonEnabled && !(selectedBoxType >= 3 && selectedBoxType <= 6);
    const giftSelection = resolveGiftWrappingSelection(isDefaultBox, defaultStuffType ?? 0, selectedColorId, selectedBoxType, selectedRibbonType);
    const showPurchaserIdentity = isModerator ? showMyFace : true;
    const boxName = `catalog.gift_wrapping_new.box.${isDefaultBox ? 'default' : selectedBoxType}`;
    const ribbonName = `catalog.gift_wrapping_new.ribbon.${selectedRibbonIndex}`;
    const priceText = `catalog.gift_wrapping_new.${isDefaultBox ? 'freeprice' : 'price'}`;
    const configuredGiftCard = GetConfigurationValue<string>('catalog.gift_wrapping_new.gift_card', '');
    const giftCardImage = configuredGiftCard.length
        ? `${GetConfigurationValue<string>('image.library.url', '')}Giftcards/${configuredGiftCard}.png`
        : giftCardBlankImage;

    const selectRelativeBox = useCallback(
        (offset: number) => {
            if (!giftConfiguration || !boxTypes.length) return;

            const nextIndex = wrapGiftSelectionIndex(selectedBoxIndex, offset, boxTypes.length);

            setIsAutocompleteVisible(false);
            setSelectedBoxIndex(nextIndex);

            if (boxTypes[nextIndex] === 8) setSelectedRibbonIndex(getValentineRibbonIndex(giftConfiguration));
        },
        [boxTypes, giftConfiguration, selectedBoxIndex]
    );

    const selectRelativeRibbon = useCallback(
        (offset: number) => {
            if (!giftConfiguration || !isRibbonEnabled) return;

            setIsAutocompleteVisible(false);
            setSelectedRibbonIndex((value) => wrapGiftSelectionIndex(value, offset, giftConfiguration.ribbonTypes.length));
        },
        [giftConfiguration, isRibbonEnabled]
    );

    const selectReceiverName = useCallback((friendName: string) => {
        setReceiverName(friendName);
        setSuggestions([]);
        setIsAutocompleteVisible(false);
        setHighlightedSuggestionIndex(0);
        messageInputRef.current?.focus();
    }, []);

    const onReceiverChanged = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const value = event.target.value;
            const nextSuggestions = filterGiftRecipients(allFriends, value);

            setReceiverName(value);
            setSuggestions(nextSuggestions);
            setIsAutocompleteVisible(nextSuggestions.length > 0);
            setHighlightedSuggestionIndex(0);
        },
        [allFriends]
    );

    const onReceiverKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Tab') {
                setIsAutocompleteVisible(false);
                return;
            }

            if (event.key === 'ArrowDown' && !receiverName.length && (!suggestions.length || !isAutocompleteVisible)) {
                const nextSuggestions = allFriends.slice(0, 10);

                if (nextSuggestions.length) {
                    event.preventDefault();
                    setSuggestions(nextSuggestions);
                    setHighlightedSuggestionIndex(0);
                    setIsAutocompleteVisible(true);
                }

                return;
            }

            if (!suggestions.length) return;

            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    setHighlightedSuggestionIndex((value) => wrapGiftSelectionIndex(value, -1, suggestions.length));
                    return;
                case 'ArrowDown':
                    event.preventDefault();
                    setHighlightedSuggestionIndex((value) => wrapGiftSelectionIndex(value, 1, suggestions.length));
                    return;
                case 'Enter':
                    if (!isAutocompleteVisible) return;

                    event.preventDefault();
                    selectReceiverName(suggestions[highlightedSuggestionIndex]?.name ?? '');
                    return;
            }
        },
        [allFriends, highlightedSuggestionIndex, isAutocompleteVisible, receiverName.length, selectReceiverName, suggestions]
    );

    const onBuyGift = useCallback(() => {
        if (isBuyingGift) return;

        setIsBuyingGift(true);

        SendMessageComposer(
            new PurchaseFromCatalogAsGiftComposer(
                pageId,
                offerId,
                extraData,
                receiverName,
                message,
                giftSelection.wrapperId,
                giftSelection.boxType,
                giftSelection.ribbonType,
                showPurchaserIdentity
            )
        );
        setGiftReceiver?.(null);
        resetPlacedOfferData?.();
    }, [extraData, giftSelection, isBuyingGift, message, offerId, pageId, receiverName, resetPlacedOfferData, setGiftReceiver, showPurchaserIdentity]);

    const onGiftReceiverNotFound = useCallback(() => {
        if (!isVisible || !isBuyingGift) return;

        setIsBuyingGift(false);
        simpleAlert?.(
            LocalizeText('catalog.gift_wrapping.receiver_not_found.info'),
            null,
            null,
            null,
            LocalizeText('catalog.gift_wrapping.receiver_not_found.title')
        );
    }, [isBuyingGift, isVisible, simpleAlert]);

    useMessageEvent<GiftReceiverNotFoundEvent>(GiftReceiverNotFoundEvent, onGiftReceiverNotFound);

    const onNotEnoughBalance = useCallback(
        (event: NotEnoughBalanceMessageEvent) => {
            if (!isVisible || !isBuyingGift) return;

            const parser = event.getParser();

            setIsBuyingGift(false);

            if (parser.notEnoughCredits) {
                const title = LocalizeText('catalog.alert.notenough.title');
                const description = LocalizeText('catalog.alert.notenough.credits.description');

                if (showConfirm) {
                    const settle = () => resetPlacedOfferData?.();

                    showConfirm(
                        description,
                        () => {
                            settle();

                            const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

                            if (shopUrl) OpenUrl(shopUrl);
                        },
                        settle,
                        null,
                        null,
                        title
                    );
                } else {
                    simpleAlert?.(description, null, null, null, title);
                }

                return;
            }

            if (!parser.notEnoughActivityPoints) return;

            const currencyLocalization = GetConfigurationValue<string>(
                `activitypoint.name.${parser.activityPointType}`,
                parser.activityPointType === 0 ? 'tooltip.duckets' : ''
            );

            if (currencyLocalization) {
                const currencyName = LocalizeText(currencyLocalization);
                const description = LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]);
                const title = LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName]);

                if (parser.activityPointType === 0 && showConfirm) {
                    const settle = () => resetPlacedOfferData?.();

                    showConfirm(
                        description,
                        () => {
                            settle();

                            const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

                            if (ducketsUrl) OpenUrl(ducketsUrl);
                        },
                        settle,
                        null,
                        null,
                        title
                    );
                } else {
                    simpleAlert?.(description, null, null, null, title);
                }
            } else {
                simpleAlert?.(
                    LocalizeText('catalog.alert.notenough.activitypoints.description'),
                    null,
                    null,
                    null,
                    LocalizeText(`catalog.alert.notenough.activitypoints.title.${parser.activityPointType}`)
                );
            }
        },
        [isBuyingGift, isVisible, resetPlacedOfferData, showConfirm, simpleAlert]
    );

    useMessageEvent<NotEnoughBalanceMessageEvent>(NotEnoughBalanceMessageEvent, onNotEnoughBalance);

    const onCatalogEvent = useCallback(
        (event: OctaneEvent) => {
            if (event.type === CatalogEvent.INIT_GIFT) {
                const giftEvent = event as CatalogInitGiftEvent;
                const initialReceiverName = giftEvent.receiverName ?? '';

                // Opening the customizer is a continuation of the purchase flow.
                // AIR only clears a placed-offer preview on submit or cancellation.
                resetViewState();
                setPageId(giftEvent.pageId);
                setOfferId(giftEvent.offerId);
                setExtraData(giftEvent.extraData);
                setReceiverName(initialReceiverName);
                shouldFocusMessageRef.current = initialReceiverName.length > 0;
                setInitializationSequence((value) => value + 1);
                setIsVisible(true);

                // The server also pushes this during login, but AIR requests
                // the wrapping configuration explicitly. Retry here when the
                // cached request was missed or failed so gifting cannot end in
                // an invisible second stage.
                if (!giftConfiguration) void refetchGiftConfiguration();

                return;
            }

            // Purchase outcome events are shared by the whole catalog. Only
            // consume one while this dialog owns an in-flight gift purchase.
            if (!isVisible || !isBuyingGift) return;

            switch (event.type) {
                case CatalogPurchasedEvent.PURCHASE_SUCCESS:
                    onClose();
                    return;
                case CatalogPurchaseFailureEvent.PURCHASE_FAILED: {
                    const purchaseError = event as CatalogPurchaseFailureEvent;
                    const descriptionKey =
                        purchaseError.code > 0 ? `catalog.alert.purchaseerror.description.${purchaseError.code}` : 'catalog.alert.purchaseerror.description';

                    simpleAlert?.(LocalizeText(descriptionKey), null, null, null, LocalizeText('catalog.alert.purchaseerror.title'));
                    onClose();
                    return;
                }
                case CatalogPurchaseNotAllowedEvent.NOT_ALLOWED: {
                    const notAllowed = event as CatalogPurchaseNotAllowedEvent;
                    const descriptionKey =
                        notAllowed.code === 1 ? 'catalog.alert.purchasenotallowed.hc.description' : 'catalog.alert.purchasenotallowed.unknown.description';

                    // Polaris uses this response for insufficient gift funds,
                    // so unlock the AIR submit control just as its dedicated
                    // NotEnoughBalance response does.
                    setIsBuyingGift(false);
                    simpleAlert?.(LocalizeText(descriptionKey), null, null, null, LocalizeText('catalog.alert.purchasenotallowed.title'));
                    return;
                }
                case CatalogPurchaseSoldOutEvent.SOLD_OUT:
                    simpleAlert?.(
                        LocalizeText('catalog.alert.limited_edition_sold_out.message'),
                        null,
                        null,
                        null,
                        LocalizeText('catalog.alert.limited_edition_sold_out.title')
                    );
                    onClose();
                    return;
            }
        },
        [giftConfiguration, isBuyingGift, isVisible, onClose, refetchGiftConfiguration, resetViewState, simpleAlert]
    );

    useUiEvent(
        [
            CatalogPurchasedEvent.PURCHASE_SUCCESS,
            CatalogPurchaseFailureEvent.PURCHASE_FAILED,
            CatalogPurchaseNotAllowedEvent.NOT_ALLOWED,
            CatalogPurchaseSoldOutEvent.SOLD_OUT,
            CatalogEvent.INIT_GIFT
        ],
        onCatalogEvent
    );

    const renderSuggestionName = useCallback(
        (name: string): ReactNode => {
            const matchIndex = findGiftRecipientMatchIndex(name, receiverName);

            if (matchIndex < 0 || !receiverName.length) return name;

            const matchEnd = Math.min(matchIndex + receiverName.length, name.length);

            return (
                <>
                    {name.slice(0, matchIndex)}
                    <strong>{name.slice(matchIndex, matchEnd)}</strong>
                    {name.slice(matchEnd)}
                </>
            );
        },
        [receiverName]
    );

    // AIR caches the wrapping configuration when the catalog starts, but
    // showGiftDialog() never gates the customizer on isWrappingEnabled. Once
    // usable wrapper data exists, the second stage of the gift flow opens.
    if (!isVisible || !giftConfiguration || !boxTypes.length) return null;

    return (
        <OctaneCardView classNames={['octane-catalog-gift']} frameStyle={3} isResizable={false} theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('catalog.gift_wrapping.title')} onCloseClick={onClose} />
            <OctaneCardContentView classNames={['octane-catalog-gift-content']} overflow="hidden">
                <div className="octane-catalog-gift-name-border">
                    <input
                        aria-label={LocalizeText('catalog.gift_wrapping_new.name_hint')}
                        className="octane-catalog-gift-name-input"
                        maxLength={32}
                        placeholder={LocalizeText('catalog.gift_wrapping_new.name_hint')}
                        ref={recipientInputRef}
                        type="text"
                        value={receiverName}
                        onChange={onReceiverChanged}
                        onKeyDown={onReceiverKeyDown}
                        onMouseDown={() => setIsAutocompleteVisible(false)}
                    />
                </div>
                <img alt="" className="octane-catalog-gift-pen" draggable={false} src={giftSmallPenImage} />

                {isAutocompleteVisible && suggestions.length > 0 && (
                    <div className="octane-catalog-gift-suggestions" role="listbox">
                        {suggestions.map((friend, index) => (
                            <div
                                aria-selected={index === highlightedSuggestionIndex}
                                className={index === highlightedSuggestionIndex ? 'is-highlighted' : ''}
                                key={friend.id}
                                role="option"
                                onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
                                    event.preventDefault();
                                    selectReceiverName(friend.name);
                                }}
                                onMouseEnter={() => setHighlightedSuggestionIndex(index)}
                            >
                                {renderSuggestionName(friend.name)}
                            </div>
                        ))}
                    </div>
                )}

                <img alt="" className="octane-catalog-gift-card" draggable={false} src={giftCardImage} />
                <div className="octane-catalog-gift-avatar">
                    {showPurchaserIdentity ? (
                        <LayoutAvatarImageView
                            headOnly
                            classNames={['octane-catalog-gift-avatar-image']}
                            direction={2}
                            figure={sessionDataManager.figure}
                            nativeCroppedHead
                        />
                    ) : (
                        <img alt="" className="octane-catalog-gift-incognito" draggable={false} src={giftIncognitoImage} />
                    )}
                </div>
                <textarea
                    aria-label={LocalizeText('catalog.gift_wrapping_new.message_hint')}
                    className={`octane-catalog-gift-message${isAutocompleteVisible && suggestions.length >= 2 ? ' is-concealed' : ''}`}
                    maxLength={140}
                    placeholder={LocalizeText('catalog.gift_wrapping_new.message_hint')}
                    ref={messageInputRef}
                    value={message}
                    onChange={(event) => setMessage(limitGiftMessageToTextarea(event.target.value, event.target))}
                    onFocus={() => setIsAutocompleteVisible(false)}
                />
                {showPurchaserIdentity && (
                    <div className="octane-catalog-gift-signature">
                        {LocalizeText('catalog.gift_wrapping_new.message_from', ['name'], [sessionDataManager.userName])}
                    </div>
                )}

                {isModerator && (
                    <>
                        <input
                            aria-label={LocalizeText('catalog.gift_wrapping.show_face.title')}
                            checked={showMyFace}
                            className="octane-catalog-gift-show-face"
                            id="octane-catalog-gift-show-face"
                            type="checkbox"
                            onChange={(event) => setShowMyFace(event.target.checked)}
                        />
                        <label className="octane-catalog-gift-show-face-label" htmlFor="octane-catalog-gift-show-face">
                            {LocalizeText('catalog.gift_wrapping.show_face.title')}
                        </label>
                    </>
                )}

                <div className="octane-catalog-gift-box-picker">
                    <div className="octane-catalog-gift-product-border">
                        <div className="octane-catalog-gift-product-image">
                            {giftSelection.wrapperId > 0 && (
                                <LayoutFurniImageView
                                    direction={180}
                                    extraData={giftSelection.previewExtraData}
                                    productClassId={giftSelection.wrapperId}
                                    productType={ProductTypeEnum.FLOOR}
                                />
                            )}
                        </div>
                    </div>
                    <button
                        aria-label={LocalizeText('catalog.gift_wrapping.pick_box')}
                        className="octane-catalog-gift-arrow octane-catalog-gift-box-prev"
                        type="button"
                        onClick={() => selectRelativeBox(-1)}
                    >
                        <img alt="" draggable={false} src={giftArrowLeftImage} />
                    </button>
                    <button
                        aria-label={LocalizeText('catalog.gift_wrapping.pick_box')}
                        className="octane-catalog-gift-arrow octane-catalog-gift-box-next"
                        type="button"
                        onClick={() => selectRelativeBox(1)}
                    >
                        <img alt="" draggable={false} src={giftArrowRightImage} />
                    </button>
                    <div className="octane-catalog-gift-box-name">{LocalizeText(boxName)}</div>
                    <div className="octane-catalog-gift-price">
                        <span>{LocalizeText(priceText, ['price'], [giftConfiguration.price.toString()])}</span>
                        {!isDefaultBox && <img alt="" draggable={false} src={giftSmallCoinImage} />}
                    </div>
                    <button
                        aria-label={LocalizeText('catalog.gift_wrapping.pick_ribbon.title')}
                        className={`octane-catalog-gift-arrow octane-catalog-gift-ribbon-prev${isRibbonEnabled ? '' : ' is-disabled'}`}
                        disabled={!isRibbonEnabled}
                        type="button"
                        onClick={() => selectRelativeRibbon(-1)}
                    >
                        <img alt="" draggable={false} src={giftArrowLeftImage} />
                    </button>
                    <button
                        aria-label={LocalizeText('catalog.gift_wrapping.pick_ribbon.title')}
                        className={`octane-catalog-gift-arrow octane-catalog-gift-ribbon-next${isRibbonEnabled ? '' : ' is-disabled'}`}
                        disabled={!isRibbonEnabled}
                        type="button"
                        onClick={() => selectRelativeRibbon(1)}
                    >
                        <img alt="" draggable={false} src={giftArrowRightImage} />
                    </button>
                    <div className={`octane-catalog-gift-ribbon-name${isRibbonEnabled ? '' : ' is-disabled'}`}>{LocalizeText(ribbonName)}</div>
                </div>

                <div className={`octane-catalog-gift-color-title${isColorEnabled ? '' : ' is-disabled'}`}>
                    {LocalizeText('catalog.gift_wrapping.pick_color')}
                </div>
                <div className={`octane-catalog-gift-palette${isColorEnabled ? '' : ' is-disabled'}`}>
                    <div className="octane-catalog-gift-palette-grid">
                        {colors.map((color) => (
                            <button
                                aria-label={color.color}
                                className="octane-catalog-gift-palette-item"
                                disabled={!isColorEnabled}
                                key={color.id}
                                style={{ '--octane-gift-palette-color': color.color } as CSSProperties}
                                type="button"
                                onClick={() => {
                                    setIsAutocompleteVisible(false);
                                    setSelectedColorId(color.id);
                                }}
                            >
                                <span className="octane-catalog-gift-palette-color" />
                                <img alt="" className="octane-catalog-gift-palette-border" draggable={false} src={giftPaletteBorderImage} />
                                {color.id === selectedColorId && (
                                    <img alt="" className="octane-catalog-gift-palette-selection" draggable={false} src={giftPaletteSelectionImage} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="octane-catalog-gift-cancel" type="button" onClick={onClose}>
                    {LocalizeText('catalog.gift_wrapping.cancel')}
                </button>
                <button className="octane-catalog-gift-submit" disabled={isBuyingGift} type="button" onClick={onBuyGift}>
                    {LocalizeText('catalog.gift_wrapping.give_gift')}
                </button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
