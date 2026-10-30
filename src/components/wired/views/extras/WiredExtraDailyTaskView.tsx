import { FC } from 'react';
import { DAILY_TASK_NAME_MAX_LENGTH } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { WiredExtraNamedCodeVariableView } from './WiredExtraNamedCodeVariableView';

/** AIR's daily task variable (DailyTaskVariable): the variable's name and the task's code (100 characters, "1234.."). */
export const WiredExtraDailyTaskView: FC<{}> = () => (
    <NativeTextTree>
        <WiredExtraNamedCodeVariableView codeTitleKey="wiredfurni.params.variables.daily_task_name" maxCodeLength={DAILY_TASK_NAME_MAX_LENGTH} placeholder="1234.." />
    </NativeTextTree>
);
