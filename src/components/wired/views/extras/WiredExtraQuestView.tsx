import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { NumberInput } from '../../../../common/NumberInput';

// Quest box: place it on the SAME stack as a counter variable. Config = the target value to reach.
// Exposes derived read-only vars: <counter>.progress / .target / .is_complete / .percent / .remaining.
export const WiredExtraQuestView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [target, setTarget] = useState(0);

    useEffect(() => {
        if (!trigger) return;
        setTarget(trigger.intData.length > 0 ? Math.max(0, trigger.intData[0]) : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([Math.max(0, target)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>Place this on the same tile as a counter variable.</Text>
                <Text bold>Objective (target value to reach)</Text>
                <NumberInput min={0} className="form-control form-control-sm" value={target} onChange={(event) => setTarget(Math.max(0, parseInt(event.target.value, 10) || 0))} />
                <Text small>Exposes: progress, target, is_complete, percent, remaining (read them in conditions/effects).</Text>
            </div>
        </WiredExtraBaseView>
    );
};
