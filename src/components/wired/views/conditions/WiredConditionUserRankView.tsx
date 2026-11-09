import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_GREATER_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { NumberInput } from '../../../../common/NumberInput';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MIN_RANK = 1;
const MAX_RANK = 1000;

const clampRank = (value: number) => (Number.isNaN(value) ? MIN_RANK : Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(value))));

// Server contract (WiredConditionHabboHasRank): intData = [rank, comparison], the users in the official source
// slot and the quantifier in its slot (the base view's). The negative box shares the dialog and turns the per-user check around on the server.
export const WiredConditionUserRankView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [rank, setRank] = useState(MIN_RANK);
    const [comparison, setComparison] = useState(WIRED_CMP_GREATER_EQUAL);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setRank(data.length > 0 ? clampRank(data[0]) : MIN_RANK);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_GREATER_EQUAL);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams([clampRank(rank), comparison]);
        setSourceTypes({ furni: [], users: [userSource] });
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
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.rank', 'Rank')}</Text>
                        <NumberInput min={MIN_RANK} max={MAX_RANK} className="form-control form-control-sm" style={{ maxWidth: 140 }} value={rank} onChange={(event) => setRank(clampRank(parseInt(event.target.value, 10)))} />
                    </div>
                    <WiredComparisonOperator name="wiredUserRankComparison" value={comparison} onChange={setComparison} />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
