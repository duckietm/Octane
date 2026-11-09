import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export const WiredActionKickFromRoomView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    /** Sit, lie down and fast walk share this window for its user source; nobody is being kicked, so
     * the message the kicked person would see has nothing to say. */
    const showMessage = trigger?.code !== WiredActionLayoutCode.USER_TARGET;
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    const save = () => {
        setStringParam(showMessage ? message : '');
        setIntParams([]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setMessage(trigger.stringData);
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                {showMessage && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                        <OctaneInput
                            maxLength={GetConfigurationValue<number>('wired.action.kick.from.room.max.length', 100)}
                            type="text"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                        />
                    </div>
                )}
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
