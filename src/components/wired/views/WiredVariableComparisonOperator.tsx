import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Text } from '../../../common';

// Comparison operators for the wired VARIABLE family.
//
// The server maps by VALUE, never by order, and this encoding is the wire
// contract shared by WiredConditionUserLevel.java, WiredConditionVariableValueMatch.java
// and WiredEffectVariableSelectorBase.java:
//   0 = >    1 = >=    2 = =    3 = <=    4 = <    5 = !=
//
// It is deliberately NOT the chest encoding in WiredComparison.java, which
// WiredComparisonOperator renders. The two are numbered differently and cannot be
// swapped: sending a chest value to a variable-family box silently selects a
// different operator on the server.
export const WIRED_VAR_CMP_GREATER = 0;
export const WIRED_VAR_CMP_GREATER_EQUAL = 1;
export const WIRED_VAR_CMP_EQUAL = 2;
export const WIRED_VAR_CMP_LESS_EQUAL = 3;
export const WIRED_VAR_CMP_LESS = 4;
export const WIRED_VAR_CMP_NOT_EQUAL = 5;

// Mirrors WiredConditionUserLevel.normalizeComparison, fallback included.
export const WIRED_VAR_CMP_DEFAULT = WIRED_VAR_CMP_GREATER_EQUAL;

export const normalizeWiredVariableComparison = (value: number, fallback: number = WIRED_VAR_CMP_DEFAULT): number =>
    value >= WIRED_VAR_CMP_GREATER && value <= WIRED_VAR_CMP_NOT_EQUAL ? value : fallback;

// Official display order: >  >=  =  <=  <  !=
export const WIRED_VAR_CMP_OPTIONS: { value: number; symbol: string }[] = [
    { value: WIRED_VAR_CMP_GREATER, symbol: '>' },
    { value: WIRED_VAR_CMP_GREATER_EQUAL, symbol: '≥' },
    { value: WIRED_VAR_CMP_EQUAL, symbol: '=' },
    { value: WIRED_VAR_CMP_LESS_EQUAL, symbol: '≤' },
    { value: WIRED_VAR_CMP_LESS, symbol: '<' },
    { value: WIRED_VAR_CMP_NOT_EQUAL, symbol: '≠' },
];

interface WiredVariableComparisonOperatorProps {
    name: string;
    value: number;
    onChange: (value: number) => void;
    title?: string;
}

export const WiredVariableComparisonOperator: FC<WiredVariableComparisonOperatorProps> = ({ name, value, onChange, title }) => (
    <div className="flex flex-col gap-1">
        <Text bold>{title ?? localizeWithFallback('wiredfurni.params.comparison_selection', 'Comparison')}</Text>
        <div className="flex flex-wrap gap-2">
            {WIRED_VAR_CMP_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-1">
                    <input
                        type="radio"
                        className="form-check-input"
                        name={name}
                        checked={value === option.value}
                        onChange={() => onChange(option.value)}
                    />
                    <Text>{option.symbol}</Text>
                </label>
            ))}
        </div>
    </div>
);
