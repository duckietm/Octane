import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MESSAGE_MAX_LENGTH = 100;

/** Official: the message (100 characters) first, then the minutes slider (0..10, 1 by default); [minutes]. */
export const WiredActionMuteUserView: FC<{}> = () => {
    const [time, setTime] = useState(1);
    const [message, setMessage] = useState('');
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    const save = () => {
        setIntParams([time]);
        setStringParam(message);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setTime(trigger?.intData?.[0] ?? 1);
        setUserSource(slotUserSource(trigger));
        setMessage(trigger?.stringData ?? '');
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                validate={() => message.length <= MESSAGE_MAX_LENGTH}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                    <OctaneInput maxLength={MESSAGE_MAX_LENGTH} type="text" value={message} onChange={(event) => setMessage(event.target.value)} />
                </div>
                <WiredSliderSection
                    max={10}
                    min={0}
                    title={LocalizeText('wiredfurni.params.length.minutes', ['minutes'], [time.toString()])}
                    value={Math.min(10, time)}
                    onChange={setTime}
                />
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
