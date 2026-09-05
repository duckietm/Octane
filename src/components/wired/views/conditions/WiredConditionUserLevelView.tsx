import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MIN_LEVEL = 1;
const MAX_LEVEL = 100;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

/**
 * The level compared here is the one the level-up add-on derives from a user variable, because that
 * is the only level a room owns. The picker therefore offers user variables, and a variable with no
 * level-up add-on attached simply never matches.
 */
export const WiredConditionUserLevelView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [] } = useWiredTools();
    const [variableToken, setVariableToken] = useState('');
    const [level, setLevel] = useState(MIN_LEVEL);
    const [comparison, setComparison] = useState(1);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries('user', 'condition', userVariableDefinitions),
        [userVariableDefinitions]
    );

    useEffect(() => {
        if (!trigger) return;

        setVariableToken(trigger.stringData ?? '');
        setLevel(trigger.intData?.length > 0 ? trigger.intData[0] : MIN_LEVEL);
        setComparison(trigger.intData?.length > 1 ? trigger.intData[1] : 1);
        setQuantifier(trigger.intData?.length > 3 && trigger.intData[3] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
    }, [trigger]);

    const save = () => {
        // The third slot is the user source, which the base view owns; it is sent as the trigger
        // default so the emulator reads a complete list rather than falling back mid-array.
        setIntParams([level, comparison, 0, quantifier]);
        setStringParam(variableToken);
    };

    const validate = () => !!variableToken;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
        >
            <div className="flex flex-col gap-2">
                <Text>{localizeWithFallback('wiredfurni.params.level.variable', 'Experience variable')}</Text>
                <WiredVariablePicker
                    entries={variableEntries}
                    recentScope="user-level"
                    selectedToken={variableToken}
                    onSelect={(entry) => setVariableToken(entry.token)}
                />

                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.level_selection', 'Level')}: {level}</Text>
                    <Slider max={MAX_LEVEL} min={MIN_LEVEL} value={level} onChange={(value) => setLevel(value)} />
                </div>

                <WiredComparisonOperator name="wiredUserLevelComparison" value={comparison} onChange={setComparison} />

                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        checked={quantifier === QUANTIFIER_ANY}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => setQuantifier(event.target.checked ? QUANTIFIER_ANY : QUANTIFIER_ALL)}
                    />
                    <Text>
                        {localizeWithFallback(
                            'wiredfurni.params.level.any_user',
                            'One user is enough (otherwise every user must match)'
                        )}
                    </Text>
                </label>
            </div>
        </WiredConditionBaseView>
    );
};
