import { FC, useState } from 'react';
import { ExplorerConnection, WebApiVariable } from '../../api';
import { WidgetErrorBoundary } from '../../common/error-boundary/WidgetErrorBoundary';
import { useVariablesExplorerStore } from '../../state/variablesExplorer';
import { VariablesExplorerConnectView } from './VariablesExplorerConnectView';
import { VariablesExplorerMainView } from './VariablesExplorerMainView';
import '../../css/variables-explorer/VariablesExplorer.css';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

interface ExplorerSession {
    connection: ExplorerConnection;
    variables: WebApiVariable[];
    openCount: number;
}

/** Connect form first, then the explorer. Keys live only in this state unless the user asked to remember them. */
export const VariablesExplorerView: FC = () => {
    const isOpen = useVariablesExplorerStore((s) => s.isOpen);
    const prefill = useVariablesExplorerStore((s) => s.prefill);
    const openCount = useVariablesExplorerStore((s) => s.openCount);
    const close = useVariablesExplorerStore((s) => s.close);
    const [session, setSession] = useState<ExplorerSession | null>(null);
    const [disconnected, setDisconnected] = useState<{ roomId: number; openCount: number } | null>(null);

    if (!isOpen) return null;

    const closeExplorer = () => {
        setSession(null);
        close();
    };

    const activeSession = session?.openCount === openCount ? session : null;

    return (
        <NativeTextTree>
            <WidgetErrorBoundary name="VariablesExplorer">
                {activeSession ? (
                    <VariablesExplorerMainView
                        connection={activeSession.connection}
                        initialVariables={activeSession.variables}
                        onDisconnect={() => {
                            setDisconnected({ roomId: activeSession.connection.roomId, openCount });
                            setSession(null);
                        }}
                        onClose={closeExplorer}
                    />
                ) : (
                    <VariablesExplorerConnectView
                        key={openCount}
                        prefill={disconnected?.openCount === openCount ? { roomId: disconnected.roomId } : prefill}
                        onConnected={(connection, variables) => setSession({ connection, variables, openCount })}
                        onClose={closeExplorer}
                    />
                )}
            </WidgetErrorBoundary>
        </NativeTextTree>
    );
};
