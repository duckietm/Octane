import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { variableTokenFromId, WIRED_FIXED_HOLDER_SOURCE, WiredValueOrVariableField, wiredValueTargetKey } from '../WiredValueOrVariableField';
import { readWiredVariableToken, toWiredVariableId, wiredVariableIdList } from '../WiredVariableIds';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * Habbo's progress-reward-track action (`wf_act_progress_reward_track`): moves one task of a reward
 * track for the chosen users. Server: WiredEffectProgressRewardTrack. String param `track\ttask`, then a
 * tab and the value variable's id; official int params `[add to existing, amount from a variable,
 * amount, variable target (global -10 / context -20)]`; the user source is the official slot.
 * The hotel decides which tracks wired may move.
 */

/** AIR: both ids are `TextInputParam("", 100, null, -1, "a-zA-Z0-9_")`. */
export const REWARD_TRACK_ID_MAX_LENGTH = 100;

/** The score the server keeps a reward track task to (WiredHotelProgress.MAX_AMOUNT). */
export const REWARD_TRACK_MAX_AMOUNT = 1_000_000;

export const clampRewardTrackAmount = (value: number): number =>
    Number.isFinite(value) ? Math.min(REWARD_TRACK_MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1;

// The official reward track reads its value variable on a global or a context holder only.
const GLOBAL_TARGET = -10;
const CONTEXT_TARGET = -20;

export const normalizeRewardTrackId = (value: string): string => (value ?? '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, REWARD_TRACK_ID_MAX_LENGTH);

/** AIR's reset box: `TextInputParam("", 100, null, -1, "^\t")`, anything but a tab. */
export const normalizeResetRewardTrackId = (value: string): string => (value ?? '').replace(/\t/g, '').slice(0, REWARD_TRACK_ID_MAX_LENGTH);

export const WiredActionProgressRewardTrackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null, setVariableIds = null } = useWired();
    const [trackId, setTrackId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [addToExisting, setAddToExisting] = useState(false);
    const [amount, setAmount] = useState('1');
    const [isVariable, setIsVariable] = useState(false);
    const [valueTarget, setValueTarget] = useState(GLOBAL_TARGET);
    const [valueToken, setValueToken] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [valueValid, setValueValid] = useState(true);

    useEffect(() => {
        if (!trigger) return;

        const [track = '', task = '', variableId = ''] = (trigger.stringData ?? '').split('\t');

        // A box saved under the older rules shows its ids as stored; editing them applies AIR's characters.
        setTrackId(track.slice(0, REWARD_TRACK_ID_MAX_LENGTH));
        setTaskId(task.slice(0, REWARD_TRACK_ID_MAX_LENGTH));
        setAddToExisting((trigger.intData?.[0] ?? 0) !== 0);
        setIsVariable(trigger.intData?.[1] === 1);
        setAmount(String(clampRewardTrackAmount(trigger.intData?.[2] ?? 1)));
        setValueTarget(trigger.intData?.[3] === CONTEXT_TARGET ? CONTEXT_TARGET : GLOBAL_TARGET);
        // AIR: the amount's variable is the first variable id; an older server wrote its id as a third field.
        setValueToken(readWiredVariableToken(trigger.variableIds, 0, variableTokenFromId(variableId)));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    const save = () => {
        // AIR ProgressRewardTrack: `track\ttask` as the string, the amount's variable as the variable id.
        setStringParam(`${trackId}\t${taskId}`);
        setVariableIds(wiredVariableIdList(isVariable ? toWiredVariableId(wiredValueTargetKey(valueTarget), valueToken) : ''));
        setIntParams([addToExisting ? 1 : 0, isVariable ? 1 : 0, clampRewardTrackAmount(parseInt(amount, 10)), valueTarget]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <NativeTextTree>
            <WiredActionBaseView
                footerCollapsible={false}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                validate={() => trackId.length > 0 && taskId.length > 0 && valueValid && (!isVariable || getCustomVariableItemId(valueToken) > 0)}
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
                    {/* AIR ProgressRewardTrack: createValueOrVariableSection(0, mergedSourceOptions(0), score, 1, int max) with the
                        claimed merged slot 0 in the popup. The server reads the variable on a room or context holder only. */}
                    <WiredValueOrVariableField
                        holderSource={WIRED_FIXED_HOLDER_SOURCE}
                        isVariable={isVariable}
                        label={localizeWithFallback('wiredfurni.params.reward_track.score', 'Score')}
                        literal={amount}
                        min={1}
                        target={valueTarget}
                        targets={[GLOBAL_TARGET, CONTEXT_TARGET]}
                        token={valueToken}
                        onIsVariableChange={setIsVariable}
                        onLiteralChange={setAmount}
                        onTargetChange={setValueTarget}
                        onTokenChange={setValueToken}
                        onValidityChange={setValueValid}
                    />
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
