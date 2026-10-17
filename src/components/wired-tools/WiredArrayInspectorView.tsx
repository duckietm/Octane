import { IWiredArrayInspectionData, WiredArrayInspectionDataEvent, WiredArrayInspectionRequestComposer, WiredArrayInspectionUpdateComposer } from '@octane/renderer';
import { useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, SendMessageComposer, wiredArrayFieldsOf } from '../../api';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { WiredPagedTable, WiredTableCell, WiredTableColumn } from './WiredPagedTable';
import { NO_PAGE } from './WiredPaging.helpers';
import { NumberInput } from '../../common/NumberInput';
import { BaseButton } from '../../common/BaseButton';

export const WIRED_ARRAY_INSPECTOR_PAGE_SIZE = 25;
const REQUEST_PAGE_RATELIMIT = 300;

export interface WiredArrayInspectorViewProps {
    definitionItemId: number;
    variableName: string;
    variableType: number;
    onClose: () => void;
}

export const WiredArrayInspectorView = (props: WiredArrayInspectorViewProps) => {
    const { definitionItemId, variableName, variableType, onClose } = props;
    const [data, setData] = useState<IWiredArrayInspectionData | null>(null);
    const [ownerId, setOwnerId] = useState(0);
    const [ownerInput, setOwnerInput] = useState('0');
    const [editing, setEditing] = useState<{ fieldId: number; index: number; value: string } | null>(null);
    const [scrollKey, setScrollKey] = useState(0);

    useMessageEvent<WiredArrayInspectionDataEvent>(WiredArrayInspectionDataEvent, (event) => {
        const parsed = event.getParser()?.data ?? null;

        if (!parsed || parsed.definition?.itemId !== definitionItemId) return;

        setData(parsed);
        setEditing(null);
        setScrollKey((key) => key + 1);
    });

    const currentPage = data ? data.page : NO_PAGE;
    const lastPage = data ? Math.max(1, data.pageCount) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: data,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) =>
            SendMessageComposer(new WiredArrayInspectionRequestComposer(variableType, ownerId, definitionItemId, requested, WIRED_ARRAY_INSPECTOR_PAGE_SIZE))
    });

    useEffect(() => {
        setData(null);
        SendMessageComposer(new WiredArrayInspectionRequestComposer(variableType, ownerId, definitionItemId, 1, WIRED_ARRAY_INSPECTOR_PAGE_SIZE));
    }, [definitionItemId, ownerId, variableType]);

    const fields = useMemo(
        () =>
            wiredArrayFieldsOf(
                data?.definition
                    ? {
                          arrayFormat: data.definition.arrayFormat,
                          arrayMode: data.definition.arrayMode,
                          fields: data.definition.fields,
                          hasValue: true,
                          itemId: data.definition.itemId,
                          maxEntries: data.definition.maxEntries,
                          name: data.definition.name,
                          permanent: false,
                          valueShape: 'array',
                          variableType: data.definition.variableType,
                          writable: data.definition.writable
                      }
                    : null
            ),
        [data?.definition]
    );

    const writable = !!data?.definition?.writable;

    const commitEdit = () => {
        if (!editing) return;

        SendMessageComposer(
            new WiredArrayInspectionUpdateComposer(
                variableType,
                ownerId,
                definitionItemId,
                editing.index,
                editing.fieldId,
                editing.value.trim(),
                Math.max(1, currentPage === NO_PAGE ? 1 : currentPage),
                WIRED_ARRAY_INSPECTOR_PAGE_SIZE
            )
        );
        setEditing(null);
    };

    const columns: WiredTableColumn[] = [
        { id: 'index', title: localizeWithFallback('wiredmenu.arrays.col.index', 'Index'), className: 'w-[70px]' },
        ...fields.map((field) => ({
            id: `field-${field.id}`,
            title: field.name || localizeWithFallback('wiredmenu.arrays.col.value', 'Value')
        }))
    ];

    const getCell = (entry: IWiredArrayInspectionData['entries'][number], columnId: string): WiredTableCell => {
        if (columnId === 'index') return { content: String(entry.index), className: 'tabular-nums' };

        const fieldId = parseInt(columnId.slice(6), 10);
        const raw = entry.values?.[String(fieldId)] ?? '';
        const connected = entry.connectedText?.[String(fieldId)] ?? '';
        const shown = !entry.occupied ? '/' : connected || raw || '0';

        if (editing && editing.index === entry.index && editing.fieldId === fieldId)
            return {
                content: (
                    <input
                        autoFocus
                        className="w-[90px] rounded border border-[#b8b2a4] bg-white px-1 text-[12px]"
                        value={editing.value}
                        onBlur={commitEdit}
                        onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') commitEdit();
                            if (event.key === 'Escape') setEditing(null);
                        }}
                    />
                )
            };

        if (!writable) return { className: 'tabular-nums', content: shown, title: raw };

        return {
            className: 'tabular-nums',
            content: (
                <BaseButton
                    className="text-[#1b57b2] underline underline-offset-2"
                    type="button"
                    onClick={() => setEditing({ fieldId, index: entry.index, value: raw })}
                >
                    {shown}
                </BaseButton>
            ),
            title: raw
        };
    };

    const summary = data
        ? localizeWithFallback('wiredmenu.arrays.summary', 'Holding %occupied% of %total% indexes')
              .replace('%occupied%', String(data.occupiedCount))
              .replace('%total%', String(data.totalIndexes))
        : '';

    return (
        <OctaneCardView
            className="min-w-[620px] max-w-[620px] max-h-[620px]"
            theme="primary-slim"
            uniqueKey="wired-array-inspector"
            windowPosition={DraggableWindowPosition.TOP_LEFT}
            offsetLeft={540}
            offsetTop={60}
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('wiredmenu.arrays.title', 'Array contents')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3" overflow="hidden">
                <div className="rounded border border-[#c8c2b2] bg-white p-3 flex items-center justify-between gap-3">
                    <div className="grow flex flex-col">
                        <Text>
                            <b>{localizeWithFallback('wiredmenu.variable_management.variable_name', 'Variable name:')}</b> {variableName}
                        </Text>
                        {!!data && <Text>{summary}</Text>}
                    </div>
                    <Button variant="secondary" onClick={() => requests.refresh()}>
                        {localizeWithFallback('wiredmenu.variable_management.refresh', 'Refresh')}
                    </Button>
                </div>

                <label className="flex items-center gap-2 text-[12px]">
                    <Text>{localizeWithFallback('wiredmenu.arrays.owner', 'Owner id')}:</Text>
                    <NumberInput className="w-[110px] rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]" value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} onKeyDown={(event) => {
                            if (event.key !== 'Enter') return;

                            const parsed = parseInt(ownerInput.trim(), 10);

                            setOwnerId(Number.isFinite(parsed) ? parsed : 0);
                        }} />
                    <Text small className="text-black/60">
                        {localizeWithFallback('wiredmenu.arrays.owner.hint', 'Room arrays ignore this. Press Enter to load.')}
                    </Text>
                </label>

                {!!data && !data.hasArray && (
                    <Text>{localizeWithFallback('wiredmenu.arrays.not_array', 'That variable is not an array, or this owner has no value for it yet.')}</Text>
                )}

                <WiredPagedTable
                    columns={columns}
                    rows={data?.entries ?? []}
                    getRowId={(entry) => String(entry.index)}
                    getCell={getCell}
                    currentPage={currentPage}
                    totalEntries={data?.totalIndexes ?? 0}
                    lastPage={lastPage}
                    requests={requests}
                    emptyText={localizeWithFallback('wiredmenu.arrays.empty', 'This array holds nothing yet')}
                    scrollResetKey={scrollKey}
                    bodyClassName="h-[320px]"
                />
            </OctaneCardContentView>
        </OctaneCardView>
    );
};

export const wiredArrayVariableTypeOf = (variablesType: string): number => {
    switch (variablesType) {
        case 'furni':
            return 0;
        case 'user':
            return 2;
        case 'context':
            return 3;
        default:
            return 1;
    }
};
