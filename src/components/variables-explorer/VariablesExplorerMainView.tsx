import { FC, useMemo, useState } from 'react';
import {
    createVariablesWebApiClient,
    ExplorerConnection,
    explorerErrorMessage,
    GetWebApiHotels,
    localizeWithFallback,
    WebApiVariable
} from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { WiredVariablesTabView } from '../wired-tools/WiredVariablesTabView';
import {
    EXPLORER_LOOKUP_KINDS,
    EXPLORER_VARIABLE_ELEMENTS,
    ExplorerHolderTarget,
    ExplorerLookupKind,
    ExplorerVariablesType,
    lookupTarget,
    scopeOfVariablesType,
    toVariableDefinition,
    variableProperties
} from './VariablesExplorer.helpers';
import { VariablesExplorerBulkDeleteView } from './VariablesExplorerBulkDeleteView';
import { VariablesExplorerHolderView } from './VariablesExplorerHolderView';
import { VariablesExplorerHoldersView } from './VariablesExplorerHoldersView';

export interface VariablesExplorerMainViewProps {
    connection: ExplorerConnection;
    initialVariables: WebApiVariable[];
    onDisconnect: () => void;
    onClose: () => void;
}

const FIELD_CLASS = 'rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]';

const emptyPickerText = (scope: 'user' | 'furni' | 'global'): string =>
    localizeWithFallback(
        `wiredmenu.variables_explorer.empty.${scope}`,
        `No permanent ${scope} variables in this room. Set a variable to Permanent in its wired box to use it here.`
    );

export const VariablesExplorerMainView: FC<VariablesExplorerMainViewProps> = ({ connection, initialVariables, onDisconnect, onClose }) => {
    const client = useMemo(() => createVariablesWebApiClient({ ...connection, baseUrl: connection.hotelUrl }), [connection]);
    const hotelName = useMemo(() => GetWebApiHotels().find((hotel) => hotel.url === connection.hotelUrl)?.name ?? connection.hotelUrl, [connection]);
    const [variables, setVariables] = useState<WebApiVariable[]>(initialVariables);
    const [variablesType, setVariablesType] = useState<ExplorerVariablesType>('user');
    const [selectedKeys, setSelectedKeys] = useState<Partial<Record<ExplorerVariablesType, string>>>({});
    const [isOwnersOpen, setIsOwnersOpen] = useState(false);
    const [holderTarget, setHolderTarget] = useState<ExplorerHolderTarget | null>(null);
    const [bulkDeleteName, setBulkDeleteName] = useState<string | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [lookupKind, setLookupKind] = useState<ExplorerLookupKind>('username');
    const [lookupInput, setLookupInput] = useState('');
    const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

    const scope = scopeOfVariablesType(variablesType);
    const definitions = useMemo(
        () => variables.filter((variable) => variable.scope === scope).map((variable) => toVariableDefinition(variable, client.hasWriteAccess)),
        [variables, scope, client]
    );
    const selectedDefinition = definitions.find((definition) => definition.key === selectedKeys[variablesType]) ?? definitions[0] ?? null;

    const reportError = (error: unknown) => setStatus({ text: explorerErrorMessage(error), isError: true });

    const reloadVariables = () => {
        client
            .listVariables()
            .then((next) => {
                setVariables(next);
                setStatus(null);
            })
            .catch(reportError);
    };

    const openLookup = () => {
        const target = lookupTarget(lookupKind, lookupInput);

        if (!target) {
            setStatus({ text: lookupKind === 'username' ? 'Enter a user name.' : 'Enter a valid id.', isError: true });
            return;
        }

        setStatus(null);
        setHolderTarget(target);
    };

    const runBulkDelete = () => {
        if (!bulkDeleteName || bulkBusy) return;

        setBulkBusy(true);
        client
            .bulkDelete([bulkDeleteName])
            .then((deleted) => {
                setStatus({ text: `Deleted ${deleted[bulkDeleteName] ?? 0} entries of ${bulkDeleteName}.`, isError: false });
                setBulkDeleteName(null);
            })
            .catch((error) => {
                reportError(error);
                setBulkDeleteName(null);
            })
            .finally(() => setBulkBusy(false));
    };

    return (
        <>
            <OctaneCardView
                className="min-w-[560px] max-w-[560px]"
                theme="primary-slim"
                uniqueKey="variables-explorer"
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={120}
                offsetTop={60}
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.variables_explorer.title', 'Variables Explorer')} onCloseClick={onClose} />
                <OctaneCardContentView className="text-black bg-[#e9e6d9]" gap={2}>
                    <div className="mx-3 mt-3 rounded border border-[#c8c2b2] bg-white px-3 py-2 flex items-center justify-between gap-3 text-[12px]">
                        <div className="flex flex-col min-w-0">
                            <Text bold truncate>
                                {hotelName} &middot; Room {connection.roomId}
                            </Text>
                            <Text small className="text-[#6b6659]">
                                {client.hasWriteAccess ? 'Read and write access' : 'Read-only access'}
                            </Text>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <Button variant="secondary" onClick={reloadVariables}>
                                Reload
                            </Button>
                            <Button variant="secondary" onClick={onDisconnect}>
                                Disconnect
                            </Button>
                        </div>
                    </div>
                    <WiredVariablesTabView
                        variablePickerDefinitions={definitions}
                        emptyPickerText={emptyPickerText(scope)}
                        selectedVariableDefinition={selectedDefinition}
                        onPickVariable={(key) => setSelectedKeys((previous) => ({ ...previous, [variablesType]: key }))}
                        canVariableHighlight={false}
                        variableManageCanOpen={!!selectedDefinition}
                        onOpenManagePanel={() => {
                            if (!selectedDefinition) return;

                            if (scope === 'global') setHolderTarget({ scope: 'global' });
                            else setIsOwnersOpen(true);
                        }}
                        arrayInspectorCanOpen={false}
                        onOpenArrayInspector={() => undefined}
                        canVariableClear={!!selectedDefinition && client.hasWriteAccess}
                        onClearVariable={() => selectedDefinition && setBulkDeleteName(selectedDefinition.key)}
                        selectedVariableProperties={variableProperties(selectedDefinition)}
                        selectedVariableTextValues={[]}
                        variablesType={variablesType}
                        onVariablesTypeChange={(type) => {
                            if (type === 'context') return;

                            setVariablesType(type);
                            setIsOwnersOpen(false);
                        }}
                        variableElements={EXPLORER_VARIABLE_ELEMENTS}
                        showHighlight={false}
                        showArrayInspector={false}
                        showTextValues={false}
                    />
                    <div className="mx-3 flex flex-wrap items-center gap-2 text-[12px]">
                        <Text bold>Look up a holder:</Text>
                        <select
                            aria-label="Holder kind"
                            className={FIELD_CLASS}
                            value={lookupKind}
                            onChange={(event) => setLookupKind(event.target.value as ExplorerLookupKind)}
                        >
                            {EXPLORER_LOOKUP_KINDS.map((kind) => (
                                <option key={kind.value} value={kind.value}>
                                    {kind.label}
                                </option>
                            ))}
                        </select>
                        <input
                            aria-label="Holder"
                            className={`${FIELD_CLASS} w-[140px]`}
                            type="text"
                            value={lookupInput}
                            onChange={(event) => setLookupInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter') return;

                                event.preventDefault();
                                openLookup();
                            }}
                        />
                        <Button variant="secondary" onClick={openLookup}>
                            Open
                        </Button>
                        <Button variant="secondary" onClick={() => setHolderTarget({ scope: 'global' })}>
                            Global variables
                        </Button>
                    </div>
                    <div className="mx-3 mb-3 min-h-[26px]">
                        {!!status && (
                            <div
                                className={`rounded border px-2 py-1 text-[12px] ${status.isError ? 'border-[#d9a3a3] bg-[#fbeaea] text-[#8c2424]' : 'border-[#a9c9a4] bg-[#e8f4e5] text-[#2a6a24]'}`}
                                role={status.isError ? 'alert' : 'status'}
                            >
                                {status.text}
                            </div>
                        )}
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
            {isOwnersOpen && !!selectedDefinition && scope !== 'global' && (
                <VariablesExplorerHoldersView
                    client={client}
                    scope={scope}
                    variableName={selectedDefinition.key}
                    hasValue={selectedDefinition.hasValue}
                    onManage={setHolderTarget}
                    onClose={() => setIsOwnersOpen(false)}
                />
            )}
            {!!holderTarget && (
                <VariablesExplorerHolderView
                    client={client}
                    roomId={connection.roomId}
                    target={holderTarget}
                    variables={variables}
                    onClose={() => setHolderTarget(null)}
                />
            )}
            {!!bulkDeleteName && (
                <VariablesExplorerBulkDeleteView
                    variableName={bulkDeleteName}
                    busy={bulkBusy}
                    onConfirm={runBulkDelete}
                    onCancel={() => setBulkDeleteName(null)}
                />
            )}
        </>
    );
};
