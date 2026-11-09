// Official contract editor state (AIR WiredContractController).
import {
    GetWiredContractContentsComposer,
    IWiredContractContents,
    RoomEngineEvent,
    RoomSessionEvent,
    UpdateWiredContractComposer,
    WiredContractContentsEvent,
    WiredContractOpenEvent,
    WiredContractUpdateResultEvent
} from '@octane/renderer';
import { SendMessageComposer } from '../../../api';
import { canShowWiredContract, cloneWiredContractContents, finalizeWiredContract } from '../../../api/wired/WiredContract';
import { createOctaneStore } from '../../../state/createOctaneStore';
import { useMessageEvent, useOctaneEvent } from '../../events';

export type WiredContractState = {
    /** AIR WiredContractController._requestedContractId: the contract the server opened, -1 for none. */
    requestedId: number;
    contents: IWiredContractContents | null;
    /** Bumped on every contents packet, so the editor starts again from what the server sent. */
    generation: number;
    saving: boolean;
    /** The localization key of a refused save (AIR alerts `wiredcontracts.error.<code>`). */
    errorKey: string | null;
};

export type WiredContractActions = {
    open(contractId: number): void;
    applyContents(contents: IWiredContractContents): boolean;
    applyResult(contractId: number, success: boolean, failCode: string): void;
    startSave(): void;
    clearError(): void;
    close(): void;
};

const INITIAL_STATE: WiredContractState = { requestedId: -1, contents: null, generation: 0, saving: false, errorKey: null };

export const useWiredContractStore = createOctaneStore<WiredContractState & WiredContractActions>()(set => ({
    ...INITIAL_STATE,

    // AIR onOpenContract: remember the id and ask for the contents; the open frames stay until those arrive.
    open: contractId => set({ requestedId: contractId }),

    // AIR onContractContents: only the contract that was asked for opens, and it replaces whatever was open.
    applyContents: contents =>
    {
        let applied = false;

        set(state =>
        {
            if(contents.contractId !== state.requestedId || !canShowWiredContract(contents)) return state;

            applied = true;

            return { requestedId: -1, contents: cloneWiredContractContents(contents), generation: state.generation + 1, saving: false, errorKey: null };
        });

        return applied;
    },

    // AIR onContractUpdateResult: success closes the frames, a failure shows the fail code.
    applyResult: (contractId, success, failCode) => set(state =>
    {
        if(!state.contents || state.contents.contractId !== contractId) return state;
        if(success) return { ...INITIAL_STATE, generation: state.generation };

        return { saving: false, errorKey: `wiredcontracts.error.${ failCode || 'invalid_rules' }` };
    }),

    startSave: () => set({ saving: true, errorKey: null }),

    clearError: () => set({ errorKey: null }),

    close: () => set(state => ({ ...INITIAL_STATE, generation: state.generation }))
}));

/** Sends the editor's draft (AIR WiredContractController.saveContract). */
export const saveWiredContract = (draft: IWiredContractContents): void =>
{
    const state = useWiredContractStore.getState();

    if(state.saving || !state.contents || draft.contractId !== state.contents.contractId) return;

    state.startSave();
    SendMessageComposer(new UpdateWiredContractComposer(finalizeWiredContract(draft)));
};

/** Feeds the store from the three contract packets and closes the editor with the room. */
export const useWiredContractEvents = () =>
{
    useMessageEvent<WiredContractOpenEvent>(WiredContractOpenEvent, event =>
    {
        const parser = event.getParser();

        if(!parser || parser.contractId === 0) return;

        useWiredContractStore.getState().open(parser.contractId);
        SendMessageComposer(new GetWiredContractContentsComposer(parser.contractId));
    });

    useMessageEvent<WiredContractContentsEvent>(WiredContractContentsEvent, event =>
    {
        const parser = event.getParser();

        if(!parser) return;

        useWiredContractStore.getState().applyContents(parser);
    });

    useMessageEvent<WiredContractUpdateResultEvent>(WiredContractUpdateResultEvent, event =>
    {
        const parser = event.getParser();

        if(!parser) return;

        useWiredContractStore.getState().applyResult(parser.contractId, parser.isSuccess, parser.failCode);
    });

    useOctaneEvent<RoomSessionEvent>([ RoomSessionEvent.STARTED, RoomSessionEvent.ENDED ], () => useWiredContractStore.getState().close());
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => useWiredContractStore.getState().close());
};
