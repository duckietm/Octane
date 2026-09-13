import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Text } from '../../../common';

// Comparison operators for wired chest conditions.
//
// The VALUE encoding matches the official Habbo wired comparator (deobfuscated
// `ChestHasAmount`) AND the fork server switch in
// WiredConditionChestHasItems / WiredConditionChestHasItemType.java. The server
// maps by VALUE, never by order — so these numbers are the wire contract:
//   0 = <    1 = =    2 = >    3 = <=    4 = !=    5 = >=
// (NOTE: the wired VARIABLE family numbers the same six operators differently.
// That encoding lives in WiredVariableComparisonOperator and is the one the
// variable boxes and the user-level condition speak. The two are not
// interchangeable: sending a value from here to a variable box selects a
// different operator on the server.)
export const WIRED_CMP_LESS = 0;
export const WIRED_CMP_EQUAL = 1;
export const WIRED_CMP_GREATER = 2;
export const WIRED_CMP_LESS_EQUAL = 3;
export const WIRED_CMP_NOT_EQUAL = 4;
export const WIRED_CMP_GREATER_EQUAL = 5;

// Default preserves the chest conditions' historical hard-coded ">=" behaviour.
export const WIRED_CMP_DEFAULT = WIRED_CMP_GREATER_EQUAL;

const VALID_VALUES = [WIRED_CMP_LESS, WIRED_CMP_EQUAL, WIRED_CMP_GREATER, WIRED_CMP_LESS_EQUAL, WIRED_CMP_NOT_EQUAL, WIRED_CMP_GREATER_EQUAL];

export const normalizeWiredComparison = (value: number): number => (VALID_VALUES.includes(value) ? value : WIRED_CMP_DEFAULT);

// Official display order: >  >=  =  <=  <  !=
const OPTIONS: { value: number; symbol: string }[] = [
    { value: WIRED_CMP_GREATER, symbol: '>' },
    { value: WIRED_CMP_GREATER_EQUAL, symbol: '≥' },
    { value: WIRED_CMP_EQUAL, symbol: '=' },
    { value: WIRED_CMP_LESS_EQUAL, symbol: '≤' },
    { value: WIRED_CMP_LESS, symbol: '<' },
    { value: WIRED_CMP_NOT_EQUAL, symbol: '≠' },
];

interface WiredComparisonOperatorProps {
    name: string;
    value: number;
    onChange: (value: number) => void;
    title?: string;
}

export const WiredComparisonOperator: FC<WiredComparisonOperatorProps> = ({ name, value, onChange, title }) => (
    <div className="flex flex-col gap-1">
        <Text bold>{title ?? localizeWithFallback('wiredfurni.chest.comparison', 'Comparison')}</Text>
        <div className="flex flex-wrap gap-2">
            {OPTIONS.map((option) => (
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
