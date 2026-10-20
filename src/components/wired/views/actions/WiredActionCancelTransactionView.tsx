import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { Radio } from '../../../../common/Radio';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

export const CANCEL_MATCH_SPECIFIC_CONTRACT = 0;
export const CANCEL_MATCH_ANY = 1;
const SOURCE_SELECTED = 100;

const MATCH_LABELS = ['Specific contract', 'Any running transaction'];

/**
 * The official Cancel Transaction (48, AIR `chests/class_4137`): the usage note and the match criteria, 0 a
 * negotiation started from one of the contracts of furni slot 0, 1 any running one. Ints `[match criteria]`;
 * the contract picker is disabled while any transaction matches (isInputSourceDisabled).
 */
export const WiredActionCancelTransactionView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setIntParams = null, setSourceTypes = null, setAllowsFurni = null } = useWired();
    const [matchCriteria, setMatchCriteria] = useState(CANCEL_MATCH_SPECIFIC_CONTRACT);
    const [contractSource, setContractSource] = useState(SOURCE_SELECTED);

    useEffect(() => {
        if (!trigger) return;

        setMatchCriteria(trigger.intData?.[0] === CANCEL_MATCH_ANY ? CANCEL_MATCH_ANY : CANCEL_MATCH_SPECIFIC_CONTRACT);
        setContractSource(trigger.furniSourceTypes?.[0] ?? SOURCE_SELECTED);
    }, [trigger]);

    const picking = matchCriteria === CANCEL_MATCH_SPECIFIC_CONTRACT && contractSource === SOURCE_SELECTED;

    useEffect(() => {
        setAllowsFurni?.(picking ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [picking, setAllowsFurni]);

    const save = () => {
        setIntParams([matchCriteria]);
        setSourceTypes?.({ furni: [contractSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            selectionPreview={
                <fieldset disabled={matchCriteria === CANCEL_MATCH_ANY}>
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.furni.title"
                        options={FURNI_SOURCES}
                        value={contractSource}
                        selectionKind="primary"
                        selectionActive={picking}
                        selectionCount={furniIds.length}
                        selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                        selectionEnabledValues={[SOURCE_SELECTED]}
                        onChange={setContractSource}
                    />
                </fieldset>
            }
        >
            <Text small className="whitespace-pre-line">
                {localizeWithFallback(
                    'wiredfurni.params.cancel_transaction.usage_info',
                    'Cancels a running payment or trade. Stack "Initiate Transaction" on top of this box to replace a running transaction.'
                ).replace(/\\n/g, '\n')}
            </Text>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.cancel_transaction.match_criteria', 'Cancel transaction:')}</Text>
                {[CANCEL_MATCH_SPECIFIC_CONTRACT, CANCEL_MATCH_ANY].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <Radio name="cancelTransactionMatch" checked={matchCriteria === value} onCheckedChange={() => setMatchCriteria(value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.cancel_transaction.match_criteria.${value}`, MATCH_LABELS[value])}</Text>
                    </label>
                ))}
            </div>
        </WiredActionBaseView>
    );
};
