import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const MATCH_CONTAINS = 0;
const MATCH_EXACT = 1;
const MATCH_ALL = 2;

export const WiredTriggerAvatarSaysSomethingView: FC<{}> = () => {
    const [message, setMessage] = useState('');
    const [matchMode, setMatchMode] = useState(MATCH_CONTAINS);
    const [hideMessage, setHideMessage] = useState(false);
    const [ownerOnly, setOwnerOnly] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () => {
        setStringParam(message);
        setIntParams([matchMode, hideMessage ? 1 : 0, ownerOnly ? 1 : 0]);
    };

    useEffect(() => {
        setMessage(trigger?.stringData ?? '');
        setMatchMode(trigger?.intData?.length > 0 ? trigger.intData[0] : MATCH_CONTAINS);
        setHideMessage(trigger?.intData?.length > 1 ? trigger.intData[1] === 1 : false);
        setOwnerOnly(trigger?.intData?.length > 2 ? trigger.intData[2] === 1 : false);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.whatissaid')}</Text>
                <OctaneInput type="text" value={message} onChange={(event) => setMessage(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        checked={matchMode === MATCH_CONTAINS}
                        className="form-check-input"
                        id="sayMatchContains"
                        name="sayMatchMode"
                        type="radio"
                        onChange={() => setMatchMode(MATCH_CONTAINS)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.chatcontains')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={matchMode === MATCH_EXACT}
                        className="form-check-input"
                        id="sayMatchExact"
                        name="sayMatchMode"
                        type="radio"
                        onChange={() => setMatchMode(MATCH_EXACT)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.exactmatch')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={matchMode === MATCH_ALL}
                        className="form-check-input"
                        id="sayMatchAll"
                        name="sayMatchMode"
                        type="radio"
                        onChange={() => setMatchMode(MATCH_ALL)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.allmatch')}</Text>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        checked={hideMessage}
                        className="form-check-input"
                        id="sayHideMessage"
                        type="checkbox"
                        onChange={(event) => setHideMessage(event.target.checked)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.chat.hide')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={ownerOnly}
                        className="form-check-input"
                        id="sayOwnerOnly"
                        type="checkbox"
                        onChange={(event) => setOwnerOnly(event.target.checked)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.chat.onlyowner')}</Text>
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
