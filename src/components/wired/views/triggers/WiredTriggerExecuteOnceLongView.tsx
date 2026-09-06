import { FC, useEffect, useState } from 'react';
import { FriendlyTime, LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const STEP_SECONDS = 5;

// Server contract (WiredTriggerAtTimeLong): intData = [time] in 5-second steps, the same shape the long
// repeater uses; the half-second execute-once dialog cannot reach the delays this box is for.
export const WiredTriggerExecuteOnceLongView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        if (!trigger) return;

        setTime(trigger.intData?.length > 0 ? Math.max(1, trigger.intData[0]) : 1);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.setlongtime', ['time'], [FriendlyTime.format(time * STEP_SECONDS).toString()])}</Text>
                <Slider max={120} min={1} value={time} onChange={(value) => setTime(value)} />
            </div>
        </WiredTriggerBaseView>
    );
};
