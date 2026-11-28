import { FC, useEffect, useRef } from 'react';
import { localizeWithFallback } from '../../../api';
import { NumberInput } from '../../../common/NumberInput';
import { Select } from '../../../common/Select';
import { ToggleButton } from '../../../common/ToggleButton';
import type { WiredVariableHolderPanelViewProps } from '../WiredVariableHolderPanelView';
import { HandheldWiredButton, HandheldWiredCard, HandheldWiredEmpty, HandheldWiredField, HandheldWiredPage } from './HandheldWiredParts';

/**
 * A holder of a variable on a phone (opened by "Manage" in the variable management): a page beside the holders on
 * its side, over them upright. Who the holder is (picture and lines), its variables as rows that open their value
 * for editing with Save / Cancel (the desktop edits after a double click), then Remove / Give variable, Give opening
 * its form as a card. Every value and write is the desktop panel's.
 */
export const HandheldWiredHolderPanel: FC<WiredVariableHolderPanelViewProps> = (props) => {
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
        onCommitEdit,
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
        uniqueKey = 'wired-variable-management-entry'
    } = props;
    const selectedGiveOption = giveOptions.find((option) => option.id === giveSelectedId) ?? null;
    const giveForm = useRef<HTMLDivElement>(null);

    // The form opens under the list, next to the sticky bar: bring it into view.
    useEffect(() => {
        if (isGiveOpen) giveForm.current?.scrollIntoView?.({ block: 'nearest' });
    }, [isGiveOpen]);

    return (
        <HandheldWiredPage
            side
            actions={
                <HandheldWiredButton testId="wired-holder-refresh" onClick={onRefresh}>
                    {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                </HandheldWiredButton>
            }
            title={title}
            uniqueKey={uniqueKey}
            onClose={onClose}
        >
            {!!warningText && <div className="octane-handheld-wired__note">{warningText}</div>}
            <HandheldWiredCard title={localizeWithFallback('wiredmenu.variable_management_detail.holder_info', 'Holder info:')}>
                <div className="octane-handheld-wired__holder-row">
                    <div className="octane-handheld-wired__preview">{preview}</div>
                    <div className="octane-handheld-wired__holder-text">
                        {infoLines.map((line, index) => (
                            <div key={`${line}-${index}`} className="octane-handheld-wired__line">
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            </HandheldWiredCard>
            {status}
            <HandheldWiredCard title={variablesTitle}>
                {!entries.length && (
                    <HandheldWiredEmpty>
                        {localizeWithFallback('octane.wired_tools.no_variables_currently_assigned', 'No variables currently assigned')}
                    </HandheldWiredEmpty>
                )}
                <div className="octane-handheld-wired__rows">
                    {entries.map((entry) => {
                        const isSelected = selectedId === entry.id;
                        const isEditing = editingId === entry.id;
                        const isEditable = canEdit && !entry.isReadOnly && entry.hasValue;

                        if (isEditing)
                            return (
                                <div key={entry.id} className="octane-handheld-wired__row is-editing" data-testid={`wired-holder-variable-${entry.id}`}>
                                    <span className="octane-handheld-wired__row-key">{entry.name}</span>
                                    <div className="octane-handheld-wired__editor">
                                        <NumberInput
                                            autoFocus
                                            aria-label={entry.name}
                                            steppers={false}
                                            value={editingValue}
                                            onChange={(event) => onEditingValueChange(event.target.value)}
                                            onKeyDownCapture={onEditKeyDown}
                                        />
                                        {!!onCommitEdit && (
                                            <HandheldWiredButton testId="wired-holder-save" tone="primary" onClick={onCommitEdit}>
                                                {localizeWithFallback('generic.save', 'Save')}
                                            </HandheldWiredButton>
                                        )}
                                        <HandheldWiredButton testId="wired-holder-cancel" onClick={onEditBlur}>
                                            {localizeWithFallback('generic.cancel', 'Cancel')}
                                        </HandheldWiredButton>
                                    </div>
                                </div>
                            );

                        return (
                            <ToggleButton
                                key={entry.id}
                                className={`octane-handheld-wired__row${isSelected ? ' is-selected' : ''}${isEditable ? ' is-editable' : ''}`}
                                data-testid={`wired-holder-variable-${entry.id}`}
                                pressed={isSelected}
                                onClick={() => {
                                    // A tap selects the variable; a second tap on the selected one opens its value.
                                    if (isSelected && isEditable) onBeginEdit(entry);
                                    else onSelect(entry.id);
                                }}
                            >
                                <span className="octane-handheld-wired__row-key">
                                    {entry.name}
                                    {!!entry.availability && <span className="octane-handheld-wired__row-note">{entry.availability}</span>}
                                </span>
                                <span className="octane-handheld-wired__row-value">{entry.hasValue ? (entry.value ?? 0) : '/'}</span>
                            </ToggleButton>
                        );
                    })}
                </div>
                {!!selectedId &&
                    canEdit &&
                    entries.some((entry) => entry.id === selectedId && entry.hasValue && !entry.isReadOnly) &&
                    editingId !== selectedId && (
                        <p className="octane-handheld-wired__muted">
                            {localizeWithFallback('octane.handheld.wired_tools.tap_to_edit', 'Tap the selected variable again to change its value.')}
                        </p>
                    )}
            </HandheldWiredCard>
            {extraActions}
            {isGiveOpen && (
                <div ref={giveForm} className="octane-handheld-wired__give">
                    <HandheldWiredCard className="is-form" title={localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}>
                        <HandheldWiredField label={localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}>
                            <Select value={selectedGiveOption?.id ?? ''} onChange={(event) => onGiveSelect(event.target.value)}>
                                {!giveOptions.length && (
                                    <option value="">{localizeWithFallback('octane.wired_tools.no_variables_available', 'No variables available')}</option>
                                )}
                                {giveOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </Select>
                        </HandheldWiredField>
                        <HandheldWiredField label={localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}>
                            <NumberInput
                                disabled={!selectedGiveOption?.hasValue}
                                steppers={false}
                                value={giveValue}
                                onChange={(event) => onGiveValueChange(event.target.value)}
                            />
                        </HandheldWiredField>
                        <HandheldWiredButton disabled={!canGive || !selectedGiveOption} testId="wired-holder-give-create" tone="primary" onClick={onGive}>
                            {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                        </HandheldWiredButton>
                    </HandheldWiredCard>
                </div>
            )}
            <div className="octane-handheld-wired__bar is-sticky">
                <HandheldWiredButton disabled={!canRemove} testId="wired-holder-remove" onClick={onRemove}>
                    {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                </HandheldWiredButton>
                <HandheldWiredButton disabled={!canGive} pressed={isGiveOpen} testId="wired-holder-give" onClick={onToggleGive}>
                    {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                </HandheldWiredButton>
            </div>
        </HandheldWiredPage>
    );
};
