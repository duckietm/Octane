import { FC } from 'react';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { WiredExtraNamedCodeVariableView } from './WiredExtraNamedCodeVariableView';

/** AIR's quest chain variable (QuestChainVariable): the variable's name and the chain's code (500 characters). */
export const WiredExtraQuestChainView: FC<{}> = () => (
    <NativeTextTree>
        <WiredExtraNamedCodeVariableView codeTitleKey="wiredfurni.params.variables.quest_chain_name" maxCodeLength={500} />
    </NativeTextTree>
);
