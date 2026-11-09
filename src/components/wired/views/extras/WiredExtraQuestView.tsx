import { FC } from 'react';
import { WiredExtraNamedCodeVariableView } from './WiredExtraNamedCodeVariableView';

/** AIR's quest variable (QuestVariable): the variable's name and the quest's code (500 characters). */
export const WiredExtraQuestView: FC<{}> = () => <WiredExtraNamedCodeVariableView codeTitleKey="wiredfurni.params.variables.quest_name" maxCodeLength={500} />;
