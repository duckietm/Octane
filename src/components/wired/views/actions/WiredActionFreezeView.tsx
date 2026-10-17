import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';

/** The official effect list; the box saves the index (wiredfurni.params.freeze.effect.0..4). */
const EFFECT_OPTIONS = [218, 12, 11, 53, 163];

/** Official: [effect index, cancel on teleport], both in one section; the user source is the official slot. */
export const WiredActionFreezeView: FC<{}> = () => {
    const [effectIndex, setEffectIndex] = useState(0);
    const [cancelOnTeleport, setCancelOnTeleport] = useState(false);
    const [userSource, setUserSource] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    const save = () => {
        setIntParams([effectIndex, cancelOnTeleport ? 1 : 0]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        const index = trigger?.intData?.[0] ?? 0;

        setEffectIndex(index >= 0 && index < EFFECT_OPTIONS.length ? index : 0);
        setCancelOnTeleport(trigger?.intData?.[1] === 1);
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.freeze.effect_selection', 'Effect')}</Text>
                <Select className="form-select form-select-sm" value={effectIndex} onChange={(event) => setEffectIndex(parseInt(event.target.value))}>
                    {EFFECT_OPTIONS.map((effectId, index) => (
                        <option key={effectId} value={index}>
                            {localizeWithFallback(`wiredfurni.params.freeze.effect.${index}`, LocalizeText(`fx_${effectId}`))}
                        </option>
                    ))}
                </Select>
                <label className="flex items-center gap-1">
                    <Checkbox checked={cancelOnTeleport} onCheckedChange={(nextChecked) => setCancelOnTeleport(nextChecked)} />
                    <Text>{LocalizeText('wiredfurni.params.freeze.cancel_on_teleport')}</Text>
                </label>
            </div>
        </WiredActionBaseView>
    );
};
