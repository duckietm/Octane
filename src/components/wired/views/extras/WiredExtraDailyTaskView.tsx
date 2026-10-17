import { FC, useEffect, useState } from 'react';
import { DAILY_TASK_NAME_MAX_LENGTH, localizeWithFallback, normalizeDailyTaskName, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { NumberInput } from '../../../../common/NumberInput';

const MAX_TARGET = 2147483647;

export const WiredExtraDailyTaskView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [taskName, setTaskName] = useState('');
    const [target, setTarget] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setTaskName(normalizeDailyTaskName(trigger.stringData));
        setTarget(trigger.intData.length > 0 ? Math.max(0, trigger.intData[0]) : 0);
    }, [trigger]);

    const save = () => {
        setIntParams([Math.max(0, target)]);
        setStringParam(normalizeDailyTaskName(taskName).trim());
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.variables.daily_task.usage', 'Place this on the same tile as a user counter variable.')}</Text>
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.daily_task_name', 'Daily task name')}</Text>
                    <OctaneInput
                        maxLength={DAILY_TASK_NAME_MAX_LENGTH}
                        placeholder="1234.."
                        type="text"
                        value={taskName}
                        onChange={(event) => setTaskName(normalizeDailyTaskName(event.target.value))}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{localizeWithFallback('wiredfurni.params.variables.daily_task.target', 'Daily goal (value to reach)')}</Text>
                    <NumberInput min={0} className="form-control form-control-sm" value={target} onChange={(event) => setTarget(Math.min(MAX_TARGET, Math.max(0, parseInt(event.target.value, 10) || 0)))} />
                </div>
                <Text small>
                    {localizeWithFallback(
                        'wiredfurni.params.variables.daily_task.info',
                        'The counter starts again at 0 every day, on the room\'s wired clock. Exposes: progress, target, is_complete, percent, remaining.'
                    )}
                </Text>
            </div>
        </WiredExtraBaseView>
    );
};
