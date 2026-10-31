import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * Official Link Speaker add-on (2003): its picked WIRED Links join the send link boxes of its stack, for the kinds
 * chosen under "speak for". Int params [message, dataframe].
 */
export const WiredExtraLinkSpeakerView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null } = useWired();
    const [ message, setMessage ] = useState(true);
    const [ dataframe, setDataframe ] = useState(true);

    useEffect(() =>
    {
        if(!trigger) return;

        const params = trigger.intData ?? [];

        setMessage((params.length > 0) ? (params[0] === 1) : true);
        setDataframe((params.length > 1) ? (params[1] === 1) : true);
    }, [ trigger ]);

    const save = () => setIntParams([ message ? 1 : 0, dataframe ? 1 : 0 ]);

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } save={ save }>
                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.link_speaker.speak_for', 'Speak for:') }</Text>
                    <label className="flex cursor-pointer items-center gap-1">
                        <Checkbox checked={ message } onCheckedChange={ nextChecked => setMessage(nextChecked) } />
                        <Text small>{ localizeWithFallback('wiredfurni.params.link_speaker.message', 'Message') }</Text>
                    </label>
                    <label className="flex cursor-pointer items-center gap-1">
                        <Checkbox checked={ dataframe } onCheckedChange={ nextChecked => setDataframe(nextChecked) } />
                        <Text small>{ localizeWithFallback('wiredfurni.params.link_speaker.dataframe', 'Dataframe') }</Text>
                    </label>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
