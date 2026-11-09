import { FC, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { canTransfer } from '../../hooks/collectibles/collectibles.helpers';
import { useCollectibles } from '../../hooks/collectibles/useCollectibles';
import { useNotification } from '../../hooks/notification';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import { CollectiblesLoadingView } from './CollectiblesLoadingView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/**
 * `TransferNftsTab`. The official tab moves every collectible of the collector wallet to an external
 * wallet for a silver fee; without a blockchain the wallet picker becomes the name of the user who gets
 * them.
 */
export const CollectiblesTransferTabView: FC = () => {
    const { transferFee = null, silver = 0, collectorWallet = '', transferPending = false, transfer = null } = useCollectibles();
    const { showConfirm = null } = useNotification();
    const [recipient, setRecipient] = useState('');

    if (transferFee === null) return <CollectiblesLoadingView />;

    const enabled = canTransfer(transferFee, silver, collectorWallet, transferPending, recipient);

    const onTransfer = () => {
        const name = recipient.trim();

        showConfirm?.(
            localizeWithFallback('collectibles.transfer.confirm.user', `Are you sure you want to transfer all your collectibles to ${name}?`, ['name'], [name]),
            () => {
                transfer?.(name);
                setRecipient('');
            },
            null,
            localizeWithFallback('collectibles.transfer', 'Transfer'),
            null,
            localizeWithFallback('collectibles.transfer', 'Transfer')
        );
    };

    return (
        <NativeTextTree>
            <div className="octane-collectibles-transfer" data-testid="collectibles-transfer">
                <div className="octane-collectibles-transfer-description">
                    {localizeWithFallback('collectibles.transfer.user.description', 'Transfer the collectibles of your Collector Wallet to another Habbo.')}
                </div>
                <div className="octane-collectibles-transfer-safe" />
                <div className="octane-collectibles-transfer-form">
                    <input
                        aria-label={localizeWithFallback('collectibles.transfer.recipient', 'Habbo name')}
                        className="octane-collectibles-search"
                        data-testid="collectibles-transfer-recipient"
                        placeholder={localizeWithFallback('collectibles.transfer.recipient', 'Habbo name')}
                        value={recipient}
                        onChange={(event) => setRecipient(event.target.value)}
                    />
                    <div className="octane-collectibles-transfer-fee">
                        {transferFee > 0 && (
                            <>
                                <span data-testid="collectibles-transfer-fee">{transferFee}</span>
                                <img alt="" draggable={false} src={silverIcon} />
                            </>
                        )}
                        <BaseButton className="octane-collectibles-button is-blue" disabled={!enabled} onClick={onTransfer}>
                            {localizeWithFallback('collectibles.transfer', 'Transfer')}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
