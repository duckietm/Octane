import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { normalizeResetRewardTrackId, REWARD_TRACK_ID_MAX_LENGTH } from './WiredActionProgressRewardTrackView';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * Habbo's reset-reward-track action (`wf_act_reset_reward_track`): puts the chosen users' tasks of a
 * track back to zero. Points and claimed prizes stay. Server: WiredEffectResetRewardTrack. String
 * param the track id (AIR: anything but a tab, at most 100, and it may be left empty), no int params; the
 * user source is the official slot.
 */
export const WiredActionResetRewardTrackView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [trackId, setTrackId] = useState('');
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setTrackId(normalizeResetRewardTrackId(trigger.stringData ?? ''));
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    const save = () => {
        // Official: the track id, no int params; the user source is the official slot.
        setStringParam(trackId);
        setIntParams([]);
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
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.reward_track.reset.track', 'Reward track to reset')}</Text>
                    <label className="flex items-center gap-2">
                        <Text>{localizeWithFallback('wiredfurni.params.reward_track.track_id', 'Track ID')}</Text>
                        <input
                            aria-label="track"
                            className="form-control form-control-sm"
                            maxLength={REWARD_TRACK_ID_MAX_LENGTH}
                            value={trackId}
                            onChange={(event) => setTrackId(normalizeResetRewardTrackId(event.target.value))}
                        />
                    </label>
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
