import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText, localizeWithFallback } from '../../../api';
import contextVariableIcon from '../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../assets/images/wired/var/icon_source_user.png';
import variableReferenceIcon from '../../../assets/images/wired/var/icon_variable_reference.png';
import { Text } from '../../../common';
import { WiredVariablePicker } from './WiredVariablePicker';
import { flattenWiredVariablePickerEntries, IWiredVariablePickerEntry, WiredVariablePickerTarget } from './WiredVariablePickerData';

/*
 * AIR WIN63-202610131318-860371703, roomevents/wired_setup/uibuilder/presets:
 * - sections/ValueOrVariableSection.as: one text field that holds a whole number or a variable name.
 * - ValueOrVariableInputPreset.as: the field, its target type indicator and the variable reference button.
 * - ValueOrVariablePopupPreset.as: the popup under the field with the claimed holder source, the
 *   "same furni or user" checkbox and the variable picker.
 */

export const WIRED_VALUE_TARGET_ICONS: Record<WiredVariablePickerTarget, string> = {
    furni: furniVariableIcon,
    user: userVariableIcon,
    global: globalVariableIcon,
    context: contextVariableIcon
};

/** WiredInputSourcePicker.getTypeNameForSource: the sourcetype text and icon name of a target. */
const TARGET_TYPE_NAMES: Record<WiredVariablePickerTarget, string> = { furni: 'furni', user: 'users', global: 'global', context: 'context' };

/** WiredInputSourcePicker.getColorForSourceType lightened by 1.26 (ValueOrVariableInputPreset.setTargetIndicator L120-121). */
const TARGET_GLOW_COLORS: Record<WiredVariablePickerTarget, string> = { furni: '#e5bc21', user: '#30b334', global: '#25a5b2', context: '#db7729' };

/** ValueOrVariableSection.isNumericText (L29-33, 98-101): decimal, 0x hex or 0b binary. */
const DECIMAL_PATTERN = /^-?\d+$/;
const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;
const BINARY_PATTERN = /^0b[01]+$/;

export const isWiredNumericText = (text: string) => DECIMAL_PATTERN.test(text) || HEX_PATTERN.test(text) || BINARY_PATTERN.test(text);

/** ValueOrVariableSection.parseNumericText (L103-114). */
export const parseWiredNumericText = (text: string): number => {
    if (HEX_PATTERN.test(text)) return parseInt(text.substring(2), 16);
    if (BINARY_PATTERN.test(text)) return parseInt(text.substring(2), 2);

    return Number(text);
};

export type WiredValueTextResult =
    | { kind: 'literal'; valid: boolean; value?: number }
    | { kind: 'variable'; valid: boolean; ambiguous: boolean; entry?: IWiredVariablePickerEntry };

/**
 * ValueOrVariableSection.onInputTextChanged (L362-412): a number is a literal, in range and whole; "-" and "+" are an
 * unfinished literal; any other text is a variable name, valid when exactly one eligible variable has it (any case).
 */
export const readWiredValueText = (text: string, eligible: IWiredVariablePickerEntry[], min: number, max: number): WiredValueTextResult => {
    if (isWiredNumericText(text)) {
        const value = parseWiredNumericText(text);
        const valid = !Number.isNaN(value) && value === Math.floor(value) && value >= -2147483648 && value <= 2147483647 && value >= min && value <= max;

        return valid ? { kind: 'literal', valid, value } : { kind: 'literal', valid };
    }

    if (text === '-' || text === '+') return { kind: 'literal', valid: false };

    const lower = text.toLowerCase();
    const matches = eligible.filter((entry) => entry.displayLabel.toLowerCase() === lower);

    return matches.length === 1 ? { kind: 'variable', valid: true, ambiguous: false, entry: matches[0] } : { kind: 'variable', valid: false, ambiguous: matches.length > 1 };
};

/** The holder type buttons (AIR SourceTypeSelectorPreset). */
export const WiredVariableTargetButtons: FC<{
    targets: WiredVariablePickerTarget[];
    value: WiredVariablePickerTarget;
    disabled?: boolean;
    onChange: (target: WiredVariablePickerTarget) => void;
}> = ({ targets, value, disabled = false, onChange }) => (
    <div className="octane-wired__give-var-targets">
        {targets.map((target) => (
            <button
                key={target}
                type="button"
                disabled={disabled}
                title={LocalizeText(`wiredfurni.params.sourcetype.${TARGET_TYPE_NAMES[target]}`)}
                className={`octane-wired__give-var-target octane-wired__give-var-target--${target} ${value === target ? 'is-active' : ''}`}
                onClick={() => onChange(target)}
            >
                <img src={WIRED_VALUE_TARGET_ICONS[target]} alt={target} />
            </button>
        ))}
    </div>
);

export interface IWiredValueSourceRender {
    /** The popup's type selector, for the source section's header (ValueOrVariablePopupPreset.refreshTargetSelector L383-394). */
    typeSelector: ReactNode;
    /** The same holder locks the source (ValueOrVariablePopupPreset.applyReferenceVariableOnTargetState L354-362). */
    locked: boolean;
}

interface WiredValueOrVariableInputProps {
    /** The field's accessible name. */
    label: string;
    isVariable: boolean;
    literal: string;
    min?: number;
    max?: number;
    target: WiredVariablePickerTarget;
    /** The section's holder types (createValueOrVariableSection param2); one type hides the selector. */
    targets: WiredVariablePickerTarget[];
    token: string;
    entries: IWiredVariablePickerEntry[];
    disabled?: boolean;
    /**
     * ValueOrVariablePopupPreset.attachInputSource (L156-181): the claimed merged source as the popup's first section,
     * titled "wiredfurni.params.sources.merged.title.variables". Without it the type selector gets a section of its own.
     */
    renderSource?: (props: IWiredValueSourceRender) => ReactNode;
    /** The "use the same furni or user as the target variable" checkbox (ValueOrVariablePopupPreset L88-96). */
    sameHolder?: boolean;
    onSameHolderChange?: (checked: boolean) => void;
    /** The destination's holder type, which decides whether the same holder can be used (ValueOrVariableSection L461, 483-486). */
    primaryTarget?: WiredVariablePickerTarget;
    onIsVariableChange: (isVariable: boolean) => void;
    onLiteralChange: (literal: string) => void;
    onTargetChange: (target: WiredVariablePickerTarget) => void;
    onTokenChange: (token: string) => void;
    onValidityChange?: (valid: boolean) => void;
}

export const isWiredSameHolderEligible = (primaryTarget: WiredVariablePickerTarget | undefined, target: WiredVariablePickerTarget) =>
    (primaryTarget === 'furni' || primaryTarget === 'user') && primaryTarget === target;

export const WiredValueOrVariableInput: FC<WiredValueOrVariableInputProps> = (props) => {
    const {
        label,
        isVariable,
        literal,
        min = -2147483648,
        max = 2147483647,
        target,
        targets,
        token,
        entries,
        disabled = false,
        renderSource,
        sameHolder = false,
        onSameHolderChange,
        primaryTarget,
        onIsVariableChange,
        onLiteralChange,
        onTargetChange,
        onTokenChange,
        onValidityChange
    } = props;
    const leaves = useMemo(() => flattenWiredVariablePickerEntries(entries).filter((entry) => !entry.children?.length), [entries]);
    const eligible = useMemo(() => leaves.filter((entry) => entry.selectable), [leaves]);
    const selected = leaves.find((entry) => entry.token === token) ?? null;
    const sameHolderEligible = isWiredSameHolderEligible(primaryTarget, target);
    const sourceLocked = isVariable && sameHolder && sameHolderEligible;
    const wireKey = `${isVariable ? 1 : 0}:${literal}:${target}:${token}`;
    const publishedKey = useRef(wireKey);
    // The typed text and its reading; null shows the saved value (setTextSilently after init or a popup pick).
    const [edit, setEdit] = useState<{ text: string; valid: boolean; ambiguous: boolean } | null>(null);
    const [popupRect, setPopupRect] = useState<{ left: number; top: number; width: number } | null>(null);
    const anchorRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const portalTarget = typeof document !== 'undefined' ? (document.getElementById('draggable-windows-container') ?? document.body) : null;
    const open = !!popupRect && !disabled;

    const shownText = isVariable ? (selected?.displayLabel ?? '') : literal;
    const text = edit ? edit.text : shownText;
    // ValueOrVariableSection.init L160 / applyVariableTarget L518-522: a variable reads valid only when it can be picked.
    const valid = edit ? edit.valid : !isVariable || (!!selected && selected.selectable);
    const ambiguous = edit ? edit.ambiguous : false;
    const showError = !disabled && !valid;

    useEffect(() => {
        if (publishedKey.current === wireKey) return;

        publishedKey.current = wireKey;
        setEdit(null);
    }, [wireKey]);

    useEffect(() => {
        onValidityChange?.(disabled || valid);
    }, [disabled, valid, onValidityChange]);

    // ValueOrVariablePopupPreset.refreshSourceVisibility L216-220: a disabled section hides the popup.
    useEffect(() => {
        if (disabled) setPopupRect(null);
    }, [disabled]);

    // NewVariablePicker.onDeactivate: a click outside the popup and the field hides it.
    useEffect(() => {
        if (!open) return;

        const onMouseDown = (event: globalThis.MouseEvent) => {
            const node = event.target as Node;

            if (popupRef.current?.contains(node) || anchorRef.current?.contains(node)) return;
            if ((node as HTMLElement)?.closest?.('.octane-wired__vpicker-list')) return;

            setPopupRect(null);
        };

        document.addEventListener('mousedown', onMouseDown);

        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [open]);

    const publish = (nextIsVariable: boolean, nextLiteral: string, nextToken: string) => {
        publishedKey.current = `${nextIsVariable ? 1 : 0}:${nextLiteral}:${target}:${nextToken}`;
    };

    const onChangeText = (next: string) => {
        const result = readWiredValueText(next, eligible, min, max);

        if (result.kind === 'literal') {
            const nextLiteral = result.valid ? String(result.value) : literal;

            publish(false, nextLiteral, token);
            setEdit({ text: next, valid: result.valid, ambiguous: false });
            onIsVariableChange(false);
            if (result.valid) onLiteralChange(nextLiteral);

            return;
        }

        const nextToken = result.entry ? result.entry.token : token;

        publish(true, literal, nextToken);
        setEdit({ text: next, valid: result.valid, ambiguous: result.ambiguous });
        onIsVariableChange(true);
        if (result.entry) onTokenChange(result.entry.token);
    };

    const toggle = () => {
        if (open) {
            setPopupRect(null);
            return;
        }

        const rect = anchorRef.current?.getBoundingClientRect();

        // NewVariablePicker.expandView with an external anchor (L362-368): the anchor's width, from its bottom edge.
        setPopupRect(rect ? { left: rect.left, top: rect.bottom, width: Math.round(rect.width) } : { left: 0, top: 0, width: 230 });
    };

    const changeTarget = (next: WiredVariablePickerTarget) => {
        if (next === target || sourceLocked) return;

        onTargetChange(next);
        onTokenChange('');
    };

    const typeSelector = targets.length > 1 ? <WiredVariableTargetButtons targets={targets} value={target} disabled={sourceLocked} onChange={changeTarget} /> : null;
    const errorText = ambiguous
        ? localizeWithFallback('wiredfurni.params.variables.reference_value.ambiguous', 'More than one variable has this name.')
        : localizeWithFallback('wiredfurni.params.variables.reference_value.invalid', 'Enter a valid whole number or variable name.');
    // ValueOrVariableSection.updateTargetIndicator (L561-564): only for a variable, and only with a choice of types.
    const showTargetIndicator = isVariable && targets.length > 1;

    return (
        <div className="octane-wired__value-field">
            <div ref={anchorRef} className={`octane-wired__value-input ${showError ? 'is-invalid' : ''} ${disabled ? 'is-disabled' : ''}`}>
                <input aria-label={label} aria-invalid={showError} disabled={disabled} type="text" value={text} onChange={(event) => onChangeText(event.target.value)} />
                {showTargetIndicator && (
                    <span className="octane-wired__value-input-target" title={LocalizeText(`wiredfurni.params.sourcetype.${TARGET_TYPE_NAMES[target]}`)}>
                        <img alt={target} draggable={false} src={WIRED_VALUE_TARGET_ICONS[target]} style={{ filter: `drop-shadow(0 0 2px ${TARGET_GLOW_COLORS[target]})` }} />
                    </span>
                )}
                <button
                    aria-expanded={open}
                    aria-label={LocalizeText('wiredfurni.params.variables.reference_value.popup')}
                    className="octane-wired__value-input-button"
                    disabled={disabled}
                    title={LocalizeText('wiredfurni.params.variables.reference_value.popup')}
                    type="button"
                    onClick={toggle}
                >
                    <img alt="" draggable={false} src={variableReferenceIcon} />
                </button>
                {showError && (
                    <div className="octane-wired__value-input-error" role="alert">
                        {errorText}
                    </div>
                )}
            </div>
            {open &&
                portalTarget &&
                createPortal(
                    <div className="octane-wired octane-wired__variable-picker-portal">
                        <div
                            ref={popupRef}
                            aria-label={label}
                            className="octane-wired__vpicker-expanded octane-wired__value-popup"
                            role="dialog"
                            style={{ left: popupRect.left, top: popupRect.top, width: popupRect.width }}
                        >
                            <div className="octane-wired__value-popup-header">
                                {renderSource ? (
                                    <>
                                        <div className="octane-wired__value-popup-source">{renderSource({ typeSelector, locked: sourceLocked })}</div>
                                        <div className="octane-wired__divider" />
                                    </>
                                ) : (
                                    typeSelector && (
                                        // Without a claimed source the type selector is a section of its own, with no splitter (L396-412).
                                        <div className="octane-wired__value-popup-source octane-wired__value-popup-target">
                                            <Text>{localizeWithFallback('wiredfurni.params.variables.reference_value.target', LocalizeText('wiredfurni.params.sources.merged.title.variables'))}</Text>
                                            {typeSelector}
                                        </div>
                                    )
                                )}
                                {onSameHolderChange && (
                                    <>
                                        <label className={`octane-wired__value-popup-same-holder ${sameHolderEligible ? '' : 'is-disabled'}`}>
                                            <input
                                                checked={sameHolder}
                                                className="form-check-input"
                                                disabled={!sameHolderEligible}
                                                type="checkbox"
                                                onChange={(event) => {
                                                    onSameHolderChange(event.target.checked);
                                                    // onReferenceVariableOnTargetChanged -> onPopupVariableChanged(selected, checked) (L443-451, 421-424).
                                                    if (event.target.checked) onIsVariableChange(true);
                                                }}
                                            />
                                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.same_holder')}</Text>
                                        </label>
                                        <div className="octane-wired__divider" />
                                    </>
                                )}
                            </div>
                            <WiredVariablePicker
                                embedded={{ width: popupRect.width, onClose: () => setPopupRect(null) }}
                                entries={entries}
                                selectedToken={token}
                                onSelect={(entry) => {
                                    publish(true, literal, entry.token);
                                    setEdit(null);
                                    onIsVariableChange(true);
                                    onTokenChange(entry.token);
                                    setPopupRect(null);
                                }}
                            />
                        </div>
                    </div>,
                    portalTarget
                )}
        </div>
    );
};
