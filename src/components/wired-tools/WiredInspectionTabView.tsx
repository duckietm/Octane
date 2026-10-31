import { KeyboardEvent } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../api';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import { Button, LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView, Text } from '../../common';
import { INSPECTION_ELEMENTS, PACKED_WIRED_VARIABLE_KEYS } from './WiredCreatorTools.constants';
import { InspectionFurniSelection, InspectionUserSelection, InspectionVariable } from './WiredCreatorTools.types';
import { wiredSourceTypeLabelKey } from './WiredCreatorTools.helpers';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';
import { Checkbox } from '../../common/Checkbox';
import { Select } from '../../common/Select';
import { NumberInput } from '../../common/NumberInput';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

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
    previewRevision?: number;
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

    // AIR "highlight_wired_btn": the wired boxes that pick the inspected furni
    canHighlightWireds?: boolean;
    isHighlightingWireds?: boolean;
    onToggleHighlightWireds?: () => void;
}

/** Official VariableValueTableObject: an int at the edge of the 32-bit range is shown as hidden. */
export const isFlashRestrictedValue = (value: string): boolean => value === '2147483647' || value === '-2147483648';

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
        previewRevision,
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
        canHighlightWireds = false,
        isHighlightingWireds = false,
        onToggleHighlightWireds
    } = props;

    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);

    return (
        <NativeTextTree>
            <div className="p-3 min-h-[360px] flex gap-4">
                <div className="w-[145px] shrink-0 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredmenu.inspection.type', 'Element type:')}</Text>
                        <div className="flex gap-1">
                            {INSPECTION_ELEMENTS.map((element) => (
                                <Hint key={element.key} content={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}>
                                    <BaseButton aria-label={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}
                                        type="button"
                                        className={`w-[42px] h-[38px] rounded border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.7)] ${inspectionType === element.key ? 'border-[#222] bg-[#d9d6cf]' : 'border-[#7f7f7f] bg-[#ece9e1]'}`}
                                        onClick={() => setInspectionType(element.key)}
                                    >
                                        <img alt="" className="w-auto h-auto max-w-[22px] max-h-[22px] object-contain" src={element.icon} />
                                    </BaseButton>
                                </Hint>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredmenu.inspection.preview', 'Preview:')}</Text>
                        <div className="relative h-[224px] rounded border border-[#c0bdb4] bg-[#d7d7d7] overflow-hidden">
                            {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                                <div className="absolute inset-0 flex items-center justify-center p-3">
                                    <LayoutRoomObjectImageView
                                        key={`${selectedFurni.objectId}-${previewRevision ?? 0}`}
                                        category={selectedFurni.category}
                                        objectId={selectedFurni.objectId}
                                        roomId={roomId}
                                    />
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
                            {inspectionType === 'furni' && (
                                <Hint content={LocalizeText('wiredmenu.inspection.highlight_wireds')}>
                                    <BaseButton
                                        aria-label={LocalizeText('wiredmenu.inspection.highlight_wireds')}
                                        aria-pressed={isHighlightingWireds}
                                        className={`absolute top-[6px] right-[6px] w-[25px] h-[26px] rounded border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.7)] disabled:opacity-50 disabled:cursor-default ${isHighlightingWireds ? 'border-[#222] bg-[#d9d6cf]' : 'border-[#7f7f7f] bg-[#ece9e1]'}`}
                                        disabled={!canHighlightWireds}
                                        type="button"
                                        onClick={onToggleHighlightWireds}
                                    >
                                        <img
                                            alt=""
                                            className="[image-rendering:pixelated]"
                                            draggable={false}
                                            src={GetConfigurationValue<string>('catalog.asset.icon.url', '').replace('%name%', '80')}
                                        />
                                    </BaseButton>
                                </Hint>
                            )}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-[12px] text-[#111]">
                        <Checkbox checked={keepSelected} className="mt-0" onCheckedChange={(nextChecked) => onKeepSelectedChange(nextChecked)} />
                        <span>{localizeWithFallback('wiredmenu.inspection.pin', 'Keep selected')}</span>
                    </label>
                </div>
                <div className="min-w-0 grow flex flex-col gap-2">
                    <div className="flex flex-col gap-1 grow min-h-0">
                        <Text bold>{localizeWithFallback('wiredmenu.inspection.variables', 'Variables:')}</Text>
                        <div className="grow rounded border border-[#bdb8ab] bg-white overflow-hidden">
                            <div className="grid grid-cols-[1fr_120px] border-b border-[#d8d4c8] bg-[#f5f2ea] px-3 py-2 text-[12px] text-[#666]">
                                <span>{localizeWithFallback('wiredmenu.inspection.variables.variable', 'Variable')}</span>
                                <span>{localizeWithFallback('wiredmenu.inspection.variables.value', 'Value')}</span>
                            </div>
                            {!displayedVariables.length && (
                                <div className="h-[calc(100%-37px)] flex items-center justify-center text-[#333333] text-[12px]">
                                    <Text>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</Text>
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
                                                    <td className="px-3 py-1 text-[#444]">
                                                        {PACKED_WIRED_VARIABLE_KEYS.has(variable.key) ? (
                                                            <Hint
                                                                content={localizeWithFallback(
                                                                    'wiredmenu.inspection.packed_variable.desc',
                                                                    'This is a packed variable that lets you read and write\nseveral other variables at once'
                                                                )}
                                                            >
                                                                <span className="cursor-help underline decoration-dotted">{variable.key}</span>
                                                            </Hint>
                                                        ) : (
                                                            variable.key
                                                        )}
                                                    </td>
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
                                                        {editingVariable !== variable.key && isFlashRestrictedValue(variable.value) && (
                                                            <Hint content={localizeWithFallback('wiredmenu.inspection.flash_restriction.desc', 'The classic client can not inspect this value, it is too large')}>
                                                                <span className="text-[#ff5733]">{localizeWithFallback('wiredmenu.inspection.flash_restriction.text', 'Hidden')}</span>
                                                            </Hint>
                                                        )}
                                                        {editingVariable !== variable.key && !isFlashRestrictedValue(variable.value) && !variable.editable && (
                                                            <span className={variable.valueClassName}>{variable.label ? `${variable.value} (${variable.label})` : variable.value}</span>
                                                        )}
                                                        {editingVariable !== variable.key && !isFlashRestrictedValue(variable.value) && variable.editable && (
                                                            <BaseButton
                                                                className={`w-full cursor-pointer rounded px-1 text-right text-[#1b57b2] hover:underline ${variable.valueClassName ?? ''}`}
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    onBeginVariableEdit(variable);
                                                                }}
                                                            >
                                                                {variable.label ? `${variable.value} (${variable.label})` : variable.value}
                                                            </BaseButton>
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
                    <div className="relative flex justify-between gap-2">
                        {isInspectionGiveOpen && (
                            <div className="absolute right-0 bottom-full mb-2 w-[210px] rounded border border-[#8d887a] bg-[#efede5] p-3 shadow-[0_2px_8px_rgba(0,0,0,.25)] z-10 flex flex-col gap-2">
                                <Text bold>{localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}</Text>
                                <Select
                                    className="rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]"
                                    value={selectedInspectionGiveDefinition?.itemId ?? 0}
                                    onChange={(event) => onSelectGiveVariable(Number(event.target.value))}
                                >
                                    {!availableInspectionDefinitions.length && (
                                        <option value={0}>{localizeWithFallback('wiredmenu.inspection.no_variables', 'No variables available')}</option>
                                    )}
                                    {availableInspectionDefinitions.map((definition) => (
                                        <option key={definition.itemId} value={definition.itemId}>
                                            {definition.name}
                                        </option>
                                    ))}
                                </Select>
                                <Text bold>{localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}</Text>
                                <NumberInput className="w-[96px] rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px] disabled:opacity-60" disabled={!selectedInspectionGiveDefinition?.hasValue} value={inspectionGiveValue} onChange={(event) => onInspectionGiveValueChange(event.target.value)} />
                                <Button disabled={!canGiveInspectionVariable} variant="secondary" onClick={onGiveInspectionVariable}>
                                    {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                                </Button>
                            </div>
                        )}
                        <Button disabled={!canRemoveInspectionVariable} variant="secondary" onClick={onRemoveInspectionVariable}>
                            {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                        </Button>
                        <Button disabled={!canGiveInspectionVariable} variant="secondary" onClick={() => setIsInspectionGiveOpen((value) => !value)}>
                            {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                        </Button>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
