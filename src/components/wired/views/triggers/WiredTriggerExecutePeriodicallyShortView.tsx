import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeExecutePeriodicallyShortView: FC<{}> = () => {
    const [time, setTime] = useState(10);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 10);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.setshorttime', LocalizeText('wiredfurni.params.settime', ['seconds'], [((time * 50) / 1000).toFixed(2)]), ['ms'], [String(time * 50)])}</Text>
                <Text small>{`${time * 50} ms`}</Text>
                <Slider max={10} min={1} value={time} onChange={(event) => setTime(event)} />
            </div>
        </WiredTriggerBaseView>
    );
};
