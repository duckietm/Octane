import { FC, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CatalogType, GetConfigurationValue, LocalizeText } from '../../../../../api';
import { getCatalogBundleDiscountFlatPriceSteps, getCatalogBundleDiscountItemCount } from '../../../../../api/catalog/CatalogBundleDiscount';
import { useCatalogBundleDiscountRuleset, useCatalogData, useCatalogUiState } from '../../../../../hooks';

const MIN_VALUE: number = 1;
const MAX_VALUE: number = 100;
const HOLD_STEP_DELAY_MS: number = 75;
const HOLD_ACCELERATION_DISTANCE: number = 35;

type QuantityStepDirection = -1 | 1;

export const clampCatalogPurchaseQuantity = (value: number, maxValue: number = MAX_VALUE): number => {
    if (isNaN(value)) return MIN_VALUE;

    return Math.min(Math.max(Math.trunc(value), MIN_VALUE), Math.max(MIN_VALUE, Math.trunc(maxValue)));
};

export const stepCatalogPurchaseQuantity = (
    value: number,
    direction: QuantityStepDirection,
    maxValue: number = MAX_VALUE,
    skippedQuantities: ReadonlySet<number> = new Set<number>()
): number => {
    let nextValue = value + direction;

    while (skippedQuantities.has(nextValue)) nextValue += direction;

    return clampCatalogPurchaseQuantity(nextValue, maxValue);
};

export const CatalogSpinnerWidgetView: FC<{}> = () => {
    const { currentOffer = null } = useCatalogData();
    const { currentType = CatalogType.NORMAL, purchaseOptions = null, setPurchaseOptions = null } = useCatalogUiState();
    const { data: bundleDiscountRuleset = null } = useCatalogBundleDiscountRuleset();
    const quantityInputId = useId();
    const quantity = purchaseOptions?.quantity ?? MIN_VALUE;
    const maxPurchaseSize = Math.max(MIN_VALUE, Math.trunc(bundleDiscountRuleset?.maxPurchaseSize ?? MAX_VALUE));
    const freeItemCount = currentOffer?.bundlePurchaseAllowed ? getCatalogBundleDiscountItemCount(quantity, bundleDiscountRuleset) : 0;
    const skippedQuantities = useMemo(
        () => new Set<number>(currentOffer?.bundlePurchaseAllowed ? getCatalogBundleDiscountFlatPriceSteps(bundleDiscountRuleset) : []),
        [bundleDiscountRuleset, currentOffer?.bundlePurchaseAllowed]
    );
    const [quantityDraft, setQuantityDraft] = useState(() => quantity.toString());
    const quantityRef = useRef(quantity);
    const holdStartQuantityRef = useRef(quantity);
    const holdDidRepeatRef = useRef(false);
    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopStepping = useCallback(() => {
        if (holdTimerRef.current === null) return;

        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
    }, []);

    useEffect(() => {
        stopStepping();
        setQuantityDraft(MIN_VALUE.toString());
    }, [currentOffer, stopStepping]);

    useEffect(() => {
        quantityRef.current = quantity;
    }, [quantity]);

    useEffect(() => () => stopStepping(), [stopStepping]);

    useEffect(() => {
        stopStepping();
    }, [maxPurchaseSize, skippedQuantities, stopStepping]);

    useEffect(() => {
        if (quantity <= maxPurchaseSize) return;

        quantityRef.current = maxPurchaseSize;
        setQuantityDraft(maxPurchaseSize.toString());
        setPurchaseOptions((prevValue) => ({ ...prevValue, quantity: maxPurchaseSize }));
    }, [maxPurchaseSize, quantity, setPurchaseOptions]);

    const updateQuantity = useCallback(
        (value: number, syncDraft: boolean = true): boolean => {
            value = clampCatalogPurchaseQuantity(value, maxPurchaseSize);

            if (value === quantityRef.current) return false;

            quantityRef.current = value;
            if (syncDraft) setQuantityDraft(value.toString());

            setPurchaseOptions((prevValue) => {
                const newValue = { ...prevValue };

                newValue.quantity = value;

                return newValue;
            });

            return true;
        },
        [maxPurchaseSize, setPurchaseOptions]
    );

    const stepQuantity = useCallback(
        (direction: QuantityStepDirection): boolean =>
            updateQuantity(stepCatalogPurchaseQuantity(quantityRef.current, direction, maxPurchaseSize, skippedQuantities)),
        [maxPurchaseSize, skippedQuantities, updateQuantity]
    );

    const startStepping = useCallback(
        (direction: QuantityStepDirection) => {
            stopStepping();
            holdStartQuantityRef.current = quantityRef.current;
            holdDidRepeatRef.current = false;
            holdTimerRef.current = setInterval(() => {
                holdDidRepeatRef.current = true;

                if (!stepQuantity(direction)) {
                    stopStepping();
                    return;
                }

                if (Math.abs(quantityRef.current - holdStartQuantityRef.current) > HOLD_ACCELERATION_DISTANCE) {
                    stepQuantity(direction);
                }
            }, HOLD_STEP_DELAY_MS);
        },
        [stepQuantity, stopStepping]
    );

    const finishStepClick = (direction: QuantityStepDirection, mouseClickCount: number) => {
        if (mouseClickCount === 0 || !holdDidRepeatRef.current) stepQuantity(direction);

        holdDidRepeatRef.current = false;
    };

    const updateQuantityDraft = (value: string) => {
        if (value.length && !/^\d+$/.test(value)) return;

        if (!value.length) {
            setQuantityDraft('');
            updateQuantity(Number.NaN, false);
            return;
        }

        const nextQuantity = clampCatalogPurchaseQuantity(Number(value), maxPurchaseSize);

        setQuantityDraft(nextQuantity.toString());
        updateQuantity(nextQuantity, false);
    };

    if (
        !currentOffer?.bundlePurchaseAllowed ||
        currentType === CatalogType.BUILDER ||
        !GetConfigurationValue<boolean>('catalog.multiple.purchase.enabled', true)
    )
        return null;

    return (
        <div className="octane-catalog-standard-spinner">
            <label className="octane-catalog-standard-spinner-label" htmlFor={quantityInputId}>
                {LocalizeText('catalog.bundlewidget.quantity')}
            </label>
            {freeItemCount > 0 && (
                <div className="octane-catalog-standard-spinner-discount">
                    <span className="octane-catalog-standard-spinner-discount-copy">
                        {LocalizeText('shop.bonus.items.count', ['amount'], [freeItemCount.toString()])}
                    </span>
                    <span aria-hidden="true" className="octane-catalog-standard-spinner-discount-star" />
                </div>
            )}
            <button
                type="button"
                className="octane-catalog-standard-spinner-button octane-catalog-standard-spinner-button-less"
                aria-controls={quantityInputId}
                aria-label={`${LocalizeText('catalog.bundlewidget.quantity')} −`}
                disabled={quantity <= MIN_VALUE}
                onBlur={stopStepping}
                onClick={(event) => finishStepClick(-1, event.detail)}
                onLostPointerCapture={stopStepping}
                onPointerCancel={stopStepping}
                onPointerDown={(event) => {
                    if (event.button !== 0) return;

                    event.currentTarget.setPointerCapture(event.pointerId);
                    startStepping(-1);
                }}
                onPointerUp={stopStepping}
            />
            <div className="octane-catalog-standard-spinner-input-frame">
                <input
                    id={quantityInputId}
                    className="octane-catalog-standard-spinner-value"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={maxPurchaseSize.toString().length}
                    value={quantityDraft}
                    onChange={(event) => updateQuantityDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

                        event.preventDefault();
                        stepQuantity(event.key === 'ArrowDown' ? -1 : 1);
                    }}
                />
            </div>
            <button
                type="button"
                className="octane-catalog-standard-spinner-button octane-catalog-standard-spinner-button-more"
                aria-controls={quantityInputId}
                aria-label={`${LocalizeText('catalog.bundlewidget.quantity')} +`}
                disabled={quantity >= maxPurchaseSize}
                onBlur={stopStepping}
                onClick={(event) => finishStepClick(1, event.detail)}
                onLostPointerCapture={stopStepping}
                onPointerCancel={stopStepping}
                onPointerDown={(event) => {
                    if (event.button !== 0) return;

                    event.currentTarget.setPointerCapture(event.pointerId);
                    startStepping(1);
                }}
                onPointerUp={stopStepping}
            />
        </div>
    );
};
