import { FC, PropsWithChildren } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { Select } from '../../../../common/Select';

/** A titled group of the chest settings window (a bordered box with its caption in the border). */
export const ChestSettingsSection: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
    <NativeTextTree>
        <fieldset className="octane-chest-settings__section">
            <legend>{title}</legend>
            {children}
        </fieldset>
    </NativeTextTree>
);

export interface ChestSelectOption<T extends number> {
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

/** A numeric drop menu of the chest windows, on the client's Select. */
export function ChestSelect<T extends number>(props: ChestSelectProps<T>) {
    const { label, value, options, onSelect, disabled = false } = props;

    return (
        <NativeTextTree>
            <Select
                aria-label={label}
                className="form-select form-select-sm"
                disabled={disabled}
                value={value}
                onChange={(event) => onSelect(Number(event.target.value) as T)}
            >
                {options.map(({ value: optionValue, label: optionLabel }) => (
                    <option key={optionValue} value={optionValue}>
                        {optionLabel}
                    </option>
                ))}
            </Select>
        </NativeTextTree>
    );
}

/** The chest looks: AIR offers four chest states, eight content preview modes and one to four previewed items. */
const STATE_COUNT = 4;
const PREVIEW_MODE_COUNT = 8;
const PREVIEW_AMOUNTS = [1, 2, 3, 4];
const PREVIEW_OFF = 0;

const APPEARANCE_KEY = 'wiredchests.settings.appearance';

/** Options 0..count-1, each labelled by `<key>.<n>`. */
const numberedOptions = (key: string, count: number): ChestSelectOption<number>[] => {
    const options: ChestSelectOption<number>[] = [];

    for (let index = 0; index < count; index++) options.push({ value: index, label: LocalizeText(`${key}.${index}`) });

    return options;
};

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
 * The appearance group of the chest settings. Every chest picks its state; a furni chest also picks how its contents
 * are previewed and how many items show. Switching the preview off only greys the amount out, so the chosen amount is
 * still there (and saved) when the preview is switched back on. A coin chest has no contents to preview.
 */
export const ChestAppearanceFields: FC<ChestAppearanceFieldsProps> = (props) => {
    const { isFurni, state, previewMode, previewAmount, onStateChange, onPreviewModeChange, onPreviewAmountChange } = props;
    const stateLabel = LocalizeText(`${APPEARANCE_KEY}.state`);
    const previewLabel = LocalizeText(`${APPEARANCE_KEY}.preview`);
    const amountLabel = LocalizeText(`${APPEARANCE_KEY}.preview_amount`);
    const previewOff = previewMode === PREVIEW_OFF;

    return (
        <NativeTextTree>
            <>
                <Text bold>{stateLabel}</Text>
                <ChestSelect label={stateLabel} value={state} options={numberedOptions(`${APPEARANCE_KEY}.state`, STATE_COUNT)} onSelect={onStateChange} />
                {isFurni && (
                    <>
                        <Text bold>{previewLabel}</Text>
                        <ChestSelect
                            label={previewLabel}
                            value={previewMode}
                            options={numberedOptions(`${APPEARANCE_KEY}.preview`, PREVIEW_MODE_COUNT)}
                            onSelect={onPreviewModeChange}
                        />
                        <span className="octane-chest-settings__note">{LocalizeText(`${APPEARANCE_KEY}.preview.note`)}</span>
                        <div className={`octane-chest-settings__amount${previewOff ? ' is-off' : ''}`} aria-disabled={previewOff}>
                            <Text bold>{amountLabel}</Text>
                            <ChestSelect
                                label={amountLabel}
                                value={previewAmount}
                                disabled={previewOff}
                                options={PREVIEW_AMOUNTS.map((amount) => ({ value: amount, label: String(amount) }))}
                                onSelect={onPreviewAmountChange}
                            />
                        </div>
                    </>
                )}
            </>
        </NativeTextTree>
    );
};
