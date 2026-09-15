import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

// Quest Chain box: place it on the SAME stack as a "current step" counter variable. Config = total steps.
// Designers bump the step counter as each sub-quest completes. Exposes derived read-only vars:
// <counter>.current_step / .total_steps / .is_complete / .percent.
export const WiredExtraQuestChainView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [totalSteps, setTotalSteps] = useState(0);

    useEffect(() => {
        if (!trigger) return;
        setTotalSteps(trigger.intData.length > 0 ? Math.max(0, trigger.intData[0]) : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([Math.max(0, totalSteps)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>
                    {localizeWithFallback(
                        'wiredfurni.params.quest_chain.placement',
                        'Place this on the same tile as a "current step" counter variable.'
                    )}
                </Text>
                <Text bold>{localizeWithFallback('wiredfurni.params.quest_chain.total_steps', 'Total steps')}</Text>
                <input
                    type="number"
                    min={0}
                    className="form-control form-control-sm"
                    value={totalSteps}
                    onChange={(event) => setTotalSteps(Math.max(0, parseInt(event.target.value, 10) || 0))}
                />
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.quest_chain.exposes',
                        'Exposes: current_step, total_steps, is_complete, percent. Bump the step counter when each sub-quest completes.'
                    )}
                </Text>
            </div>
        </WiredExtraBaseView>
    );
};
