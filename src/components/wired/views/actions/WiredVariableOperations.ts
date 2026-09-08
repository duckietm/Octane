import { localizeWithFallback } from '../../../../api';

/**
 * The operator menu of the "change variable value" box, in the order the official client lists it:
 * arithmetic first, then the bitwise family under "advanced". The bit scans answer a bit position or
 * -1; "low" means a cleared bit, "high" a set bit; inclusive scans start at the operand position,
 * exclusive ones a position further on.
 */
export const WIRED_VARIABLE_OPERATIONS: number[] = [
    0, 1, 2, 3, 4, 5, 6, 40, 41, 50, 60, 100, 101, 102, 103, 104, 105, 110, 115, 116, 117, 118, 111, 112, 113, 114, 119, 120, 121, 122
];

/** Operations that ignore the reference value: the server reads only the destination. */
export const WIRED_VARIABLE_UNARY_OPERATIONS: number[] = [60, 103, 110];

const OPERATION_FALLBACKS: Record<number, string> = {
    0: 'Assign',
    1: 'Add',
    2: 'Subtract',
    3: 'Multiply',
    4: 'Divide',
    5: 'Power',
    6: 'Modulo',
    40: 'Set minimum',
    41: 'Set maximum',
    50: 'Random with upper bound',
    60: 'Absolute value',
    100: 'Bitwise AND',
    101: 'Bitwise OR',
    102: 'Bitwise XOR',
    103: 'Bitwise NOT',
    104: 'Left shift (<<)',
    105: 'Right shift (>>)',
    110: 'Bit count',
    111: 'Next Low Bit (Inclusive)',
    112: 'Next High Bit (Inclusive)',
    113: 'Previous Low Bit (Inclusive)',
    114: 'Previous High Bit (Inclusive)',
    115: 'Get Bit',
    116: 'Set Bit',
    117: 'Clear Bit',
    118: 'Toggle Bit',
    119: 'Next Low Bit (Exclusive)',
    120: 'Next High Bit (Exclusive)',
    121: 'Previous Low Bit (Exclusive)',
    122: 'Previous High Bit (Exclusive)'
};

export const localizeWiredVariableOperation = (operation: number): string =>
    localizeWithFallback(`wiredfurni.params.variables.operation.${operation}`, OPERATION_FALLBACKS[operation] ?? `Operation ${operation}`);
