import { FC, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { PULSES_TO_SECONDS, SECONDS_TO_PULSES, WiredSliderSection } from '../WiredSliderSection';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { timeElapsedFromParams } from './WiredConditionTimeElapsedMoreView';

const MIN_PULSES = 1;
const MAX_PULSES = 1200;

/** Official: a 1..1200 half-second slider (default 1) with the seconds editable in the section header. */
export const WiredConditionTimeElapsedLessView: FC<{}> = () => {
    const [time, setTime] = useState(MIN_PULSES);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time + 1]);

    useEffect(() => {
        setTime(timeElapsedFromParams(trigger?.intData ?? []));
    }, [trigger]);

    const seconds = GetWiredTimeLocale(time);

    return (
        <NativeTextTree>
            <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <WiredSliderSection
                    displayStep={0.5}
                    fromDisplay={SECONDS_TO_PULSES}
                    max={MAX_PULSES}
                    min={MIN_PULSES}
                    title={localizeWithFallback('wiredfurni.params.allowbefore2', LocalizeText('wiredfurni.params.allowbefore', ['seconds'], [seconds]), ['seconds'], [seconds])}
                    toDisplay={PULSES_TO_SECONDS}
                    value={time}
                    onChange={setTime}
                />
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
