import { FC, useEffect, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

export const WiredTriggeExecuteOnceView: FC<{}> = (props) => {
    const [time, setTime] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();

    const save = () => setIntParams([time]);

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <WiredSliderSection
                boxStep={0.5}
                fromDisplay={(text) => Math.round(Number(text) * 2)}
                max={1200}
                min={1}
                titleFallback={LocalizeText('wiredfurni.params.settime')}
                titleKey="wiredfurni.params.settime2"
                toDisplay={GetWiredTimeLocale}
                value={time}
                onChange={(value) => setTime(value)}
            />
        </WiredTriggerBaseView>
    );
};
