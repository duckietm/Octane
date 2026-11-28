import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HandheldCollectiblesActions, HandheldCollectiblesPrice } from './HandheldCollectiblesParts';

export interface HandheldCollectiblesTransferViewProps {
    fee: number;
    recipient: string;
    canTransfer: boolean;
    onRecipient: (recipient: string) => void;
    onTransfer: () => void;
}

/**
 * The Transfer tab on a phone: what it does beside the safe, the name of the user who gets the collectibles in a
 * 16 px field, and the fee + Transfer in the bar at the foot. The tab view keeps the field and the confirmation.
 */
export const HandheldCollectiblesTransferView: FC<HandheldCollectiblesTransferViewProps> = ({ fee, recipient, canTransfer, onRecipient, onTransfer }) => {
    const label = localizeWithFallback('collectibles.transfer.recipient', 'Habbo name');

    return (
        <NativeTextTree>
            <div className="octane-handheld-collectibles__page is-transfer" data-testid="collectibles-transfer">
                <div className="octane-handheld-collectibles__scroll">
                    <div className="octane-handheld-collectibles__card is-transfer">
                        <span aria-hidden="true" className="octane-handheld-collectibles__safe" />
                        <span className="octane-handheld-collectibles__text">
                            {localizeWithFallback(
                                'collectibles.transfer.user.description',
                                'Transfer the collectibles of your Collector Wallet to another Habbo.'
                            )}
                        </span>
                    </div>
                    <label className="octane-handheld-collectibles__field">
                        <span className="octane-handheld-collectibles__field-label">{label}</span>
                        <input
                            autoCapitalize="off"
                            autoComplete="off"
                            className="octane-handheld-collectibles__input"
                            data-testid="collectibles-transfer-recipient"
                            enterKeyHint="send"
                            placeholder={label}
                            spellCheck={false}
                            value={recipient}
                            onChange={(event) => onRecipient(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && canTransfer && onTransfer()}
                        />
                    </label>
                </div>
                <HandheldCollectiblesActions>
                    {fee > 0 && (
                        <span className="octane-handheld-collectibles__fee">
                            <span className="octane-handheld-collectibles__fee-label">{localizeWithFallback('octane.handheld.collectibles.fee', 'Fee')}</span>
                            <span data-testid="collectibles-transfer-fee">
                                <HandheldCollectiblesPrice amount={fee} className="is-large" icon={silverIcon} />
                            </span>
                        </span>
                    )}
                    <BaseButton
                        className="octane-handheld-collectibles__button is-blue"
                        data-testid="collectibles-transfer-button"
                        disabled={!canTransfer}
                        onClick={onTransfer}
                    >
                        {localizeWithFallback('collectibles.transfer', 'Transfer')}
                    </BaseButton>
                </HandheldCollectiblesActions>
            </div>
        </NativeTextTree>
    );
};
