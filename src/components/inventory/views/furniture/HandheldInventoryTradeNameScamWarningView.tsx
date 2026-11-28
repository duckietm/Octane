import { CSSProperties, FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { LayoutAvatarImageView } from '../../../../common/layout/LayoutAvatarImageView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface HandheldInventoryTradeNameScamWarningViewProps {
    userName: string;
    figure: string;
    similarInRoom: ReadonlyArray<string>;
    similarInFriends: ReadonlyArray<string>;
    /** Seconds left before the card can be closed, and how many there were. */
    lockSeconds: number;
    lockTotal: number;
    onOpenProfile: () => void;
    onClose: () => void;
}

const NameChips: FC<{ label: string; names: ReadonlyArray<string> }> = ({ label, names }) => (
    <div className="octane-handheld-invdlg__names">
        <span className="octane-handheld-invdlg__label">{label}</span>
        <ul className="octane-handheld-invdlg__chips">
            {names.map((name) => (
                <li key={name} className="octane-handheld-invdlg__chip">
                    {name}
                </li>
            ))}
        </ul>
    </div>
);

/**
 * The trade name-scam warning on a phone (HandheldInventoryDialogs.css): a centred card with a warning badge, the
 * desktop's text, the trader as a card (head, name, Profile), the look-alike names as chips and a big OK that stays
 * locked while the countdown bar runs out. InventoryTradeNameScamWarningView keeps the check and the lock.
 */
export const HandheldInventoryTradeNameScamWarningView: FC<HandheldInventoryTradeNameScamWarningViewProps> = (props) => {
    const { userName, figure, similarInRoom, similarInFriends, lockSeconds, lockTotal, onOpenProfile, onClose } = props;
    const locked = lockSeconds > 0;
    const fill = lockTotal > 0 ? Math.max(0, Math.min(1, lockSeconds / lockTotal)) : 0;

    return (
        <NativeTextTree>
            <DraggableWindow uniqueKey="trade-name-scam">
                <div
                    aria-labelledby="octane-handheld-invdlg-scam-title"
                    className="octane-handheld-invdlg is-warning"
                    data-testid="trade-name-scam-card"
                    role="alertdialog"
                >
                    <div className="octane-handheld-invdlg__head">
                        <span aria-hidden="true" className="octane-handheld-invdlg__badge is-warning">
                            <svg viewBox="0 0 16 16">
                                <path d="M8 2.5 L14 13 H2 Z M8 6.5 V9.5" />
                                <circle cx="8" cy="11.4" r="0.5" />
                            </svg>
                        </span>
                        <h3 className="octane-handheld-invdlg__title" id="octane-handheld-invdlg-scam-title">
                            {localizeWithFallback('inventory.trading.namescam.title', 'Check who you are trading with')}
                        </h3>
                        <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-invdlg__close" disabled={locked} onClick={onClose}>
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M4 4 L12 12 M12 4 L4 12" />
                            </svg>
                        </BaseButton>
                    </div>
                    <div className="octane-handheld-invdlg__body">
                        <div className="octane-handheld-invdlg__main">
                            <p className="octane-handheld-invdlg__text">
                                {localizeWithFallback(
                                    'inventory.trading.namescam.warning',
                                    `The name ${userName} looks a lot like someone you know. Make sure this is the person you meant to trade with.`,
                                    ['trader_name'],
                                    [userName]
                                )}
                            </p>
                            <div className="octane-handheld-invdlg__trader">
                                <div className="octane-handheld-invdlg__head-picture">
                                    {figure && <LayoutAvatarImageView direction={2} figure={figure} headOnly />}
                                </div>
                                <div className="octane-handheld-invdlg__item-text">
                                    <span className="octane-handheld-invdlg__muted">
                                        {localizeWithFallback('inventory.trading.namescam.trader', 'Trading with')}
                                    </span>
                                    <span className="octane-handheld-invdlg__name">{userName}</span>
                                </div>
                                <BaseButton className="octane-handheld-invdlg__button is-secondary is-compact" onClick={onOpenProfile}>
                                    {localizeWithFallback('inventory.trading.namescam.open_profile', 'Profile')}
                                </BaseButton>
                            </div>
                        </div>
                        {(similarInRoom.length > 0 || similarInFriends.length > 0) && (
                            <div className="octane-handheld-invdlg__side">
                                {similarInRoom.length > 0 && (
                                    <NameChips
                                        label={localizeWithFallback('inventory.trading.namescam.similar_in_room', 'Similar names in this room')}
                                        names={similarInRoom}
                                    />
                                )}
                                {similarInFriends.length > 0 && (
                                    <NameChips
                                        label={localizeWithFallback('inventory.trading.namescam.similar_in_friends', 'Similar names in your friends')}
                                        names={similarInFriends}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <div className="octane-handheld-invdlg__actions is-stacked">
                        {locked && (
                            <div className="octane-handheld-invdlg__lock" role="status">
                                <span className="octane-handheld-invdlg__muted">
                                    {localizeWithFallback(
                                        'inventory.trading.namescam.close_countdown',
                                        `You can close this in ${lockSeconds} s`,
                                        ['seconds'],
                                        [String(lockSeconds)]
                                    )}
                                </span>
                                <span aria-hidden="true" className="octane-handheld-invdlg__lock-bar" style={{ '--hh-fill': String(fill) } as CSSProperties} />
                            </div>
                        )}
                        <BaseButton className="octane-handheld-invdlg__button is-primary" disabled={locked} onClick={onClose}>
                            {localizeWithFallback('inventory.trading.namescam.close', 'OK')}
                        </BaseButton>
                    </div>
                </div>
            </DraggableWindow>
        </NativeTextTree>
    );
};
