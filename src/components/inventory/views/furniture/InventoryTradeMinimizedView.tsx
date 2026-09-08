import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { Button } from '../../../../common';

interface InventoryTradeMinimizedViewProps {
    onContinue: () => void;
    onCancel: () => void;
}

/**
 * inventory_trading_minimized.xml (478x68): while a trade is running and the inventory shows a tab
 * other than furni (TradingModel.categorySwitch) the trade collapses to this strip; "Continue"
 * reopens the furni tab (TradingModel.requestFurniViewOpen), "Cancel" ends the trade.
 */
export const InventoryTradeMinimizedView: FC<InventoryTradeMinimizedViewProps> = (props) => {
    const { onContinue = null, onCancel = null } = props;

    return (
        <div className="octane-inventory-trade-minimized" data-testid="inventory-trade-minimized" role="status">
            <span aria-hidden="true" className="octane-inventory-trade-minimized-icon" />
            <span className="octane-inventory-trade-minimized-title">
                {localizeWithFallback('inventory.trading.minimized.trade_in_progress', 'Trade in progress')}
            </span>
            <div className="octane-inventory-trade-minimized-actions">
                <Button variant="primary" onClick={onContinue}>
                    {localizeWithFallback('inventory.trading.minimized.continue_trade', 'Continue')}
                </Button>
                <Button variant="danger" onClick={onCancel}>
                    {LocalizeText('generic.cancel')}
                </Button>
            </div>
        </div>
    );
};
