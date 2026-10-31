import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

const LINK_SOURCES = [ { value: 100, label: 'wiredfurni.params.sources.furni.100' } ];

/**
 * Official receive link message (29, AIR ReceiveLinkMessage): the picked furni are the WIRED Links the stack
 * listens on; the received message is captured in $(trigger_text). No params.
 */
export const WiredTriggerReceiveLinkMessageView: FC<{}> = () =>
{
    const { setIntParams = null, setSourceTypes = null } = useWired();

    const save = () =>
    {
        setIntParams([]);
        setSourceTypes({ furni: [ 100 ], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredTriggerBaseView
                hasSpecialInput={ true }
                requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
                save={ save }
                footer={ <WiredSourcesSelector showFurni={ true } furniSource={ 100 } furniSources={ LINK_SOURCES } furniTitle={ localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links') } onChangeFurni={ () => undefined } /> }
            >
                <Text bold>{ localizeWithFallback('wiredfurni.params.general_box_info', 'Info') }</Text>
                <Text small className="whitespace-pre-line text-[#777]">{ localizeWithFallback('wiredfurni.params.link.receive_message_info', 'The received message is captured in the $(trigger_text) text placeholder.') }</Text>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
