import { FC, useEffect, useState } from 'react';
import { GetUserProfile, ITradingNameScamWarning, localizeWithFallback } from '../../../../api';
import { Button, LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

interface InventoryTradeNameScamWarningViewProps {
    warning: ITradingNameScamWarning;
    onClose: () => void;
}

// TradingNameScamWarningView.CLOSE_LOCK_SECONDS: both close buttons stay disabled for six seconds.
export const NAME_SCAM_CLOSE_LOCK_SECONDS = 6;

/**
 * inventory_trading_name_scam_warning.xml (356x333): shown by TradingModel.startTrading when the
 * partner's name looks like another user in the room or a friend (see TradingNameScamDetector).
 */
export const InventoryTradeNameScamWarningView: FC<InventoryTradeNameScamWarningViewProps> = (props) => {
    const { warning = null, onClose = null } = props;
    const [secondsLeft, setSecondsLeft] = useState(NAME_SCAM_CLOSE_LOCK_SECONDS);

    useEffect(() => {
        if (!warning) return;

        setSecondsLeft(NAME_SCAM_CLOSE_LOCK_SECONDS);

        const interval = setInterval(() => {
            setSecondsLeft((prevValue) => {
                const nextValue = prevValue - 1;

                if (nextValue <= 0) clearInterval(interval);

                return Math.max(0, nextValue);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [warning]);

    if (!warning) return null;

    const isLocked = secondsLeft > 0;
    const title = localizeWithFallback('inventory.trading.namescam.title', 'Check who you are trading with!');
    const tryClose = () => {
        if (isLocked) return;

        onClose?.();
    };

    const renderMatches = (headerKey: string, headerFallback: string, names: string[], testId: string) => {
        if (!names || !names.length) return null;

        return (
            <section className="octane-inventory-namescam-matches" data-testid={testId}>
                <strong>{localizeWithFallback(headerKey, headerFallback)}</strong>
                <span>{names.join('\n')}</span>
            </section>
        );
    };

    return (
        <OctaneCardView
            aria-label={title}
            classNames={['octane-inventory-namescam-window']}
            frameStyle={3}
            isResizable={false}
            role="dialog"
            theme="primary-slim"
            uniqueKey="inventory-trade-name-scam"
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={tryClose} />
            <OctaneCardContentView classNames={['octane-inventory-namescam-content']} overflow="auto">
                <p className="octane-inventory-namescam-warning" data-testid="namescam-warning-text">
                    {localizeWithFallback(
                        'inventory.trading.namescam.warning',
                        'The name of %trader_name% looks very similar to the name of someone you know. Make sure you are trading with the right Habbo before you offer anything.',
                        ['trader_name'],
                        [warning.tradedUserName]
                    )}
                </p>
                <div className="octane-inventory-namescam-trader">
                    <div className="octane-inventory-namescam-avatar">
                        {!!warning.tradedUserFigure && <LayoutAvatarImageView headOnly direction={2} figure={warning.tradedUserFigure} />}
                    </div>
                    <div className="octane-inventory-namescam-trader-name">
                        <span className="octane-inventory-namescam-trader-label">
                            {localizeWithFallback('inventory.trading.namescam.trader', 'Trading with')}
                        </span>
                        <strong data-testid="namescam-trader-name">{warning.tradedUserName}</strong>
                    </div>
                    <Button disabled={warning.tradedUserId <= 0} variant="secondary" onClick={() => GetUserProfile(warning.tradedUserId)}>
                        {localizeWithFallback('inventory.trading.namescam.open_profile', 'Open profile')}
                    </Button>
                </div>
                {renderMatches('inventory.trading.namescam.similar_in_room', 'Similar names in this room:', warning.similarInRoom, 'namescam-room-matches')}
                {renderMatches(
                    'inventory.trading.namescam.similar_in_friends',
                    'Similar names in your friend list:',
                    warning.similarInFriends,
                    'namescam-friend-matches'
                )}
                <div className="octane-inventory-namescam-actions">
                    <Button disabled={isLocked} variant="primary" onClick={tryClose}>
                        {localizeWithFallback('inventory.trading.namescam.close', 'Close')}
                    </Button>
                    {isLocked && (
                        <span className="octane-inventory-namescam-countdown" data-testid="namescam-close-countdown">
                            {localizeWithFallback('inventory.trading.namescam.close_countdown', '%seconds%s', ['seconds'], [secondsLeft.toString()])}
                        </span>
                    )}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
