import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { ChestFurniIconPreview } from '../ChestFurniIconPreview';
import { normalizeWiredComparison, WIRED_CMP_DEFAULT, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { NumberInput } from '../../../../common/NumberInput';

// Server contract (WiredConditionChestHasItemType): intData[0] = baseItemId, intData[1] = amount,
// intData[2] = comparison op. baseItemId stays at [0] for back-compat; old saves (2 ints) read the
// comparison as the default (>=), preserving the previous hard-coded ">=" behaviour.
export const WiredConditionChestHasItemTypeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [baseItemId, setBaseItemId] = useState(0);
    const [amount, setAmount] = useState(1);
    const [comparison, setComparison] = useState(WIRED_CMP_DEFAULT);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setBaseItemId(data.length > 0 ? data[0] : 0);
        setAmount(data.length > 1 ? Math.max(1, data[1]) : 1);
        setComparison(data.length > 2 ? normalizeWiredComparison(data[2]) : WIRED_CMP_DEFAULT);
    }, [trigger]);

    const save = () => setIntParams([Math.max(0, baseItemId), Math.max(1, amount), comparison]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
            <div className="flex flex-col gap-3">
                <Text small className="text-black/60">
                    {localizeWithFallback(
                        'wiredfurni.params.sources.furni.title.item_types',
                        'Pick the chest above. Passes when it holds the furni type below.'
                    )}
                </Text>
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.base_item_id', 'Furni base item ID')}</Text>
                    <ChestFurniIconPreview baseItemId={baseItemId} />
                    <NumberInput min={0} className="form-control form-control-sm" style={{ maxWidth: 140 }} value={baseItemId} onChange={(event) => setBaseItemId(Math.max(0, parseInt(event.target.value, 10) || 0))} />
                </div>
                <WiredComparisonOperator name="chestHasItemTypeComparison" value={comparison} onChange={setComparison} />
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.count', 'Amount')}</Text>
                    <NumberInput min={1} className="form-control form-control-sm" style={{ maxWidth: 140 }} value={amount} onChange={(event) => setAmount(Math.max(1, parseInt(event.target.value, 10) || 1))} />
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
