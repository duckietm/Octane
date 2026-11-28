import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { NumberInput } from '../../common/NumberInput';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { Select } from '../../common/Select';
import type { CategoryDef, EditRow } from './FortuneWheelSettingsView';

/** English names of the prize types, for a hotel whose texts lack the key. */
const CATEGORY_FALLBACKS: Record<string, string> = {
    item: 'Furni',
    diamonds: 'Diamonds',
    duckets: 'Duckets',
    credits: 'Credits',
    spins: 'Extra spins',
    nothing: 'Nothing'
};

export interface HandheldFortuneWheelSettingsViewProps {
    rows: EditRow[];
    categories: CategoryDef[];
    /** Add stops at this many prizes, as on the desktop. */
    maxRows: number;
    onUpdate: (id: number, patch: Partial<EditRow>) => void;
    onRemove: (id: number) => void;
    onAdd: () => void;
    onSave: () => void;
    onBack: () => void;
}

/**
 * The staff settings of the wheel on a phone (HandheldFortuneWheel.css): a page of the wheel's sheet with Back, one card
 * per prize (type, value, weight, label, remove) with 16 px fields, Add under the cards and Cancel / Save in a bar at
 * the bottom. FortuneWheelSettingsView keeps the rows, the load and the save packet; this only draws them. Save keeps
 * the page open, as the desktop window stays open; Cancel and Back close it like the window's close button.
 */
export const HandheldFortuneWheelSettingsView: FC<HandheldFortuneWheelSettingsViewProps> = ({
    rows,
    categories,
    maxRows,
    onUpdate,
    onRemove,
    onAdd,
    onSave,
    onBack
}) => {
    const typeLabel = localizeWithFallback('rarevalues.editor.type', 'Type');
    const valueLabel = localizeWithFallback('rarevalues.editor.value', 'Value');
    const weightLabel = localizeWithFallback('rarevalues.editor.weight', 'Weight');
    const labelLabel = localizeWithFallback('rarevalues.editor.label', 'Label');
    const removeLabel = localizeWithFallback('rarevalues.editor.remove', 'Remove');

    return (
        <NativeTextTree>
            <div className="octane-handheld-wheel-settings" data-testid="wheel-settings">
                <div className="octane-handheld-wheel-settings__head">
                    <BaseButton className="octane-handheld-wheel__back" data-testid="wheel-settings-back" onClick={onBack}>
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                            <path d="M10 3 L5 8 L10 13" />
                        </svg>
                        <span>{localizeWithFallback('generic.back', 'Back')}</span>
                    </BaseButton>
                    <span className="octane-handheld-wheel-settings__title">{localizeWithFallback('wheel.settings.title', 'Wheel settings')}</span>
                </div>
                <div className="octane-handheld-wheel-settings__list">
                    {rows.map((row, index) => (
                        <div key={row.id} className="octane-handheld-wheel-settings__card" data-testid={`wheel-settings-row-${row.id}`}>
                            <div className="octane-handheld-wheel-settings__card-head">
                                <span className="octane-handheld-wheel-settings__card-title">
                                    {localizeWithFallback('octane.handheld.fortune_wheel.prize_number', 'Prize %number%', ['number'], [String(index + 1)])}
                                </span>
                                <BaseButton aria-label={removeLabel} className="octane-handheld-wheel-settings__remove" onClick={() => onRemove(row.id)}>
                                    <svg aria-hidden="true" viewBox="0 0 16 16">
                                        <path d="M4 4 L12 12 M12 4 L4 12" />
                                    </svg>
                                </BaseButton>
                            </div>
                            <div className="octane-handheld-wheel-settings__field is-wide">
                                <span className="octane-handheld-wheel-settings__label">{typeLabel}</span>
                                <Select
                                    aria-label={typeLabel}
                                    className="octane-handheld-wheel-settings__input"
                                    value={row.category}
                                    onChange={(event) => onUpdate(row.id, { category: event.target.value })}
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.key} value={cat.key}>
                                            {localizeWithFallback(cat.labelKey, CATEGORY_FALLBACKS[cat.key] ?? cat.key)}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="octane-handheld-wheel-settings__field">
                                <span className="octane-handheld-wheel-settings__label">{valueLabel}</span>
                                <NumberInput
                                    aria-label={valueLabel}
                                    className="octane-handheld-wheel-settings__input"
                                    disabled={row.category === 'nothing'}
                                    steppers={false}
                                    value={row.num}
                                    onChange={(event) => onUpdate(row.id, { num: parseInt(event.target.value) || 0 })}
                                />
                            </div>
                            <div className="octane-handheld-wheel-settings__field">
                                <span className="octane-handheld-wheel-settings__label">{weightLabel}</span>
                                <NumberInput
                                    aria-label={weightLabel}
                                    className="octane-handheld-wheel-settings__input"
                                    steppers={false}
                                    value={row.weight}
                                    onChange={(event) => onUpdate(row.id, { weight: parseInt(event.target.value) || 0 })}
                                />
                            </div>
                            <div className="octane-handheld-wheel-settings__field is-wide">
                                <span className="octane-handheld-wheel-settings__label">{labelLabel}</span>
                                <input
                                    aria-label={labelLabel}
                                    className="octane-handheld-wheel-settings__input"
                                    type="text"
                                    value={row.label}
                                    onChange={(event) => onUpdate(row.id, { label: event.target.value })}
                                />
                            </div>
                        </div>
                    ))}
                    {!rows.length && (
                        <div className="octane-handheld-wheel__empty">{localizeWithFallback('wheel.settings.empty', 'The wheel has no prizes yet.')}</div>
                    )}
                    <BaseButton
                        className="octane-handheld-wheel-settings__add"
                        data-testid="wheel-settings-add"
                        disabled={rows.length >= maxRows}
                        onClick={onAdd}
                    >
                        {localizeWithFallback('rarevalues.editor.add', 'Add prize')}
                    </BaseButton>
                </div>
                <div className="octane-handheld-wheel-settings__bar">
                    <BaseButton className="octane-handheld-wheel__button is-cancel" data-testid="wheel-settings-cancel" onClick={onBack}>
                        {localizeWithFallback('generic.cancel', 'Cancel')}
                    </BaseButton>
                    <BaseButton className="octane-handheld-wheel__button is-save" data-testid="wheel-settings-save" disabled={!rows.length} onClick={onSave}>
                        {localizeWithFallback('rarevalues.editor.save', 'Save')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
