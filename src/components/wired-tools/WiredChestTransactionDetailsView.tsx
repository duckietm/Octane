import { FurnitureType, IWiredChestTransactionDetailItem, IWiredChestTransactionRow } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, ProductImageUtility } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { chestTransactionMethodText } from './WiredChestTransactions.helpers';
import { HANDHELD_MIN_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';

export interface WiredChestTransactionDetails {
    transaction: IWiredChestTransactionRow;
    chestIds: number[];
    withdrawn: IWiredChestTransactionDetailItem[];
    deposited: IWiredChestTransactionDetailItem[];
    incomplete: boolean;
}

interface WiredChestTransactionDetailsViewProps {
    details: WiredChestTransactionDetails;
    onClose: () => void;
}

/** AIR TransactionOverviewView: the coins and the furni one side of a transaction moved, or "Nothing". */
const TransactionSide: FC<{ title: string; coins: number; furniCount: number; items: IWiredChestTransactionDetailItem[]; incomplete: boolean }> = ({ title, coins, furniCount, items, incomplete }) => (
    <div className="octane-chest-log__side">
        <b>{title}</b>
        {coins <= 0 && furniCount <= 0 && <div>{localizeWithFallback('wiredchests.log_details.transactions.none_placeholder', 'Nothing')}</div>}
        {(coins > 0 || !!items.length) && (
            <div className="octane-chest-log__items">
                {coins > 0 && (
                    <div className="octane-chest-log__item">
                        <span>{localizeWithFallback('wiredchests.logs.only_coins', '%amount% coins', ['amount'], [String(coins)])}</span>
                    </div>
                )}
                {items.map((item) => (
                    <div key={`${item.wallItem ? 'w' : 'f'}${item.typeId}:${item.posterId}`} className="octane-chest-log__item">
                        <img alt="" src={ProductImageUtility.getProductImageUrl(item.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR, item.typeId, item.posterId)} />
                        <span>x{item.quantity}</span>
                    </div>
                ))}
            </div>
        )}
        {incomplete && furniCount > 0 && <div className="octane-chest-log__incomplete">{localizeWithFallback('wiredchests.log_details.incomplete_data', 'More furni that are not shown')}</div>}
    </div>
);

/**
 * AIR WiredTransactionDetailsView on transaction_details (400 wide): the method, time, room, chests, user and extra
 * info as key / value lines, then what was withdrawn and what was deposited.
 */
export const WiredChestTransactionDetailsView: FC<WiredChestTransactionDetailsViewProps> = ({ details, onClose }) => {
    const [extraInfoOpen, setExtraInfoOpen] = useState(false);
    const { transaction, chestIds, withdrawn, deposited, incomplete } = details;

    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_MIN_FRAME_SCALE} className="octane-widget-chest-log octane-chest-log-details" theme="primary-slim" uniqueKey="chest-transaction-details">
                <OctaneCardHeaderView headerText={localizeWithFallback('wiredchests.log_details.title', 'Transaction details')} onCloseClick={onClose} />
                <OctaneCardContentView>
                    <div className="octane-chest-log__detail">
                        <div>
                            <b>{localizeWithFallback('wiredchests.log_details.type', 'Transaction method:')}</b> <span>{chestTransactionMethodText(transaction.method)}</span>
                        </div>
                        <div>
                            <b>{localizeWithFallback('wiredchests.log_details.timestamp', 'Timestamp:')}</b> <span>{transaction.readableTimestamp || '-'}</span>
                        </div>
                        <div>
                            <b>{localizeWithFallback('wiredchests.log_details.room_id', 'Room id:')}</b> <span>{transaction.roomId}</span>
                        </div>
                        <div>
                            <b>{localizeWithFallback('wiredchests.log_details.chest_ids', 'Chest id(s):')}</b> <span>{chestIds.join(', ') || '-'}</span>
                        </div>
                        <div>
                            <b>{localizeWithFallback('wiredchests.log_details.username', 'Username:')}</b> <span>{transaction.userName || '-'}</span>
                        </div>
                        <div className="octane-chest-log__extra">
                            <b>{localizeWithFallback('wiredchests.log_details.extra', 'Extra:')}</b> <span>{transaction.definitionInfo || '-'}</span>
                            <BaseButton
                                aria-expanded={extraInfoOpen}
                                aria-label={localizeWithFallback('wiredchests.log_details.extra.title', 'Extra information')}
                                className="octane-chest-log__extra-button"
                                type="button"
                                onClick={() => setExtraInfoOpen((open) => !open)}>
                                ?
                            </BaseButton>
                        </div>
                        {extraInfoOpen && (
                            <div className="octane-chest-log__extra-info">
                                <b>{localizeWithFallback('wiredchests.log_details.extra.title', 'Extra information')}</b>
                                <div>{localizeWithFallback('wiredchests.log_details.extra.desc.1', 'This can hold additional information relevant to the wired transaction.')}</div>
                                <div dangerouslySetInnerHTML={{ __html: localizeWithFallback('wiredchests.log_details.extra.desc.2', '<b>1. </b>For <b>WIRED</b> transactions: the furni id of the wired action and the amount of items / currency.') }} />
                                <div dangerouslySetInnerHTML={{ __html: localizeWithFallback('wiredchests.log_details.extra.desc.3', '<b>2. </b>For <b>CONTRACT</b> transactions: the contract id and the multiplier used.') }} />
                            </div>
                        )}
                        <b>{localizeWithFallback('wiredchests.log_details.transactions', 'Transactions:')}</b>
                        <TransactionSide
                            coins={transaction.withdrawnCoins}
                            furniCount={transaction.withdrawnFurni}
                            incomplete={incomplete}
                            items={withdrawn}
                            title={localizeWithFallback('wiredchests.log_details.transactions.withdrawn', 'Withdrawals')}
                        />
                        <TransactionSide
                            coins={transaction.depositedCoins}
                            furniCount={transaction.depositedFurni}
                            incomplete={incomplete}
                            items={deposited}
                            title={localizeWithFallback('wiredchests.log_details.transactions.deposit', 'Deposits')}
                        />
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
