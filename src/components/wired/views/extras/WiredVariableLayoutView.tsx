import { WiredVariableLayoutCode } from '../../../../api';
import { WiredExtraContextVariableView } from './WiredExtraContextVariableView';
import { WiredExtraDailyTaskView } from './WiredExtraDailyTaskView';
import { WiredExtraFurniVariableView } from './WiredExtraFurniVariableView';
import { WiredExtraPointerVariableView } from './WiredExtraPointerVariableView';
import { WiredExtraQuestChainView } from './WiredExtraQuestChainView';
import { WiredExtraQuestView } from './WiredExtraQuestView';
import { WiredExtraRoomVariableView } from './WiredExtraRoomVariableView';
import { WiredExtraUserVariableView } from './WiredExtraUserVariableView';
import { WiredExtraVariableEchoView } from './WiredExtraVariableEchoView';
import { WiredExtraVariableReferenceView } from './WiredExtraVariableReferenceView';

/** The editor of a variable, by its official variable code. */
export const WiredVariableLayoutView = (code: number) =>
{
    switch(code)
    {
        case WiredVariableLayoutCode.FURNI_VARIABLE:
            return <WiredExtraFurniVariableView />;
        case WiredVariableLayoutCode.USER_VARIABLE:
            return <WiredExtraUserVariableView />;
        case WiredVariableLayoutCode.GLOBAL_VARIABLE:
            return <WiredExtraRoomVariableView />;
        case WiredVariableLayoutCode.CONTEXT_VARIABLE:
            return <WiredExtraContextVariableView />;
        case WiredVariableLayoutCode.REFERENCE_VARIABLE:
            return <WiredExtraVariableReferenceView />;
        case WiredVariableLayoutCode.QUEST_VARIABLE:
            return <WiredExtraQuestView />;
        case WiredVariableLayoutCode.QUEST_CHAIN_VARIABLE:
            return <WiredExtraQuestChainView />;
        case WiredVariableLayoutCode.ECHO_VARIABLE:
            return <WiredExtraVariableEchoView />;
        case WiredVariableLayoutCode.DAILY_TASK_VARIABLE:
            return <WiredExtraDailyTaskView />;
        case WiredVariableLayoutCode.POINTER_VARIABLE:
            return <WiredExtraPointerVariableView />;
    }

    return null;
};
