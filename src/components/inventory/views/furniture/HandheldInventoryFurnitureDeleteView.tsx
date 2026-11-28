import { FC } from 'react';
import { LocalizeText, localizeWithFallback, ProductTypeEnum } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { DraggableWindow } from '../../../../common/draggable-window';
import { LayoutFurniImageView } from '../../../../common/layout/LayoutFurniImageView';
import { NumberInput } from '../../../../common/NumberInput';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface HandheldInventoryFurnitureDeleteViewProps {
    title: string;
    furniTitle: string;
    productClassId: number;
    isWallItem: boolean;
    extraData: string;
    amount: number;
    maxAmount: number;
    /** A confirm is already up: Delete waits for it. */
    confirming: boolean;
    /** The desktop's own amount rule (1..max, text that is no number becomes 1). */
    onAmountChange: (value: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

/**
 * Deleting furni on a phone (HandheldInventoryDialogs.css): a card in the middle of the screen with the furni's picture
 * and name, how many there are, a finger-sized amount stepper with Max, and Cancel beside the red Delete. Delete asks the
 * same confirm as the desktop; InventoryFurnitureDeleteView keeps the amount, the confirm and the packet.
 */
export const HandheldInventoryFurnitureDeleteView: FC<HandheldInventoryFurnitureDeleteViewProps> = (props) => {
    const { title, furniTitle, productClassId, isWallItem, extraData, amount, maxAmount, confirming, onAmountChange, onDelete, onClose } = props;
    const several = maxAmount > 1;

    return (
        <NativeTextTree>
            <DraggableWindow uniqueKey="inventory-delete">
                <div
                    aria-labelledby="octane-handheld-invdlg-delete-title"
                    className="octane-handheld-invdlg is-delete"
                    data-testid="inventory-delete-card"
                    role="dialog"
                >
                    <div className="octane-handheld-invdlg__head">
                        <span aria-hidden="true" className="octane-handheld-invdlg__badge is-danger">
                            <svg viewBox="0 0 16 16">
                                <path d="M3 4.5 H13 M6.5 4.5 V3 H9.5 V4.5 M4.5 4.5 L5.2 13 H10.8 L11.5 4.5 M7 7 V11 M9 7 V11" />
                            </svg>
                        </span>
                        <h3 className="octane-handheld-invdlg__title" id="octane-handheld-invdlg-delete-title">
                            {title}
                        </h3>
                        <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-invdlg__close" onClick={onClose}>
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M4 4 L12 12 M12 4 L4 12" />
                            </svg>
                        </BaseButton>
                    </div>
                    <div className="octane-handheld-invdlg__body">
                        <div className="octane-handheld-invdlg__main">
                            <div className="octane-handheld-invdlg__item">
                                <div className="octane-handheld-invdlg__picture">
                                    <LayoutFurniImageView
                                        extraData={extraData}
                                        productClassId={productClassId}
                                        productType={isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                                    />
                                </div>
                                <div className="octane-handheld-invdlg__item-text">
                                    <span className="octane-handheld-invdlg__name">{furniTitle}</span>
                                    <span className="octane-handheld-invdlg__muted">
                                        {localizeWithFallback('octane.handheld.inventory_dialogs.owned', 'You have %count%', ['count'], [String(maxAmount)])}
                                    </span>
                                </div>
                            </div>
                            <p className="octane-handheld-invdlg__note">
                                {localizeWithFallback(
                                    'octane.handheld.inventory_dialogs.delete_note',
                                    'Deleted furni is gone for good and cannot be brought back.'
                                )}
                            </p>
                        </div>
                        {several && (
                            <div className="octane-handheld-invdlg__side octane-handheld-invdlg__amount">
                                <span className="octane-handheld-invdlg__label">
                                    {localizeWithFallback('octane.handheld.inventory_dialogs.amount', 'How many')}
                                </span>
                                <div className="octane-handheld-invdlg__stepper">
                                    <BaseButton
                                        aria-label={localizeWithFallback('octane.handheld.inventory_dialogs.fewer', 'Fewer')}
                                        className="octane-handheld-invdlg__step"
                                        disabled={amount <= 1}
                                        onClick={() => onAmountChange(String(amount - 1))}
                                    >
                                        <svg aria-hidden="true" viewBox="0 0 16 16">
                                            <path d="M3.5 8 H12.5" />
                                        </svg>
                                    </BaseButton>
                                    <NumberInput
                                        aria-label={localizeWithFallback('octane.handheld.inventory_dialogs.amount', 'How many')}
                                        className="octane-handheld-invdlg__field"
                                        max={maxAmount}
                                        min={1}
                                        steppers={false}
                                        value={amount}
                                        onChange={(event) => onAmountChange(event.target.value)}
                                    />
                                    <BaseButton
                                        aria-label={localizeWithFallback('octane.handheld.inventory_dialogs.more', 'More')}
                                        className="octane-handheld-invdlg__step"
                                        disabled={amount >= maxAmount}
                                        onClick={() => onAmountChange(String(amount + 1))}
                                    >
                                        <svg aria-hidden="true" viewBox="0 0 16 16">
                                            <path d="M3.5 8 H12.5 M8 3.5 V12.5" />
                                        </svg>
                                    </BaseButton>
                                    <BaseButton
                                        className="octane-handheld-invdlg__max"
                                        disabled={amount >= maxAmount}
                                        onClick={() => onAmountChange(String(maxAmount))}
                                    >
                                        {localizeWithFallback('inventory.delete.max_amount.button', 'Maximum')}
                                    </BaseButton>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="octane-handheld-invdlg__actions">
                        <BaseButton className="octane-handheld-invdlg__button is-secondary" onClick={onClose}>
                            {LocalizeText('generic.cancel')}
                        </BaseButton>
                        <BaseButton className="octane-handheld-invdlg__button is-danger" disabled={confirming || amount > maxAmount} onClick={onDelete}>
                            {localizeWithFallback('inventory.delete.confirm_delete.button', 'Delete')}
                        </BaseButton>
                    </div>
                </div>
            </DraggableWindow>
        </NativeTextTree>
    );
};
