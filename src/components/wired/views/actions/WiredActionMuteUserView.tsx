import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionMuteUserView: FC<{}> = (props) => {
    const [time, setTime] = useState(-1);
    const [message, setMessage] = useState('');
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => {
        setIntParams([time, userSource]);
        setStringParam(message);
    };

    useEffect(() => {
        setTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setMessage(trigger.stringData);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.length.minutes', ['minutes'], [time.toString()])}</Text>
                <Slider max={10} min={0} value={time} onChange={(event) => setTime(event)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                <OctaneInput
                    maxLength={GetConfigurationValue<number>('wired.action.mute.user.max.length', 100)}
                    type="text"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
            </div>
        </WiredActionBaseView>
    );
};
