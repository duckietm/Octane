import { FC, ReactNode } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { NumberInput } from '../../../../common/NumberInput';
import { HandheldShopButton, HandheldShopPrice, HandheldShopPricePart, HandheldShopSection, HandheldShopSheet } from './HandheldShopDialogParts';

/* ------------------------------------------------------------------ marketplace: post an offer */

export interface HandheldMarketplacePostOfferViewProps {
    title: string;
    picture: ReactNode;
    /** The limited-edition plate, or null. */
    unique: ReactNode;
    /** The rarity mark, or null. */
    rarity: ReactNode;
    name: string;
    expiration: string;
    isNft: boolean;
    price: { label: string; value: string; valid: boolean; onChange: (value: string) => void };
    /** Null for a collectible, which is always sold one at a time. */
    amount: { label: string; value: string; max: number; onChange: (value: string) => void } | null;
    /** The visible price statistics, each one line. */
    stats: { name: string; text: string }[];
    /** Null when there is no suggested price to copy. */
    copyLabel: string | null;
    /** What one sale earns, or why the price cannot be posted. */
    finalText: string;
    postLabel: string;
    cancelLabel: string;
    onCopySuggested: () => void;
    onPost: () => void;
    onClose: () => void;
}

/**
 * MarketplacePostOfferView on a phone: the furni, its name and how long the offer shows, the asking price (and the amount
 * of a furni sold several at once) as 16 px fields, the market's prices with "copy suggested", what a sale earns, and
 * Cancel / Post offer at the bottom. The price check and the confirmation are the desktop's.
 */
export const HandheldMarketplacePostOfferView: FC<HandheldMarketplacePostOfferViewProps> = (props) => {
    const {
        title,
        picture,
        unique,
        rarity,
        name,
        expiration,
        isNft,
        price,
        amount,
        stats,
        copyLabel,
        finalText,
        postLabel,
        cancelLabel,
        onCopySuggested,
        onPost,
        onClose
    } = props;
    const amountValue = Number.parseInt(amount?.value ?? '1', 10) || 1;

    return (
        <HandheldShopSheet
            actions={
                <>
                    <HandheldShopButton data-testid="handheld-marketplace-post-cancel" onClick={onClose}>
                        {cancelLabel}
                    </HandheldShopButton>
                    <HandheldShopButton data-testid="handheld-marketplace-post" disabled={!price.valid} tone="primary" onClick={onPost}>
                        {postLabel}
                    </HandheldShopButton>
                </>
            }
            className={`octane-handheld-shop-market${isNft ? ' is-nft' : ''}`}
            icon="icon-inventory"
            testId="handheld-marketplace-post-offer"
            title={title}
            uniqueKey="marketplace-post-offer"
            onClose={onClose}
        >
            <HandheldShopSection className="octane-handheld-shop-market__item">
                <div className="octane-handheld-shop-sheet__picture">{picture}</div>
                <div className="octane-handheld-shop-market__about">
                    <strong className="octane-handheld-shop-sheet__name" data-testid="handheld-marketplace-name">
                        {name}
                    </strong>
                    {(unique || rarity) && (
                        <div className="octane-handheld-shop-market__marks">
                            {unique}
                            {rarity}
                        </div>
                    )}
                    <span className="octane-handheld-shop-sheet__muted">{expiration}</span>
                </div>
            </HandheldShopSection>
            <HandheldShopSection className="octane-handheld-shop-market__fields">
                <label className="octane-handheld-shop-sheet__label" htmlFor="handheld-marketplace-price">
                    {price.label}
                </label>
                <input
                    autoComplete="off"
                    className={`octane-handheld-shop-sheet__field${price.value && !price.valid ? ' is-invalid' : ''}`}
                    id="handheld-marketplace-price"
                    inputMode="numeric"
                    type="text"
                    value={price.value}
                    onChange={(event) => price.onChange(event.target.value)}
                />
                {amount && (
                    <>
                        <label className="octane-handheld-shop-sheet__label" htmlFor="handheld-marketplace-amount">
                            {amount.label}
                        </label>
                        <div className="octane-handheld-shop-sheet__stepper">
                            <HandheldShopButton
                                aria-label={localizeWithFallback('octane.handheld.shop_dialogs.less', 'Less')}
                                className="is-step"
                                disabled={amountValue <= 1}
                                onClick={() => amount.onChange(String(amountValue - 1))}
                            >
                                -
                            </HandheldShopButton>
                            <input
                                autoComplete="off"
                                className="octane-handheld-shop-sheet__field is-amount"
                                id="handheld-marketplace-amount"
                                inputMode="numeric"
                                type="text"
                                value={amount.value}
                                onChange={(event) => amount.onChange(event.target.value)}
                            />
                            <HandheldShopButton
                                aria-label={localizeWithFallback('octane.handheld.shop_dialogs.more', 'More')}
                                className="is-step"
                                disabled={amountValue >= amount.max}
                                onClick={() => amount.onChange(String(amountValue + 1))}
                            >
                                +
                            </HandheldShopButton>
                        </div>
                    </>
                )}
            </HandheldShopSection>
            {(stats.length > 0 || copyLabel) && (
                <HandheldShopSection className="octane-handheld-shop-market__stats">
                    {stats.map((stat) => (
                        <span key={stat.name} className="octane-handheld-shop-market__stat" data-testid={`handheld-marketplace-${stat.name}`}>
                            {stat.text}
                        </span>
                    ))}
                    {copyLabel && (
                        <HandheldShopButton className="is-outline" data-testid="handheld-marketplace-copy" onClick={onCopySuggested}>
                            {copyLabel}
                        </HandheldShopButton>
                    )}
                </HandheldShopSection>
            )}
            <div
                className={`octane-handheld-shop-sheet__status${price.valid ? ' is-valid' : ' is-invalid'}`}
                data-testid="handheld-marketplace-final"
                role="status"
            >
                {finalText}
            </div>
        </HandheldShopSheet>
    );
};

/* ------------------------------------------------------------------ HC benefits */

export interface HandheldVipBenefitsViewProps {
    caption: string;
    headerImage: string;
    teaserImage: string;
    title: string;
    /** Sanitised hotel html. */
    descriptionHtml: { __html: string };
    detailsHtml: { __html: string };
    onClose: () => void;
}

/** VipBenefitsView on a phone: the header art across the sheet, the teaser, the title and the two hotel texts, and Close. */
export const HandheldVipBenefitsView: FC<HandheldVipBenefitsViewProps> = ({
    caption,
    headerImage,
    teaserImage,
    title,
    descriptionHtml,
    detailsHtml,
    onClose
}) => (
    <HandheldShopSheet
        actions={
            <HandheldShopButton data-testid="handheld-vip-benefits-close" onClick={onClose}>
                {LocalizeText('generic.close')}
            </HandheldShopButton>
        }
        className="octane-handheld-shop-vip"
        testId="handheld-vip-benefits"
        title={caption}
        uniqueKey="vip-benefits"
        onClose={onClose}
    >
        <div className="octane-handheld-shop-vip__art">
            <img alt="" className="octane-handheld-shop-vip__header" src={headerImage} />
        </div>
        <div className="octane-handheld-shop-vip__copy">
            <HandheldShopSection className="octane-handheld-shop-vip__intro">
                <img alt="" className="octane-handheld-shop-vip__teaser" src={teaserImage} />
                <strong className="octane-handheld-shop-sheet__name" data-testid="handheld-vip-benefits-title">
                    {title}
                </strong>
            </HandheldShopSection>
            <HandheldShopSection>
                <div className="octane-handheld-shop-vip__html" dangerouslySetInnerHTML={descriptionHtml} />
            </HandheldShopSection>
            <HandheldShopSection>
                <div className="octane-handheld-shop-vip__html is-details" dangerouslySetInnerHTML={detailsHtml} />
            </HandheldShopSection>
        </div>
    </HandheldShopSheet>
);

/* ------------------------------------------------------------------ targeted offer */

export interface HandheldOfferWindowViewProps {
    title: string;
    imageUrl: string;
    /** Sanitised hotel html. */
    descriptionHtml: { __html: string };
    /** "Time left" line, or null for an offer without an end. */
    timeLeft: string | null;
    priceLabel: string;
    price: HandheldShopPricePart[];
    /** The stepper of an offer that may be bought more than once, or null. */
    quantity: { label: string; value: number; max: number; onChange: (value: number) => void } | null;
    /** Why it cannot be bought (too few credits / points), or null. */
    warning: string | null;
    buyLabel: string;
    buyDisabled: boolean;
    onBuy: () => void;
    onMinimize: () => void;
}

/**
 * OfferWindowView on a phone: the offer's picture, title and text, the time left, the amount stepper, the price with
 * its currency icons and the green Buy at the bottom. Close minimises it to its bubble, as on the desktop.
 */
export const HandheldOfferWindowView: FC<HandheldOfferWindowViewProps> = (props) => {
    const { title, imageUrl, descriptionHtml, timeLeft, priceLabel, price, quantity, warning, buyLabel, buyDisabled, onBuy, onMinimize } = props;

    return (
        <HandheldShopSheet
            actions={
                <>
                    <HandheldShopPrice className="is-bar" parts={price} />
                    <HandheldShopButton data-testid="handheld-offer-buy" disabled={buyDisabled} tone="primary" onClick={onBuy}>
                        {buyLabel}
                    </HandheldShopButton>
                </>
            }
            className="octane-handheld-shop-offer"
            testId="handheld-targeted-offer"
            title={title}
            uniqueKey="targeted-offer"
            onClose={onMinimize}
        >
            <div className="octane-handheld-shop-offer__art" style={{ backgroundImage: `url(${imageUrl})` }} />
            <div className="octane-handheld-shop-offer__copy">
                {timeLeft && (
                    <div className="octane-handheld-shop-offer__time" role="timer">
                        {timeLeft}
                    </div>
                )}
                <HandheldShopSection>
                    <strong className="octane-handheld-shop-sheet__name">{title}</strong>
                    <div className="octane-handheld-shop-offer__html" dangerouslySetInnerHTML={descriptionHtml} />
                </HandheldShopSection>
                <HandheldShopSection className="octane-handheld-shop-offer__buy">
                    <HandheldShopPrice label={priceLabel} parts={price} />
                    {quantity && (
                        <div className="octane-handheld-shop-offer__quantity">
                            <span className="octane-handheld-shop-sheet__label">{quantity.label}</span>
                            <div className="octane-handheld-shop-sheet__stepper">
                                <HandheldShopButton
                                    aria-label={localizeWithFallback('octane.handheld.shop_dialogs.less', 'Less')}
                                    className="is-step"
                                    disabled={quantity.value <= 1}
                                    onClick={() => quantity.onChange(quantity.value - 1)}
                                >
                                    -
                                </HandheldShopButton>
                                <NumberInput
                                    aria-label={quantity.label}
                                    className="octane-handheld-shop-sheet__field is-amount"
                                    max={quantity.max}
                                    min={1}
                                    value={quantity.value}
                                    onChange={(event) => quantity.onChange(parseInt(event.target.value))}
                                />
                                <HandheldShopButton
                                    aria-label={localizeWithFallback('octane.handheld.shop_dialogs.more', 'More')}
                                    className="is-step"
                                    disabled={quantity.value >= quantity.max}
                                    onClick={() => quantity.onChange(quantity.value + 1)}
                                >
                                    +
                                </HandheldShopButton>
                            </div>
                        </div>
                    )}
                    {warning && (
                        <span className="octane-handheld-shop-sheet__status is-invalid" role="alert">
                            {warning}
                        </span>
                    )}
                </HandheldShopSection>
            </div>
        </HandheldShopSheet>
    );
};
