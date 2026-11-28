import { FC } from 'react';
import { localizeWithFallback } from '../../../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../../common';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../../../../../hooks/handheld/useHandheldLayout';
import { HandheldMarketplaceTokenView } from '../../../handheld/HandheldShopConfirmViews';

/** English fallbacks for the AIR texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    'inventory.marketplace.buy_tokens.title': 'No advertisements left',
    'inventory.marketplace.buy_tokens.info':
        'Selling furni on the marketplace costs %price% credit for %count% advertisements. You have none left, so your next advertisement costs %price% credit. The %free% after it are free.',
    'inventory.marketplace.buy_tokens.buy': 'Buy (%price% credit)',
    'inventory.marketplace.buy_tokens.cancel': 'Cancel',
    'inventory.marketplace.no_credits.title': 'Not enough credits!',
    'inventory.marketplace.no_credits.info': 'You need %price% credit for five advertisements.',
    'inventory.marketplace.no_credits.get_credits': 'Get credits',
    'inventory.marketplace.no_credits.cancel': 'Close'
};

const text = (key: string, parameters: string[] = null, replacements: string[] = null): string => {
    let fallback = FALLBACKS[key] ?? key;

    if (parameters && replacements) parameters.forEach((parameter, index) => (fallback = fallback.split(`%${parameter}%`).join(replacements[index] ?? '')));

    return localizeWithFallback(key, fallback, parameters, replacements);
};

/**
 * AIR buy_marketplace_tokens (habbo-inventory-com, MarketplaceView.showBuyTokens): the 283x175 window the
 * can-make-offer answer 4 opens. `price` and `count` are the token batch of the marketplace configuration;
 * the info text also names the `free` advertisements after the paid one.
 */
export const MarketplaceBuyTokensView: FC<{ price: number; count: number; onBuy: () => void; onCancel: () => void }> = ({ price, count, onBuy, onCancel }) => {
    const isHandheld = useIsHandheld();
    const info = text('inventory.marketplace.buy_tokens.info', ['price', 'count', 'free'], [String(price), String(count), String(count - 1)]);

    if (isHandheld)
        return (
            <HandheldMarketplaceTokenView
                cancelLabel={text('inventory.marketplace.buy_tokens.cancel')}
                confirmLabel={text('inventory.marketplace.buy_tokens.buy', ['price'], [String(price)])}
                info={info}
                kind="buy"
                price={price}
                title={text('inventory.marketplace.buy_tokens.title')}
                onCancel={onCancel}
                onConfirm={onBuy}
            />
        );

    return (
        <NativeTextTree>
            <OctaneCardView
                classNames={['octane-marketplace-token-dialog', 'is-buy-tokens']}
                frameStyle={3}
                isResizable={false}
                theme="primary-slim"
                uniqueKey="marketplace-buy-tokens"
            >
                <OctaneCardHeaderView headerText={text('inventory.marketplace.buy_tokens.title')} onCloseClick={onCancel} />
                <OctaneCardContentView classNames={['octane-marketplace-token-dialog-content']} overflow="hidden">
                    <span className="octane-marketplace-token-dialog-info" data-testid="marketplace-buy-tokens-info">
                        {info}
                    </span>
                    <BaseButton className="octane-marketplace-token-dialog-button is-buy" onClick={onBuy}>
                        {text('inventory.marketplace.buy_tokens.buy', ['price'], [String(price)])}
                    </BaseButton>
                    <BaseButton className="octane-marketplace-token-dialog-button is-cancel" onClick={onCancel}>
                        {text('inventory.marketplace.buy_tokens.cancel')}
                    </BaseButton>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};

/**
 * AIR marketplace_no_credits (habbo-inventory-com, MarketplaceView.showNoCredits): 252x153, shown when the
 * server refuses the token purchase for lack of credits. "Get credits" opens `web.shop.relativeUrl`.
 */
export const MarketplaceNoCreditsView: FC<{ price: number; onGetCredits: () => void; onClose: () => void }> = ({ price, onGetCredits, onClose }) => {
    const isHandheld = useIsHandheld();

    if (isHandheld)
        return (
            <HandheldMarketplaceTokenView
                cancelLabel={text('inventory.marketplace.no_credits.cancel')}
                confirmLabel={text('inventory.marketplace.no_credits.get_credits')}
                info={text('inventory.marketplace.no_credits.info', ['price'], [String(price)])}
                kind="no_credits"
                price={price}
                title={text('inventory.marketplace.no_credits.title')}
                onCancel={onClose}
                onConfirm={onGetCredits}
            />
        );

    return (
        <NativeTextTree>
            <OctaneCardView
                classNames={['octane-marketplace-token-dialog', 'is-no-credits']}
                frameStyle={3}
                isResizable={false}
                theme="primary-slim"
                uniqueKey="marketplace-no-credits"
            >
                <OctaneCardHeaderView headerText={text('inventory.marketplace.no_credits.title')} onCloseClick={onClose} />
                <OctaneCardContentView classNames={['octane-marketplace-token-dialog-content']} overflow="hidden">
                    <span className="octane-marketplace-token-dialog-info" data-testid="marketplace-no-credits-info">
                        {text('inventory.marketplace.no_credits.info', ['price'], [String(price)])}
                    </span>
                    <BaseButton className="octane-marketplace-token-dialog-button is-get-credits" onClick={onGetCredits}>
                        {text('inventory.marketplace.no_credits.get_credits')}
                    </BaseButton>
                    <BaseButton className="octane-marketplace-token-dialog-button is-cancel" onClick={onClose}>
                        {text('inventory.marketplace.no_credits.cancel')}
                    </BaseButton>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
