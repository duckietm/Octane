import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionTriggerFurniAdjacentStateView: FC<{}> = () =>
{
    const [ requiredState, setRequiredState ] = useState<string>('');
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();

    useEffect(() =>
    {
        if(!trigger) return;

        setRequiredState(trigger.stringData ?? '');
    }, [ trigger ]);

    const save = () =>
    {
        setStringParam(requiredState);
        setIntParams([]);
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={ true }
            requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
            save={ save }>
            <div className="flex flex-col gap-1">
                <Text bold>Required state</Text>
                <OctaneInput maxLength={ 64 } type="text" value={ requiredState } onChange={ event => setRequiredState(event.target.value) } />
            </div>
        </WiredConditionBaseView>
    );
};
