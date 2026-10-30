import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { LINK_MESSAGE_MAX_BYTES, utf8Length } from '../../../../api/wired/WiredLinkDataframe';
import { Text } from '../../../../common';
import { useNotification, useWired } from '../../../../hooks';
import { WiredPlaceholderInsert } from '../WiredPlaceholderInsert';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const FROM_TRIGGER = 0;
const CUSTOM_MESSAGE = 1;
const LINK_SOURCES = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

/**
 * Official send link message (63, AIR SendLinkMessage): a message source ("from WIRED trigger" or a custom message
 * with placeholders, at most 1000 bytes) and the WIRED Links to send through. Int params [source].
 */
export const WiredActionSendLinkMessageView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const { simpleAlert = null } = useNotification();
    const [ source, setSource ] = useState(FROM_TRIGGER);
    const [ message, setMessage ] = useState('');
    const [ furniSource, setFurniSource ] = useState(100);

    useEffect(() =>
    {
        if(!trigger) return;

        setSource((trigger.intData?.[0] === CUSTOM_MESSAGE) ? CUSTOM_MESSAGE : FROM_TRIGGER);
        setMessage(trigger.stringData ?? '');
        setFurniSource((trigger.furniSourceTypes?.[0] === 200) ? 200 : 100);
    }, [ trigger ]);

    const validate = () =>
    {
        if(utf8Length(message) <= LINK_MESSAGE_MAX_BYTES) return true;

        simpleAlert?.(localizeWithFallback('wiredfurni.params.link.message_too_large', 'This message is too large to save.'));

        return false;
    };

    const save = () =>
    {
        setIntParams([ source ]);
        setStringParam(message);
        setSourceTypes({ furni: [ furniSource ], users: [] });
    };

    const custom = (source === CUSTOM_MESSAGE);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={ true }
                requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
                save={ save }
                validate={ validate }
                footer={ <WiredSourcesSelector showFurni={ true } furniSource={ furniSource } furniSources={ LINK_SOURCES } furniTitle={ localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links') } onChangeFurni={ setFurniSource } /> }
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.link.message_source', 'Message source') }</Text>
                    { [ FROM_TRIGGER, CUSTOM_MESSAGE ].map(value => (
                        <label key={ value } className="flex cursor-pointer items-center gap-1">
                            <Radio checked={ source === value } name="sendLinkMessageSource" onCheckedChange={ () => setSource(value) } />
                            <Text small>{ (value === FROM_TRIGGER) ? localizeWithFallback('wiredfurni.params.link.from_trigger', 'From WIRED trigger') : localizeWithFallback('wiredfurni.params.link.custom_message', 'Custom message') }</Text>
                        </label>
                    )) }
                </div>
                <div className={ `flex flex-col gap-1 ${ custom ? '' : 'opacity-50' }` }>
                    <Text bold>{ localizeWithFallback('wiredfurni.params.message', 'Message') }</Text>
                    <textarea className="form-control form-control-sm octane-wired__resizable-textarea" disabled={ !custom } rows={ 4 } value={ message } onChange={ event => setMessage(event.target.value) } />
                    <Text small className={ (utf8Length(message) > LINK_MESSAGE_MAX_BYTES) ? 'text-[#ad3434]' : 'text-[#777]' }>{ `${ utf8Length(message) } / ${ LINK_MESSAGE_MAX_BYTES }` }</Text>
                    { custom && <WiredPlaceholderInsert trigger={ trigger } onInsert={ token => setMessage(current => current + token) } /> }
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
