import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredActionBaseView } from './WiredActionBaseView';

const CAPTION_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 200;

export const WiredActionSetRoomAdView: FC<{}> = props =>
{
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [ caption, setCaption ] = useState<string>('');
    const [ description, setDescription ] = useState<string>('');
    const [ category, setCategory ] = useState<number>(0);

    useEffect(() =>
    {
        if(!trigger) return;

        const parts = (trigger.stringData ?? '').split('\t');

        setCaption(parts.length > 0 ? parts[0] : '');
        setDescription(parts.length > 1 ? parts[1] : '');
        setCategory((trigger.intData?.length ?? 0) > 0 ? trigger.intData[0] : 0);
    }, [ trigger ]);

    const save = () =>
    {
        setStringParam(`${ caption }\t${ description }`);
        setIntParams([ category ]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={ true }
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE }
            save={ save }>
            <div className="flex flex-col gap-1">
                <Text bold>Room ad caption</Text>
                <OctaneInput maxLength={ CAPTION_MAX_LENGTH } type="text" value={ caption } onChange={ event => setCaption(event.target.value) } />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>Room ad description</Text>
                <textarea
                    className="form-control form-control-sm octane-wired__resizable-textarea"
                    maxLength={ DESCRIPTION_MAX_LENGTH }
                    rows={ 3 }
                    value={ description }
                    onChange={ event => setDescription(event.target.value) } />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>Category</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={ 0 }
                    max={ 50 }
                    value={ category }
                    onChange={ event => setCategory(parseInt(event.target.value, 10) || 0) } />
            </div>
        </WiredActionBaseView>
    );
};
