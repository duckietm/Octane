import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { NumberInput } from '../../../../common/NumberInput';

// Config-based v1: the chest stocks a single furni base-type (base item id) x quantity.
export const WiredChestFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [baseItemId, setBaseItemId] = useState(0);
    const [quantity, setQuantity] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setBaseItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setQuantity(trigger.intData.length > 1 ? Math.max(0, trigger.intData[1]) : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([Math.max(0, baseItemId), Math.max(0, quantity)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>Furni base item id to store</Text>
                <NumberInput min={0} className="form-control form-control-sm" value={baseItemId} onChange={(event) => setBaseItemId(Math.max(0, parseInt(event.target.value, 10) || 0))} />
                <Text bold>Quantity stored</Text>
                <NumberInput min={0} className="form-control form-control-sm" value={quantity} onChange={(event) => setQuantity(Math.max(0, parseInt(event.target.value, 10) || 0))} />
            </div>
        </WiredExtraBaseView>
    );
};
