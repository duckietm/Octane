import { DeleteItemMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { FurnitureItem, LocalizeText, ProductTypeEnum, SendMessageComposer } from '../../../../api';
import { LayoutFurniImageView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { DeleteItemConfirmEvent } from '../../../../events';
import { useNotification, useUiEvent } from '../../../../hooks';
import { OctaneButton, OctaneInput } from '../../../../layout';

export const InventoryFurnitureDeleteView: FC<{}> = (props) => {
    const [item, setItem] = useState<FurnitureItem>(null);
    const [amount, setAmount] = useState(1);
    const [maxAmount, setMaxAmount] = useState(1);
    const { showConfirm = null } = useNotification();

    const onClose = () => {
        setItem(null);
        setAmount(1);
        setMaxAmount(1);
    };

    const updateAmount = (value: string) => {
        let newValue = parseInt(value);

        if (isNaN(newValue)) newValue = 1;

        newValue = Math.max(newValue, 1);
        newValue = Math.min(newValue, maxAmount);

        setAmount(newValue);
    };

    const deleteItem = () => {
        if (!item) return;

        const furniTitle = LocalizeText(item.isWallItem ? 'wallItem.name.' + item.type : 'roomItem.name.' + item.type);

        showConfirm(
            LocalizeText('inventory.delete.confirm_delete.info', ['furniname', 'amount'], [furniTitle, amount.toString()]),
            () => {
                SendMessageComposer(new DeleteItemMessageComposer(item.id, amount));
                onClose();
            },
            () => onClose(),
            null,
            null,
            LocalizeText('inventory.delete.confirm_delete.title')
        );
    };

    useUiEvent<DeleteItemConfirmEvent>(DeleteItemConfirmEvent.DELETE_ITEM_CONFIRM, (event) => {
        setItem(event.item);
        setMaxAmount(event.amount);
        setAmount(1);
    });

    if (!item) return null;

    const furniTitle = LocalizeText(item.isWallItem ? 'wallItem.name.' + item.type : 'roomItem.name.' + item.type);

    return (
        <OctaneCardView className="min-w-0 w-[min(340px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" uniqueKey="inventory-delete">
            <OctaneCardHeaderView headerText={LocalizeText('inventory.delete.confirm_delete.title')} onCloseClick={onClose} />
            <div className="bg-[#DFDFDF] p-2">
                <div className="flex items-center gap-2">
                    <div className="shrink-0 w-[64px] h-[64px] bg-white rounded flex items-center justify-center">
                        <LayoutFurniImageView
                            extraData={item.extra.toString()}
                            productClassId={item.type}
                            productType={item.isWallItem ? ProductTypeEnum.WALL : ProductTypeEnum.FLOOR}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <span className="font-bold text-sm truncate">{furniTitle}</span>
                        <div className="flex items-center gap-1">
                            <FaCaretLeft className="cursor-pointer text-black fa-icon shrink-0" onClick={() => updateAmount((amount - 1).toString())} />
                            <OctaneInput
                                className="w-[49px] text-center py-0.5!"
                                type="number"
                                min={1}
                                max={maxAmount}
                                value={amount}
                                onChange={(event) => updateAmount(event.target.value)}
                            />
                            <FaCaretRight className="cursor-pointer text-black fa-icon shrink-0" onClick={() => updateAmount((amount + 1).toString())} />
                            <OctaneButton className="text-xs py-0.5 px-1 shrink-0" onClick={() => updateAmount(maxAmount.toString())}>
                                {LocalizeText('inventory.delete.max_amount.button')}
                            </OctaneButton>
                        </div>
                        <OctaneButton className="bg-danger! hover:bg-danger/80! w-full" disabled={amount > maxAmount} onClick={deleteItem}>
                            {LocalizeText('inventory.delete.confirm_delete.button')}
                        </OctaneButton>
                    </div>
                </div>
            </div>
        </OctaneCardView>
    );
};
