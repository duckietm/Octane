import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredValueTarget, variableTokenFromId, WiredValueOrVariableSection } from '../WiredValueOrVariableSection';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';

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
export const WiredExtraFilterAmountView: FC<{ name: string }> = ({ name }) => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [amount, setAmount] = useState(String(MIN_FILTER));
    const [fromVariable, setFromVariable] = useState(false);
    const [target, setTarget] = useState(TARGET_USER);
    const [token, setToken] = useState('');
    const [randomPick, setRandomPick] = useState(true);

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

    const validate = () => !fromVariable || getCustomVariableItemId(token) > 0;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 360 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.setfilter')}</Text>
                <WiredValueOrVariableSection
                    hideSources={true}
                    furniSource={0}
                    isVariable={fromVariable}
                    min={MIN_FILTER}
                    name={name}
                    target={target}
                    token={token}
                    userSource={0}
                    value={amount}
                    onFurniSourceChange={() => {}}
                    onIsVariableChange={setFromVariable}
                    onTargetChange={setTarget}
                    onTokenChange={setToken}
                    onUserSourceChange={() => {}}
                    onValueChange={setAmount}
                />
                <label className="flex items-center gap-1">
                    <Checkbox checked={randomPick} onCheckedChange={(nextChecked) => setRandomPick(nextChecked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.filter.random', 'Pick at random (off: the first N)')}</Text>
                </label>
            </div>
        </WiredExtraBaseView>
    );
};
