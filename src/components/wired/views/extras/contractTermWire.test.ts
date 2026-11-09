import { describe, expect, it } from 'vitest';
import {
    CONTRACT_DIR_PAY,
    CONTRACT_DIR_RECEIVE,
    CONTRACT_KIND_CURRENCY,
    CONTRACT_KIND_FURNI,
    CONTRACT_RULES_FORMAT,
    ContractTermRow,
    parseContractRules,
    serializeContractRules,
} from './contractTermWire';

const row = (patch: Partial<ContractTermRow>): ContractTermRow => ({
    direction: CONTRACT_DIR_PAY,
    kind: CONTRACT_KIND_CURRENCY,
    currencyType: -1,
    wallItem: false,
    baseItemId: 0,
    amount: 1,
    ...patch,
});

describe('contract requirement wire', () => {
    // This exact array is pinned on the server too, in InteractionWiredContractRulesTest. The dialog
    // and the contract used to disagree about the shape of a term, and the only symptom was that a
    // saved contract came back empty -- so the agreement is worth stating in both languages.
    it('writes the shape the server reads back', () => {
        const { intParams } = serializeContractRules({
            giveRules: [
                [row({ kind: CONTRACT_KIND_FURNI, baseItemId: 1389, amount: 2 }), row({ currencyType: -1, amount: 5 })],
                [row({ kind: CONTRACT_KIND_FURNI, baseItemId: 4242, amount: 1 })],
            ],
            getRule: [row({ direction: CONTRACT_DIR_RECEIVE, currencyType: 0, amount: 9 })],
        });

        expect(intParams).toEqual([
            CONTRACT_RULES_FORMAT,
            2,
            2, CONTRACT_KIND_FURNI, 0, 0, 1389, 2, CONTRACT_KIND_CURRENCY, -1, 0, 0, 5,
            1, CONTRACT_KIND_FURNI, 0, 0, 4242, 1,
            1, CONTRACT_KIND_CURRENCY, 0, 0, 0, 9,
        ]);
    });

    it('reads back everything it wrote', () => {
        const original = {
            giveRules: [
                [row({ kind: CONTRACT_KIND_FURNI, baseItemId: 1389, amount: 2 }), row({ amount: 5 })],
                [row({ kind: CONTRACT_KIND_FURNI, baseItemId: 4242, amount: 1 })],
            ],
            getRule: [row({ direction: CONTRACT_DIR_RECEIVE, currencyType: 0, amount: 9 })],
        };

        const { intParams, stringParam } = serializeContractRules(original);
        const parsed = parseContractRules(intParams, stringParam);

        expect(parsed.giveRules).toHaveLength(2);
        expect(parsed.giveRules[0]).toHaveLength(2);
        expect(parsed.giveRules[0][0].baseItemId).toBe(1389);
        expect(parsed.giveRules[0][1].amount).toBe(5);
        expect(parsed.giveRules[1][0].baseItemId).toBe(4242);
        expect(parsed.getRule[0].amount).toBe(9);
        expect(parsed.getRule[0].direction).toBe(CONTRACT_DIR_RECEIVE);
    });

    it('reads a contract saved before alternatives existed as a single option', () => {
        // The old flat shape: [count, (direction, currencyType, amount)*]. Every paying term was
        // required together, so they are one option -- reading them as several would make the
        // contract cheaper than its owner set it.
        const parsed = parseContractRules([3, 0, -1, 5, 0, 0, 2, 1, -1, 9], '');

        expect(parsed.giveRules).toHaveLength(1);
        expect(parsed.giveRules[0]).toHaveLength(2);
        expect(parsed.giveRules[0][0].currencyType).toBe(-1);
        expect(parsed.giveRules[0][0].amount).toBe(5);
        expect(parsed.getRule).toHaveLength(1);
        expect(parsed.getRule[0].amount).toBe(9);
    });

    it('drops rows that ask for nothing rather than sending them', () => {
        const { intParams } = serializeContractRules({
            giveRules: [[row({ amount: 0 }), row({ amount: 4 })]],
            getRule: [],
        });

        expect(intParams).toEqual([CONTRACT_RULES_FORMAT, 1, 1, CONTRACT_KIND_CURRENCY, -1, 0, 0, 4, 0]);
    });

    it('keeps a wall item poster id attached to its own row across the grouping', () => {
        const { intParams, stringParam } = serializeContractRules({
            giveRules: [
                [row({ kind: CONTRACT_KIND_FURNI, wallItem: true, baseItemId: 77, posterId: 'a', amount: 1 })],
                [row({ kind: CONTRACT_KIND_FURNI, wallItem: true, baseItemId: 88, posterId: 'b', amount: 1 })],
            ],
            getRule: [],
        });

        const parsed = parseContractRules(intParams, stringParam);

        expect(parsed.giveRules[0][0].posterId).toBe('a');
        expect(parsed.giveRules[1][0].posterId).toBe('b');
    });

    it('answers an empty payload with one empty option rather than nothing', () => {
        const parsed = parseContractRules([], '');

        expect(parsed.giveRules).toHaveLength(1);
        expect(parsed.giveRules[0]).toHaveLength(0);
        expect(parsed.getRule).toHaveLength(0);
    });
});
