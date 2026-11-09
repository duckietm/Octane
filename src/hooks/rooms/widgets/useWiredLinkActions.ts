// WIRED Link window actions (AIR WiredLinkController save / createNetwork / renameNetwork / deleteNetwork /
// getConnections / visitRoom).
import { WiredLinkCreateNetworkComposer, WiredLinkDeleteNetworkComposer, WiredLinkGetConnectionsComposer, WiredLinkRenameNetworkComposer, WiredLinkSaveSelectionComposer } from '@octane/renderer';
import { CreateLinkEvent, SendMessageComposer } from '../../../api';
import { canConnectWiredLink, isValidWiredLinkName, WIRED_LINK_NO_NETWORK, WIRED_LINK_OPERATION_CREATE, WIRED_LINK_OPERATION_RENAME, WIRED_LINK_OPERATION_SAVE, WIRED_LINK_RESULT_CANNOT_CONNECT, WIRED_LINK_RESULT_INVALID_NAME } from '../../../api/wired/WiredLink';
import { ownsWiredLink, useWiredLinkStore } from './useWiredLinkState';

const getState = () => useWiredLinkStore.getState();

/** AIR canEdit: the viewer must still own the Link in the active room; otherwise the window closes. */
const canEdit = (): boolean =>
{
    const state = getState();

    if(!state.isOpen) return false;

    if(ownsWiredLink(state.roomId, state.furniId)) return true;

    state.closeWiredLink();

    return false;
};

const findNetwork = (networkId: string) => getState().networks.find(network => (network.id === networkId)) ?? null;

const validName = (name: string, operation: number): boolean =>
{
    if(isValidWiredLinkName(name)) return true;

    getState().failOperation(WIRED_LINK_RESULT_INVALID_NAME, operation);

    return false;
};

/** Connects the Link to the network ("0" clears it) with the receive flag. */
export const saveWiredLink = (networkId: string, receiveLocal: boolean) =>
{
    if(!canEdit()) return;

    const state = getState();

    if(!canConnectWiredLink(state.networks, networkId, state.selectedNetworkId))
    {
        state.failOperation(WIRED_LINK_RESULT_CANNOT_CONNECT, WIRED_LINK_OPERATION_SAVE);

        return;
    }

    state.setReceiveLocal(receiveLocal);
    SendMessageComposer(new WiredLinkSaveSelectionComposer(state.furniId, networkId, receiveLocal));
};

/** AIR setReceiveLocal: the checkbox saves at once; receiving with no network explains itself. */
export const setWiredLinkReceiveLocal = (receiveLocal: boolean) =>
{
    const { selectedNetworkId, furniId } = getState();

    saveWiredLink(selectedNetworkId, receiveLocal);

    if(receiveLocal && (selectedNetworkId === WIRED_LINK_NO_NETWORK) && furniId) getState().setShowReceiveLocalInfo(true);
};

export const clearWiredLinkConnection = () => saveWiredLink(WIRED_LINK_NO_NETWORK, getState().receiveLocal);

export const createWiredLinkNetwork = (name: string) =>
{
    if(!validName(name, WIRED_LINK_OPERATION_CREATE) || !canEdit()) return;

    SendMessageComposer(new WiredLinkCreateNetworkComposer(getState().furniId, name));
};

export const renameWiredLinkNetwork = (networkId: string, name: string) =>
{
    if(!findNetwork(networkId) || !validName(name, WIRED_LINK_OPERATION_RENAME) || !canEdit()) return;

    SendMessageComposer(new WiredLinkRenameNetworkComposer(getState().furniId, networkId, name));
};

export const deleteWiredLinkNetwork = (networkId: string) =>
{
    if(!findNetwork(networkId) || !canEdit()) return;

    SendMessageComposer(new WiredLinkDeleteNetworkComposer(getState().furniId, networkId));
};

export const requestWiredLinkConnections = (networkId: string) =>
{
    if(!findNetwork(networkId) || !canEdit()) return;

    getState().openConnections(networkId);
    SendMessageComposer(new WiredLinkGetConnectionsComposer(getState().furniId, networkId));
};

export const visitWiredLinkRoom = (roomId: number) => CreateLinkEvent(`navigator/goto/${ roomId }`);
