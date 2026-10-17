import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { variableTokenFromId, WiredValueOrVariableSection } from '../WiredValueOrVariableSection';
import { clampProgressAmount, PROGRESS_ACHIEVEMENT_MAX_AMOUNT } from './WiredActionProgressAchievementView';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

/**
 * Habbo's progress-reward-track action (`wf_act_progress_reward_track`): moves one task of a reward
 * track for the chosen users. Server: WiredEffectProgressRewardTrack. String param `track\ttask`, then a
 * tab and the value variable's id; official int params `[add to existing, amount from a variable,
 * amount, variable target (global -10 / context -20)]`; the user source is the official slot.
 * The hotel decides which tracks wired may move.
 */

export const REWARD_TRACK_ID_MAX_LENGTH = 64;

// The official reward track reads its value variable on a global or a context holder only.
const GLOBAL_TARGET = -10;
const CONTEXT_TARGET = -20;

export const normalizeRewardTrackId = (value: string): string => (value ?? '').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, REWARD_TRACK_ID_MAX_LENGTH);

export const WiredActionProgressRewardTrackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [trackId, setTrackId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [addToExisting, setAddToExisting] = useState(false);
    const [amount, setAmount] = useState('1');
    const [isVariable, setIsVariable] = useState(false);
    const [valueTarget, setValueTarget] = useState(GLOBAL_TARGET);
    const [valueToken, setValueToken] = useState('');
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const [track = '', task = '', variableId = ''] = (trigger.stringData ?? '').split('\t');

        setTrackId(normalizeRewardTrackId(track));
        setTaskId(normalizeRewardTrackId(task));
        setAddToExisting((trigger.intData?.[0] ?? 0) !== 0);
        setIsVariable(trigger.intData?.[1] === 1);
        setAmount(String(clampProgressAmount(trigger.intData?.[2] ?? 1)));
        setValueTarget(trigger.intData?.[3] === CONTEXT_TARGET ? CONTEXT_TARGET : GLOBAL_TARGET);
        setValueToken(variableTokenFromId(variableId));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    const save = () => {
        const variableId = isVariable ? getCustomVariableItemId(valueToken) : 0;

        setStringParam(isVariable ? `${trackId}\t${taskId}\t${variableId}` : `${trackId}\t${taskId}`);
        setIntParams([addToExisting ? 1 : 0, isVariable ? 1 : 0, clampProgressAmount(parseInt(amount, 10)), valueTarget]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <WiredActionBaseView
            footerCollapsible={false}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => trackId.length > 0 && taskId.length > 0 && (!isVariable || getCustomVariableItemId(valueToken) > 0)}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.progress.ids', 'Reward track')}</Text>
                <input
                    aria-label="track"
                    className="form-control form-control-sm"
                    maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track ID')}
                    value={trackId}
                    onChange={(event) => setTrackId(normalizeRewardTrackId(event.target.value))}
                />
                <input
                    aria-label="task"
                    className="form-control form-control-sm"
                    maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                    placeholder={localizeWithFallback('wiredfurni.params.reward_track.task_id', 'Task ID')}
                    value={taskId}
                    onChange={(event) => setTaskId(normalizeRewardTrackId(event.target.value))}
                />
            </div>
            <label className="flex items-center gap-1">
                <Checkbox checked={addToExisting} onCheckedChange={(nextChecked) => setAddToExisting(nextChecked)} />
                <Text>{localizeWithFallback('wiredfurni.params.reward_track.add_to_existing_score', 'Add to the existing score')}</Text>
            </label>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.score', 'Score')}</Text>
                <WiredValueOrVariableSection
                    name="rewardTrackValue"
                    isVariable={isVariable}
                    value={amount}
                    target={valueTarget}
                    token={valueToken}
                    furniSource={0}
                    userSource={0}
                    min={1}
                    targets={[GLOBAL_TARGET, CONTEXT_TARGET]}
                    onIsVariableChange={setIsVariable}
                    onValueChange={setAmount}
                    onTargetChange={setValueTarget}
                    onTokenChange={setValueToken}
                    onFurniSourceChange={() => undefined}
                    onUserSourceChange={() => undefined}
                />
            </div>
        </WiredActionBaseView>
    );
};
