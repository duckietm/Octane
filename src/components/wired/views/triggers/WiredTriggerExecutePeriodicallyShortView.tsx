import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

/** Official: [v], 1..10 steps of 50 ms; the title carries the milliseconds, no number input. */
export const WiredTriggeExecutePeriodicallyShortView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(Math.max(1, trigger?.intData?.[0] ?? 1));
    }, [trigger]);

    const ms = String(time * 50);

    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
                <WiredSliderSection
                    max={10}
                    min={1}
                    numberInput={false}
                    title={localizeWithFallback('wiredfurni.params.setshorttime', `${ms} ms`, ['ms'], [ms])}
                    value={time}
                    onChange={setTime}
                />
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
