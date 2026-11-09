import { FC, useEffect } from 'react';
import { localizeWithFallback, NotificationAlertType } from '../../../../api';
import { WIRED_LINK_FALLBACKS } from '../../../../api/wired/WiredLink';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useNotification } from '../../../../hooks';
import { useWiredLinkEvents, useWiredLinkStore } from '../../../../hooks/rooms/widgets/useWiredLinkState';
import { WiredLinkConnectionsView } from './WiredLinkConnectionsView';
import { WiredLinkView } from './WiredLinkView';

/**
 * The WIRED Link windows (AIR WiredLinkController): listens for the link packets so the server can open the
 * window when the owner uses their Link, then shows the networks and, on "Manage", a network's connections.
 */
export const WiredLinkWidgetView: FC<{}> = () =>
{
    useWiredLinkEvents();

    const isOpen = useWiredLinkStore(state => state.isOpen);
    const hasConnections = useWiredLinkStore(state => (state.connections !== null));
    const showReceiveLocalInfo = useWiredLinkStore(state => state.showReceiveLocalInfo);
    const { simpleAlert } = useNotification();

    // AIR WiredLinkView.showReceiveLocalInfo: receiving locally without a network is explained once.
    useEffect(() =>
    {
        if(!showReceiveLocalInfo) return;

        useWiredLinkStore.getState().setShowReceiveLocalInfo(false);
        simpleAlert(
            localizeWithFallback('wiredlink.receive.local.info', WIRED_LINK_FALLBACKS['wiredlink.receive.local.info']).replace(/\\n/g, '\n'),
            NotificationAlertType.DEFAULT,
            null,
            null,
            localizeWithFallback('wiredlink.receive.local.title', 'Receive own messages'));
    }, [ showReceiveLocalInfo, simpleAlert ]);

    return (
        <NativeTextTree>
            <>
                { isOpen && <WiredLinkView /> }
                { isOpen && hasConnections && <WiredLinkConnectionsView /> }
            </>
        </NativeTextTree>
    );
};
