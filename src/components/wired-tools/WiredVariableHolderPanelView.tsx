import { KeyboardEvent, ReactNode } from 'react';
import { Button, DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { Select } from '../../common/Select';
import { NumberInput } from '../../common/NumberInput';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { localizeWithFallback } from '../../api';
import { HANDHELD_MIN_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { HandheldWiredHolderPanel } from './handheld/HandheldWiredHolderPanel';

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
    /** Phone layout: saves the value being edited (the desktop field saves on Enter). */
    onCommitEdit?: () => void;
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
    const isHandheld = useIsHandheld();

    // A phone shows the holder as a page of the sheet, with the same data and writes.
    if (isHandheld) return <HandheldWiredHolderPanel {...props} />;

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

    // AIR variables_management_detail (339 wide): the info box with Refresh beside it, the holder's picture (94 x 94)
    // next to its text box, the variables in the AIR table, and two 145 px buttons under it. A value is edited after
    // a double click on it; Give variable opens the create bubble over the table.
    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_MIN_FRAME_SCALE}
                className="octane-wired-menu octane-wired-holder"
                theme="primary-slim"
                uniqueKey={uniqueKey}
                windowPosition={DraggableWindowPosition.TOP_LEFT}
                offsetLeft={offsetLeft}
                offsetTop={offsetTop}
            >
                <OctaneCardHeaderView headerText={title} onCloseClick={onClose} />
                <OctaneCardContentView className="octane-wired-holder__content" overflow="hidden">
                    <div className="octane-wired-holder__top">
                        <div className="octane-wired-logs__info octane-wired-holder__info">{warningText}</div>
                        <Button variant="secondary" onClick={onRefresh}>
                            {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                        </Button>
                    </div>
                    <div className="octane-wired-holder__section">
                        <b>{localizeWithFallback('wiredmenu.variable_management_detail.holder_info', 'Holder info:')}</b>
                        <div className="octane-wired-holder__holder">
                            <div className="octane-wired-holder__preview">{preview}</div>
                            <div className="octane-wired-holder__lines">
                                {infoLines.map((line, index) => (
                                    <div key={`${line}-${index}`}>{line}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {status}
                    <div className="octane-wired-holder__section is-variables">
                        <b>{variablesTitle}</b>
                        <div className="octane-wired-table__border octane-wired-holder__table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{localizeWithFallback('octane.wired_tools.variable', 'Variable')}</th>
                                        <th className="octane-wired-holder__value-column">{localizeWithFallback('octane.wired_tools.value', 'Value')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!entries.length && (
                                        <tr className="is-empty">
                                            <td colSpan={2}>{localizeWithFallback('octane.wired_tools.no_variables_currently_assigned', 'No variables currently assigned')}</td>
                                        </tr>
                                    )}
                                    {entries.map((entry) => {
                                        const isSelected = selectedId === entry.id;
                                        const isEditing = editingId === entry.id;
                                        const isEditable = canEdit && !entry.isReadOnly;

                                        return (
                                            <tr key={entry.id} aria-selected={isSelected} className={isSelected ? 'is-selected' : ''} onClick={() => onSelect(entry.id)}>
                                                <td title={entry.availability ? `${entry.name} (${entry.availability})` : entry.name}>{entry.name}</td>
                                                <td
                                                    className="octane-wired-holder__value-column"
                                                    onDoubleClick={() => {
                                                        // AIR TableCellView: an editable cell turns into its field on a double click.
                                                        if (entry.hasValue && isEditable && !isEditing) onBeginEdit(entry);
                                                    }}
                                                >
                                                    {!entry.hasValue && '/'}
                                                    {!!entry.hasValue && !isEditing && (entry.value ?? 0)}
                                                    {!!entry.hasValue && isEditing && (
                                                        <NumberInput autoFocus className="octane-wired-holder__value-input" steppers={false} value={editingValue} onBlur={onEditBlur} onChange={(event) => onEditingValueChange(event.target.value)} onClick={(event) => event.stopPropagation()} onKeyDownCapture={onEditKeyDown} />
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
                    <div className="octane-wired-holder__buttons">
                        {isGiveOpen && (
                            <div className="octane-wired-holder__bubble">
                                <b>{localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}</b>
                                <Select value={selectedGiveOption?.id ?? ''} onChange={(event) => onGiveSelect(event.target.value)}>
                                    {!giveOptions.length && <option value="">{localizeWithFallback('octane.wired_tools.no_variables_available', 'No variables available')}</option>}
                                    {giveOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </Select>
                                <b>{localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}</b>
                                <NumberInput className="octane-wired-holder__give-value" disabled={!selectedGiveOption?.hasValue} steppers={false} value={giveValue} onChange={(event) => onGiveValueChange(event.target.value)} />
                                <Button disabled={!canGive || !selectedGiveOption} variant="secondary" onClick={onGive}>
                                    {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                                </Button>
                            </div>
                        )}
                        <Button disabled={!canRemove} variant="secondary" onClick={onRemove}>
                            {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                        </Button>
                        <Button disabled={!canGive} variant="secondary" onClick={onToggleGive}>
                            {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                        </Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
