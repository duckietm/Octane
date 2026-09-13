import { FC, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeExecutePeriodicallyView: FC<{}> = (props) => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.settime3', LocalizeText('wiredfurni.params.settime', ['seconds'], [GetWiredTimeLocale(time)]))}</Text>
                <Slider max={120} min={1} value={time} onChange={(event) => setTime(event)} />
                <Text small>{LocalizeText('wiredfurni.params.settime', ['seconds'], [GetWiredTimeLocale(time)])}</Text>
            </div>
        </WiredTriggerBaseView>
    );
};
