import { FurnitureType, IFurnitureData, IWiredContractContents } from '@octane/renderer';
import { describe, expect, it } from 'vitest';
import {
    canShowWiredContract,
    createWiredContractNode,
    editableWiredContract,
    filterWiredContractCandidates,
    finalizeWiredContract,
    validateWiredContractElement,
    WIRED_CONTRACT_POSTER_IDS,
    wiredContractCandidates,
    wiredContractHasCreditNode
} from './WiredContract';

const payment = (): IWiredContractContents => ({
    contractId: 42,
    contractType: 0,
    definition: { youGiveRule: [ { nodes: [ { type: 0, amount: 7, itemType: null } ] } ], youGetRule: null },
    paymentMode: 1,
    receiveText: 'A cookie',
    layoutType: 'generic',
    rewardCategory: 11,
    showDialog: false,
    rewardText: ''
});

const furni = (id: number, className: string, name: string, type: string, tradeable = true) =>
    ({ id, className, fullName: className, name, type, tradeable } as unknown as IFurnitureData);

describe('AIR contract editor helpers', () =>
{
    it('opens only a contract whose type has the rules it needs (AIR *Contract.show)', () =>
    {
        expect(canShowWiredContract(payment())).toBe(true);
        expect(canShowWiredContract({ ...payment(), definition: { youGiveRule: null, youGetRule: null } })).toBe(false);
        expect(canShowWiredContract({ ...payment(), contractType: 1 })).toBe(false);
        expect(canShowWiredContract({ ...payment(), contractType: 2, definition: { youGiveRule: null, youGetRule: { nodes: [] } } })).toBe(true);
    });

    it('shows one empty payment option for an empty list and drops empty options when saving', () =>
    {
        const empty = { ...payment(), definition: { youGiveRule: [], youGetRule: null } };

        expect(editableWiredContract(empty).definition.youGiveRule).toEqual([ { nodes: [] } ]);
        expect(finalizeWiredContract(editableWiredContract(empty)).definition.youGiveRule).toEqual([]);
        expect(empty.definition.youGiveRule).toEqual([]);
    });

    it('enables the earnings category only with a credit node', () =>
    {
        expect(wiredContractHasCreditNode({ nodes: [ { type: 0, amount: 1, itemType: null } ] })).toBe(true);
        expect(wiredContractHasCreditNode({ nodes: [ { type: 1, amount: 1, itemType: { isWallItem: false, typeId: 1, legacyPosterId: '' } } ] })).toBe(false);
        expect(wiredContractHasCreditNode(null)).toBe(false);
    });

    it('validates elements with the AIR limits and tradeability', () =>
    {
        const chair = { itemType: { isWallItem: false, typeId: 1, legacyPosterId: '' }, code: 'chair', name: 'Chair', tradeable: true };

        expect(validateWiredContractElement(0, 100000, null)).toBeNull();
        expect(validateWiredContractElement(0, 100001, null)).toBe('wiredcontracts.element.amount');
        expect(validateWiredContractElement(0, 0, null)).toBe('wiredcontracts.element.amount');
        expect(validateWiredContractElement(1, 500, chair)).toBeNull();
        expect(validateWiredContractElement(1, 501, chair)).toBe('wiredcontracts.element.too_many_items');
        expect(validateWiredContractElement(1, 1, null)).toBe('wiredcontracts.element.item_not_allowed');
        expect(validateWiredContractElement(1, 1, { ...chair, tradeable: false })).toBe('wiredcontracts.element.item_not_allowed');
        expect(createWiredContractNode(0, 5, chair.itemType)).toEqual({ type: 0, amount: 5, itemType: null });
    });

    it('lists floor and wall furni sorted by name and every legacy poster as its own row', () =>
    {
        const candidates = wiredContractCandidates([
            furni(1, 'chair', 'Zebra chair', FurnitureType.FLOOR),
            furni(2, 'lamp', 'A lamp', FurnitureType.FLOOR),
            furni(3, 'poster', 'Poster', FurnitureType.WALL),
            furni(4, '', 'Nameless', FurnitureType.FLOOR)
        ], key => `[${ key }]`);

        expect(candidates).toHaveLength(2 + WIRED_CONTRACT_POSTER_IDS.length);
        expect(candidates.find(candidate => candidate.code === 'poster*2008')).toMatchObject({ name: '[poster_2008_name]', itemType: { isWallItem: true, typeId: 3, legacyPosterId: '2008' } });
        expect(candidates.findIndex(candidate => candidate.code === 'lamp')).toBeLessThan(candidates.findIndex(candidate => candidate.code === 'chair'));
    });

    it('filters from two characters on, on the lower-case name or the code', () =>
    {
        const candidates = wiredContractCandidates([ furni(1, 'chair_basic', 'Basic Chair', FurnitureType.FLOOR), furni(2, 'lamp', 'Lamp', FurnitureType.FLOOR) ]);

        expect(filterWiredContractCandidates(candidates, 'c')).toHaveLength(2);
        expect(filterWiredContractCandidates(candidates, 'CHAIR').map(candidate => candidate.code)).toEqual([ 'chair_basic' ]);
        expect(filterWiredContractCandidates(candidates, 'amp').map(candidate => candidate.code)).toEqual([ 'lamp' ]);
    });
});
