import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';

const MATCH_CONTAINS = 0;
const MATCH_EXACT = 1;
const MATCH_ALL = 2;

interface WiredTriggerAvatarSaysSomethingViewProps {
    /**
     * The say-your-username trigger (code 31) fires on the speaker's own name, so it has no keyword
     * and no match mode; only the hide and owner-only switches are its own.
     */
    usernameOnly?: boolean;
}

export const WiredTriggerAvatarSaysSomethingView: FC<WiredTriggerAvatarSaysSomethingViewProps> = ({ usernameOnly = false }) => {
    const [message, setMessage] = useState('');
    const [matchMode, setMatchMode] = useState(MATCH_CONTAINS);
    const [hideMessage, setHideMessage] = useState(false);
    const [ownerOnly, setOwnerOnly] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    const save = () => {
        setStringParam(usernameOnly ? '' : message);
        // Official layout: [owner only, match mode, hide the message].
        setIntParams([ownerOnly ? 1 : 0, usernameOnly ? MATCH_CONTAINS : matchMode, hideMessage ? 1 : 0]);
    };

    useEffect(() => {
        setMessage(trigger?.stringData ?? '');
        setOwnerOnly(trigger?.intData?.[0] === 1);
        setMatchMode(trigger?.intData?.length > 1 ? trigger.intData[1] : MATCH_CONTAINS);
        setHideMessage(trigger?.intData?.[2] === 1);
    }, [trigger]);

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            {usernameOnly && (
                <Text small className="text-black/60">
                    {localizeWithFallback('wiredfurni.params.username_as_trigger.info', 'Fires when a user says their own username.')}
                </Text>
            )}
            {!usernameOnly && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.whatissaid')}</Text>
                    <OctaneInput
                        disabled={matchMode === MATCH_ALL}
                        maxLength={1000}
                        title={LocalizeText('wiredfurni.tooltip.chatinput')}
                        type="text"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                </div>
            )}
            {!usernameOnly && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.chattriggertype')}</Text>
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
            )}
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.select_options')}</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={hideMessage} id="sayHideMessage" onCheckedChange={(nextChecked) => setHideMessage(nextChecked)} />
                    <Text>{LocalizeText('wiredfurni.params.chat.hide')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Checkbox checked={ownerOnly} id="sayOwnerOnly" onCheckedChange={(nextChecked) => setOwnerOnly(nextChecked)} />
                    <Text>{LocalizeText('wiredfurni.params.chat.onlyowner')}</Text>
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
