import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NumberInput } from '../../../../common/NumberInput';

export const WiredTriggerUserGetsHandItemView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null } = useWired();
    const [ filterEnabled, setFilterEnabled ] = useState(false);
    const [ handItemId, setHandItemId ] = useState(0);

    useEffect(() =>
    {
        if(!trigger) return;

        const id = ((trigger.intData?.length ?? 0) > 0) ? trigger.intData[0] : 0;

        setFilterEnabled(id > 0);
        setHandItemId(id);
    }, [ trigger ]);

    const save = () => setIntParams([ filterEnabled ? Math.max(0, handItemId) : 0 ]);

    return (
        <WiredTriggerBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } save={ save }>
            <div className="flex flex-col gap-1">
                <Text bold>Hand item filter</Text>
                <Text small>Fires when a user receives a hand item. Leave unchecked to match any hand item.</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={ filterEnabled } id="handItemFilterEnabled" onCheckedChange={(nextChecked) => setFilterEnabled(nextChecked)} />
                    <Text>Only a specific hand item id</Text>
                </div>
                { filterEnabled &&
                    <NumberInput className="form-control form-control-sm" min={ 0 } value={ handItemId } onChange={ event => setHandItemId(parseInt(event.target.value, 10) || 0) } /> }
            </div>
        </WiredTriggerBaseView>
    );
};
