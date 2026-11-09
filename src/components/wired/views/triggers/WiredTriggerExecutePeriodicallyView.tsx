import { FC, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { PULSES_TO_SECONDS, SECONDS_TO_PULSES, WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** Official: [pulses], 1..120 half seconds, the seconds editable in the section header. */
export const WiredTriggeExecutePeriodicallyView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(Math.max(1, trigger?.intData?.[0] ?? 1));
    }, [trigger]);

    const seconds = GetWiredTimeLocale(time);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <WiredSliderSection
                    displayStep={0.5}
                    fromDisplay={SECONDS_TO_PULSES}
                    max={120}
                    min={1}
                    title={localizeWithFallback('wiredfurni.params.settime3', LocalizeText('wiredfurni.params.settime', ['seconds'], [seconds]), ['seconds'], [seconds])}
                    toDisplay={PULSES_TO_SECONDS}
                    value={time}
                    onChange={setTime}
                />
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
