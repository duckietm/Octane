import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { CONTRACT_DIR_PAY, ContractTermRow, emptyRow, parseContractRules, serializeContractRules } from './contractTermWire';
import { WiredContractRulesEditor } from './WiredContractRulesEditor';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/** Payment: the player gives something and gets nothing back through the contract itself. */
export const WiredContractPaymentView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [giveRules, setGiveRules] = useState<ContractTermRow[][]>([[emptyRow(CONTRACT_DIR_PAY)]]);

    useEffect(() => {
        if (!trigger) return;

        const parsed = parseContractRules(trigger.intData ?? [], trigger.stringData ?? '');
        setGiveRules(parsed.giveRules.length ? parsed.giveRules : [[emptyRow(CONTRACT_DIR_PAY)]]);
    }, [trigger]);

    const save = () => {
        const payload = serializeContractRules({ giveRules, getRule: [] });
        setIntParams(payload.intParams);
        setStringParam(payload.stringParam);
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <Text bold>The user must PAY:</Text>
                    <WiredContractRulesEditor direction={CONTRACT_DIR_PAY} rules={giveRules} onChange={setGiveRules} />
                    <Text small>Each option is an alternative — the player pays whichever one they can.</Text>
                    <Text small>Optional: pick a chest above to deposit the payment into (else it is removed).</Text>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
