import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredValueTarget, variableTokenFromId, WiredValueOrVariableField } from '../WiredValueOrVariableField';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_FILTER = 1;
const MAX_FILTER = 1000;
const TARGET_USER = 1;

const clampValue = (value: number) => {
    if (isNaN(value)) return MIN_FILTER;

    return Math.max(MIN_FILTER, Math.min(MAX_FILTER, Math.floor(value)));
};

/**
 * Official layout: [N, N from a variable, variable target], the variable id as text; ours follow:
 * [random pick]. The variable is read on the triggering holder.
 */
export const WiredExtraFilterAmountView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [amount, setAmount] = useState(String(MIN_FILTER));
    const [fromVariable, setFromVariable] = useState(false);
    const [target, setTarget] = useState(TARGET_USER);
    const [token, setToken] = useState('');
    const [randomPick, setRandomPick] = useState(true);
    const [amountValid, setAmountValid] = useState(true);

    useEffect(() => {
        if (!trigger) return;

        const d = trigger.intData;

        setAmount(String(clampValue(d[0] ?? 0)));
        setFromVariable(d[1] === 1);
        setTarget(d.length > 2 ? normalizeWiredValueTarget(d[2]) : TARGET_USER);
        setRandomPick(d.length > 3 ? d[3] === 1 : true);
        setToken(variableTokenFromId(trigger.stringData));
    }, [trigger]);

    const save = () => {
        const variableId = fromVariable ? getCustomVariableItemId(token) : 0;

        setIntParams([clampValue(Number(amount)), fromVariable ? 1 : 0, target, randomPick ? 1 : 0]);
        setStringParam(variableId > 0 ? String(variableId) : '');
    };

    const validate = () => amountValid && (!fromVariable || getCustomVariableItemId(token) > 0);

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 360 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.setfilter')}</Text>
                {/* AIR SelectorFilter / VariableFilter: createValueOrVariableSection(0, mergedSourceOptions(0), setfilter, 1, 1000).
                    The server reads the variable on the triggering holder, so the popup offers the type selector only. */}
                <WiredValueOrVariableField
                    isVariable={fromVariable}
                    label={LocalizeText('wiredfurni.params.setfilter')}
                    literal={amount}
                    max={MAX_FILTER}
                    min={MIN_FILTER}
                    target={target}
                    token={token}
                    onIsVariableChange={setFromVariable}
                    onLiteralChange={setAmount}
                    onTargetChange={setTarget}
                    onTokenChange={setToken}
                    onValidityChange={setAmountValid}
                />
                <label className="flex items-center gap-1">
                    <input checked={randomPick} className="form-check-input" type="checkbox" onChange={(event) => setRandomPick(event.target.checked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.filter.random', 'Pick at random (off: the first N)')}</Text>
                </label>
            </div>
        </WiredExtraBaseView>
    );
};
