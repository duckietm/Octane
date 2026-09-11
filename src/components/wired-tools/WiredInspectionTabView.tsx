import type { IWiredArrayInspectionData } from '@octane/renderer';
import { KeyboardEvent } from 'react';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import { Button, LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView, Text } from '../../common';
import { WiredArrayInspectionView } from './WiredArrayInspectionView';
import { INSPECTION_ELEMENTS } from './WiredCreatorTools.constants';
import { InspectionFurniSelection, InspectionUserSelection, InspectionVariable } from './WiredCreatorTools.types';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

/**
 * Structural shape we need from the renderer's variable-definition
 * objects (`IWiredUserVariableDefinition` / `IWiredFurniVariableDefinition`).
 * Declared locally to avoid pulling the renderer SDK into the view.
 */
export interface InspectionGiveDefinition {
    itemId: number;
    name: string;
    hasValue: boolean;
}

export interface WiredInspectionTabViewProps {
    // preview
    selectedFurni: InspectionFurniSelection | null;
    selectedUser: InspectionUserSelection | null;
    roomId: number | null;
    previewPlaceholder: string;

    // keep-selected toggle
    keepSelected: boolean;
    onKeepSelectedChange: (next: boolean) => void;

    // variables table
    displayedVariables: InspectionVariable[];
    selectedInspectionVariableKey: string;
    onSelectInspectionVariable: (variable: InspectionVariable) => void;

    // inline editor — `editingVariable` / `editingValue` come from the
    // store; this tab only needs the cancel / keydown / begin handlers
    // since each tab consumer wraps `onBeginVariableEdit` with its own
    // bookkeeping (variable-key tracking).
    onCancelVariableEdit: () => void;
    onVariableInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onBeginVariableEdit: (variable: InspectionVariable) => void;

    // give-variable popover
    selectedInspectionGiveDefinition: InspectionGiveDefinition | null;
    onSelectGiveVariable: (itemId: number) => void;
    availableInspectionDefinitions: InspectionGiveDefinition[];
    inspectionGiveValue: string;
    onInspectionGiveValueChange: (value: string) => void;
    canGiveInspectionVariable: boolean;
    onGiveInspectionVariable: () => void;

    // remove variable
    canRemoveInspectionVariable: boolean;
    onRemoveInspectionVariable: () => void;

    arrayInspection: IWiredArrayInspectionData | null;
    canModifyArray: boolean;
    onArrayPageChange: (page: number) => void;
    onArrayFieldUpdate: (index: number, fieldId: number, value: string) => void;
}

/**
 * The "Inspection" tab body of WiredCreatorToolsView, extracted from
 * the parent's inline JSX. Same shape as WiredVariablesTabView:
 * pure presentation, all state and actions arrive as typed props.
 */
export const WiredInspectionTabView = (props: WiredInspectionTabViewProps) => {
    const {
        selectedFurni,
        selectedUser,
        roomId,
        previewPlaceholder,
        keepSelected,
        onKeepSelectedChange,
        displayedVariables,
        selectedInspectionVariableKey,
        onSelectInspectionVariable,
        onCancelVariableEdit,
        onVariableInputKeyDown,
        onBeginVariableEdit,
        selectedInspectionGiveDefinition,
        onSelectGiveVariable,
        availableInspectionDefinitions,
        inspectionGiveValue,
        onInspectionGiveValueChange,
        canGiveInspectionVariable,
        onGiveInspectionVariable,
        canRemoveInspectionVariable,
        onRemoveInspectionVariable,
        arrayInspection,
        canModifyArray,
        onArrayPageChange,
        onArrayFieldUpdate
    } = props;

    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);

    return (
        <div className="p-3 min-h-[360px] flex gap-4">
            <div className="w-[145px] shrink-0 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>Element type:</Text>
                    <div className="flex gap-1">
                        {INSPECTION_ELEMENTS.map((element) => (
                            <button
                                key={element.key}
                                type="button"
                                className={`w-[42px] h-[38px] rounded border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.7)] ${inspectionType === element.key ? 'border-[#222] bg-[#d9d6cf]' : 'border-[#7f7f7f] bg-[#ece9e1]'}`}
                                onClick={() => setInspectionType(element.key)}
                                title={element.label}
                            >
                                <img alt={element.label} className="w-auto h-auto max-w-[22px] max-h-[22px] object-contain" src={element.icon} />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>Preview:</Text>
                    <div className="relative h-[224px] rounded border border-[#c0bdb4] bg-[#d7d7d7] overflow-hidden">
                        {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                            <div className="absolute inset-0 flex items-center justify-center p-3">
                                <LayoutRoomObjectImageView category={selectedFurni.category} objectId={selectedFurni.objectId} roomId={roomId} />
                            </div>
                        )}
                        {inspectionType === 'user' && selectedUser && (
                            <div className="absolute inset-0 flex items-center justify-center p-3">
                                {selectedUser.kind === 'pet' ? (
                                    <LayoutPetImageView direction={2} figure={selectedUser.figure} posture={selectedUser.posture} />
                                ) : (
                                    <LayoutAvatarImageView direction={2} figure={selectedUser.figure} />
                                )}
                            </div>
                        )}
                        {inspectionType === 'global' && (
                            <div className="absolute inset-0 flex items-center justify-center p-3">
                                <img alt="Global placeholder" className="max-w-full max-h-full object-contain" src={wiredGlobalPlaceholderImage} />
                            </div>
                        )}
                        {((inspectionType === 'furni' && !selectedFurni) || (inspectionType === 'user' && !selectedUser) || inspectionType === 'global') && (
                            <div
                                className={`absolute inset-0 flex items-center justify-center px-3 text-center text-[#666] text-[12px] ${inspectionType === 'global' ? 'hidden' : ''}`}
                            >
                                {previewPlaceholder}
                            </div>
                        )}
                    </div>
                </div>
                <label className="flex items-center gap-2 text-[12px] text-[#111]">
                    <input
                        checked={keepSelected}
                        className="form-check-input mt-0"
                        type="checkbox"
                        onChange={(event) => onKeepSelectedChange(event.target.checked)}
                    />
                    <span>Keep selected</span>
                </label>
            </div>
            <div className="min-w-0 grow flex flex-col gap-2">
                <div className="flex flex-col gap-1 grow min-h-0">
                    <Text bold>Variables:</Text>
                    <div className="grow rounded border border-[#bdb8ab] bg-white overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px] border-b border-[#d8d4c8] bg-[#f5f2ea] px-3 py-2 text-[12px] text-[#666]">
                            <span>Variable</span>
                            <span>Value</span>
                        </div>
                        {!displayedVariables.length && (
                            <div className="h-[calc(100%-37px)] flex items-center justify-center text-[#b1aca2] text-[20px]">
                                <Text>Nothing to display</Text>
                            </div>
                        )}
                        {!!displayedVariables.length && (
                            <div className="max-h-[290px] overflow-y-auto">
                                <table className="w-full text-[12px]">
                                    <tbody>
                                        {displayedVariables.map((variable, index) => (
                                            <tr
                                                key={variable.key}
                                                className={`${selectedInspectionVariableKey === variable.key ? 'bg-[#d7dfea]' : index % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'} ${variable.editable ? 'cursor-pointer hover:bg-[#e8eefc]' : 'cursor-pointer'}`}
                                                onClick={() => onSelectInspectionVariable(variable)}
                                            >
                                                <td className="px-3 py-1 text-[#444]">{variable.key}</td>
                                                <td className="px-3 py-1 text-right text-[#222]">
                                                    {editingVariable === variable.key && (
                                                        <input
                                                            autoFocus
                                                            className="w-[170px] rounded border border-[#8d8d8d] px-2 py-1 text-right text-[12px]"
                                                            spellCheck={false}
                                                            type="text"
                                                            value={editingValue}
                                                            onClick={(event) => event.stopPropagation()}
                                                            onBlur={onCancelVariableEdit}
                                                            onChange={(event) => setEditingValue(event.target.value)}
                                                            onKeyDownCapture={onVariableInputKeyDown}
                                                        />
                                                    )}
                                                    {editingVariable !== variable.key && !variable.editable && (
                                                        <span className={variable.valueClassName}>{variable.value}</span>
                                                    )}
                                                    {editingVariable !== variable.key && variable.editable && (
                                                        <button
                                                            className={`w-full cursor-pointer rounded px-1 text-right text-[#1b57b2] hover:underline ${variable.valueClassName ?? ''}`}
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                onBeginVariableEdit(variable);
                                                            }}
                                                        >
                                                            {variable.value}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                {arrayInspection && (
                    <WiredArrayInspectionView
                        canModify={canModifyArray}
                        data={arrayInspection}
                        onPageChange={onArrayPageChange}
                        onUpdateField={onArrayFieldUpdate}
                    />
                )}
                <div className="relative flex justify-between gap-2">
                    {isInspectionGiveOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-[210px] rounded border border-[#8d887a] bg-[#efede5] p-3 shadow-[0_2px_8px_rgba(0,0,0,.25)] z-10 flex flex-col gap-2">
                            <Text bold>Variable:</Text>
                            <select
                                className="rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]"
                                value={selectedInspectionGiveDefinition?.itemId ?? 0}
                                onChange={(event) => onSelectGiveVariable(Number(event.target.value))}
                            >
                                {!availableInspectionDefinitions.length && <option value={0}>No variables available</option>}
                                {availableInspectionDefinitions.map((definition) => (
                                    <option key={definition.itemId} value={definition.itemId}>
                                        {definition.name}
                                    </option>
                                ))}
                            </select>
                            <Text bold>Value:</Text>
                            <input
                                className="w-[96px] rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px] disabled:opacity-60"
                                disabled={!selectedInspectionGiveDefinition?.hasValue}
                                type="number"
                                value={inspectionGiveValue}
                                onChange={(event) => onInspectionGiveValueChange(event.target.value)}
                            />
                            <Button disabled={!canGiveInspectionVariable} variant="secondary" onClick={onGiveInspectionVariable}>
                                Create
                            </Button>
                        </div>
                    )}
                    <Button disabled={!canRemoveInspectionVariable} variant="secondary" onClick={onRemoveInspectionVariable}>
                        Remove variable
                    </Button>
                    <Button disabled={!canGiveInspectionVariable} variant="secondary" onClick={() => setIsInspectionGiveOpen((value) => !value)}>
                        Give variable
                    </Button>
                </div>
            </div>
        </div>
    );
};
