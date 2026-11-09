import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_GREATER_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { NumberInput } from '../../../../common/NumberInput';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MIN_POINTS = 0;
const MAX_POINTS = 1_000_000_000;

const clampPoints = (value: number) => (Number.isNaN(value) ? MIN_POINTS : Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.floor(value))));

// Server contract (WiredConditionHabboHasHighscorePoints): intData = [points, comparison], the users in the
// official source slot and the quantifier in its slot (the base view's), plus the picked scoreboards. The user's best score across them is what
// gets compared; a user with no entry has zero points, and a box with no scoreboard never passes.
export const WiredConditionUserHighscorePointsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [points, setPoints] = useState(MIN_POINTS);
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER_EQUAL);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setPoints(data.length > 0 ? clampPoints(data[0]) : MIN_POINTS);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_GREATER_EQUAL);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([clampPoints(points), comparison]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    const validate = () => (trigger?.selectedItems?.length ?? 0) > 0;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
                save={save}
                validate={validate}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-2">
                    <Text small className="text-black/60">
                        {localizeWithFallback('wiredfurni.params.highscore.title', "Pick the scoreboards above. The user's best score on them is compared.")}
                    </Text>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.highscore_points', 'Points')}</Text>
                        <NumberInput min={MIN_POINTS} max={MAX_POINTS} className="form-control form-control-sm" style={{ maxWidth: 160 }} value={points} onChange={(event) => setPoints(clampPoints(parseInt(event.target.value, 10)))} />
                    </div>
                    <WiredComparisonOperator name="wiredHighscorePointsComparison" value={comparison} onChange={setComparison} />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
