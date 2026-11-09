import { CreateLinkEvent, GetSessionDataManager } from '@octane/renderer';
import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../../api';
import { getBonusRareProgressPercent } from '../../../api/hotel-view/LandingViewWidgets';
import { LayoutFurniImageView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useBonusRareInfo } from '../../../hooks';

/** The name of the bonus rare: product data by class name, then the floor furni data. */
const getRareName = (productType: string): string => {
    const manager = GetSessionDataManager();
    const product = manager.getProductData(productType);

    if (product?.name) return product.name;

    return manager.getFloorItemDataByName(productType)?.name ?? productType;
};

/**
 * BonusRarePromoWidget (bonus_rare_promo.xml) in the bonus bag slot: "<rare> for every <n> credits",
 * the bar of the credits already spent and the credits page button. Until the server answers (or
 * when it has no bonus rare) the slot keeps the texts the staff wrote.
 */
export const HotelViewBonusRareWidget: FC<{ fallback: ReactNode; buttonText: string; link: string; showPreview: boolean; onLink: (link: string) => void }> = ({
    fallback,
    buttonText,
    link,
    showPreview,
    onLink
}) => {
    const { info = null } = useBonusRareInfo();

    // The emulator answers with item id 0 when no bonus rare is configured: keep the slot then.
    if (!info || info.productClassId <= 0 || info.totalCoinsForBonus <= 0) return <>{fallback}</>;

    const rareName = getRareName(info.productType);
    const remaining = Math.max(0, info.coinsStillRequiredToBuy);

    return (
        <NativeTextTree>
            <div className="hotelview-bonus-rare">
                {showPreview && (
                    <div className="hotelview-bonus-rare-preview">
                        <LayoutFurniImageView productType="s" productClassId={info.productClassId} direction={2} />
                    </div>
                )}
                <div className="hotelview-bonus-rare-copy">
                    <h2>
                        {localizeWithFallback(
                            'landing.view.bonus.rare.header',
                            '%rarename% for every %amount% credits!',
                            ['rarename', 'amount'],
                            [rareName, String(info.totalCoinsForBonus)]
                        )}
                    </h2>
                    <div className="hotelview-progress hotelview-bonus-rare-progress">
                        <span style={{ width: `${getBonusRareProgressPercent(info.totalCoinsForBonus, remaining)}%` }} />
                        <em>
                            {localizeWithFallback(
                                'landing.view.bonus.rare.status',
                                'Only %amount%/%total% credits to go!',
                                ['amount', 'total'],
                                [String(remaining), String(info.totalCoinsForBonus)]
                            )}
                        </em>
                    </div>
                    <BaseButton
                        type="button"
                        className="hotelview-widget-button"
                        onClick={() => (link ? onLink(link) : CreateLinkEvent('catalog/open/credits'))}
                    >
                        {buttonText || localizeWithFallback('landing.view.bonus.rare.open.credits.page', 'Get credits!')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
