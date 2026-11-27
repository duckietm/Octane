import { IWiredLinkNetwork } from '@octane/renderer';
import { FC, useMemo, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { canConnectWiredLink, sortWiredLinkNetworks, WIRED_LINK_FALLBACKS } from '../../../../api/wired/WiredLink';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { clearWiredLinkConnection, createWiredLinkNetwork, requestWiredLinkConnections, saveWiredLink, setWiredLinkReceiveLocal } from '../../../../hooks/rooms/widgets/useWiredLinkActions';
import { useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkAction, WiredLinkColumn, WiredLinkTable } from './WiredLinkTable';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import '../../../../css/room/RoomWidgetsSweepAir.css';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * AIR WiredLinkView (wired_link_view_xml): the Link's current network with "clear connection", the user's
 * networks (name, connected Links, status, manage), a field to create one, and "receive messages sent by this
 * room". Connect, Clear and Receive save at once, as in AIR.
 */
export const WiredLinkView: FC<{}> = () =>
{
    const networks = useWiredLinkStore(state => state.networks);
    const selectedNetworkId = useWiredLinkStore(state => state.selectedNetworkId);
    const receiveLocal = useWiredLinkStore(state => state.receiveLocal);
    const status = useWiredLinkStore(state => state.status);
    const createCount = useWiredLinkStore(state => state.createCount);
    const closeWiredLink = useWiredLinkStore(state => state.closeWiredLink);
    const [ nameDraft, setNameDraft ] = useState({ seq: -1, text: '' });
    const nameInput = (nameDraft.seq === createCount) ? nameDraft.text : '';
    const sortedNetworks = useMemo(() => sortWiredLinkNetworks(networks), [ networks ]);
    const selectedName = networks.find(network => (network.id === selectedNetworkId))?.name;

    const columns: WiredLinkColumn[] = [
        { id: 'name', title: localizeWithFallback('wiredlink.column.name', 'Network name'), fraction: 0.44, left: true },
        { id: 'count', title: localizeWithFallback('wiredlink.column.count', 'Connected Links'), fraction: 0.22 },
        { id: 'status', title: localizeWithFallback('wiredlink.column.status', 'Status'), fraction: 0.21 },
        { id: 'manage', title: '', fraction: 0.13 }
    ];

    const getCell = (network: IWiredLinkNetwork, columnId: string) =>
    {
        const current = (network.id === selectedNetworkId);

        switch(columnId)
        {
            case 'name':
                return <span title={ network.name }>{ network.name }</span>;
            case 'count':
                return String(network.connectionCount);
            case 'status':
                if(!current && !network.linkedInCurrentRoom)
                {
                    return <WiredLinkAction disabled={ !canConnectWiredLink(networks, network.id, selectedNetworkId) } text={ localizeWithFallback('wiredlink.status.connect', 'Connect') } onClick={ () => saveWiredLink(network.id, receiveLocal) } />;
                }

                return <span style={ { color: current ? '#287346' : '#555555' } }>{ current ? localizeWithFallback('wiredlink.status.connected', 'Connected') : localizeWithFallback('wiredlink.status.linked_in_room', 'Linked in room') }</span>;
            case 'manage':
                return <WiredLinkAction text={ localizeWithFallback('wiredlink.manage', 'Manage') } onClick={ () => requestWiredLinkConnections(network.id) } />;
        }

        return null;
    };

    const title = localizeWithFallback('wiredlink.title', 'WIRED Link');
    const selectedLine = (selectedName === undefined)
        ? localizeWithFallback('wiredlink.selected.none', 'Selected network: None')
        : localizeWithFallback('wiredlink.selected', `Selected network: ${ selectedName }`, [ 'name' ], [ selectedName ]);

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-wired-link w-[620px]" theme="primary-slim" uniqueKey="wired-link">
                <OctaneCardHeaderView headerText={ title } onCloseClick={ closeWiredLink } />
                <OctaneCardContentView gap={ 2 }>
                    <div className="octane-wired-link__summary flex items-center justify-between rounded border border-[#b9cbd2] bg-[#dce8ec] px-2 py-1">
                        <span className="octane-wired-link__selected truncate font-bold text-[#285568]">{ selectedLine }</span>
                        <WiredLinkAction text={ localizeWithFallback('wiredlink.clear', 'Clear connection') } onClick={ clearWiredLinkConnection } />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[14px] font-bold">{ localizeWithFallback('wiredlink.networks.title', 'My networks:') }</span>
                        <WiredLinkTable columns={ columns } emptyText={ localizeWithFallback('wiredlink.empty', '') } getCell={ getCell } getRowId={ network => network.id } rows={ sortedNetworks } />
                    </div>
                    <div className="flex items-center gap-2 rounded border border-[#d6d1c4] bg-white px-2 py-1">
                        <span className="font-bold">{ localizeWithFallback('wiredlink.new_name', 'New network:') }</span>
                        <input aria-label={ localizeWithFallback('wiredlink.new_name', 'New network:') } className="form-control form-control-sm grow" maxLength={ 255 } type="text" value={ nameInput } onChange={ event => setNameDraft({ seq: createCount, text: event.target.value }) } onKeyDown={ event => { if(event.key === 'Enter') createWiredLinkNetwork(nameInput); } } />
                        <BaseButton className="btn btn-primary btn-sm octane-wired-link__button" type="button" onClick={ () => createWiredLinkNetwork(nameInput) }>{ localizeWithFallback('wiredlink.create', 'Create network') }</BaseButton>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 rounded bg-[#deded7] px-2 py-1">
                        <Checkbox checked={ receiveLocal } onCheckedChange={ nextChecked => setWiredLinkReceiveLocal(nextChecked) } />
                        <span>{ localizeWithFallback('wiredlink.receive', 'Receive messages sent by this room') }</span>
                    </label>
                    { status && <div className="text-[12px]" role="status" style={ { color: status.error ? '#ad3434' : '#555555' } }>{ localizeWithFallback(status.key, WIRED_LINK_FALLBACKS[status.key] ?? status.key) }</div> }
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
