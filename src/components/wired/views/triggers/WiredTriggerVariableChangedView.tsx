import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { ARRAY_VARIABLE_CONTEXT, ARRAY_VARIABLE_FURNI, ARRAY_VARIABLE_ROOM, ARRAY_VARIABLE_USER, collectWiredArrayDefinitions } from '../WiredArrayControls';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    IWiredVariablePickerEntry,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

type VariableTargetType = 'user' | 'furni' | 'context' | 'global';

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const TARGET_GLOBAL = 3;
const ARRAY_CREATED = 1;
const ARRAY_CHANGED = 1 << 1;
const ARRAY_FIELD_CHANGED = 1 << 9;
const ARRAY_OPTIONS = [
    [1 << 2, 'Entry appended'],
    [1 << 3, 'Entry inserted'],
    [1 << 4, 'Entry removed'],
    [1 << 5, 'Index cleared'],
    [1 << 6, 'Entry replaced'],
    [1 << 7, 'Entry moved'],
    [1 << 8, 'Entries swapped'],
    [ARRAY_FIELD_CHANGED, 'Field value changed'],
    [1 << 10, 'Length changed'],
    [1 << 11, 'Array cleared'],
    [1 << 12, 'Array shuffled']
] as const;

// Where a change may come from; the server labels each write and the trigger keeps a bit mask of
// the origins it listens to (-1 = every origin, which is also what a box saved before the mask means).
const ORIGIN_ALL = -1;
const ORIGIN_OPTIONS = [
    { bit: 0, key: 'wiredfurni.params.variables.trigger_origin.0', fallback: 'A wired box in this room' },
    { bit: 1, key: 'wiredfurni.params.variables.trigger_origin.1', fallback: 'The web API' },
    { bit: 2, key: 'wiredfurni.params.variables.trigger_origin.2', fallback: 'The creator tools' }
] as const;
const ORIGIN_EVERY_BIT = ORIGIN_OPTIONS.reduce((mask, option) => mask | (1 << option.bit), 0);

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'context', icon: contextVariableIcon },
    { key: 'global', icon: globalVariableIcon }
];

const filterCustomEntries = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
    return entries
        .filter((entry) => entry.kind === 'custom')
        .map((entry) => ({
            ...entry,
            children: entry.children?.filter((child) => child.kind === 'custom')
        }));
};

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_GLOBAL:
            return 'global';
        case TARGET_CONTEXT:
            return 'context';
        default:
            return 'user';
    }
};

const getTargetValue = (value: VariableTargetType) => {
    switch (value) {
        case 'furni':
            return TARGET_FURNI;
        case 'global':
            return TARGET_GLOBAL;
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

export const WiredTriggerVariableChangedView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], contextVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [createdEnabled, setCreatedEnabled] = useState(true);
    const [valueChangedEnabled, setValueChangedEnabled] = useState(true);
    const [increasedEnabled, setIncreasedEnabled] = useState(true);
    const [decreasedEnabled, setDecreasedEnabled] = useState(true);
    const [unchangedEnabled, setUnchangedEnabled] = useState(true);
    const [deletedEnabled, setDeletedEnabled] = useState(true);
    const [originMask, setOriginMask] = useState(ORIGIN_ALL);
    const [arrayOptions, setArrayOptions] = useState(ARRAY_CREATED | ARRAY_CHANGED);
    const [arrayFieldId, setArrayFieldId] = useState(0);

    const variableDefinitions = useMemo(() => {
        switch (targetType) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            case 'context':
                return contextVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]);
    const arrayDefinitions = useMemo(
        () => collectWiredArrayDefinitions(furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions]
    );
    const arrayVariableType =
        targetType === 'furni'
            ? ARRAY_VARIABLE_FURNI
            : targetType === 'context'
              ? ARRAY_VARIABLE_CONTEXT
              : targetType === 'global'
                ? ARRAY_VARIABLE_ROOM
                : ARRAY_VARIABLE_USER;
    const arrayDefinition = useMemo(
        () =>
            arrayDefinitions.find(
                (definition) =>
                    definition.variableType === arrayVariableType &&
                    definition.itemId === getCustomVariableItemId(variableToken) &&
                    definition.valueShape === 'array'
            ),
        [arrayDefinitions, arrayVariableType, variableToken]
    );
    const variableEntries = useMemo(
        () => filterCustomEntries(buildWiredVariablePickerEntries(targetType, 'condition', variableDefinitions)),
        [targetType, variableDefinitions]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(targetType, variableToken);

        return fallbackEntry && fallbackEntry.kind === 'custom' ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [targetType, variableEntries, variableToken]);
    const effectiveCreatedEnabled = targetType === 'global' ? false : createdEnabled;
    const effectiveDeletedEnabled = targetType === 'global' ? false : deletedEnabled;
    const effectiveIncreasedEnabled = valueChangedEnabled && increasedEnabled;
    const effectiveDecreasedEnabled = valueChangedEnabled && decreasedEnabled;
    const effectiveUnchangedEnabled = valueChangedEnabled && unchangedEnabled;

    useEffect(() => {
        if (!trigger) return;

        const intData = trigger.intData || [];

        setTargetType(normalizeTargetType(intData.length > 0 ? intData[0] : TARGET_USER));
        const stringParts = (trigger.stringData || '').split('\t', 2);
        let arrayData: { options?: number; fieldId?: number } = {};
        try {
            arrayData = stringParts[1] ? JSON.parse(stringParts[1]) : {};
        } catch {
            arrayData = {};
        }
        setVariableToken(normalizeVariableTokenFromWire(stringParts[0] || ''));
        setArrayOptions(arrayData.options || ARRAY_CREATED | ARRAY_CHANGED);
        setArrayFieldId(Number.isInteger(arrayData.fieldId) ? Math.max(0, arrayData.fieldId) : 0);
        setCreatedEnabled(intData.length <= 1 || intData[1] === 1);
        setValueChangedEnabled(intData.length <= 2 || intData[2] === 1);
        setIncreasedEnabled(intData.length <= 3 || intData[3] === 1);
        setDecreasedEnabled(intData.length <= 4 || intData[4] === 1);
        setUnchangedEnabled(intData.length <= 5 || intData[5] === 1);
        setDeletedEnabled(intData.length <= 6 || intData[6] === 1);
        setOriginMask(intData.length > 7 ? intData[7] : ORIGIN_ALL);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'global') return;

        setCreatedEnabled(false);
        setDeletedEnabled(false);
    }, [targetType]);

    const save = () => {
        setStringParam(`${variableToken}\t${JSON.stringify({ options: arrayOptions, fieldId: arrayFieldId, metadataVersion: 1 })}`);
        setIntParams([
            getTargetValue(targetType),
            effectiveCreatedEnabled ? 1 : 0,
            valueChangedEnabled ? 1 : 0,
            effectiveIncreasedEnabled ? 1 : 0,
            effectiveDecreasedEnabled ? 1 : 0,
            effectiveUnchangedEnabled ? 1 : 0,
            effectiveDeletedEnabled ? 1 : 0,
            originMask
        ]);
    };

    const effectiveOriginMask = originMask < 0 || originMask === 0 ? ORIGIN_EVERY_BIT : originMask;
    const isOriginChecked = (bit: number) => (effectiveOriginMask & (1 << bit)) !== 0;
    const toggleOrigin = (bit: number, checked: boolean) => {
        const nextMask = checked ? effectiveOriginMask | (1 << bit) : effectiveOriginMask & ~(1 << bit);

        setOriginMask(nextMask === ORIGIN_EVERY_BIT ? ORIGIN_ALL : nextMask);
    };

    return (
        <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="octane-wired__give-var octane-wired__give-var--trigger-variable">
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${targetType === button.key ? 'is-active' : ''}`}
                                onClick={() => {
                                    if (targetType === button.key) return;

                                    setTargetType(button.key);
                                    setVariableToken('');
                                }}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedVariableEntries}
                    recentScope="variable-triggers"
                    selectedToken={variableToken}
                    onSelect={(entry) => setVariableToken(entry.token)}
                />

                <div className="octane-wired__divider" />

                {arrayDefinition && (
                    <div className="flex flex-col gap-1">
                        <Text bold>Array trigger options</Text>
                        {[
                            [ARRAY_CREATED, 'Array created'],
                            [ARRAY_CHANGED, 'Array changed']
                        ].map(([option, label]) => (
                            <label key={option} className="flex items-center gap-1">
                                <input
                                    checked={(arrayOptions & Number(option)) !== 0}
                                    className="form-check-input"
                                    type="checkbox"
                                    onChange={(event) => setArrayOptions(event.target.checked ? arrayOptions | Number(option) : arrayOptions & ~Number(option))}
                                />
                                <Text>{label}</Text>
                            </label>
                        ))}
                        <div className="ml-3 flex flex-col gap-1">
                            {ARRAY_OPTIONS.map(([option, label]) => (
                                <label key={option} className="flex items-center gap-1">
                                    <input
                                        checked={(arrayOptions & option) !== 0}
                                        className="form-check-input"
                                        disabled={(arrayOptions & ARRAY_CHANGED) === 0}
                                        type="checkbox"
                                        onChange={(event) => setArrayOptions(event.target.checked ? arrayOptions | option : arrayOptions & ~option)}
                                    />
                                    <Text>{label}</Text>
                                </label>
                            ))}
                        </div>
                        {(arrayOptions & ARRAY_FIELD_CHANGED) !== 0 && arrayDefinition.fields.length > 1 && (
                            <select
                                className="form-select form-select-sm"
                                value={arrayFieldId}
                                onChange={(event) => setArrayFieldId(Number(event.target.value))}
                            >
                                <option value={0}>Any field</option>
                                {arrayDefinition.fields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {!arrayDefinition && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.variables.trigger_options')}</Text>

                        <label className="flex items-center gap-1">
                            <input
                                checked={effectiveCreatedEnabled}
                                className="form-check-input"
                                disabled={targetType === 'global'}
                                type="checkbox"
                                onChange={(event) => setCreatedEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.0')}</Text>
                        </label>

                        <label className="flex items-center gap-1">
                            <input
                                checked={valueChangedEnabled}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => setValueChangedEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1')}</Text>
                        </label>

                        <div className="ml-3 flex flex-col gap-1">
                            <label className="flex items-center gap-1">
                                <input
                                    checked={effectiveIncreasedEnabled}
                                    className="form-check-input"
                                    disabled={!valueChangedEnabled}
                                    type="checkbox"
                                    onChange={(event) => setIncreasedEnabled(event.target.checked)}
                                />
                                <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.0')}</Text>
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    checked={effectiveDecreasedEnabled}
                                    className="form-check-input"
                                    disabled={!valueChangedEnabled}
                                    type="checkbox"
                                    onChange={(event) => setDecreasedEnabled(event.target.checked)}
                                />
                                <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.1')}</Text>
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    checked={effectiveUnchangedEnabled}
                                    className="form-check-input"
                                    disabled={!valueChangedEnabled}
                                    type="checkbox"
                                    onChange={(event) => setUnchangedEnabled(event.target.checked)}
                                />
                                <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.2')}</Text>
                            </label>
                        </div>

                        <label className="flex items-center gap-1">
                            <input
                                checked={effectiveDeletedEnabled}
                                className="form-check-input"
                                disabled={targetType === 'global'}
                                type="checkbox"
                                onChange={(event) => setDeletedEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.2')}</Text>
                        </label>
                    </div>
                )}
                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.variables.trigger_origin', 'Changed by:')}</Text>
                    {ORIGIN_OPTIONS.map((option) => (
                        <label key={option.bit} className="flex items-center gap-1">
                            <input
                                checked={isOriginChecked(option.bit)}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => toggleOrigin(option.bit, event.target.checked)}
                            />
                            <Text>{localizeWithFallback(option.key, option.fallback)}</Text>
                        </label>
                    ))}
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
