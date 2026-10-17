import { FC, PropsWithChildren } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { Select } from '../../../../common/Select';

/** Ubuntu Wired BorderSection; chest settings use this style, not the Illumina stack editor. */
export const ChestSettingsSection: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => <fieldset className="octane-chest-settings__section"><legend>{title}</legend>{children}</fieldset>;

interface ChestSelectOption<T extends number> {
    value: T;
    label: string;
}

interface ChestSelectProps<T extends number> {
    label: string;
    value: T;
    options: ChestSelectOption<T>[];
    onSelect: (value: T) => void;
    disabled?: boolean;
}

/** The chest windows' drop menus, on the client's own select. */
export const ChestSelect = <T extends number>({ label, value, options, onSelect, disabled = false }: ChestSelectProps<T>) =>
    <Select
        aria-label={label}
        className="form-select form-select-sm"
        disabled={disabled}
        value={value}
        onChange={(event) => onSelect(Number(event.target.value) as T)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select>;

interface ChestAppearanceFieldsProps {
    isFurni: boolean;
    state: number;
    previewMode: number;
    previewAmount: number;
    onStateChange: (value: number) => void;
    onPreviewModeChange: (value: number) => void;
    onPreviewAmountChange: (value: number) => void;
}

/**
 * AIR ChestSettingsUI: 4 states, 8 preview modes and a retained, disabled count when preview is off.
 * Ported from Volt (GPL-3.0).
 */
export const ChestAppearanceFields: FC<ChestAppearanceFieldsProps> = ({ isFurni, state, previewMode, previewAmount, onStateChange, onPreviewModeChange, onPreviewAmountChange }) => <>
    <Text bold>{LocalizeText('wiredchests.settings.appearance.state')}</Text>
    <ChestSelect label={LocalizeText('wiredchests.settings.appearance.state')} value={state} onSelect={onStateChange} options={Array.from({ length: 4 }, (_, value) => ({ value, label: LocalizeText(`wiredchests.settings.appearance.state.${value}`) }))} />
    {isFurni && <>
        <Text bold>{LocalizeText('wiredchests.settings.appearance.preview')}</Text>
        <ChestSelect label={LocalizeText('wiredchests.settings.appearance.preview')} value={previewMode} onSelect={onPreviewModeChange} options={Array.from({ length: 8 }, (_, value) => ({ value, label: LocalizeText(`wiredchests.settings.appearance.preview.${value}`) }))} />
        <Text small style={{ opacity: 0.6 }}>{LocalizeText('wiredchests.settings.appearance.preview.note')}</Text>
        <div aria-disabled={previewMode === 0} style={{ display: 'grid', gap: 5, opacity: previewMode === 0 ? 0.5 : 1 }}>
            <Text bold>{LocalizeText('wiredchests.settings.appearance.preview_amount')}</Text>
            <ChestSelect label={LocalizeText('wiredchests.settings.appearance.preview_amount')} value={previewAmount} disabled={previewMode === 0} onSelect={onPreviewAmountChange} options={[1, 2, 3, 4].map(value => ({ value, label: String(value) }))} />
        </div>
    </>}
</>;
