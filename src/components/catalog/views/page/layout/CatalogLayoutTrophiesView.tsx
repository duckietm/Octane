import { FC, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { handleInternalLinkClick, LocalizeText, localizeWithFallback, SanitizeHtmlWithInternalLinks } from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { LayoutFurniImageView } from '../../../../../common/layout/LayoutFurniImageView';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogActions, useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { getTrophyMetal, groupTrophyOffers, pickTrophyOffer, TROPHY_METAL_COLOURS, TROPHY_METALS, TrophyMetal } from './catalogTrophies.helpers';

/**
 * AIR layout_trophies_xml with TrophyCatalogWidget, in AIR's order but stretched over the whole catalog page: the
 * description (`trophy.description`, text 0) on top, the selected trophy (furni image, direction 2) with the previous /
 * next model buttons in the preview that takes the free height, the metal swatches (gold, silver, bronze), the
 * inscription label (`trophy.enscription`, text 1) and box, and the purchase row. Offers are grouped into models by
 * name (`_g`, `_s`, `_b`); a model without the chosen metal shows its first offer.
 */
export const CatalogLayoutTrophiesView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [inscription, setInscription] = useState('');
    const [modelIndex, setModelIndex] = useState(0);
    const [metal, setMetal] = useState<TrophyMetal>('g');
    const { currentOffer = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { setPurchaseOptions = null } = useCatalogUiState();

    const models = useMemo(() => groupTrophyOffers(page?.offers ?? []), [page]);
    const offer = pickTrophyOffer(models[modelIndex] ?? models[0], metal);
    const showModelButtons = models.length > 1;
    const showMetals = models.some((model) => model.offers.size > 1);

    // A new page starts on its first model in gold, or on the trophy the catalog opened it for (a search result).
    const currentOfferRef = useRef(currentOffer);

    useLayoutEffect(() => {
        currentOfferRef.current = currentOffer;
    });

    useEffect(() => {
        const opened = currentOfferRef.current;
        const openedModel = opened ? models.findIndex((model) => Array.from(model.offers.values()).includes(opened)) : -1;

        setModelIndex(Math.max(0, openedModel));
        setMetal(openedModel >= 0 ? getTrophyMetal(opened.localizationId) || 'g' : 'g');
    }, [models]);

    useEffect(() => {
        if (offer && offer !== currentOffer) selectCatalogOffer?.(offer);
    }, [offer, currentOffer, selectCatalogOffer]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions?.((previous) => ({ ...previous, extraData: inscription }));
    }, [currentOffer, inscription, setPurchaseOptions]);

    const stepModel = (step: number) => {
        if (!models.length) return;

        setModelIndex((index) => (index + step + models.length) % models.length);
    };

    const product = offer?.product;

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-trophies">
                <div
                    className="octane-catalog-air-trophies__description"
                    onClick={handleInternalLinkClick}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtmlWithInternalLinks(page?.localization?.getText(0) ?? '') }}
                />
                <div className="octane-catalog-air-trophies__preview">
                    {!!product && (
                        <LayoutFurniImageView
                            direction={2}
                            extraData={product.extraParam}
                            productClassId={product.productClassId}
                            productType={product.productType}
                        />
                    )}
                    {!!offer && <CatalogTotalPriceWidget className="octane-catalog-air-trophies__price" />}
                    {showModelButtons && (
                        <>
                            <BaseButton
                                aria-label={localizeWithFallback('catalog.trophies.previous', 'Previous')}
                                className="octane-catalog-air-trophies__model is-previous"
                                onClick={() => stepModel(-1)}
                            >
                                <FaChevronLeft />
                            </BaseButton>
                            <BaseButton
                                aria-label={localizeWithFallback('catalog.trophies.next', 'Next')}
                                className="octane-catalog-air-trophies__model is-next"
                                onClick={() => stepModel(1)}
                            >
                                <FaChevronRight />
                            </BaseButton>
                        </>
                    )}
                </div>
                {showMetals && (
                    <div className="octane-catalog-air-trophies__metals" role="radiogroup">
                        {TROPHY_METALS.map((value) => (
                            <BaseButton
                                key={value}
                                role="radio"
                                aria-checked={metal === value}
                                aria-label={value}
                                className={`octane-catalog-air-trophies__metal ${metal === value ? 'is-selected' : ''}`}
                                style={{ backgroundColor: TROPHY_METAL_COLOURS[value] }}
                                onClick={() => setMetal(value)}
                            />
                        ))}
                    </div>
                )}
                <div className="octane-catalog-air-trophies__inscription-label">{page?.localization?.getText(1) ?? ''}</div>
                <div className="octane-catalog-air-trophies__inscription">
                    <textarea
                        maxLength={200}
                        placeholder={LocalizeText('catalog.trophies.inscription.placeholder')}
                        value={inscription}
                        onChange={(event) => setInscription(event.target.value)}
                    />
                </div>
                <div className="octane-catalog-air-trophies__purchase">
                    <CatalogPurchaseWidgetView />
                </div>
            </div>
        </NativeTextTree>
    );
};
