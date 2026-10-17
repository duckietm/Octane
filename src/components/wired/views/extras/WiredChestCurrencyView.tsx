import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Radio } from '../../../../common/Radio';
import { NumberInput } from '../../../../common/NumberInput';

// Currency type convention (matches server InteractionWiredChestCurrency): -1 = credits, >=0 = points type.
const CURRENCY_OPTIONS: { value: number; label: string }[] = [
    { value: -1, label: 'Credits' },
    { value: 0, label: 'Duckets' },
    { value: 5, label: 'Diamonds' },
];

export const WiredChestCurrencyView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [currencyType, setCurrencyType] = useState(-1);
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setCurrencyType(trigger.intData.length > 0 ? trigger.intData[0] : -1);
        setAmount(trigger.intData.length > 1 ? Math.max(0, trigger.intData[1]) : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([currencyType, Math.max(0, amount)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>Currency type</Text>
                <div className="flex flex-col gap-1">
                    {CURRENCY_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2">
                            <Radio name="chestCurrencyType" checked={currencyType === option.value} onCheckedChange={() => setCurrencyType(option.value)} />
                            <Text small>{option.label}</Text>
                        </label>
                    ))}
                </div>
                <Text bold>Amount stored</Text>
                <NumberInput min={0} className="form-control form-control-sm" value={amount} onChange={(event) => setAmount(Math.max(0, parseInt(event.target.value, 10) || 0))} />
            </div>
        </WiredExtraBaseView>
    );
};
