import { IWiredContractContents } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as unknown[]);

vi.mock('../../../api', () => ({ SendMessageComposer: (composer: unknown) => sent.push(composer) }));
vi.mock('@octane/renderer', () => ({
    GetWiredContractContentsComposer: class { constructor(public id: number) {} },
    UpdateWiredContractComposer: class { constructor(public contents: IWiredContractContents) {} },
    WiredContractContentsEvent: class {},
    WiredContractOpenEvent: class {},
    WiredContractUpdateResultEvent: class {},
    RoomEngineEvent: {},
    RoomSessionEvent: {}
}));
vi.mock('../../events', () => ({ useMessageEvent: () => undefined, useOctaneEvent: () => undefined }));

import { saveWiredContract, useWiredContractStore } from './useWiredContractState';

const payment = (contractId = 42): IWiredContractContents => ({
    contractId,
    contractType: 0,
    definition: { youGiveRule: [ { nodes: [ { type: 0, amount: 7, itemType: null } ] }, { nodes: [] } ], youGetRule: null },
    paymentMode: 1,
    receiveText: '',
    layoutType: 'generic',
    rewardCategory: 11,
    showDialog: false,
    rewardText: ''
});

afterEach(() =>
{
    useWiredContractStore.getState().close();
    sent.length = 0;
});

describe('official contract editor state (AIR WiredContractController)', () =>
{
    it('opens only the contract the server opened, once', () =>
    {
        const store = useWiredContractStore.getState();

        expect(store.applyContents(payment())).toBe(false);
        store.open(42);
        expect(store.applyContents(payment(7))).toBe(false);
        expect(store.applyContents(payment())).toBe(true);
        expect(useWiredContractStore.getState().contents?.contractId).toBe(42);
        expect(store.applyContents(payment())).toBe(false);
    });

    it('sends the draft without empty payment options and closes on success', () =>
    {
        const store = useWiredContractStore.getState();

        store.open(42);
        store.applyContents(payment());
        saveWiredContract(payment());

        expect(useWiredContractStore.getState().saving).toBe(true);
        expect((sent[0] as { contents: IWiredContractContents }).contents.definition.youGiveRule).toHaveLength(1);

        saveWiredContract(payment());
        expect(sent).toHaveLength(1);

        store.applyResult(42, true, '');
        expect(useWiredContractStore.getState().contents).toBeNull();
    });

    it('keeps the editor open with the fail code on a refused save', () =>
    {
        const store = useWiredContractStore.getState();

        store.open(42);
        store.applyContents(payment());
        saveWiredContract(payment());
        store.applyResult(7, false, 'invalid_rules');
        expect(useWiredContractStore.getState().saving).toBe(true);

        store.applyResult(42, false, 'invalid_rules');
        expect(useWiredContractStore.getState()).toMatchObject({ saving: false, errorKey: 'wiredcontracts.error.invalid_rules' });
        expect(useWiredContractStore.getState().contents).not.toBeNull();
    });
});
