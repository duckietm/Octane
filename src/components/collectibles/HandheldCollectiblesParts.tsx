import { CollectibleProductData } from '@octane/renderer';
import { CSSProperties, FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { PRODUCT_TYPE_FALLBACKS, productTypeKey } from '../../hooks/collectibles/collectibles.helpers';

/** The pieces the phone collectibles pages share (HandheldCollectibles.css). */

export const HandheldCollectiblesChevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-collectibles__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

/** The way back from a page to its list (upright only; on its side both are on screen). */
export const HandheldCollectiblesBack: FC<{ onClick: () => void }> = ({ onClick }) => (
    <BaseButton className="octane-handheld-collectibles__back" data-testid="collectibles-back" onClick={onClick}>
        <HandheldCollectiblesChevron back />
        <span>{localizeWithFallback('generic.back', 'Back')}</span>
    </BaseButton>
);

/** An amount with its currency picture (emeralds, silver, stamps). */
export const HandheldCollectiblesPrice: FC<{ amount: number; icon: string; className?: string }> = ({ amount, icon, className = '' }) => (
    <span className={`octane-handheld-collectibles__price ${className}`.trim()}>
        <span>{amount}</span>
        <img alt="" draggable={false} src={icon} />
    </span>
);

/** The picture of what is chosen, on the turning star of the hub. */
export const HandheldCollectiblesStage: FC<{ children: ReactNode; name?: ReactNode; className?: string }> = ({ children, name = null, className = '' }) => (
    <div className={`octane-handheld-collectibles__stage ${className}`.trim()}>
        <div aria-hidden="true" className="octane-handheld-collectibles__star" />
        <div className="octane-handheld-collectibles__stage-image">{children}</div>
        {name !== null && <div className="octane-handheld-collectibles__stage-name">{name}</div>}
    </div>
);

/** Type, rarity and XP of a product, as rows of a card. */
export const HandheldCollectiblesFacts: FC<{ product: CollectibleProductData }> = ({ product }) => {
    const typeKey = productTypeKey(product.productTypeId);

    return (
        <dl className="octane-handheld-collectibles__facts">
            <div>
                <dt>{localizeWithFallback('collectibles.item.type', 'Type')}</dt>
                <dd>{localizeWithFallback(typeKey, PRODUCT_TYPE_FALLBACKS[typeKey] ?? '')}</dd>
            </div>
            <div>
                <dt>{localizeWithFallback('collectibles.item.rarity', 'Rarity')}</dt>
                <dd>{product.rarity}</dd>
            </div>
            <div>
                <dt>{localizeWithFallback('collectibles.item.xp', 'XP')}</dt>
                <dd>{product.score}</dd>
            </div>
        </dl>
    );
};

/** A bar of the share done (`--hh-fill`), in a colour of the caller's (the set's progress colour). */
export const HandheldCollectiblesBar: FC<{ ratio: number; color?: string }> = ({ ratio, color }) => (
    <span
        className="octane-handheld-collectibles__bar"
        style={{ '--hh-fill': `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`, ...(color ? { '--collectibles-bar': color } : null) } as CSSProperties}
    >
        <span className="octane-handheld-collectibles__bar-fill" />
    </span>
);

/** The bar at the foot of a page with its main action. */
export const HandheldCollectiblesActions: FC<{ children: ReactNode }> = ({ children }) => (
    <div className="octane-handheld-collectibles__actions">{children}</div>
);
