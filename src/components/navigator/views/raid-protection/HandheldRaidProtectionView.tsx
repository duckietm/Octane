import { FC, useId } from 'react';
import { IRaidProtectionEditable } from '../../../../api/navigator/RaidProtection';
import { BaseButton } from '../../../../common/BaseButton';
import { Checkbox } from '../../../../common/Checkbox';
import { DraggableWindow } from '../../../../common/draggable-window';
import { HandheldSheetFrame } from '../../../../common/handheld/HandheldSheetFrame';
import { Select } from '../../../../common/Select';

export interface HandheldRaidOption {
    value: number;
    label: string;
}

interface HandheldRaidProtectionViewProps {
    form: IRaidProtectionEditable;
    text: (key: string, fallback: string) => string;
    sensitivityOptions: HandheldRaidOption[];
    actionOptions: HandheldRaidOption[];
    banOptions: HandheldRaidOption[];
    guardOptions: HandheldRaidOption[];
    protectionDisabled: boolean;
    banDisabled: boolean;
    guardDisabled: boolean;
    incidentActive: boolean;
    inactiveText: string;
    busy: boolean;
    onUpdate: (patch: Partial<IRaidProtectionEditable>) => void;
    onSave: () => void;
    onClose: () => void;
}

/** A switch row of the phone sheet: the whole 44 px row is the checkbox' label. */
const ToggleRow: FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => {
    const id = useId();

    return (
        <label className="octane-handheld-rx-raid__toggle" htmlFor={id}>
            <span className="octane-handheld-rx-raid__toggle-text" id={`${id}-text`}>
                {label}
            </span>
            <Checkbox aria-labelledby={`${id}-text`} checked={checked} id={id} onCheckedChange={onChange} />
        </label>
    );
};

/** A choice of the sheet: its label over a 44 px drop-down. */
const ChoiceRow: FC<{ label: string; value: number; options: HandheldRaidOption[]; disabled: boolean; onChange: (value: number) => void }> = ({
    label,
    value,
    options,
    disabled,
    onChange
}) => (
    <div className="octane-handheld-rx-raid__choice" data-disabled={disabled || undefined}>
        <span className="octane-handheld-rx-raid__choice-label">{label}</span>
        <Select
            aria-label={label}
            className="octane-handheld-rx__select"
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </Select>
    </div>
);

/**
 * Raid protection on a phone: a sheet with the advice, the protection card (switch, sensitivity, action, ban length), the
 * guard card, the raid status and Cancel / Save in a bar at the bottom; on its side the two cards stand side by side.
 * NavigatorRaidProtectionView keeps the form, the confirmation and the packets.
 */
export const HandheldRaidProtectionView: FC<HandheldRaidProtectionViewProps> = (props) => {
    const {
        form,
        text,
        sensitivityOptions,
        actionOptions,
        banOptions,
        guardOptions,
        protectionDisabled,
        banDisabled,
        guardDisabled,
        incidentActive,
        inactiveText,
        busy,
        onUpdate,
        onSave,
        onClose
    } = props;

    return (
        <DraggableWindow handheldSheet uniqueKey="raid-protection-settings">
            <HandheldSheetFrame
                className="octane-handheld-rx octane-handheld-rx-raid"
                icon="icon-cog"
                title={text('title', 'Raid protection')}
                onClose={onClose}
            >
                <div className="octane-handheld-rx__scroll" data-testid="handheld-raid-protection">
                    <p className="octane-handheld-rx-raid__advice">
                        {text('warning', 'Switch this on when you expect an unwanted raid. Start busy games or events with a lower sensitivity.')}
                    </p>
                    <div className="octane-handheld-rx-raid__cards">
                        <section className="octane-handheld-rx__card">
                            <ToggleRow
                                checked={form.enabled}
                                label={text('enabled', 'Turn on raid protection')}
                                onChange={(checked) => onUpdate({ enabled: checked })}
                            />
                            <ChoiceRow
                                disabled={protectionDisabled}
                                label={text('detection.label', 'Sensitivity')}
                                options={sensitivityOptions}
                                value={form.sensitivity}
                                onChange={(value) => onUpdate({ sensitivity: value })}
                            />
                            <ChoiceRow
                                disabled={protectionDisabled}
                                label={text('action.label', 'When a raid is detected')}
                                options={actionOptions}
                                value={form.actionType}
                                onChange={(value) => onUpdate({ actionType: value })}
                            />
                            <ChoiceRow
                                disabled={banDisabled}
                                label={text('ban_duration', 'Ban length')}
                                options={banOptions}
                                value={form.banDurationSeconds}
                                onChange={(value) => onUpdate({ banDurationSeconds: value })}
                            />
                        </section>
                        <section className="octane-handheld-rx__card">
                            <ToggleRow
                                checked={form.guardEnabled}
                                label={text('guard.enabled', 'Keep suspicious players out during a raid')}
                                onChange={(checked) => onUpdate({ guardEnabled: checked })}
                            />
                            <p className="octane-handheld-rx__hint">
                                {text('guard.description', 'During a raid suspicious players can be kept out of the room as well')}
                            </p>
                            <ChoiceRow
                                disabled={guardDisabled}
                                label={text('guard.duration', 'Keep players out for')}
                                options={guardOptions}
                                value={form.guardDurationSeconds}
                                onChange={(value) => onUpdate({ guardDurationSeconds: value })}
                            />
                            <ChoiceRow
                                disabled={guardDisabled}
                                label={text('guard.sensitivity', 'How strict should this be?')}
                                options={sensitivityOptions}
                                value={form.guardSensitivity}
                                onChange={(value) => onUpdate({ guardSensitivity: value })}
                            />
                        </section>
                    </div>
                </div>
                <div className="octane-handheld-rx__bar">
                    <div className="octane-handheld-rx-raid__status" data-active={incidentActive || undefined} role="status">
                        <span aria-hidden="true" className="octane-handheld-rx-raid__status-dot" />
                        <span>{incidentActive ? text('status.active', 'A raid is going on right now') : inactiveText}</span>
                    </div>
                    <div className="octane-handheld-rx__bar-actions">
                        <BaseButton className="octane-handheld-rx__button" onClick={onClose}>
                            {text('cancel', 'Cancel')}
                        </BaseButton>
                        <BaseButton className="octane-handheld-rx__button is-primary" disabled={busy} onClick={onSave}>
                            {text('save', 'Save')}
                        </BaseButton>
                    </div>
                </div>
            </HandheldSheetFrame>
        </DraggableWindow>
    );
};
