import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { Button, Text } from '../../common';
import { VARIABLES_ELEMENTS } from './WiredCreatorTools.constants';
import { VariableDefinition, VariablesElementButton, VariablesElementType, VariableTextValue } from './WiredCreatorTools.types';
import { wiredSourceTypeLabelKey } from './WiredCreatorTools.helpers';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export interface WiredVariablesTabViewProps {
    variablePickerDefinitions: VariableDefinition[];
    selectedVariableDefinition: VariableDefinition | null;
    onPickVariable: (key: string) => void;
    canVariableHighlight: boolean;
    variableManageCanOpen: boolean;
    onOpenManagePanel: () => void;
    arrayInspectorCanOpen: boolean;
    onOpenArrayInspector: () => void;
    canVariableClear: boolean;
    onClearVariable: () => void;
    selectedVariableProperties: { key: string; value: string }[];
    selectedVariableTextValues: VariableTextValue[];
    /** Set together with `onVariablesTypeChange` to drive the type from outside the creator tools store. */
    variablesType?: VariablesElementType;
    onVariablesTypeChange?: (type: VariablesElementType) => void;
    variableElements?: VariablesElementButton[];
    showHighlight?: boolean;
    showArrayInspector?: boolean;
    showTextValues?: boolean;
    clearLabel?: string;
    onOpenWebApiExplorer?: () => void;
    /** Shown in the picker while it has nothing to list. */
    emptyPickerText?: string;
}

export const WiredVariablesTabView: FC<WiredVariablesTabViewProps> = ({
    variablePickerDefinitions,
    selectedVariableDefinition,
    onPickVariable,
    canVariableHighlight,
    variableManageCanOpen,
    onOpenManagePanel,
    arrayInspectorCanOpen,
    onOpenArrayInspector,
    canVariableClear,
    onClearVariable,
    selectedVariableProperties,
    selectedVariableTextValues,
    variablesType: controlledVariablesType,
    onVariablesTypeChange,
    variableElements = VARIABLES_ELEMENTS,
    showHighlight = true,
    showArrayInspector = true,
    showTextValues = true,
    clearLabel,
    onOpenWebApiExplorer,
    emptyPickerText
}) => {
    const storeVariablesType = useWiredCreatorToolsUiStore((s) => s.variablesType);
    const setStoreVariablesType = useWiredCreatorToolsUiStore((s) => s.setVariablesType);
    const isControlled = controlledVariablesType !== undefined && !!onVariablesTypeChange;
    const variablesType = isControlled ? controlledVariablesType : storeVariablesType;
    const setVariablesType = isControlled ? onVariablesTypeChange : setStoreVariablesType;
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);

    return (
        <NativeTextTree>
            <div className="p-3 min-h-[360px] flex gap-4">
                <div className="w-[205px] shrink-0 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredmenu.variable_overview.type', 'Variable type:')}</Text>
                        <div className="flex gap-1">
                            {variableElements.map((element) => (
                                <Hint key={element.key} content={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}><BaseButton aria-label={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}
                                    type="button"
                                    className={`w-[42px] h-[38px] rounded border flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,.7)] ${element.disabled ? 'border-[#b7b7b7] bg-[#e7e3da] opacity-60 cursor-not-allowed' : variablesType === element.key ? 'border-[#222] bg-[#d9d6cf]' : 'border-[#7f7f7f] bg-[#ece9e1]'}`}
                                    disabled={element.disabled}
                                    onClick={() => !element.disabled && setVariablesType(element.key)}
                                >
                                    <img alt="" className="w-auto h-auto max-w-[22px] max-h-[22px] object-contain" src={element.icon} />
                                </BaseButton></Hint>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 min-h-0 grow">
                        <Text bold>{localizeWithFallback('wiredmenu.variable_overview.picker', 'Variable picker:')}</Text>
                        <div className="grow rounded border border-[#bdb8ab] bg-white overflow-hidden">
                            <div className="max-h-[408px] overflow-y-auto">
                                <table className="w-full text-[12px]">
                                    <tbody>
                                        {variablePickerDefinitions.map((variable, index) => (
                                            <tr
                                                key={variable.key}
                                                className={`cursor-pointer ${selectedVariableDefinition?.key === variable.key ? 'bg-[#d7dfea]' : index % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'} hover:bg-[#e8eefc]`}
                                                onClick={() => onPickVariable(variable.key)}
                                            >
                                                <td className="px-3 py-1 text-[#444]">{variable.key}</td>
                                            </tr>
                                        ))}
                                        {!variablePickerDefinitions.length && !!emptyPickerText && (
                                            <tr>
                                                <td className="px-3 py-2 text-[#777] text-center">{emptyPickerText}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {showHighlight && (
                            <Hint content={localizeWithFallback('wiredmenu.variable_overview.highlight_holders.tooltip', 'Highlight all users/furni inside the room that are holding this variable')}>
                                <Button disabled={!canVariableHighlight} variant="secondary" onClick={() => setIsVariableHighlightActive((value) => !value)}>
                                    {isVariableHighlightActive
                                        ? localizeWithFallback('wiredmenu.variable_overview.unhighlight_holders', 'Undo')
                                        : localizeWithFallback('wiredmenu.variable_overview.highlight_holders', 'Highlight')}
                                </Button>
                            </Hint>
                        )}
                        <Hint content={localizeWithFallback('wiredmenu.variable_overview.manage.tooltip', 'Manage all users who are holding this variable')}>
                            <Button disabled={!variableManageCanOpen} variant="secondary" onClick={onOpenManagePanel}>
                                {localizeWithFallback('wiredmenu.variable_overview.manage', 'Manage')}
                            </Button>
                        </Hint>
                        {showArrayInspector && (
                            <Button disabled={!arrayInspectorCanOpen} variant="secondary" onClick={onOpenArrayInspector}>
                                {localizeWithFallback('wiredmenu.variable_overview.contents', 'Contents')}
                            </Button>
                        )}
                        <Button disabled={!canVariableClear} variant="secondary" onClick={onClearVariable}>
                            {clearLabel ?? localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable')}
                        </Button>
                        {!!onOpenWebApiExplorer && (
                            <Button variant="secondary" onClick={onOpenWebApiExplorer}>
                                {localizeWithFallback('wiredmenu.variables.web_api_explorer', 'Web API explorer')}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="min-w-0 grow flex flex-col gap-3">
                    {variablesType === 'context' && (
                        <div className="rounded border border-[#c8b98f] bg-[#fff7df] px-3 py-2 text-[12px] text-[#6a5d33]">
                            Context variables live only during the current wired execution. This tab shows their definitions, text mappings and execution-scoped
                            capabilities, but not live values from a running stack.
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredmenu.variable_overview.properties', 'Properties:')}</Text>
                        <div className="rounded border border-[#bdb8ab] bg-white overflow-hidden">
                            <div className="grid grid-cols-[1fr_120px] border-b border-[#d8d4c8] bg-[#f5f2ea] px-3 py-2 text-[12px] font-bold text-[#333]">
                                <span>{localizeWithFallback('wiredmenu.variable_overview.properties.column.property', 'Property')}</span>
                                <span>{localizeWithFallback('wiredmenu.variable_overview.properties.column.value', 'Value')}</span>
                            </div>
                            <div className="max-h-[210px] overflow-y-auto">
                                <table className="w-full text-[12px]">
                                    <tbody>
                                        {selectedVariableProperties.map((property, index) => (
                                            <tr key={property.key} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                                                <td className="px-3 py-1 text-[#444]">{property.key}</td>
                                                <td className="px-3 py-1 text-[#222]">{property.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {showTextValues && (
                        <div className="flex flex-col gap-1 min-h-0 grow">
                            <Text bold>{localizeWithFallback('wiredmenu.variable_overview.text_values', 'Text values:')}</Text>
                            <div className="grow rounded border border-[#bdb8ab] bg-white overflow-hidden">
                                <div className="grid grid-cols-[120px_1fr] border-b border-[#d8d4c8] bg-[#f5f2ea] px-3 py-2 text-[12px] font-bold text-[#333]">
                                    <span>{localizeWithFallback('wiredmenu.variable_overview.text.column.value', 'Value')}</span>
                                    <span>{localizeWithFallback('wiredmenu.variable_overview.text.column.text', 'Text')}</span>
                                </div>
                                {!selectedVariableTextValues.length && (
                                    <div className="h-[calc(100%-37px)] flex items-center justify-center text-[#333333] text-[12px]">
                                        <Text>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</Text>
                                    </div>
                                )}
                                {!!selectedVariableTextValues.length && (
                                    <div className="max-h-[178px] overflow-y-auto">
                                        <table className="w-full text-[12px]">
                                            <tbody>
                                                {selectedVariableTextValues.map((entry, index) => (
                                                    <tr key={`${entry.value}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                                                        <td className="px-3 py-1 text-[#444]">{entry.value}</td>
                                                        <td className="px-3 py-1 text-[#222]">{entry.text}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
