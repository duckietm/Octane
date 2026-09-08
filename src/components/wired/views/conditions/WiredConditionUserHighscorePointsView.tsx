import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_GREATER_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MIN_POINTS = 0;
const MAX_POINTS = 1_000_000_000;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

const clampPoints = (value: number) => (Number.isNaN(value) ? MIN_POINTS : Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.floor(value))));

// Server contract (WiredConditionHabboHasHighscorePoints): intData = [points, comparison, userSource,
// quantifier] plus the picked scoreboards. The user's best score across them is what gets compared; a
// user with no entry has zero points, and a box with no scoreboard never passes.
export const WiredConditionUserHighscorePointsView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [points, setPoints] = useState(MIN_POINTS);
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER_EQUAL);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setPoints(data.length > 0 ? clampPoints(data[0]) : MIN_POINTS);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_GREATER_EQUAL);
        setUserSource(data.length > 2 ? data[2] : 0);
        setQuantifier(data.length > 3 && data[3] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
    }, [trigger]);

    const save = () => setIntParams([clampPoints(points), comparison, userSource, quantifier]);

    const validate = () => (trigger?.selectedItems?.length ?? 0) > 0;

    return (
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
                    <input
                        type="number"
                        min={MIN_POINTS}
                        max={MAX_POINTS}
                        className="form-control form-control-sm"
                        style={{ maxWidth: 160 }}
                        value={points}
                        onChange={(event) => setPoints(clampPoints(parseInt(event.target.value, 10)))}
                    />
                </div>
                <WiredComparisonOperator name="wiredHighscorePointsComparison" value={comparison} onChange={setComparison} />
                <label className="flex items-center gap-1 cursor-pointer">
                    <input
                        checked={quantifier === QUANTIFIER_ANY}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => setQuantifier(event.target.checked ? QUANTIFIER_ANY : QUANTIFIER_ALL)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.level.any_user', 'One user is enough (otherwise every user must match)')}</Text>
                </label>
            </div>
        </WiredConditionBaseView>
    );
};
