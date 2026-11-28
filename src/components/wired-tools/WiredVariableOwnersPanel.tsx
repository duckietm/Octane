import { IWiredVariableHolder } from '@octane/renderer';
import { ReactNode } from 'react';
import { localizeWithFallback } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { WiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { VariablesElementType } from './WiredCreatorTools.types';
import { WiredPagedTable, WiredTableCell, WiredTableColumn } from './WiredPagedTable';
import { Select } from '../../common/Select';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HANDHELD_MIN_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { HandheldWiredButton, HandheldWiredCard, HandheldWiredField, HandheldWiredPage, HandheldWiredPair } from './handheld/HandheldWiredParts';

/** The server's holder kinds (`entityType`). */
export const HOLDER_TYPE_ROOM = 0;
export const HOLDER_TYPE_USER = 1;
export const HOLDER_TYPE_FURNI = 2;

export interface WiredHolderDescription {
    categoryLabel: string;
    entityName: string;
}

export interface WiredOwnersFilter {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

export interface WiredVariableOwnersPanelProps {
    variableName: string;
    variablesType: VariablesElementType;
    hasValue: boolean;
    holders: IWiredVariableHolder[];
    describeHolder: (entityType: number, entityId: number, entityName: string) => WiredHolderDescription;
    currentPage: number;
    totalEntries: number;
    lastPage: number;
    requests: WiredPageRequests;
    scrollResetKey: number;
    filters: WiredOwnersFilter[];
    onManage: (holder: IWiredVariableHolder) => void;
    /** Adds a delete link next to "Manage". */
    onDelete?: (holder: IWiredVariableHolder) => void;
    /** Turns user names into profile links. */
    onOpenUserProfile?: (entityId: number) => void;
    onClose: () => void;
    infoText?: string;
    status?: ReactNode;
    uniqueKey?: string;
    offsetLeft?: number;
    offsetTop?: number;
}

const LINK_CLASS = 'text-[#1b57b2] underline underline-offset-2';

/**
 * The "Variable Management" window: who holds a variable, a page at a time, with filter menus,
 * refresh and a "Manage" link per holder. It shows what it is handed; the caller fetches.
 */
export const WiredVariableOwnersPanel = (props: WiredVariableOwnersPanelProps) => {
    const {
        variableName,
        variablesType,
        hasValue,
        holders,
        describeHolder,
        currentPage,
        totalEntries,
        lastPage,
        requests,
        scrollResetKey,
        filters,
        onManage,
        onDelete,
        onOpenUserProfile,
        onClose,
        infoText,
        status = null,
        uniqueKey = 'wired-variable-management',
        offsetLeft = 540,
        offsetTop = 60
    } = props;
    const isHandheld = useIsHandheld();

    const typeHeader = (() => {
        switch (variablesType) {
            case 'furni':
                return localizeWithFallback('wiredmenu.variable_management.col.furnitype', 'Furni type');
            case 'global':
                return localizeWithFallback('wiredmenu.variable_management.col.scope', 'Scope');
            default:
                return localizeWithFallback('wiredmenu.variable_management.col.usertype', 'User type');
        }
    })();

    const columns: WiredTableColumn[] = [
        { id: 'type', title: typeHeader, className: 'w-[90px]', handheld: 'meta' },
        { id: 'name', title: localizeWithFallback('wiredmenu.variable_management.col.name', 'Name'), className: 'w-[160px]', handheld: 'title' },
        { id: 'creation_time', title: localizeWithFallback('wiredmenu.variable_management.col.creation_time', 'Creation time'), className: 'w-[150px]' },
        {
            id: 'last_update_time',
            title: localizeWithFallback('wiredmenu.variable_management.col.last_update_time', 'Last update time'),
            className: 'w-[150px]'
        },
        { id: 'value', title: localizeWithFallback('wiredmenu.variable_management.col.value', 'Value'), className: 'w-[110px]' },
        { id: 'manage', title: localizeWithFallback('wiredmenu.variable_management.col.manage', 'Manage'), handheld: 'action' }
    ];

    const noValueLabel = hasValue ? '/' : localizeWithFallback('wiredmenu.variable_management.no_value', 'Not supported');

    const getCell = (holder: IWiredVariableHolder, columnId: string): WiredTableCell => {
        const description = describeHolder(holder.entityType, holder.entityId, holder.entityName);

        switch (columnId) {
            case 'type':
                return { content: description.categoryLabel };
            case 'name':
                return holder.entityType === HOLDER_TYPE_USER && holder.entityId > 0 && onOpenUserProfile
                    ? {
                          content: (
                              <BaseButton className={LINK_CLASS} type="button" onClick={() => onOpenUserProfile(holder.entityId)}>
                                  {description.entityName}
                              </BaseButton>
                          ),
                          title: description.entityName
                      }
                    : { content: description.entityName, title: description.entityName };
            case 'creation_time':
                return { content: holder.storage.creationTimeStr || '/', className: 'tabular-nums' };
            case 'last_update_time':
                return { content: holder.storage.lastUpdateTimeStr || '/', className: 'tabular-nums' };
            case 'value':
                return { content: hasValue ? String(holder.storage.value) : noValueLabel, className: 'tabular-nums' };
            default:
                // Phone: Manage (and Delete) as finger-sized pills at the foot of the holder's card.
                if (isHandheld)
                    return {
                        content: (
                            <>
                                <HandheldWiredButton testId="wired-holder-manage" tone="primary" onClick={() => onManage(holder)}>
                                    {localizeWithFallback('wiredmenu.variable_management.manage', 'Manage')}
                                </HandheldWiredButton>
                                {!!onDelete && (
                                    <HandheldWiredButton tone="danger" onClick={() => onDelete(holder)}>
                                        {localizeWithFallback('wiredmenu.variable_management.delete', 'Delete')}
                                    </HandheldWiredButton>
                                )}
                            </>
                        )
                    };

                return {
                    content: (
                        <span className="flex gap-2">
                            <BaseButton className={LINK_CLASS} type="button" onClick={() => onManage(holder)}>
                                {localizeWithFallback('wiredmenu.variable_management.manage', 'Manage')}
                            </BaseButton>
                            {!!onDelete && (
                                <BaseButton className="text-[#a32a2a] underline underline-offset-2" type="button" onClick={() => onDelete(holder)}>
                                    {localizeWithFallback('wiredmenu.variable_management.delete', 'Delete')}
                                </BaseButton>
                            )}
                        </span>
                    )
                };
        }
    };

    const table = (
        <WiredPagedTable
            columns={columns}
            rows={holders}
            getRowId={(holder) => `${holder.entityType}-${holder.entityId}`}
            getCell={getCell}
            currentPage={currentPage}
            totalEntries={totalEntries}
            lastPage={lastPage}
            requests={requests}
            pagingTextKey="wiredmenu.variable_management.bottom_text"
            emptyText={localizeWithFallback('wiredmenu.variable_management.empty', 'Nobody holds this variable with the current filters')}
            scrollResetKey={scrollResetKey}
            bodyClassName="octane-wired-vars__table"
        />
    );

    // Phone: a page of the sheet with the variable, its filters and Refresh in a card, the holders as cards.
    if (isHandheld)
        return (
            <HandheldWiredPage
                actions={
                    <HandheldWiredButton testId="wired-owners-refresh" onClick={() => requests.refresh()}>
                        {localizeWithFallback('wiredmenu.variable_management.refresh', 'Refresh')}
                    </HandheldWiredButton>
                }
                title={localizeWithFallback('wiredmenu.variable_management.title', 'Variable Management')}
                uniqueKey={uniqueKey}
                onClose={onClose}
                aside={
                    <HandheldWiredCard>
                        <p className="octane-handheld-wired__text">
                            {(
                                infoText ??
                                localizeWithFallback('wiredmenu.variable_management.info', 'This is a tool to manage everyone and everything that holds this variable, in the room or not.')
                            ).replace(/\\n/g, '\n')}
                        </p>
                        <HandheldWiredPair label={localizeWithFallback('wiredmenu.variable_management.variable_name', 'Variable name:')} value={variableName} valueClassName="is-strong" />
                        <div className="octane-handheld-wired__field-row">
                            {filters.map((filter) => (
                                <HandheldWiredField key={filter.id} label={filter.label}>
                                    <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                                        {filter.options.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Select>
                                </HandheldWiredField>
                            ))}
                        </div>
                    </HandheldWiredCard>
                }
            >
                {status}
                {table}
            </HandheldWiredPage>
        );

    // AIR variables_management_overview (700 wide): the info box with Refresh beside it, the variable's name as a
    // key / value line, the user type and sort menus on one line, the table (672 x 296) and the paging row.
    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_MIN_FRAME_SCALE}
                className="octane-wired-menu octane-wired-logs octane-wired-vars"
                theme="primary-slim"
                uniqueKey={uniqueKey}
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={offsetLeft}
                offsetTop={offsetTop}
            >
                <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.variable_management.title', 'Variable Management')} onCloseClick={onClose} />
                <OctaneCardContentView className="octane-wired-logs__content" overflow="hidden">
                    <div className="octane-wired-logs__top">
                        <div className="octane-wired-logs__info">
                            {(
                                infoText ??
                                localizeWithFallback(
                                    'wiredmenu.variable_management.info',
                                    'This is a tool to manage everyone and everything that holds this variable, in the room or not.'
                                )
                            ).replace(/\\n/g, '\n')}
                        </div>
                        <Button variant="secondary" onClick={() => requests.refresh()}>
                            {localizeWithFallback('wiredmenu.variable_management.refresh', 'Refresh')}
                        </Button>
                    </div>
                    <div className="octane-wired-vars__name">
                        <b>{localizeWithFallback('wiredmenu.variable_management.variable_name', 'Variable name:')}</b> <span>{variableName}</span>
                    </div>
                    <div className="octane-wired-logs__filters">
                        {filters.map((filter) => (
                            <label key={filter.id} className="octane-wired-logs__field">
                                <b>{filter.label}</b>
                                <Select className="octane-wired-logs__menu" value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                                    {filter.options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                        ))}
                    </div>
                    {status}
                    <WiredPagedTable
                        columns={columns}
                        rows={holders}
                        getRowId={(holder) => `${holder.entityType}-${holder.entityId}`}
                        getCell={getCell}
                        currentPage={currentPage}
                        totalEntries={totalEntries}
                        lastPage={lastPage}
                        requests={requests}
                        pagingTextKey="wiredmenu.variable_management.bottom_text"
                        emptyText={localizeWithFallback('wiredmenu.variable_management.empty', 'Nobody holds this variable with the current filters')}
                        scrollResetKey={scrollResetKey}
                        bodyClassName="octane-wired-vars__table"
                    />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
