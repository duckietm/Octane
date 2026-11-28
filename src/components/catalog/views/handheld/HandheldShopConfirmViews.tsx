import { FC, ReactNode } from 'react';
import { LocalizeText } from '../../../../api';
import { Checkbox } from '../../../../common/Checkbox';
import { HandheldShopButton, HandheldShopCard, HandheldShopPrice, HandheldShopPricePart } from './HandheldShopDialogParts';

/** The credit-spending disclaimer some hotels ask to be ticked before a purchase. */
export interface HandheldShopDisclaimer {
    accepted: boolean;
    onChange: (accepted: boolean) => void;
}

const DisclaimerRow: FC<{ disclaimer: HandheldShopDisclaimer }> = ({ disclaimer }) => (
    <label className="octane-handheld-shop-dialog__check">
        <Checkbox checked={disclaimer.accepted} onCheckedChange={(checked) => disclaimer.onChange(checked)} />
        <span>{LocalizeText('disclaimer.credit_spending')}</span>
    </label>
);

export interface HandheldCatalogPurchaseConfirmViewProps {
    title: string;
    /** The product's picture, drawn by the desktop view's own image views. */
    preview: ReactNode;
    name: string;
    quantity: number;
    freeItemCount: number;
    price: HandheldShopPricePart[];
    /** Null when the hotel has no disclaimer. */
    disclaimer: HandheldShopDisclaimer | null;
    /** The raffle line of a limited purchase held by the server, or null. */
    raffle: ReactNode;
    /** Items left / series size of a limited edition, or null. */
    limited: { left: number; size: number } | null;
    confirmLabel: string;
    isSubmitting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/** CatalogPurchaseConfirmView on a phone: the product's picture, name, amount and price, and Cancel / Buy (or Gift). */
export const HandheldCatalogPurchaseConfirmView: FC<HandheldCatalogPurchaseConfirmViewProps> = (props) => {
    const { title, preview, name, quantity, freeItemCount, price, disclaimer, raffle, limited, confirmLabel, isSubmitting, onCancel, onConfirm } = props;

    return (
        <HandheldShopCard
            actions={
                <>
                    <HandheldShopButton data-testid="handheld-purchase-cancel" disabled={isSubmitting} onClick={onCancel}>
                        {LocalizeText('catalog.purchase_confirmation.cancel')}
                    </HandheldShopButton>
                    <HandheldShopButton
                        data-testid="handheld-purchase-confirm"
                        disabled={isSubmitting || (disclaimer ? !disclaimer.accepted : false)}
                        tone="primary"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </HandheldShopButton>
                </>
            }
            busy={isSubmitting}
            className="is-purchase"
            hero={<div className="octane-handheld-shop-dialog__picture">{preview}</div>}
            testId="handheld-purchase"
            title={title}
            uniqueKey="catalog-purchase-confirm"
            onClose={onCancel}
        >
            <strong className="octane-handheld-shop-dialog__name">{name}</strong>
            {(quantity > 1 || freeItemCount > 0) && (
                <div className="octane-handheld-shop-dialog__chips">
                    {quantity > 1 && <span className="octane-handheld-shop-dialog__chip">X {quantity}</span>}
                    {freeItemCount > 0 && (
                        <span className="octane-handheld-shop-dialog__chip is-bonus">
                            {LocalizeText('shop.bonus.items.count', ['amount'], [freeItemCount.toString()])}
                        </span>
                    )}
                </div>
            )}
            <HandheldShopPrice label={LocalizeText('catalog.purchase.confirmation.dialog.cost')} parts={price} />
            {raffle && (
                <div className="octane-handheld-shop-dialog__note is-limited" role="status">
                    {raffle}
                </div>
            )}
            {limited && !raffle && (
                <div className="octane-handheld-shop-dialog__note is-limited" role="status">
                    <span>
                        {LocalizeText('unique.items.left')} <strong>{limited.left}</strong>
                        {' / '}
                        {LocalizeText('unique.items.number.sold')} <strong>{limited.size}</strong>
                    </span>
                </div>
            )}
            {disclaimer && <DisclaimerRow disclaimer={disclaimer} />}
        </HandheldShopCard>
    );
};

export interface HandheldClubPurchaseConfirmViewProps {
    title: string;
    productText: string;
    validUntilText: string;
    price: HandheldShopPricePart[];
    disclaimer: HandheldShopDisclaimer | null;
    onCancel: () => void;
    onConfirm: () => void;
}

/** CatalogClubPurchaseConfirmView on a phone: the club mark, what is bought and until when, its price, Cancel / Subscribe. */
export const HandheldClubPurchaseConfirmView: FC<HandheldClubPurchaseConfirmViewProps> = (props) => {
    const { title, productText, validUntilText, price, disclaimer, onCancel, onConfirm } = props;

    return (
        <HandheldShopCard
            actions={
                <>
                    <HandheldShopButton data-testid="handheld-club-cancel" onClick={onCancel}>
                        {LocalizeText('cancel')}
                    </HandheldShopButton>
                    <HandheldShopButton
                        data-testid="handheld-club-confirm"
                        disabled={disclaimer ? !disclaimer.accepted : false}
                        tone="primary"
                        onClick={onConfirm}
                    >
                        {LocalizeText('catalog.club.buy.subscribe')}
                    </HandheldShopButton>
                </>
            }
            className="is-club"
            hero={<span aria-hidden="true" className="octane-handheld-shop-dialog__club-mark" />}
            testId="handheld-club-purchase"
            title={title}
            uniqueKey="catalog-club-purchase-confirm"
            onClose={onCancel}
        >
            <strong className="octane-handheld-shop-dialog__name">{productText}</strong>
            <span className="octane-handheld-shop-dialog__text">{validUntilText}</span>
            <HandheldShopPrice label={LocalizeText('catalog.purchase.confirmation.dialog.cost')} parts={price} />
            {disclaimer && <DisclaimerRow disclaimer={disclaimer} />}
        </HandheldShopCard>
    );
};

export interface HandheldClubGiftConfirmViewProps {
    title: string;
    picture: ReactNode;
    name: string;
    onCancel: () => void;
    onConfirm: () => void;
}

/** ClubGiftConfirmView on a phone: the gift's picture and name, Cancel / Select. */
export const HandheldClubGiftConfirmView: FC<HandheldClubGiftConfirmViewProps> = ({ title, picture, name, onCancel, onConfirm }) => (
    <HandheldShopCard
        actions={
            <>
                <HandheldShopButton data-testid="handheld-club-gift-cancel" onClick={onCancel}>
                    {LocalizeText('cancel')}
                </HandheldShopButton>
                <HandheldShopButton data-testid="handheld-club-gift-confirm" tone="primary" onClick={onConfirm}>
                    {LocalizeText('catalog.club_gift.select')}
                </HandheldShopButton>
            </>
        }
        className="is-club-gift"
        hero={<div className="octane-handheld-shop-dialog__picture">{picture}</div>}
        testId="handheld-club-gift"
        title={title}
        uniqueKey="catalog-club-gift-confirm"
        onClose={onCancel}
    >
        <strong className="octane-handheld-shop-dialog__name">{name}</strong>
    </HandheldShopCard>
);

export interface HandheldMarketplaceTokenViewProps {
    kind: 'buy' | 'no_credits';
    title: string;
    info: string;
    /** The token batch's price in credits. */
    price: number;
    confirmLabel: string;
    cancelLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
}

/** MarketplaceBuyTokensView / MarketplaceNoCreditsView on a phone: the text, the batch's price, the way out and the main action. */
export const HandheldMarketplaceTokenView: FC<HandheldMarketplaceTokenViewProps> = ({
    kind,
    title,
    info,
    price,
    confirmLabel,
    cancelLabel,
    onCancel,
    onConfirm
}) => (
    <HandheldShopCard
        actions={
            <>
                <HandheldShopButton data-testid="handheld-marketplace-token-cancel" onClick={onCancel}>
                    {cancelLabel}
                </HandheldShopButton>
                <HandheldShopButton data-testid="handheld-marketplace-token-confirm" tone="primary" onClick={onConfirm}>
                    {confirmLabel}
                </HandheldShopButton>
            </>
        }
        className={`is-token is-${kind}`}
        testId={`handheld-marketplace-${kind === 'buy' ? 'buy-tokens' : 'no-credits'}`}
        title={title}
        uniqueKey={kind === 'buy' ? 'marketplace-buy-tokens' : 'marketplace-no-credits'}
        onClose={onCancel}
    >
        <span className="octane-handheld-shop-dialog__text">{info}</span>
        <HandheldShopPrice parts={[{ amount: price, type: -1 }]} />
    </HandheldShopCard>
);
