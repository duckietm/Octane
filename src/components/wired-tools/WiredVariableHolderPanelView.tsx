import { KeyboardEvent, ReactNode } from 'react';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { Select } from '../../common/Select';

export interface WiredHolderPanelEntry {
    id: string;
    name: string;
    availability: string;
    hasValue: boolean;
    value: number | null;
    isReadOnly?: boolean;
}

export interface WiredHolderPanelGiveOption {
    id: string;
    name: string;
    hasValue: boolean;
}

export interface WiredVariableHolderPanelViewProps {
    title: string;
    warningText: string;
    onRefresh: () => void;
    onClose: () => void;
    preview: ReactNode;
    infoLines: string[];
    variablesTitle: string;
    entries: WiredHolderPanelEntry[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    canEdit: boolean;
    editingId: string | null;
    editingValue: string;
    onBeginEdit: (entry: WiredHolderPanelEntry) => void;
    onEditingValueChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    isGiveOpen: boolean;
    onToggleGive: () => void;
    giveOptions: WiredHolderPanelGiveOption[];
    giveSelectedId: string;
    onGiveSelect: (id: string) => void;
    giveValue: string;
    onGiveValueChange: (value: string) => void;
    canGive: boolean;
    onGive: () => void;
    canRemove: boolean;
    onRemove: () => void;
    status?: ReactNode;
    extraActions?: ReactNode;
    uniqueKey?: string;
    offsetLeft?: number;
    offsetTop?: number;
}

/**
 * The holder detail window of the creator tools: who the holder is, the variables they hold with
 * inline value editing, and remove / give. Pure view; the caller owns the data and the writes.
 */
export const WiredVariableHolderPanelView = (props: WiredVariableHolderPanelViewProps) => {
    const {
        title,
        warningText,
        onRefresh,
        onClose,
        preview,
        infoLines,
        variablesTitle,
        entries,
        selectedId,
        onSelect,
        canEdit,
        editingId,
        editingValue,
        onBeginEdit,
        onEditingValueChange,
        onEditBlur,
        onEditKeyDown,
        isGiveOpen,
        onToggleGive,
        giveOptions,
        giveSelectedId,
        onGiveSelect,
        giveValue,
        onGiveValueChange,
        canGive,
        onGive,
        canRemove,
        onRemove,
        status = null,
        extraActions = null,
        uniqueKey = 'wired-variable-management-entry',
        offsetLeft = 890,
        offsetTop = 110
    } = props;
    const selectedGiveOption = giveOptions.find((option) => option.id === giveSelectedId) ?? null;

    return (
        <OctaneCardView
            className="min-w-[430px] max-w-[430px] max-h-[620px]"
            theme="primary-slim"
            uniqueKey={uniqueKey}
            windowPosition={DraggableWindowPosition.TOP_LEFT}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black bg-[#f4efe3] p-3 flex flex-col gap-3 relative" overflow="hidden">
                <div className="rounded border border-[#c8c2b2] bg-white p-3 flex items-center justify-between gap-3">
                    <div className="grow text-center">
                        <Text>{warningText}</Text>
                    </div>
                    <Button variant="secondary" onClick={onRefresh}>
                        Refresh
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    <Text bold>Holder info:</Text>
                    <div className="flex gap-4">
                        <div className="w-[140px] h-[110px] rounded border border-[#d8d2c3] bg-[#dedede] flex items-center justify-center overflow-hidden">
                            {preview}
                        </div>
                        <div className="grow rounded border border-[#d8d2c3] bg-white p-3 flex flex-col gap-1 text-[12px]">
                            {infoLines.map((line, index) => (
                                <Text key={`${line}-${index}`}>{line}</Text>
                            ))}
                        </div>
                    </div>
                </div>
                {status}
                <div className="flex flex-col gap-2 min-h-0 grow">
                    <Text bold>{variablesTitle}</Text>
                    <div className="grow rounded border border-[#d1ccbf] bg-white overflow-y-auto">
                        <table className="w-full text-[12px]">
                            <thead className="bg-[#efede5] sticky top-0">
                                <tr>
                                    <th className="text-left px-2 py-1">Variable</th>
                                    <th className="text-left px-2 py-1">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!entries.length && (
                                    <tr>
                                        <td className="px-2 py-3 text-center text-[#8b8678]" colSpan={2}>
                                            No variables currently assigned
                                        </td>
                                    </tr>
                                )}
                                {entries.map((entry, index) => {
                                    const isSelected = selectedId === entry.id;
                                    const isEditing = editingId === entry.id;
                                    const isEditable = canEdit && !entry.isReadOnly;

                                    return (
                                        <tr
                                            key={entry.id}
                                            className={`${isSelected ? 'bg-[#d7dfea]' : index % 2 === 0 ? 'bg-white' : 'bg-[#f8f6f0]'} cursor-pointer hover:bg-[#e8eefc]`}
                                            onClick={() => onSelect(entry.id)}
                                        >
                                            <td className="px-2 py-1">
                                                <div className="flex flex-col">
                                                    <span>{entry.name}</span>
                                                    <span className="text-[10px] text-[#8a8476]">{entry.availability}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                {!entry.hasValue && <span className="text-[#8a8476]">/</span>}
                                                {!!entry.hasValue && !isEditing && (
                                                    <button
                                                        className={`rounded px-1 py-[1px] ${isEditable ? 'text-[#1b57b2] underline underline-offset-2' : 'text-[#222]'}`}
                                                        disabled={!isEditable}
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();

                                                            if (!isEditable) return;

                                                            onBeginEdit(entry);
                                                        }}
                                                    >
                                                        {entry.value ?? 0}
                                                    </button>
                                                )}
                                                {!!entry.hasValue && isEditing && (
                                                    <input
                                                        autoFocus
                                                        className="w-[72px] rounded border border-[#b8b2a4] bg-white px-2 py-[2px] text-[12px]"
                                                        type="number"
                                                        value={editingValue}
                                                        onBlur={onEditBlur}
                                                        onChange={(event) => onEditingValueChange(event.target.value)}
                                                        onClick={(event) => event.stopPropagation()}
                                                        onKeyDownCapture={onEditKeyDown}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                {extraActions}
                <div className="relative flex items-center justify-between gap-3 pt-1">
                    {isGiveOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-[210px] rounded border border-[#8d887a] bg-[#efede5] p-3 shadow-[0_2px_8px_rgba(0,0,0,.25)] z-10 flex flex-col gap-2">
                            <Text bold>Variable:</Text>
                            <Select
                                className="rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]"
                                value={selectedGiveOption?.id ?? ''}
                                onChange={(event) => onGiveSelect(event.target.value)}
                            >
                                {!giveOptions.length && <option value="">No variables available</option>}
                                {giveOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </Select>
                            <Text bold>Value:</Text>
                            <input
                                className="w-[96px] rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px] disabled:opacity-60"
                                disabled={!selectedGiveOption?.hasValue}
                                type="number"
                                value={giveValue}
                                onChange={(event) => onGiveValueChange(event.target.value)}
                            />
                            <Button disabled={!canGive} variant="secondary" onClick={onGive}>
                                Create
                            </Button>
                        </div>
                    )}
                    <Button disabled={!canRemove} variant="secondary" onClick={onRemove}>
                        Remove variable
                    </Button>
                    <Button disabled={!canGive} variant="secondary" onClick={onToggleGive}>
                        Give variable
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
