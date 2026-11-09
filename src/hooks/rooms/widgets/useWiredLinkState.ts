// WIRED Link window state (AIR WiredLinkController / WiredLinkView / WiredLinkConnectionsView).
import {
    IWiredLinkConnection,
    IWiredLinkNetwork,
    RoomEngineEvent,
    RoomSessionEvent,
    WiredLinkConfigurationEvent,
    WiredLinkConnectionsEvent,
    WiredLinkNetworkInvalidatedEvent,
    WiredLinkOpenEvent,
    WiredLinkOperationResultEvent,
    WiredLinkRequestConfigComposer
} from '@octane/renderer';
import { GetRoomSession, IsOwnerOfFloorFurniture, SendMessageComposer } from '../../../api';
import { mergeWiredLinkNetworks, WIRED_LINK_NO_NETWORK, WIRED_LINK_OPERATION_CONNECTIONS, WIRED_LINK_OPERATION_CREATE, WIRED_LINK_OPERATION_DELETE, WIRED_LINK_OPERATION_RENAME, WIRED_LINK_OPERATION_SAVE } from '../../../api/wired/WiredLink';
import { createOctaneStore } from '../../../state/createOctaneStore';
import { useMessageEvent, useOctaneEvent } from '../../events';

export interface IWiredLinkStatus
{
    key: string;
    error: boolean;
}

export interface IWiredLinkConnectionsState
{
    networkId: string;
    loading: boolean;
    errorCode: number;
    connections: IWiredLinkConnection[];
}

export interface IWiredLinkResultInput
{
    operation: number;
    hasConfiguration: boolean;
    selectedNetworkId: string;
    receiveLocal: boolean;
    removedNetworkId: string;
    networks: IWiredLinkNetwork[];
}

export type WiredLinkState = {
    isOpen: boolean;
    roomId: number;
    furniId: number;
    networks: IWiredLinkNetwork[];
    /** The network the Link is connected to (as saved). */
    selectedNetworkId: string;
    receiveLocal: boolean;
    /** The receive flag as saved, restored when a save fails. */
    savedReceiveLocal: boolean;
    status: IWiredLinkStatus | null;
    /** Bumped on each successful create / rename, so the name fields clear once per success. */
    createCount: number;
    renameCount: number;
    connections: IWiredLinkConnectionsState | null;
    showReceiveLocalInfo: boolean;
};

export type WiredLinkActions = {
    applyConfiguration(roomId: number, furniId: number, selectedNetworkId: string, receiveLocal: boolean, networks: IWiredLinkNetwork[]): void;
    applyOperationResult(result: IWiredLinkResultInput): void;
    failOperation(resultCode: number, operation: number): void;
    applyInvalidated(networkId: string): void;
    applyConnections(networkId: string, connections: IWiredLinkConnection[]): void;
    openConnections(networkId: string): void;
    closeConnections(): void;
    closeWiredLink(): void;
    setReceiveLocal(receiveLocal: boolean): void;
    setStatus(status: IWiredLinkStatus | null): void;
    setShowReceiveLocalInfo(show: boolean): void;
};

const INITIAL_STATE: WiredLinkState = {
    isOpen: false,
    roomId: 0,
    furniId: 0,
    networks: [],
    selectedNetworkId: WIRED_LINK_NO_NETWORK,
    receiveLocal: false,
    savedReceiveLocal: false,
    status: null,
    createCount: 0,
    renameCount: 0,
    connections: null,
    showReceiveLocalInfo: false
};

/** AIR WiredLinkController.matchesTarget: a packet belongs to the window that is open. */
export const isWiredLinkTarget = (state: WiredLinkState, roomId: number, furniId: number): boolean =>
    state.isOpen && (state.roomId === roomId) && (state.furniId === furniId);

export const useWiredLinkStore = createOctaneStore<WiredLinkState & WiredLinkActions>()(set => ({
    ...INITIAL_STATE,

    applyConfiguration: (roomId, furniId, selectedNetworkId, receiveLocal, networks) => set({
        ...INITIAL_STATE,
        isOpen: true,
        roomId,
        furniId,
        networks,
        selectedNetworkId,
        receiveLocal,
        savedReceiveLocal: receiveLocal
    }),

    applyOperationResult: result => set(state =>
    {
        const connections = state.connections;
        let nextConnections = connections;

        if(connections && (connections.networkId === result.removedNetworkId)) nextConnections = null;
        else if(connections && (result.operation === WIRED_LINK_OPERATION_RENAME)) nextConnections = { ...connections, errorCode: 0 };

        return {
            networks: mergeWiredLinkNetworks(state.networks, result.removedNetworkId, result.networks),
            selectedNetworkId: result.hasConfiguration ? result.selectedNetworkId : (state.selectedNetworkId === result.removedNetworkId ? WIRED_LINK_NO_NETWORK : state.selectedNetworkId),
            receiveLocal: result.hasConfiguration ? result.receiveLocal : state.receiveLocal,
            savedReceiveLocal: result.hasConfiguration ? result.receiveLocal : state.savedReceiveLocal,
            status: null,
            connections: nextConnections,
            createCount: state.createCount + ((result.operation === WIRED_LINK_OPERATION_CREATE) ? 1 : 0),
            renameCount: state.renameCount + ((result.operation === WIRED_LINK_OPERATION_RENAME) ? 1 : 0)
        };
    }),

    // AIR WiredLinkView.operationFailed: rename, delete and connections errors show in the connections window.
    failOperation: (resultCode, operation) => set(state =>
    {
        const connections = state.connections;
        const onConnections = !!connections && (((operation === WIRED_LINK_OPERATION_RENAME) && (connections.networkId !== WIRED_LINK_NO_NETWORK)) || (operation === WIRED_LINK_OPERATION_DELETE) || (operation === WIRED_LINK_OPERATION_CONNECTIONS));

        return {
            receiveLocal: (operation === WIRED_LINK_OPERATION_SAVE) ? state.savedReceiveLocal : state.receiveLocal,
            status: onConnections ? state.status : { key: `wiredlink.error.${ resultCode }`, error: true },
            connections: onConnections ? { ...connections, loading: false, errorCode: resultCode } : connections
        };
    }),

    applyInvalidated: networkId => set(state => ({
        networks: state.networks.filter(network => (network.id !== networkId)),
        selectedNetworkId: (state.selectedNetworkId === networkId) ? WIRED_LINK_NO_NETWORK : state.selectedNetworkId,
        connections: (state.connections?.networkId === networkId) ? null : state.connections,
        status: { key: 'wiredlink.deleted', error: false }
    })),

    applyConnections: (networkId, connections) => set(state =>
        ((state.connections?.networkId === networkId) && state.connections.loading)
            ? { connections: { networkId, loading: false, errorCode: 0, connections }, status: null }
            : state),

    openConnections: networkId => set({ connections: { networkId, loading: true, errorCode: 0, connections: [] } }),

    closeConnections: () => set({ connections: null }),

    closeWiredLink: () => set({ ...INITIAL_STATE }),

    setReceiveLocal: receiveLocal => set({ receiveLocal }),

    setStatus: status => set({ status }),

    setShowReceiveLocalInfo: show => set({ showReceiveLocalInfo: show })
}));

/** AIR WiredLinkController.ownsTarget: the Link stands in the active room and belongs to the viewer. */
export const ownsWiredLink = (roomId: number, furniId: number): boolean =>
    (GetRoomSession()?.roomId === roomId) && IsOwnerOfFloorFurniture(furniId);

/** Feeds the store from the five link packets and closes the window with the room. */
export const useWiredLinkEvents = () =>
{
    useMessageEvent<WiredLinkOpenEvent>(WiredLinkOpenEvent, event =>
    {
        const parser = event.getParser();

        if(!parser || !IsOwnerOfFloorFurniture(parser.furniId)) return;

        SendMessageComposer(new WiredLinkRequestConfigComposer(parser.furniId));
    });

    useMessageEvent<WiredLinkConfigurationEvent>(WiredLinkConfigurationEvent, event =>
    {
        const parser = event.getParser();

        if(!parser || !ownsWiredLink(parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyConfiguration(parser.roomId, parser.furniId, parser.selectedNetworkId, parser.receiveLocal, [ ...parser.networks ]);
    });

    useMessageEvent<WiredLinkOperationResultEvent>(WiredLinkOperationResultEvent, event =>
    {
        const parser = event.getParser();
        const state = useWiredLinkStore.getState();

        if(!parser || !isWiredLinkTarget(state, parser.roomId, parser.furniId)) return;

        if(parser.resultCode !== 0) state.failOperation(parser.resultCode, parser.operation);
        else state.applyOperationResult({
            operation: parser.operation,
            hasConfiguration: parser.hasConfiguration,
            selectedNetworkId: parser.selectedNetworkId,
            receiveLocal: parser.receiveLocal,
            removedNetworkId: parser.removedNetworkId,
            networks: [ ...parser.networks ]
        });
    });

    useMessageEvent<WiredLinkConnectionsEvent>(WiredLinkConnectionsEvent, event =>
    {
        const parser = event.getParser();

        if(!parser || !isWiredLinkTarget(useWiredLinkStore.getState(), parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyConnections(parser.networkId, [ ...parser.connections ]);
    });

    useMessageEvent<WiredLinkNetworkInvalidatedEvent>(WiredLinkNetworkInvalidatedEvent, event =>
    {
        const parser = event.getParser();

        if(!parser || !isWiredLinkTarget(useWiredLinkStore.getState(), parser.roomId, parser.furniId)) return;

        useWiredLinkStore.getState().applyInvalidated(parser.deletedNetworkId);
    });

    useOctaneEvent<RoomSessionEvent>([ RoomSessionEvent.STARTED, RoomSessionEvent.ENDED ], () => useWiredLinkStore.getState().closeWiredLink());
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => useWiredLinkStore.getState().closeWiredLink());
};
