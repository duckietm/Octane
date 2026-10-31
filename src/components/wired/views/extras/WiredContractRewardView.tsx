import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { CONTRACT_DIR_RECEIVE, ContractTermRow, emptyRow, parseContractRules, serializeContractRules } from './contractTermWire';
import { WiredContractRulesEditor } from './WiredContractRulesEditor';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** Reward: the player is handed something and asked for nothing, so there is nothing to negotiate. */
export const WiredContractRewardView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [getRule, setGetRule] = useState<ContractTermRow[]>([emptyRow(CONTRACT_DIR_RECEIVE)]);

    useEffect(() => {
        if (!trigger) return;

        const parsed = parseContractRules(trigger.intData ?? [], trigger.stringData ?? '');
        setGetRule(parsed.getRule.length ? parsed.getRule : [emptyRow(CONTRACT_DIR_RECEIVE)]);
    }, [trigger]);

    const save = () => {
        const payload = serializeContractRules({ giveRules: [[]], getRule });
        setIntParams(payload.intParams);
        setStringParam(payload.stringParam);
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <Text bold>The user will RECEIVE:</Text>
                    <WiredContractRulesEditor
                        allowAlternatives={false}
                        direction={CONTRACT_DIR_RECEIVE}
                        rules={[getRule]}
                        onChange={(rules) => setGetRule(rules[0] ?? [])}
                    />
                    <Text small>Pick a chest above to source the reward from its pool (else it is minted).</Text>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
