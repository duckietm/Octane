import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MIN_LEVEL = 1;
const MAX_LEVEL = 30;

/** AIR LevelMatches comparisons: 0 lower than, 1 equal to, 2 higher than. */
const COMPARISONS = [0, 1, 2];
const COMPARISON_EQUAL = 1;

/**
 * Compares the user's account level (the profile level, as `@level`), as the AIR editor does: a 1..30 level slider
 * with its number input, then the three-way comparison. A variable stored by older saves is dropped on the next save;
 * the server no longer reads it.
 */
export const WiredConditionUserLevelView: FC<{}> = () => {
    // Official layout: [level, comparison], the users in the official source slot; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [level, setLevel] = useState(MIN_LEVEL);
    const [comparison, setComparison] = useState(COMPARISON_EQUAL);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const storedComparison = trigger.intData?.[1];

        setLevel(trigger.intData?.length > 0 ? trigger.intData[0] : MIN_LEVEL);
        setComparison(COMPARISONS.includes(storedComparison) ? storedComparison : COMPARISON_EQUAL);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([level, comparison]);
        setSourceTypes({ furni: [], users: [userSource] });
        setStringParam('');
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-2">
                    <WiredSliderSection
                        max={MAX_LEVEL}
                        min={MIN_LEVEL}
                        title={localizeWithFallback('wiredfurni.params.level_selection', `Level: ${level}`, ['level'], [String(level)])}
                        value={level}
                        onChange={setLevel}
                    />

                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.comparison_selection')}</Text>
                        {COMPARISONS.map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={comparison === value} name="wiredUserLevelComparison" onCheckedChange={() => setComparison(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
