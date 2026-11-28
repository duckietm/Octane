import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { useHandheldLayout } from '../../../hooks/handheld/useHandheldLayout';
import { VARIABLES_ELEMENTS } from '../WiredCreatorTools.constants';
import { wiredSourceTypeLabelKey } from '../WiredCreatorTools.helpers';
import { VariablesElementType } from '../WiredCreatorTools.types';
import { WiredVariablesTabViewProps } from '../WiredVariablesTabView';
import { useWiredCreatorToolsUiStore } from '../wiredCreatorToolsUiStore';
import {
    HandheldWiredBack,
    HandheldWiredButton,
    HandheldWiredCard,
    HandheldWiredChevron,
    HandheldWiredChoices,
    HandheldWiredEmpty,
    HandheldWiredPair
} from './HandheldWiredParts';

/**
 * The variables tab on a phone: the variable type as chips over the room's variables as a list; a variable opens its
 * page (upright, with Back) or shows beside the list (on its side): what can be done with it (highlight its holders,
 * manage them, its array contents, the Web API explorer, clear it for everyone), its properties and its text values.
 * Same data and handlers as the desktop tab.
 */
export const HandheldWiredVariablesTab: FC<WiredVariablesTabViewProps> = (props) => {
    const {
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
        variableElements = VARIABLES_ELEMENTS,
        showHighlight = true,
        showArrayInspector = true,
        showTextValues = true,
        clearLabel,
        onOpenWebApiExplorer,
        emptyPickerText
    } = props;
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    const variablesType = useWiredCreatorToolsUiStore((s) => s.variablesType);
    const setVariablesType = useWiredCreatorToolsUiStore((s) => s.setVariablesType);
    const isVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.isVariableHighlightActive);
    const setIsVariableHighlightActive = useWiredCreatorToolsUiStore((s) => s.setIsVariableHighlightActive);
    const [openedKey, setOpenedKey] = useState<string | null>(null);
    // Upright a variable is a page of its own while it is the one picked; another type starts on the list again.
    const detailOpen = sideBySide || (!!openedKey && openedKey === selectedVariableDefinition?.key);
    const showList = sideBySide || !detailOpen;
    const clearText = clearLabel ?? localizeWithFallback('wiredmenu.variable_overview.delete_all.title', 'Clear this variable');

    const pick = (key: string) => {
        onPickVariable(key);
        setOpenedKey(key);
    };

    return (
        <div className="octane-handheld-wired__split" data-page={showList ? 'list' : 'detail'} data-testid="wired-variables">
            {showList && (
                <div className="octane-handheld-wired__column is-side">
                    <HandheldWiredChoices<VariablesElementType>
                        choices={variableElements.map((element) => ({
                            key: element.key,
                            label: localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label),
                            icon: element.icon,
                            disabled: element.disabled
                        }))}
                        label={localizeWithFallback('wiredmenu.variable_overview.type', 'Variable type:')}
                        value={variablesType}
                        onChange={(type) => {
                            setVariablesType(type);
                            setOpenedKey(null);
                        }}
                    />
                    <HandheldWiredCard title={localizeWithFallback('wiredmenu.variable_overview.picker', 'Variable picker:')}>
                        {!variablePickerDefinitions.length && (
                            <HandheldWiredEmpty>{emptyPickerText ?? localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</HandheldWiredEmpty>
                        )}
                        <div className="octane-handheld-wired__rows">
                            {variablePickerDefinitions.map((variable) => (
                                <BaseButton
                                    key={variable.key}
                                    aria-current={selectedVariableDefinition?.key === variable.key ? 'true' : undefined}
                                    className={`octane-handheld-wired__row is-link${selectedVariableDefinition?.key === variable.key ? ' is-selected' : ''}`}
                                    data-testid={`wired-picker-${variable.key}`}
                                    onClick={() => pick(variable.key)}
                                >
                                    <span className="octane-handheld-wired__row-key">{variable.key}</span>
                                    <HandheldWiredChevron />
                                </BaseButton>
                            ))}
                        </div>
                    </HandheldWiredCard>
                </div>
            )}
            {detailOpen && (
                <div className="octane-handheld-wired__column" data-testid="wired-variable-detail">
                    {!sideBySide && <HandheldWiredBack onBack={() => setOpenedKey(null)} />}
                    {!selectedVariableDefinition && (
                        <HandheldWiredEmpty>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</HandheldWiredEmpty>
                    )}
                    {!!selectedVariableDefinition && (
                        <>
                            <div className="octane-handheld-wired__title">{selectedVariableDefinition.key}</div>
                            {variablesType === 'context' && (
                                <div className="octane-handheld-wired__note">
                                    Context variables live only during the current wired execution. This tab shows their definitions, text mappings and
                                    execution-scoped capabilities, but not live values from a running stack.
                                </div>
                            )}
                            <div className="octane-handheld-wired__actions is-grid">
                                {showHighlight && (
                                    <HandheldWiredButton
                                        disabled={!canVariableHighlight}
                                        pressed={isVariableHighlightActive}
                                        testId="wired-variable-highlight"
                                        onClick={() => setIsVariableHighlightActive((value) => !value)}
                                    >
                                        {isVariableHighlightActive
                                            ? localizeWithFallback('wiredmenu.variable_overview.unhighlight_holders', 'Undo')
                                            : localizeWithFallback('wiredmenu.variable_overview.highlight_holders', 'Highlight')}
                                    </HandheldWiredButton>
                                )}
                                <HandheldWiredButton disabled={!variableManageCanOpen} testId="wired-variable-manage" onClick={onOpenManagePanel}>
                                    {localizeWithFallback('wiredmenu.variable_overview.manage', 'Manage')}
                                </HandheldWiredButton>
                                {showArrayInspector && (
                                    <HandheldWiredButton disabled={!arrayInspectorCanOpen} testId="wired-variable-contents" onClick={onOpenArrayInspector}>
                                        {localizeWithFallback('wiredmenu.variable_overview.contents', 'Contents')}
                                    </HandheldWiredButton>
                                )}
                                {!!onOpenWebApiExplorer && (
                                    <HandheldWiredButton testId="wired-variable-explorer" onClick={onOpenWebApiExplorer}>
                                        {localizeWithFallback('wiredmenu.variables.web_api_explorer', 'Web API explorer')}
                                    </HandheldWiredButton>
                                )}
                                <HandheldWiredButton disabled={!canVariableClear} testId="wired-variable-clear" tone="danger" onClick={onClearVariable}>
                                    {clearText}
                                </HandheldWiredButton>
                            </div>
                            <HandheldWiredCard title={localizeWithFallback('wiredmenu.variable_overview.properties', 'Properties:')}>
                                {selectedVariableProperties.map((property) => (
                                    <HandheldWiredPair key={property.key} label={property.key} value={property.value} />
                                ))}
                            </HandheldWiredCard>
                            {showTextValues && (
                                <HandheldWiredCard title={localizeWithFallback('wiredmenu.variable_overview.text_values', 'Text values:')}>
                                    {!selectedVariableTextValues.length && (
                                        <HandheldWiredEmpty>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</HandheldWiredEmpty>
                                    )}
                                    {selectedVariableTextValues.map((entry, index) => (
                                        <HandheldWiredPair key={`${entry.value}-${index}`} label={entry.value} value={entry.text} />
                                    ))}
                                </HandheldWiredCard>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
