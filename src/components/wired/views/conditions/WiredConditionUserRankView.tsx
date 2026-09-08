import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_GREATER_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MIN_RANK = 1;
const MAX_RANK = 1000;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

const clampRank = (value: number) => (Number.isNaN(value) ? MIN_RANK : Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(value))));

// Server contract (WiredConditionHabboHasRank): intData = [rank, comparison, userSource, quantifier].
// The negative box shares the dialog and turns the per-user check around on the server.
export const WiredConditionUserRankView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [rank, setRank] = useState(MIN_RANK);
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER_EQUAL);
    const [userSource, setUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setRank(data.length > 0 ? clampRank(data[0]) : MIN_RANK);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_GREATER_EQUAL);
        setUserSource(data.length > 2 ? data[2] : 0);
        setQuantifier(data.length > 3 && data[3] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
    }, [trigger]);

    const save = () => setIntParams([clampRank(rank), comparison, userSource, quantifier]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.rank', 'Rank')}</Text>
                    <input
                        type="number"
                        min={MIN_RANK}
                        max={MAX_RANK}
                        className="form-control form-control-sm"
                        style={{ maxWidth: 140 }}
                        value={rank}
                        onChange={(event) => setRank(clampRank(parseInt(event.target.value, 10)))}
                    />
                </div>
                <WiredComparisonOperator name="wiredUserRankComparison" value={comparison} onChange={setComparison} />
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
