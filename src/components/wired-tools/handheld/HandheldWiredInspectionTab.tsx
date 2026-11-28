import { FC, useEffect, useRef } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import wiredGlobalPlaceholderImage from '../../../assets/images/wiredtools/wired_global_placeholder.png';
import { LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView } from '../../../common';
import { Checkbox } from '../../../common/Checkbox';
import { NumberInput } from '../../../common/NumberInput';
import { Select } from '../../../common/Select';
import { ToggleButton } from '../../../common/ToggleButton';
import { INSPECTION_ELEMENTS, PACKED_WIRED_VARIABLE_KEYS } from '../WiredCreatorTools.constants';
import { wiredSourceTypeLabelKey } from '../WiredCreatorTools.helpers';
import { InspectionElementType } from '../WiredCreatorTools.types';
import { isFlashRestrictedValue, WiredInspectionTabViewProps } from '../WiredInspectionTabView';
import { useWiredCreatorToolsUiStore } from '../wiredCreatorToolsUiStore';
import { HandheldWiredButton, HandheldWiredCard, HandheldWiredChoices, HandheldWiredEmpty, HandheldWiredField } from './HandheldWiredParts';

export interface HandheldWiredInspectionTabProps extends WiredInspectionTabViewProps {
    /** Saves the value being edited (the desktop field saves on Enter; the phone has a Save button too). */
    onCommitVariableEdit: () => void;
    /** Puts the sheet aside until a furni or user is tapped in the room. */
    onStartPicking: () => void;
}

/**
 * The inspection tab on a phone: the element type as chips, the inspected furni or user as a card (picture, name,
 * "Pick in room", highlight its wired, keep selected), its variables as finger-sized rows that open their value for
 * editing in place, and Remove / Give variable at the foot, Give opening its form as a card. Upright one column; on
 * its side the holder sits left of the variables. The data and every handler are the desktop tab's.
 */
export const HandheldWiredInspectionTab: FC<HandheldWiredInspectionTabProps> = (props) => {
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
        onCommitVariableEdit,
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
        onToggleHighlightWireds,
        onStartPicking
    } = props;
    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const setIsInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.setIsInspectionGiveOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);
    const giveForm = useRef<HTMLDivElement>(null);

    // The form opens under the list, next to the sticky bar: bring it into view.
    useEffect(() => {
        if (isInspectionGiveOpen) giveForm.current?.scrollIntoView?.({ block: 'nearest' });
    }, [isInspectionGiveOpen]);

    const holderName = inspectionType === 'furni' ? (selectedFurni?.info?.name ?? '') : inspectionType === 'user' ? (selectedUser?.name ?? '') : '';
    const hasHolder = (inspectionType === 'furni' && !!selectedFurni) || (inspectionType === 'user' && !!selectedUser);

    return (
        <div className="octane-handheld-wired__split" data-testid="wired-inspection">
            <div className="octane-handheld-wired__column is-side">
                <HandheldWiredChoices<InspectionElementType>
                    choices={INSPECTION_ELEMENTS.map((element) => ({
                        key: element.key,
                        label: localizeWithFallback(wiredSourceTypeLabelKey(element.key), element.label),
                        icon: element.icon
                    }))}
                    label={localizeWithFallback('wiredmenu.inspection.type', 'Element type:')}
                    value={inspectionType}
                    onChange={setInspectionType}
                />
                <HandheldWiredCard className="octane-handheld-wired__holder" testId="wired-holder">
                    <div className="octane-handheld-wired__holder-row">
                        <div className="octane-handheld-wired__preview">
                            {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                                <LayoutRoomObjectImageView
                                    key={`${selectedFurni.objectId}-${previewRevision ?? 0}`}
                                    category={selectedFurni.category}
                                    objectId={selectedFurni.objectId}
                                    roomId={roomId}
                                />
                            )}
                            {inspectionType === 'user' &&
                                selectedUser &&
                                (selectedUser.kind === 'pet' ? (
                                    <LayoutPetImageView direction={2} figure={selectedUser.figure} posture={selectedUser.posture} />
                                ) : (
                                    <LayoutAvatarImageView direction={2} figure={selectedUser.figure} />
                                ))}
                            {inspectionType === 'global' && (
                                <img
                                    alt={localizeWithFallback('octane.wired_tools.global_placeholder', 'Global placeholder')}
                                    src={wiredGlobalPlaceholderImage}
                                />
                            )}
                        </div>
                        <div className="octane-handheld-wired__holder-text">
                            {hasHolder ? (
                                <div className="octane-handheld-wired__holder-name">{holderName}</div>
                            ) : (
                                inspectionType !== 'global' && <div className="octane-handheld-wired__holder-hint">{previewPlaceholder}</div>
                            )}
                            {inspectionType === 'global' && (
                                <div className="octane-handheld-wired__holder-name">{localizeWithFallback(wiredSourceTypeLabelKey('global'), 'Global')}</div>
                            )}
                            {inspectionType !== 'global' && (
                                <label className="octane-handheld-wired__check">
                                    <Checkbox checked={keepSelected} onCheckedChange={(nextChecked) => onKeepSelectedChange(nextChecked)} />
                                    <span>{localizeWithFallback('wiredmenu.inspection.pin', 'Keep selected')}</span>
                                </label>
                            )}
                        </div>
                    </div>
                    {inspectionType !== 'global' && (
                        <div className="octane-handheld-wired__actions">
                            <HandheldWiredButton disabled={keepSelected} testId="wired-pick" tone="primary" onClick={onStartPicking}>
                                {localizeWithFallback('octane.handheld.wired_tools.pick', 'Pick in room')}
                            </HandheldWiredButton>
                            {inspectionType === 'furni' && (
                                <HandheldWiredButton
                                    disabled={!canHighlightWireds}
                                    pressed={isHighlightingWireds}
                                    testId="wired-highlight-wireds"
                                    onClick={() => onToggleHighlightWireds?.()}
                                >
                                    <img
                                        alt=""
                                        draggable={false}
                                        src={(GetConfigurationValue<string>('catalog.asset.icon.url', '') ?? '').replace('%name%', '80')}
                                    />
                                    <span>{localizeWithFallback('octane.handheld.wired_tools.highlight_wireds', 'Show its wired')}</span>
                                </HandheldWiredButton>
                            )}
                        </div>
                    )}
                </HandheldWiredCard>
            </div>
            <div className="octane-handheld-wired__column">
                <HandheldWiredCard title={localizeWithFallback('wiredmenu.inspection.variables', 'Variables:')} testId="wired-inspection-variables">
                    {!displayedVariables.length && (
                        <HandheldWiredEmpty>{localizeWithFallback('wiredmenu.table.empty', 'Nothing to display')}</HandheldWiredEmpty>
                    )}
                    <div className="octane-handheld-wired__rows">
                        {displayedVariables.map((variable) => {
                            const isSelected = selectedInspectionVariableKey === variable.key;
                            const isEditing = editingVariable === variable.key;
                            const hidden = isFlashRestrictedValue(variable.value);
                            const shown = variable.label ? `${variable.value} (${variable.label})` : variable.value;

                            if (isEditing)
                                return (
                                    <div key={variable.key} className="octane-handheld-wired__row is-editing" data-testid={`wired-variable-${variable.key}`}>
                                        <span className="octane-handheld-wired__row-key">{variable.key}</span>
                                        <div className="octane-handheld-wired__editor">
                                            <input
                                                autoFocus
                                                aria-label={variable.key}
                                                className="octane-handheld-wired__input"
                                                spellCheck={false}
                                                type="text"
                                                value={editingValue}
                                                onChange={(event) => setEditingValue(event.target.value)}
                                                onKeyDownCapture={onVariableInputKeyDown}
                                            />
                                            <HandheldWiredButton testId="wired-variable-save" tone="primary" onClick={onCommitVariableEdit}>
                                                {localizeWithFallback('generic.save', 'Save')}
                                            </HandheldWiredButton>
                                            <HandheldWiredButton testId="wired-variable-cancel" onClick={onCancelVariableEdit}>
                                                {localizeWithFallback('generic.cancel', 'Cancel')}
                                            </HandheldWiredButton>
                                        </div>
                                    </div>
                                );

                            return (
                                <ToggleButton
                                    key={variable.key}
                                    pressed={isSelected}
                                    className={`octane-handheld-wired__row${isSelected ? ' is-selected' : ''}${variable.editable ? ' is-editable' : ''}`}
                                    data-testid={`wired-variable-${variable.key}`}
                                    onClick={() => onSelectInspectionVariable(variable)}
                                >
                                    <span className="octane-handheld-wired__row-key">
                                        {variable.key}
                                        {isSelected && PACKED_WIRED_VARIABLE_KEYS.has(variable.key) && (
                                            <span className="octane-handheld-wired__row-note">
                                                {localizeWithFallback(
                                                    'wiredmenu.inspection.packed_variable.desc',
                                                    'This is a packed variable that lets you read and write\nseveral other variables at once'
                                                )}
                                            </span>
                                        )}
                                    </span>
                                    <span className={`octane-handheld-wired__row-value ${hidden ? 'is-hidden' : (variable.valueClassName ?? '')}`.trim()}>
                                        {hidden ? localizeWithFallback('wiredmenu.inspection.flash_restriction.text', 'Hidden') : shown}
                                    </span>
                                </ToggleButton>
                            );
                        })}
                    </div>
                </HandheldWiredCard>
                {isInspectionGiveOpen && (
                    <div ref={giveForm} className="octane-handheld-wired__give">
                        <HandheldWiredCard
                            className="is-form"
                            testId="wired-give-form"
                            title={localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                        >
                            <HandheldWiredField label={localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}>
                                <Select
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
                            </HandheldWiredField>
                            <HandheldWiredField label={localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}>
                                <NumberInput
                                    disabled={!selectedInspectionGiveDefinition?.hasValue}
                                    value={inspectionGiveValue}
                                    onChange={(event) => onInspectionGiveValueChange(event.target.value)}
                                />
                            </HandheldWiredField>
                            <div className="octane-handheld-wired__actions">
                                <HandheldWiredButton onClick={() => setIsInspectionGiveOpen(false)}>
                                    {localizeWithFallback('generic.cancel', 'Cancel')}
                                </HandheldWiredButton>
                                <HandheldWiredButton
                                    disabled={!canGiveInspectionVariable}
                                    testId="wired-give-create"
                                    tone="primary"
                                    onClick={onGiveInspectionVariable}
                                >
                                    {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                                </HandheldWiredButton>
                            </div>
                        </HandheldWiredCard>
                    </div>
                )}
                <div className="octane-handheld-wired__bar is-sticky">
                    <HandheldWiredButton disabled={!canRemoveInspectionVariable} testId="wired-remove-variable" onClick={onRemoveInspectionVariable}>
                        {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                    </HandheldWiredButton>
                    <HandheldWiredButton
                        disabled={!canGiveInspectionVariable}
                        pressed={isInspectionGiveOpen}
                        testId="wired-give-variable"
                        onClick={() => setIsInspectionGiveOpen((value) => !value)}
                    >
                        {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                    </HandheldWiredButton>
                </div>
            </div>
        </div>
    );
};
