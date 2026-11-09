import type { IWiredLinkNetwork } from '@octane/renderer';

/** The network id of "not connected". */
export const WIRED_LINK_NO_NETWORK = '0';

/** AIR WiredLinkController.validName: at most 255 characters with something that is not blank. */
export const WIRED_LINK_NAME_MAX_LENGTH = 255;

export const WIRED_LINK_OPERATION_SAVE = 1;
export const WIRED_LINK_OPERATION_CREATE = 2;
export const WIRED_LINK_OPERATION_RENAME = 3;
export const WIRED_LINK_OPERATION_DELETE = 4;
export const WIRED_LINK_OPERATION_CONNECTIONS = 5;

export const WIRED_LINK_RESULT_INVALID_NAME = 3;
export const WIRED_LINK_RESULT_CANNOT_CONNECT = 5;

export const isValidWiredLinkName = (name: string): boolean => (name.length <= WIRED_LINK_NAME_MAX_LENGTH) && /\S/.test(name);

/**
 * AIR WiredLinkController.canConnect: "no network" is always allowed; another network only when no other Link of
 * this room is on it (it may be this Link's own network).
 */
export const canConnectWiredLink = (networks: readonly IWiredLinkNetwork[], networkId: string, selectedNetworkId: string): boolean =>
{
    if(networkId === WIRED_LINK_NO_NETWORK) return true;

    const network = networks.find(entry => (entry.id === networkId));

    return !!network && (!network.linkedInCurrentRoom || (networkId === selectedNetworkId));
};

/** AIR WiredLinkNetworkTableObject.compare: networks linked in this room first, then by name. */
export const sortWiredLinkNetworks = (networks: readonly IWiredLinkNetwork[]): IWiredLinkNetwork[] =>
    [ ...networks ].sort((a, b) =>
    {
        if(a.linkedInCurrentRoom !== b.linkedInCurrentRoom) return a.linkedInCurrentRoom ? -1 : 1;

        return a.name.localeCompare(b.name);
    });

/** Merges the networks a result names into the list, after dropping the removed one. */
export const mergeWiredLinkNetworks = (current: readonly IWiredLinkNetwork[], removedNetworkId: string, changed: readonly IWiredLinkNetwork[]): IWiredLinkNetwork[] =>
{
    const networks = current.filter(network => (network.id !== removedNetworkId));

    for(const network of changed)
    {
        const index = networks.findIndex(entry => (entry.id === network.id));

        if(index < 0) networks.push(network);
        else networks[index] = network;
    }

    return networks;
};

/** The official English texts for the status keys, for hotels whose texts lack them. */
export const WIRED_LINK_FALLBACKS: Readonly<Record<string, string>> = {
    'wiredlink.error.1': 'Only the furniture owner can configure this Link.',
    'wiredlink.error.2': 'This network no longer exists or does not belong to you.',
    'wiredlink.error.3': 'Enter a network name containing text, with no more than 255 characters.',
    'wiredlink.error.4': 'You already have a network with that name. Please choose another.',
    'wiredlink.error.5': 'Another Link is already connected to this network in this room.',
    'wiredlink.error.6': 'The network identifier is invalid. Close and reopen this Link to refresh it.',
    'wiredlink.error.7': 'This Link is no longer available in the room.',
    'wiredlink.error.8': 'You have reached the network limit for your account. Delete an unused network before creating another.',
    'wiredlink.deleted': 'This network was deleted. Its Links have been disconnected.',
    'wiredlink.receive.local.info': 'This Link will receive its own messages and dataframes without a network. Connect a network when you want to exchange messages with other rooms.'
};
