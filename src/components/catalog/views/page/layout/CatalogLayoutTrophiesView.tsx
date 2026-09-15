import { FC, useEffect, useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaPen, FaTrophy } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, ProductTypeEnum, SanitizeHtml } from '../../../../../api';
import { Text } from '../../../../../common';
import { useCatalogData, useCatalogUiState } from '../../../../../hooks';
import { CatalogAddOnBadgeWidgetView } from '../widgets/CatalogAddOnBadgeWidgetView';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogViewProductWidgetView } from '../widgets/CatalogViewProductWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { getAdjacentTrophyOffer, groupTrophyOffers } from './catalogTrophies.helpers';

export const CatalogLayoutTrophiesView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [trophyText, setTrophyText] = useState<string>('');
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null, setCurrentOffer = null } = useCatalogUiState();
    // The official trophyWidget arrows step through models, not through gold/silver/bronze.
    const hasSeveralModels = groupTrophyOffers(page?.offers ?? []).length > 1;
    const selectAdjacentModel = (direction: 1 | -1) => {
        const offer = getAdjacentTrophyOffer(page?.offers ?? [], currentOffer, direction);

        if (offer) setCurrentOffer?.(offer);
    };

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => {
            const newValue = { ...prevValue };

            newValue.extraData = trophyText;

            return newValue;
        });
    }, [currentOffer, trophyText, setPurchaseOptions]);

    const canPurchase = currentOffer && trophyText.trim().length > 0;

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Selected trophy card. shrink-0 + no overflow-hidden so the
                 Buy button stays inside the panel even when the grid below
                 holds many trophies. */}
            {currentOffer ? (
                <div className="octane-catalog-trophy-card flex gap-0 bg-white rounded border-2 border-warning/40 shrink-0">
                    {/* Preview */}
                    <div className="octane-catalog-trophy-preview w-[120px] min-w-[120px] relative flex items-center justify-center border-r-2 border-warning/30">
                        {currentOffer.product.productType !== ProductTypeEnum.BADGE ? (
                            <>
                                <CatalogViewProductWidgetView />
                                <CatalogAddOnBadgeWidgetView className="bg-muted rounded bottom-1 right-1 absolute" />
                            </>
                        ) : (
                            <CatalogAddOnBadgeWidgetView className="scale-200" />
                        )}
                        {hasSeveralModels && (
                            <>
                                <button
                                    aria-label={localizeWithFallback('catalog.trophies.prev_model', 'Previous model')}
                                    className="octane-catalog-trophy-model-button absolute left-1 top-1/2 -translate-y-1/2 rounded bg-white/80 p-1 text-[10px]"
                                    data-testid="trophy-prev-model"
                                    type="button"
                                    onClick={() => selectAdjacentModel(-1)}
                                >
                                    <FaChevronLeft />
                                </button>
                                <button
                                    aria-label={localizeWithFallback('catalog.trophies.next_model', 'Next model')}
                                    className="octane-catalog-trophy-model-button absolute right-1 top-1/2 -translate-y-1/2 rounded bg-white/80 p-1 text-[10px]"
                                    data-testid="trophy-next-model"
                                    type="button"
                                    onClick={() => selectAdjacentModel(1)}
                                >
                                    <FaChevronRight />
                                </button>
                            </>
                        )}
                    </div>
                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0 p-2 gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <FaTrophy className="text-warning text-[11px]" />
                            <Text className="text-[12px]! font-bold text-dark leading-tight">{currentOffer.localizationName}</Text>
                        </div>
                        <CatalogTotalPriceWidget />
                        {!canPurchase && <span className="text-[9px] text-warning italic">{LocalizeText('catalog.trophies.write.hint')}</span>}
                        <div className="flex gap-1.5">
                            <CatalogPurchaseWidgetView />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3 p-2.5 bg-white rounded border-2 border-card-grid-item-border">
                    {!!page.localization.getImage(1) && (
                        <img alt="" className="w-[50px] h-[50px] object-contain rounded shrink-0 mt-0.5" src={page.localization.getImage(1)} />
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <FaTrophy className="text-warning text-[11px]" />
                            <span className="text-[12px] font-bold">{LocalizeText('catalog.trophies.title')}</span>
                        </div>
                        <Text
                            className="text-[10px]! text-muted leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(0)) }}
                        />
                    </div>
                </div>
            )}

            {/* Trophy inscription */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                    <FaPen className="text-[8px] text-warning" />
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{LocalizeText('catalog.trophies.inscription')}</span>
                    <span className={`text-[9px] ml-auto ${trophyText.length > 180 ? 'text-danger font-bold' : 'text-muted'}`}>{trophyText.length}/200</span>
                </div>
                <div className="relative">
                    <textarea
                        className={`octane-catalog-trophy-inscription w-full h-[60px] text-[11px] rounded p-2 pr-3 resize-none focus:outline-none transition-all border-2 ${trophyText.length > 0 ? 'has-text' : ''}`}
                        maxLength={200}
                        placeholder={LocalizeText('catalog.trophies.inscription.placeholder')}
                        value={trophyText}
                        onChange={(event) => setTrophyText(event.target.value)}
                    />
                    {trophyText.length > 0 && <FaTrophy className="absolute top-2 right-2 text-[10px] text-warning/30" />}
                </div>
            </div>

            {/* Trophy grid */}
            <div className="flex-1 overflow-auto min-h-0">
                <CatalogItemGridWidgetView columnCount={7} columnMinHeight={50} columnMinWidth={50} />
            </div>
        </div>
    );
};
