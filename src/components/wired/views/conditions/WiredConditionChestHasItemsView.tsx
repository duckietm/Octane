import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_DEFAULT, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, normalizeVariableTokenFromWire } from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';

// Server contract (WiredConditionChestHasItems):
//   intData[0] = amount, [1] = comparison, [2] = amount mode, [3] = variable target
//   stringData = the variable token
// Old saves carry two ints and no token, so they read as a constant and behave as they did.

const AMOUNT_CONSTANT = 0;
const AMOUNT_VARIABLE = 1;
const TARGET_USER = 0;
const TARGET_ROOM = 3;

export const WiredConditionChestHasItemsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredTools();

    const [amount, setAmount] = useState(1);
    const [comparison, setComparison] = useState(WIRED_CMP_DEFAULT);
    const [amountMode, setAmountMode] = useState(AMOUNT_CONSTANT);
    const [amountTarget, setAmountTarget] = useState(TARGET_ROOM);
    const [variableToken, setVariableToken] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setAmount(data.length > 0 ? Math.max(0, data[0]) : 1);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_DEFAULT);
        setAmountMode(data.length > 2 && data[2] === AMOUNT_VARIABLE ? AMOUNT_VARIABLE : AMOUNT_CONSTANT);
        setAmountTarget(data.length > 3 && data[3] === TARGET_USER ? TARGET_USER : TARGET_ROOM);
        setVariableToken(normalizeVariableTokenFromWire(trigger.stringData ?? ''));
    }, [trigger]);

    const pickerTarget = amountTarget === TARGET_USER ? 'user' : 'global';
    const definitions = amountTarget === TARGET_USER ? userVariableDefinitions : roomVariableDefinitions;

    const entries = useMemo(() => buildWiredVariablePickerEntries(pickerTarget, 'change-reference', definitions), [definitions, pickerTarget]);

    // A token saved against a variable that has since gone keeps its place in the list, so reopening
    // the box shows what it was set to instead of looking unconfigured.
    const resolvedEntries = useMemo(() => {
        if (!variableToken) return entries;
        if (flattenWiredVariablePickerEntries(entries).some((entry) => entry.token === variableToken)) return entries;

        const fallback = createFallbackVariableEntry(pickerTarget, variableToken);
        return fallback ? [fallback, ...entries] : entries;
    }, [entries, pickerTarget, variableToken]);

    const save = () => {
        setStringParam(amountMode === AMOUNT_VARIABLE ? variableToken : '');
        setIntParams([Math.max(0, amount), comparison, amountMode, amountTarget]);
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
            <div className="flex flex-col gap-3">
                <Text small className="text-black/60">
                    {localizeWithFallback('wiredfurni.params.sources.furni.title.chests', 'Pick the chest above. Passes when its total contents compare to the amount below.')}
                </Text>
                <WiredComparisonOperator name="chestHasItemsComparison" value={comparison} onChange={setComparison} />
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                        <input checked={amountMode === AMOUNT_CONSTANT} className="form-check-input" id="chestAmountConstant" name="chestAmountMode" type="radio" onChange={() => setAmountMode(AMOUNT_CONSTANT)} />
                        <Text>{localizeWithFallback('wiredfurni.params.amount.from_value', 'A number')}</Text>
                    </div>
                    <div className="flex items-center gap-1">
                        <input checked={amountMode === AMOUNT_VARIABLE} className="form-check-input" id="chestAmountVariable" name="chestAmountMode" type="radio" onChange={() => setAmountMode(AMOUNT_VARIABLE)} />
                        <Text>{localizeWithFallback('wiredfurni.params.amount.from_variable', 'The value of a variable')}</Text>
                    </div>
                </div>
                {amountMode === AMOUNT_CONSTANT ? (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.count', 'Amount')}</Text>
                        <input className="form-control form-control-sm" min={0} style={{ maxWidth: 140 }} type="number" value={amount} onChange={(event) => setAmount(Math.max(0, parseInt(event.target.value, 10) || 0))} />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <Text bold>{localizeWithFallback('wiredfurni.params.variables.target', 'Where the variable lives')}</Text>
                            {[
                                { target: TARGET_ROOM, key: 'wiredfurni.params.variables.target.room', fallback: 'The room' },
                                { target: TARGET_USER, key: 'wiredfurni.params.variables.target.user', fallback: 'The user who triggered' }
                            ].map((option) => (
                                <div key={option.target} className="flex items-center gap-1">
                                    <input checked={amountTarget === option.target} className="form-check-input" id={`chestAmountTarget${option.target}`} name="chestAmountTarget" type="radio" onChange={() => setAmountTarget(option.target)} />
                                    <Text>{localizeWithFallback(option.key, option.fallback)}</Text>
                                </div>
                            ))}
                        </div>
                        <WiredVariablePicker entries={resolvedEntries} recentScope={`chest-amount-${pickerTarget}`} selectedToken={variableToken} onSelect={(entry) => setVariableToken(entry.token)} />
                    </div>
                )}
            </div>
        </WiredConditionBaseView>
    );
};
