import { FC, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionTimeElapsedLessView: FC<{}> = (props) => {
    const [time, setTime] = useState(-1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.allowbefore2', LocalizeText('wiredfurni.params.allowbefore', ['seconds'], [GetWiredTimeLocale(time)]))}</Text>
                <Slider max={1200} min={1} value={time} onChange={(event) => setTime(event)} />
                <Text small>{LocalizeText('wiredfurni.params.allowbefore', ['seconds'], [GetWiredTimeLocale(time)])}</Text>
            </div>
        </WiredConditionBaseView>
    );
};
