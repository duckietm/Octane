import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import {
    CONTRACT_DIR_PAY,
    CONTRACT_DIR_RECEIVE,
    ContractTermRow,
    emptyRow,
    parseContractRules,
    serializeContractRules,
} from './contractTermWire';
import { WiredContractRulesEditor } from './WiredContractRulesEditor';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** Custom: the unconstrained one — both halves, both editable, alternatives on the paying side. */
export const WiredCustomContractView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [giveRules, setGiveRules] = useState<ContractTermRow[][]>([[emptyRow(CONTRACT_DIR_PAY)]]);
    const [getRule, setGetRule] = useState<ContractTermRow[]>([]);

    useEffect(() => {
        if (!trigger) return;

        const parsed = parseContractRules(trigger.intData ?? [], trigger.stringData ?? '');
        setGiveRules(parsed.giveRules.length ? parsed.giveRules : [[emptyRow(CONTRACT_DIR_PAY)]]);
        setGetRule(parsed.getRule);
    }, [trigger]);

    const save = () => {
        const payload = serializeContractRules({ giveRules, getRule });
        setIntParams(payload.intParams);
        setStringParam(payload.stringParam);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} cardStyle={{ width: 420 }}>
            <div className="flex flex-col gap-2">
                <Text bold>The user PAYS:</Text>
                <WiredContractRulesEditor direction={CONTRACT_DIR_PAY} rules={giveRules} onChange={setGiveRules} />
                <div className="octane-wired__divider" />
                <Text bold>The user RECEIVES:</Text>
                <WiredContractRulesEditor
                    allowAlternatives={false}
                    direction={CONTRACT_DIR_RECEIVE}
                    rules={[getRule]}
                    onChange={(rules) => setGetRule(rules[0] ?? [])}
                />
                <Text small>Leave the receive side empty for a contract that only takes.</Text>
            </div>
        </WiredExtraBaseView>
    );
};
