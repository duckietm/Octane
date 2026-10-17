import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const MIN_LEVEL = 1;
const MAX_LEVEL = 100;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

/**
 * Compares the user's account level (the profile level, as `@level`), as the AIR editor does: a level and a
 * comparison, no variable. A variable stored by older saves is dropped on the next save; the server no longer reads it.
 */
export const WiredConditionUserLevelView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [level, setLevel] = useState(MIN_LEVEL);
    const [comparison, setComparison] = useState(1);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    useEffect(() => {
        if (!trigger) return;

        setLevel(trigger.intData?.length > 0 ? trigger.intData[0] : MIN_LEVEL);
        setComparison(trigger.intData?.length > 1 ? trigger.intData[1] : 1);
        setUserSource(trigger.intData?.length > 2 ? trigger.intData[2] : 0);
        setQuantifier(trigger.intData?.length > 3 && trigger.intData[3] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
    }, [trigger]);

    const save = () => {
        setIntParams([level, comparison, userSource, quantifier]);
        setStringParam('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>
                        {localizeWithFallback('wiredfurni.params.level_selection', 'Level')}: {level}
                    </Text>
                    <Slider max={MAX_LEVEL} min={MIN_LEVEL} value={level} onChange={(value) => setLevel(value)} />
                </div>

                <WiredComparisonOperator name="wiredUserLevelComparison" value={comparison} onChange={setComparison} />

                <label className="flex items-center gap-1 cursor-pointer">
                    <Checkbox checked={quantifier === QUANTIFIER_ANY} onCheckedChange={(nextChecked) => setQuantifier(nextChecked ? QUANTIFIER_ANY : QUANTIFIER_ALL)} />
                    <Text>{localizeWithFallback('wiredfurni.params.level.any_user', 'One user is enough (otherwise every user must match)')}</Text>
                </label>
            </div>
        </WiredConditionBaseView>
    );
};
