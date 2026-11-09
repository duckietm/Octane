import { describe, expect, it } from 'vitest';
import {
    CUSTOM_CONTRACT_FURNI,
    emptyCustomContractElement,
    isOfficialCustomContractParams,
    readCustomContractElement,
    writeCustomContractElement
} from './WiredCustomContract';

describe('WiredCustomContract (AIR class_4234)', () => {
    it('tells the official ten ints from the free-form rules', () => {
        expect(isOfficialCustomContractParams([])).toBe(true);
        expect(isOfficialCustomContractParams([0, 0, 0, 1, -10, 0, 0, 0, 1, -10])).toBe(true);
        expect(isOfficialCustomContractParams([-1, 1, 1, 0, -1, 0, 0, 5, 0])).toBe(false);
        expect(isOfficialCustomContractParams([3, 0, -1, 1, 0, -1, 2, 1, -1, 3])).toBe(false);
    });

    it('reads an element as AIR onEditStart shows it', () => {
        expect(readCustomContractElement([1, 1, 0, 7, -20], 0, '')).toEqual({
            enabled: true,
            type: CUSTOM_CONTRACT_FURNI,
            fromVariable: false,
            literal: '7',
            target: -20,
            token: ''
        });
        // A variable amount shows the value 1 next to the variable; an element that is off shows 1 and no variable.
        expect(readCustomContractElement([0, 0, 0, 0, 0, 1, 0, 1, 50, -10], 5, 'custom:9')).toMatchObject({ fromVariable: true, literal: '1', token: 'custom:9' });
        expect(readCustomContractElement([0, 0, 1, 50, -10], 0, 'custom:9')).toMatchObject({ enabled: false, fromVariable: false, literal: '1', token: '' });
    });

    it('writes five ints with the amount held to 1..100000', () => {
        expect(writeCustomContractElement({ ...emptyCustomContractElement(), enabled: true, literal: '250000' }, 0)).toEqual([1, 0, 0, 100000, -10]);
        expect(writeCustomContractElement({ ...emptyCustomContractElement(), enabled: true, literal: '' }, 0)).toEqual([1, 0, 0, 1, -10]);
        expect(writeCustomContractElement({ ...emptyCustomContractElement(), enabled: true, fromVariable: true, target: -20 }, 0)).toEqual([1, 0, 0, 1, -20]);
        expect(writeCustomContractElement({ ...emptyCustomContractElement(), enabled: true, fromVariable: true }, 9)).toEqual([1, 0, 1, 1, -10]);
    });
});
