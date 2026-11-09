import { FC } from 'react';
import { Button, Text } from '../../../../common';
import {
    CONTRACT_MAX_NODES,
    CONTRACT_MAX_RULES,
    ContractTermRow,
    emptyRow,
} from './contractTermWire';
import { WiredContractTermRow } from './WiredContractTermRow';
import { localizeWithFallback } from '../../../../api';

interface WiredContractRulesEditorProps {
    /** Alternatives: satisfying any one of them satisfies the contract. */
    rules: ContractTermRow[][];
    direction: number;
    /** Off for the reward side, which is a single rule rather than a set of alternatives. */
    allowAlternatives?: boolean;
    onChange: (rules: ContractTermRow[][]) => void;
}

/**
 * Edits the requirement grammar: rows inside one alternative must all be met, and the alternatives
 * are joined by "or". It is the same shape the player's requirements bubble renders, so what an
 * owner builds here is literally what a visitor reads.
 */
export const WiredContractRulesEditor: FC<WiredContractRulesEditorProps> = ({
    rules,
    direction,
    allowAlternatives = true,
    onChange,
}) => {
    const replaceRule = (index: number, rule: ContractTermRow[]) =>
        onChange(rules.map((existing, position) => (position === index ? rule : existing)));

    const patchRow = (ruleIndex: number, rowIndex: number, patch: Partial<ContractTermRow>) =>
        replaceRule(
            ruleIndex,
            rules[ruleIndex].map((row, position) => (position === rowIndex ? { ...row, ...patch } : row)),
        );

    const addRow = (ruleIndex: number) => replaceRule(ruleIndex, [...rules[ruleIndex], emptyRow(direction)]);

    const removeRow = (ruleIndex: number, rowIndex: number) =>
        replaceRule(
            ruleIndex,
            rules[ruleIndex].filter((unused, position) => position !== rowIndex),
        );

    const addRule = () => onChange([...rules, [emptyRow(direction)]]);

    const removeRule = (index: number) => onChange(rules.filter((unused, position) => position !== index));

    return (
        <div className="flex flex-col gap-2">
            {rules.map((rule, ruleIndex) => (
                <div key={ruleIndex} className="flex flex-col gap-2">
                    {ruleIndex > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-black/10" />
                            <Text small bold>
                                {localizeWithFallback('octane.wired.or', 'or')}
                            </Text>
                            <div className="h-px flex-1 bg-black/10" />
                        </div>
                    )}

                    <div className="flex flex-col gap-2 rounded border border-black/10 p-2">
                        {!rule.length && <Text small>{localizeWithFallback('octane.wired.nothing_in_this_option_yet', 'Nothing in this option yet.')}</Text>}

                        {rule.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-col gap-1">
                                {rowIndex > 0 && <Text small bold>{localizeWithFallback('octane.wired.and', 'and')}</Text>}
                                <WiredContractTermRow row={row} onChange={(patch) => patchRow(ruleIndex, rowIndex, patch)} />
                                <div className="flex justify-end">
                                    <Button variant="danger" onClick={() => removeRow(ruleIndex, rowIndex)}>
                                        {localizeWithFallback('octane.wired.remove', 'Remove')}
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <div className="flex flex-wrap justify-between gap-1">
                            <Button disabled={rule.length >= CONTRACT_MAX_NODES} variant="secondary" onClick={() => addRow(ruleIndex)}>
                                {localizeWithFallback('octane.wired.add_requirement', 'Add requirement')}
                            </Button>
                            {allowAlternatives && rules.length > 1 && (
                                <Button variant="danger" onClick={() => removeRule(ruleIndex)}>
                                    {localizeWithFallback('octane.wired.remove_option', 'Remove option')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {allowAlternatives && (
                <Button disabled={rules.length >= CONTRACT_MAX_RULES} variant="secondary" onClick={addRule}>
                    {localizeWithFallback('octane.wired.add_another_option', 'Add another option')}
                </Button>
            )}
        </div>
    );
};
