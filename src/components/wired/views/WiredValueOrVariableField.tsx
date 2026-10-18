import { FC, useMemo } from 'react';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectionSourceRow } from './WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources, WiredSourceOption } from './WiredSourcesSelector';
import { WiredValueOrVariableInput } from './WiredValueOrVariableInput';
import {
    buildWiredVariablePickerEntries,
    createCustomVariableToken,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    IWiredVariableDefinitionLike,
    IWiredVariablePickerEntry,
    isCustomVariableToken,
    WiredVariablePickerTarget,
    WiredVariablePickerUsage
} from './WiredVariablePickerData';

/** Where an official value variable is read, with the official variable target ids. */
export const WIRED_VALUE_TARGETS: Array<{ key: WiredVariablePickerTarget; value: number }> = [
    { key: 'furni', value: 0 },
    { key: 'user', value: 1 },
    { key: 'global', value: -10 },
    { key: 'context', value: -20 }
];

export const WIRED_VALUE_TARGET_FURNI = 0;
export const WIRED_VALUE_TARGET_USER = 1;
export const WIRED_VALUE_TARGET_GLOBAL = -10;
export const WIRED_VALUE_TARGET_CONTEXT = -20;

export const normalizeWiredValueTarget = (value: number) => (WIRED_VALUE_TARGETS.some((target) => target.value === value) ? value : 0);

export const wiredValueTargetKey = (value: number): WiredVariablePickerTarget => WIRED_VALUE_TARGETS.find((target) => target.value === value)?.key ?? 'furni';

export const wiredValueTargetValue = (key: WiredVariablePickerTarget): number => WIRED_VALUE_TARGETS.find((target) => target.key === key)?.value ?? 0;

const VALUE_FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const VALUE_USER_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 11, label: 'wiredfurni.params.sources.users.11' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' },
        { value: 201, label: 'wiredfurni.params.sources.users.201' }
    ],
    'users'
);

/** A room or context holder has one fixed source (AIR InputSourceControlPreset for a custom source type). */
export const WIRED_GLOBAL_HOLDER_SOURCES: WiredSourceOption[] = [{ value: 0, label: 'wiredfurni.params.sources.global' }];
export const WIRED_CONTEXT_HOLDER_SOURCES: WiredSourceOption[] = [{ value: 0, label: 'wiredfurni.params.sources.context' }];

/** The server gives and reads only variables made in the room (custom), not internal ones. */
const customOnly = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] =>
    entries.flatMap((entry) => {
        if (entry.children?.length) {
            const children = customOnly(entry.children);

            return children.length ? [{ ...entry, children }] : [];
        }

        return isCustomVariableToken(entry.token) ? [entry] : [];
    });

/** Picker entries of the room's own variables, keeping a saved one that is gone. */
export const customVariablePickerEntries = (target: WiredVariablePickerTarget, usage: WiredVariablePickerUsage, definitions: IWiredVariableDefinitionLike[], token: string) => {
    const entries = customOnly(buildWiredVariablePickerEntries(target, usage, definitions));

    if (!token || flattenWiredVariablePickerEntries(entries).some((entry) => entry.token === token)) return entries;

    const fallback = createFallbackVariableEntry(target, token);

    return fallback ? [fallback, ...entries] : entries;
};

/** A variable token from the id the server sends as text. */
export const variableTokenFromId = (text: string) => {
    const id = parseInt((text ?? '').trim(), 10);

    return id > 0 ? createCustomVariableToken(id) : '';
};

/** The room's own variables with a value on one holder type: what a value section can read. */
export const useWiredValueVariableEntries = (target: WiredVariablePickerTarget, token: string) => {
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();

    return useMemo(() => {
        const definitions = { furni: furniVariableDefinitions, user: userVariableDefinitions, global: roomVariableDefinitions, context: contextVariableDefinitions }[target];

        return customVariablePickerEntries(target, 'change-reference', definitions.filter((definition) => definition.hasValue), token);
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, target, token, userVariableDefinitions]);
};

/** The section's claimed merged source: the holder the variable is read on, shown first in the popup. */
export interface IWiredValueHolderSource {
    furniSource: number;
    userSource: number;
    onFurniSourceChange: (source: number) => void;
    onUserSourceChange: (source: number) => void;
}

/** The holder source of a box that offers only room and context variables: one fixed row per type. */
export const WIRED_FIXED_HOLDER_SOURCE: IWiredValueHolderSource = { furniSource: 0, userSource: 0, onFurniSourceChange: () => undefined, onUserSourceChange: () => undefined };

interface WiredValueOrVariableFieldProps {
    /** The field's accessible name, usually the section title. */
    label: string;
    isVariable: boolean;
    literal: string;
    /** The official value target (0 furni, 1 user, -10 global, -20 context). */
    target: number;
    token: string;
    /** The official targets this box offers (all four by default). */
    targets?: number[];
    min?: number;
    max?: number;
    disabled?: boolean;
    /**
     * The holder row of the claimed merged source (AIR ValueOrVariablePopupPreset.attachInputSource). Without it the
     * server reads the variable on the box's own holder, so the popup only offers the type selector.
     */
    holderSource?: IWiredValueHolderSource;
    onIsVariableChange: (isVariable: boolean) => void;
    onLiteralChange: (literal: string) => void;
    onTargetChange: (target: number) => void;
    onTokenChange: (token: string) => void;
    onValidityChange?: (valid: boolean) => void;
}

/**
 * AIR ValueOrVariableSection for the boxes whose value is a room variable read once on a holder of its own type:
 * the value field, and in its popup the holder source with the type selector and the variable picker.
 */
export const WiredValueOrVariableField: FC<WiredValueOrVariableFieldProps> = (props) => {
    const { label, isVariable, literal, target, token, targets = null, min = undefined, max = undefined, disabled = false, holderSource = null } = props;
    const { trigger = null } = useWired();
    const availableUserSources = useAvailableUserSources(trigger, VALUE_USER_SOURCES);
    const targetKey = wiredValueTargetKey(target);
    const targetKeys = useMemo(() => WIRED_VALUE_TARGETS.filter((entry) => !targets || targets.includes(entry.value)).map((entry) => entry.key), [targets]);
    const entries = useWiredValueVariableEntries(targetKey, token);

    const sourceOptions = targetKey === 'furni' ? VALUE_FURNI_SOURCES : targetKey === 'user' ? availableUserSources : targetKey === 'global' ? WIRED_GLOBAL_HOLDER_SOURCES : WIRED_CONTEXT_HOLDER_SOURCES;
    const sourceValue = !holderSource ? 0 : targetKey === 'furni' ? holderSource.furniSource : targetKey === 'user' ? holderSource.userSource : 0;

    return (
        <WiredValueOrVariableInput
            disabled={disabled}
            entries={entries}
            isVariable={isVariable}
            label={label}
            literal={literal}
            max={max}
            min={min}
            target={targetKey}
            targets={targetKeys}
            token={token}
            renderSource={
                holderSource
                    ? ({ typeSelector }) => (
                          // ValueOrVariablePopupPreset.attachInputSource: "Variable source:" with the type selector in its header.
                          <fieldset className="octane-wired__value-popup-locked" disabled={disabled}>
                              <WiredFurniSelectionSourceRow
                                  headerContent={typeSelector}
                                  options={sourceOptions}
                                  selectionActive={false}
                                  selectionCount={0}
                                  selectionEnabledValues={[]}
                                  selectionKind="secondary"
                                  selectionLimit={0}
                                  showSelectionToggle={false}
                                  title="wiredfurni.params.sources.merged.title.variables"
                                  value={sourceValue}
                                  onChange={(source) => {
                                      if (targetKey === 'furni') holderSource.onFurniSourceChange(source);
                                      else if (targetKey === 'user') holderSource.onUserSourceChange(source);
                                  }}
                              />
                          </fieldset>
                      )
                    : undefined
            }
            onIsVariableChange={props.onIsVariableChange}
            onLiteralChange={props.onLiteralChange}
            onTargetChange={(key) => props.onTargetChange(wiredValueTargetValue(key))}
            onTokenChange={props.onTokenChange}
            onValidityChange={props.onValidityChange}
        />
    );
};
