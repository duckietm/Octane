import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { FURNI_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;

/**
 * The official "remove furni" (code 56): removes the temporary furni that "place furni" put in the
 * room. Furni somebody owns stays. No int params; one furni source.
 */
export const WiredActionRemoveTemporaryFurniView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setFurniIds = null, setSourceTypes = null } = useWired();
    const [ furniSource, setFurniSource ] = useState(SOURCE_TRIGGER);

    useEffect(() =>
    {
        if(!trigger) return;

        const source = trigger.furniSourceTypes?.[0] ?? SOURCE_TRIGGER;

        setFurniSource(FURNI_SOURCES.some(option => option.value === source) ? source : SOURCE_TRIGGER);
    }, [ trigger ]);

    const save = () =>
    {
        setIntParams([]);
        if(furniSource !== SOURCE_SELECTED) setFurniIds?.([]);
        setSourceTypes({ furni: [ furniSource ], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={ true }
                requiresFurni={ furniSource === SOURCE_SELECTED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE }
                save={ save }
                footerCollapsible={false}
                footer={ <WiredSourcesSelector showFurni={ true } furniSource={ furniSource } onChangeFurni={ setFurniSource } /> }>
                <Text small>{ localizeWithFallback('wiredfurni.params.remove_furni.usage_info', 'Removes temporary furni placed by "place furni". Furni somebody owns is not removed.') }</Text>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
