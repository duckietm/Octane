import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredTriggerDiceRolledView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null } = useWired();
    const [ matchEnabled, setMatchEnabled ] = useState(false);
    const [ requiredValue, setRequiredValue ] = useState(0);

    useEffect(() =>
    {
        if(!trigger) return;

        const value = ((trigger.intData?.length ?? 0) > 0) ? trigger.intData[0] : 0;

        setMatchEnabled(value > 0);
        setRequiredValue(value);
    }, [ trigger ]);

    const save = () => setIntParams([ matchEnabled ? Math.max(0, requiredValue) : 0 ]);

    return (
        <WiredTriggerBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } save={ save }>
            <div className="flex flex-col gap-1">
                <Text bold>Dice rolled</Text>
                <Text small>Fires when a dice is rolled. Leave unchecked to match any value.</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={ matchEnabled } id="diceMatchEnabled" onCheckedChange={(nextChecked) => setMatchEnabled(nextChecked)} />
                    <Text>Only a specific rolled value</Text>
                </div>
                { matchEnabled &&
                    <input
                        className="form-control form-control-sm"
                        type="number"
                        min={ 1 }
                        value={ requiredValue }
                        onChange={ event => setRequiredValue(parseInt(event.target.value, 10) || 0) } /> }
            </div>
        </WiredTriggerBaseView>
    );
};
