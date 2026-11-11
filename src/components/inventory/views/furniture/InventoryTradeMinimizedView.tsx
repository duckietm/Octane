import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import panicIcon from '../../../../assets/images/inventory/trade-minimized-panic.png';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface InventoryTradeMinimizedViewProps {
    onContinue: () => void;
    onCancel: () => void;
}

/** The inventory tabs a trade is made on (AIR TradingModel.categorySwitch: furni and collectibles). */
export const isTradeInventoryTab = (tab: string, tradeTabs: ReadonlyArray<string>): boolean => tradeTabs.includes(tab);

/**
 * AIR inventory_trading_minimized (478 x 68): while a trade runs the user may look at another inventory tab; the
 * trade shrinks to this bar, with the way back to it and the way out of it.
 */
export const InventoryTradeMinimizedView: FC<InventoryTradeMinimizedViewProps> = (props) => {
    const { onContinue, onCancel } = props;

    return (
        <NativeTextTree>
            <div className="octane-trade-minimized" role="status">
                <img alt="" className="octane-trade-minimized__icon" src={panicIcon} />
                <div className="octane-trade-minimized__text">{localizeWithFallback('inventory.trading.minimized.trade_in_progress', 'Trade in progress')}</div>
                <BaseButton className="octane-trade-minimized__button is-continue" onClick={onContinue}>
                    {localizeWithFallback('inventory.trading.minimized.continue_trade', 'Continue trade')}
                </BaseButton>
                <BaseButton className="octane-trade-minimized__button is-cancel" onClick={onCancel}>
                    {LocalizeText('generic.cancel')}
                </BaseButton>
            </div>
        </NativeTextTree>
    );
};
