import { IWiredLinkConnection } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { WIRED_LINK_FALLBACKS } from '../../../../api/wired/WiredLink';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useNotification } from '../../../../hooks';
import { deleteWiredLinkNetwork, renameWiredLinkNetwork, visitWiredLinkRoom } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkAction, WiredLinkColumn, WiredLinkTable } from './WiredLinkTable';
import { BaseButton } from '../../../../common/BaseButton';
import '../../../../css/room/RoomWidgetsSweepAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * AIR WiredLinkConnectionsView (wired_link_connections_view_xml): the Links of one network in every room (room
 * name, room id, Link id, self-receiving, visit), the network's name with Rename, and Delete network behind a
 * confirmation. Keyed by network so a newly opened network starts with its own name.
 */
const WiredLinkConnectionsWindow: FC<{ networkId: string }> = ({ networkId }) =>
{
    const networkName = useWiredLinkStore(state => state.networks.find(network => (network.id === networkId))?.name ?? '');
    const connections = useWiredLinkStore(state => state.connections);
    const renameCount = useWiredLinkStore(state => state.renameCount);
    const closeConnections = useWiredLinkStore(state => state.closeConnections);
    const { showConfirm } = useNotification();
    const [ nameDraft, setNameDraft ] = useState({ seq: -1, text: '' });
    const nameInput = (nameDraft.seq === renameCount) ? nameDraft.text : networkName;
    const loading = connections?.loading ?? false;
    const errorCode = connections?.errorCode ?? 0;
    const rows = loading ? [] : (connections?.connections ?? []);

    const columns: WiredLinkColumn[] = [
        { id: 'room', title: localizeWithFallback('wiredlink.column.room', 'Room name'), fraction: 0.28, left: true },
        { id: 'room_id', title: localizeWithFallback('wiredlink.column.room_id', 'Room ID'), fraction: 0.2 },
        { id: 'furni', title: localizeWithFallback('wiredlink.column.furni', 'Link ID'), fraction: 0.2 },
        { id: 'receive_local', title: localizeWithFallback('wiredlink.column.receive_local', 'Self-receiving'), fraction: 0.2 },
        { id: 'visit', title: '', fraction: 0.12 }
    ];

    const getCell = (connection: IWiredLinkConnection, columnId: string) =>
    {
        switch(columnId)
        {
            case 'room':
                return <span title={ connection.roomName }>{ connection.roomName }</span>;
            case 'room_id':
                return String(connection.roomId);
            case 'furni':
                return String(connection.furniId);
            case 'receive_local':
                return connection.receiveLocal ? localizeWithFallback('wiredlink.receive_local.yes', 'Yes') : localizeWithFallback('wiredlink.receive_local.no', 'No');
            case 'visit':
                return <WiredLinkAction text={ localizeWithFallback('wiredlink.visit_room', 'Visit') } onClick={ () => visitWiredLinkRoom(connection.roomId) } />;
        }

        return null;
    };

    const requestDelete = () => showConfirm(
        localizeWithFallback('wiredlink.delete.confirm', 'Deleting this network disconnects all of its Links in every room. This cannot be undone.'),
        () => deleteWiredLinkNetwork(networkId),
        () => undefined,
        null,
        null,
        localizeWithFallback('wiredlink.delete.title', 'Delete network?'));

    const statusText = loading
        ? localizeWithFallback('wiredlink.loading.connections', 'Loading connected rooms...')
        : (errorCode ? localizeWithFallback(`wiredlink.error.${ errorCode }`, WIRED_LINK_FALLBACKS[`wiredlink.error.${ errorCode }`] ?? '') : '');

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-wired-link-connections w-[660px]" theme="primary-slim" uniqueKey="wired-link-connections">
                <OctaneCardHeaderView headerText={ localizeWithFallback('wiredlink.connections.title', `Connected rooms: ${ networkName }`, [ 'name' ], [ networkName ]) } onCloseClick={ closeConnections } />
                <OctaneCardContentView gap={ 2 }>
                    <WiredLinkTable bodyClassName="h-[150px]" columns={ columns } emptyText={ loading ? '' : localizeWithFallback('wiredlink.empty.connections', '') } getCell={ getCell } getRowId={ connection => `${ connection.roomId }:${ connection.furniId }` } rows={ rows } />
                    <div className="text-[11px] text-[#777]">{ localizeWithFallback('wiredlink.connections.hint', '') }</div>
                    <div className="flex items-center gap-2">
                        <span>{ localizeWithFallback('wiredlink.column.name', 'Network name') }</span>
                        <input aria-label={ localizeWithFallback('wiredlink.column.name', 'Network name') } className="form-control form-control-sm grow" maxLength={ 255 } type="text" value={ nameInput } onChange={ event => setNameDraft({ seq: renameCount, text: event.target.value }) } onKeyDown={ event => { if(event.key === 'Enter') renameWiredLinkNetwork(networkId, nameInput); } } />
                        <BaseButton className="btn btn-primary btn-sm octane-wired-link__button" type="button" onClick={ () => renameWiredLinkNetwork(networkId, nameInput) }>{ localizeWithFallback('wiredlink.rename', 'Rename') }</BaseButton>
                        <WiredLinkAction danger text={ localizeWithFallback('wiredlink.delete', 'Delete network') } onClick={ requestDelete } />
                    </div>
                    { statusText && <div className="text-[12px]" role="status" style={ { color: errorCode ? '#ad3434' : '#555555' } }>{ statusText }</div> }
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};

export const WiredLinkConnectionsView: FC<{}> = () =>
{
    const networkId = useWiredLinkStore(state => state.connections?.networkId ?? '');

    if(!networkId) return null;

    return <WiredLinkConnectionsWindow key={ networkId } networkId={ networkId } />;
};
