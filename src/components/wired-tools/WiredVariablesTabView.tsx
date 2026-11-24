import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import deleteIcon from '../../assets/images/groups/native/forum_forum_hide.png';
import { Button } from '../../common';
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

    const clearText = clearLabel ?? localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable');

    // AIR wired_menu_view, variable_overview_container (500 x 382). Left column, 188 wide at x 14: the type buttons in
    // their box, the variable picker as the AIR table, and the button row (Highlight, Manage, the red delete button).
    // Right column, 256 wide at x 230: the properties table over the text values table. The buttons AIR does not
    // have (Contents, the Web API explorer) sit on a row of their own under AIR's.
    return (
        <NativeTextTree>
            <div className="octane-wired-variables">
                <div className="octane-wired-variables__left">
                    <div className="octane-wired-variables__block">
                        <b>{localizeWithFallback('wiredmenu.variable_overview.type', 'Variable type:')}</b>
                        <div className="octane-wired-variables__types">
                            {variableElements.map((element) => (
                                <Hint key={element.key} content={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}>
                                    <BaseButton
                                        aria-label={localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label)}
                                        aria-pressed={variablesType === element.key}
                                        type="button"
                                        className={`octane-wired-variables__type${variablesType === element.key ? ' is-selected' : ''}`}
                                        disabled={element.disabled}
                                        onClick={() => !element.disabled && setVariablesType(element.key)}
                                    >
                                        <img alt="" draggable={false} src={element.icon} />
                                    </BaseButton>
                                </Hint>
                            ))}
                        </div>
                    </div>
                    <div className="octane-wired-variables__block is-picker">
                        <b>{localizeWithFallback('wiredmenu.variable_overview.picker', 'Variable picker:')}</b>
                        <div className="octane-wired-table__border octane-wired-variables__picker">
                            <table>
                                <tbody>
                                    {variablePickerDefinitions.map((variable) => (
                                        <tr
                                            key={variable.key}
                                            aria-selected={selectedVariableDefinition?.key === variable.key}
                                            className={selectedVariableDefinition?.key === variable.key ? 'is-selected' : ''}
                                            onClick={() => onPickVariable(variable.key)}
                                        >
                                            <td title={variable.key}>{variable.key}</td>
                                        </tr>
                                    ))}
                                    {!variablePickerDefinitions.length && !!emptyPickerText && (
                                        <tr className="is-empty">
                                            <td>{emptyPickerText}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="octane-wired-variables__buttons">
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
                        {/* delete_button: the red 25 x 25 container_button with the forum_forum_hide icon. */}
                        <Hint content={clearLabel ?? localizeWithFallback('wiredmenu.variable_overview.delete_all.tooltip', clearText)}>
                            <BaseButton aria-label={clearText} className="octane-wired-variables__delete" disabled={!canVariableClear} type="button" onClick={onClearVariable}>
                                <img alt="" draggable={false} src={deleteIcon} />
                            </BaseButton>
                        </Hint>
                    </div>
                    {(showArrayInspector || !!onOpenWebApiExplorer) && (
                        <div className="octane-wired-variables__buttons is-extra">
                            {showArrayInspector && (
                                <Button disabled={!arrayInspectorCanOpen} variant="secondary" onClick={onOpenArrayInspector}>
                                    {localizeWithFallback('wiredmenu.variable_overview.contents', 'Contents')}
                                </Button>
                            )}
                            {!!onOpenWebApiExplorer && (
                                <Button variant="secondary" onClick={onOpenWebApiExplorer}>
                                    {localizeWithFallback('wiredmenu.variables.web_api_explorer', 'Web API explorer')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <div className="octane-wired-variables__right">
                    {variablesType === 'context' && (
                        <div className="octane-wired-variables__note">
                            Context variables live only during the current wired execution. This tab shows their definitions, text mappings and execution-scoped
                            capabilities, but not live values from a running stack.
                        </div>
                    )}
                    <div className="octane-wired-variables__block">
                        <b>{localizeWithFallback('wiredmenu.variable_overview.properties', 'Properties:')}</b>
                        <div className="octane-wired-table__border octane-wired-variables__properties">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{localizeWithFallback('wiredmenu.variable_overview.properties.column.property', 'Property')}</th>
                                        <th className="octane-wired-variables__value-column">{localizeWithFallback('wiredmenu.variable_overview.properties.column.value', 'Value')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedVariableProperties.map((property) => (
                                        <tr key={property.key}>
                                            <td title={property.key}>{property.key}</td>
                                            <td title={property.value}>{property.value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {showTextValues && (
                        <div className="octane-wired-variables__block">
                            <b>{localizeWithFallback('wiredmenu.variable_overview.text_values', 'Text values:')}</b>
                            <div className="octane-wired-table__border octane-wired-variables__texts">
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="octane-wired-variables__value-column">{localizeWithFallback('wiredmenu.variable_overview.text.column.value', 'Value')}</th>
                                            <th>{localizeWithFallback('wiredmenu.variable_overview.text.column.text', 'Text')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!selectedVariableTextValues.length && (
                                            <tr className="is-empty">
                                                <td colSpan={2}>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</td>
                                            </tr>
                                        )}
                                        {selectedVariableTextValues.map((entry, index) => (
                                            <tr key={`${entry.value}-${index}`}>
                                                <td>{entry.value}</td>
                                                <td title={entry.text}>{entry.text}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
