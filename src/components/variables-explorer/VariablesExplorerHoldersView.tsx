import { FC } from 'react';
import {
    EXPLORER_SORT_OPTIONS,
    explorerErrorMessage,
    localizeWithFallback,
    targetKindLabel,
    targetKindsOf,
    VariablesWebApiClient,
    WebApiHolderScope,
    WebApiTargetKind
} from '../../api';
import { useNotification } from '../../hooks/notification';
import { useVariablesExplorerHolders } from '../../hooks/variables-explorer/useVariablesExplorerHolders';
import { WiredVariableOwnersPanel } from '../wired-tools/WiredVariableOwnersPanel';
import { explorerHolderDescription, ExplorerHolderTarget } from './VariablesExplorer.helpers';

export interface VariablesExplorerHoldersViewProps {
    client: VariablesWebApiClient;
    scope: WebApiHolderScope;
    variableName: string;
    hasValue: boolean;
    onManage: (target: ExplorerHolderTarget) => void;
    onClose: () => void;
}

/** The creator tools' "Variable Management" window, fed from the Variables Web API. */
export const VariablesExplorerHoldersView: FC<VariablesExplorerHoldersViewProps> = ({ client, scope, variableName, hasValue, onManage, onClose }) => {
    const { showConfirm = null } = useNotification();
    const holders = useVariablesExplorerHolders(client, scope, variableName);
    const { targetKind, sortId, page, currentPage, lastPage, scrollKey, status, setStatus, requests, changeFilters } = holders;

    const deleteHolder = (entityId: number) => {
        showConfirm(
            `Remove ${variableName} from ${targetKindLabel(targetKind)} #${entityId}?`,
            () => {
                client
                    .deleteEntry(scope, variableName, targetKind, entityId)
                    .then(() => requests.refresh())
                    .catch((error) => setStatus(explorerErrorMessage(error)));
            },
            null,
            null,
            null,
            localizeWithFallback('wiredmenu.variable_management.delete', 'Delete')
        );
    };

    return (
        <WiredVariableOwnersPanel
            variableName={variableName}
            variablesType={scope}
            hasValue={hasValue}
            holders={page?.holders ?? []}
            describeHolder={(_entityType, entityId, entityName) => explorerHolderDescription(targetKind, entityId, entityName)}
            currentPage={currentPage}
            totalEntries={page?.total ?? 0}
            lastPage={lastPage}
            requests={requests}
            scrollResetKey={scrollKey}
            filters={[
                {
                    id: 'kind',
                    label: scope === 'furni' ? 'Furni type' : 'User type',
                    value: targetKind,
                    options: targetKindsOf(scope).map((kind) => ({ value: kind, label: targetKindLabel(kind) })),
                    onChange: (value) => changeFilters(value as WebApiTargetKind, sortId)
                },
                {
                    id: 'sort',
                    label: localizeWithFallback('wiredmenu.variable_management.sort_by', 'Sort by'),
                    value: sortId,
                    options: EXPLORER_SORT_OPTIONS.map((option) => ({ value: option.id, label: option.label })),
                    onChange: (value) => changeFilters(targetKind, value)
                }
            ]}
            onManage={(holder) => onManage({ scope, kind: targetKind, entityId: holder.entityId })}
            onDelete={client.hasWriteAccess ? (holder) => deleteHolder(holder.entityId) : undefined}
            onClose={onClose}
            infoText="Everyone and everything that holds this variable, read through the Variables Web API."
            status={
                status ? (
                    <div className="rounded border border-[#d9a3a3] bg-[#fbeaea] px-2 py-1 text-[12px] text-[#8c2424]" role="alert">
                        {status}
                    </div>
                ) : null
            }
            uniqueKey="variables-explorer-holders"
            offsetLeft={700}
            offsetTop={60}
        />
    );
};
