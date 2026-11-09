import { FC, useEffect, useState } from 'react';
import { FriendlyTime, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const TO_SECONDS = (value: number) => value * 5;
const FROM_SECONDS = (seconds: number) => Math.round(seconds / 5);

/** Official: [v], 1..120 steps of 5 seconds, the seconds editable in the section header. */
export const WiredTriggeExecutePeriodicallyLongView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(Math.max(1, trigger?.intData?.[0] ?? 1));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <WiredSliderSection
                    displayStep={5}
                    fromDisplay={FROM_SECONDS}
                    max={120}
                    min={1}
                    title={localizeWithFallback('wiredfurni.params.settime3', LocalizeText('wiredfurni.params.setlongtime', ['time'], [FriendlyTime.format(time * 5).toString()]))}
                    toDisplay={TO_SECONDS}
                    value={time}
                    onChange={setTime}
                />
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
