import { FC, useEffect, useMemo, useState } from 'react';
import { fromOfficialVariableTarget, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    IWiredVariablePickerEntry,
    normalizeVariableTokenFromWire,
    withoutExecutionContextVariables
} from '../WiredVariablePickerData';
import { readWiredVariableToken, toWiredVariableId, wiredVariableIdTarget } from '../WiredVariableIds';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { BaseButton } from '../../../../common/BaseButton';
import { CollapsibleSection } from '../../../../common/CollapsibleSection';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

type VariableTargetType = 'user' | 'furni' | 'global';

const TARGET_FURNI = 1;
const TARGET_GLOBAL = 3;

/** AIR VariableUpdate trigger modes: the one variable of the picker, or every variable of the picked variable boxes. */
const MODE_SELECTED_VARIABLE = 0;
const MODE_PICKED_BOXES = 1;
const MODES = [
    { value: MODE_SELECTED_VARIABLE, key: 'wiredfurni.params.variables.trigger_mode.0', fallback: 'One selected variable' },
    { value: MODE_PICKED_BOXES, key: 'wiredfurni.params.variables.trigger_mode.1', fallback: 'Picked variable boxes' }
] as const;

/** AIR availability types: 10 permanent (saved), 11 shared with the owner's other rooms. */
const AVAILABILITY_PERMANENT = 10;
const AVAILABILITY_SHARED = 11;

// Where a change may come from; the server labels each write and the trigger keeps a bit mask of
// the origins it listens to (-1 = every origin, which is also what a box saved before the mask means).
const ORIGIN_ALL = -1;
const ORIGIN_THIS_ROOM = 0;
const ORIGIN_OTHER_ROOM = 1;
const ORIGIN_INSPECTION = 2;
const ORIGIN_EXTERNAL = 3;
// The official bits: 0 this room, 1 another room (a shared variable changed in another room), 2 inspection (the
// creator tools), 3 external (variable management, the web API); 2 and 3 carry an info line.
const ORIGIN_OPTIONS = [
    { bit: ORIGIN_THIS_ROOM, fallback: 'This room', info: null },
    { bit: ORIGIN_OTHER_ROOM, fallback: 'Another room', info: null },
    { bit: ORIGIN_INSPECTION, fallback: 'Inspection', info: 'The inspection tool (:inspect)' },
    { bit: ORIGIN_EXTERNAL, fallback: 'External', info: 'Variable management or the variable web API' }
] as const;
const ORIGIN_EVERY_BIT = ORIGIN_OPTIONS.reduce((mask, option) => mask | (1 << option.bit), 0);

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon }
];

// The built-ins Habbo lets Variable Changed watch: a projectile's counts while it flies (furni).
const WATCHABLE_INTERNAL_TOKENS = new Set([
    'internal:@projectile.animation.tiles_travelled',
    'internal:@projectile.animation.user_collisions',
    'internal:@projectile.animation.furni_collisions',
    'internal:@projectile.animation.is_travelling'
]);

const isWatchableEntry = (entry: IWiredVariablePickerEntry) =>
    entry.kind === 'custom' || (entry.kind === 'internal' && WATCHABLE_INTERNAL_TOKENS.has(entry.token));

const filterCustomEntries = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
    return entries
        .filter(isWatchableEntry)
        .map((entry) => ({
            ...entry,
            children: entry.children?.filter(isWatchableEntry)
        }));
};

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_GLOBAL:
            return 'global';
        default:
            return 'user';
    }
};

export const WiredTriggerVariableChangedView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [mode, setMode] = useState(MODE_SELECTED_VARIABLE);
    const tools = useWiredTools();
    // A pointer only exists while a stack runs, so nothing can watch it change (AIR VariableUpdate filter).
    const userVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.userVariableDefinitions), [tools.userVariableDefinitions]);
    const furniVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.furniVariableDefinitions), [tools.furniVariableDefinitions]);
    const roomVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.roomVariableDefinitions), [tools.roomVariableDefinitions]);
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [createdEnabled, setCreatedEnabled] = useState(true);
    const [valueChangedEnabled, setValueChangedEnabled] = useState(true);
    const [increasedEnabled, setIncreasedEnabled] = useState(true);
    const [decreasedEnabled, setDecreasedEnabled] = useState(true);
    const [unchangedEnabled, setUnchangedEnabled] = useState(true);
    const [deletedEnabled, setDeletedEnabled] = useState(true);
    const [originMask, setOriginMask] = useState(ORIGIN_ALL);

    const variableDefinitions = useMemo(() => {
        switch (targetType) {
            case 'furni':
                return furniVariableDefinitions;
            case 'global':
                return roomVariableDefinitions;
            default:
                return userVariableDefinitions;
        }
    }, [furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]);
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
    // AIR onChangeVariable: what the picked variable can do decides which options and origins apply.
    const selectedDefinition = useMemo(() => {
        const itemId = getCustomVariableItemId(variableToken);

        return itemId > 0 ? (variableDefinitions.find((definition) => definition.itemId === itemId) ?? null) : null;
    }, [variableDefinitions, variableToken]);
    const pickedBoxes = mode === MODE_PICKED_BOXES;
    const canCreateAndDelete = pickedBoxes || targetType !== 'global';
    const canChangeValue = pickedBoxes || !selectedDefinition || selectedDefinition.hasValue !== false;
    const isOriginDisabled = (bit: number) => {
        if (bit === ORIGIN_OTHER_ROOM) return pickedBoxes || targetType !== 'user' || selectedDefinition?.availability !== AVAILABILITY_SHARED;
        if (bit === ORIGIN_EXTERNAL) {
            const availability = selectedDefinition?.availability;

            return pickedBoxes || (availability !== AVAILABILITY_PERMANENT && availability !== AVAILABILITY_SHARED);
        }

        return false;
    };
    const effectiveCreatedEnabled = canCreateAndDelete ? createdEnabled : false;
    const effectiveDeletedEnabled = canCreateAndDelete ? deletedEnabled : false;
    const effectiveIncreasedEnabled = valueChangedEnabled && increasedEnabled;
    const effectiveDecreasedEnabled = valueChangedEnabled && decreasedEnabled;
    const effectiveUnchangedEnabled = valueChangedEnabled && unchangedEnabled;

    useEffect(() => {
        if (!trigger) return;

        const intData = trigger.intData || [];

        // Official layout: [created, value changed, deleted, (bit 0 increased, 1 decreased, 2
        // unchanged), origins (-1 every one), mode]; ours follows: [variable target (official ids)].
        const changes = intData.length > 3 ? intData[3] : 7;

        // AIR: the variable is the first variable id (the target follows it); an older server wrote the token as the
        // string.
        const idTarget = wiredVariableIdTarget(trigger.variableIds?.[0] ?? '');

        setTargetType(
            intData.length > 6
                ? normalizeTargetType(fromOfficialVariableTarget(intData[6]))
                : idTarget === 'furni' || idTarget === 'global'
                  ? idTarget
                  : 'user'
        );
        setVariableToken(readWiredVariableToken(trigger.variableIds, 0, normalizeVariableTokenFromWire((trigger.stringData || '').split('\t')[0])));
        setCreatedEnabled(intData.length <= 0 || intData[0] === 1);
        setValueChangedEnabled(intData.length <= 1 || intData[1] === 1);
        setDeletedEnabled(intData.length <= 2 || intData[2] === 1);
        setIncreasedEnabled((changes & 1) !== 0);
        setDecreasedEnabled((changes & 2) !== 0);
        setUnchangedEnabled((changes & 4) !== 0);
        setOriginMask(intData.length > 4 ? intData[4] : ORIGIN_ALL);
        setMode(intData.length > 5 && intData[5] === MODE_PICKED_BOXES ? MODE_PICKED_BOXES : MODE_SELECTED_VARIABLE);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'global' || mode === MODE_PICKED_BOXES) return;

        setCreatedEnabled(false);
        setDeletedEnabled(false);
    }, [targetType, mode]);

    const save = () => {
        setStringParam('');
        setVariableIds(pickedBoxes || !variableToken ? [] : [toWiredVariableId(targetType, variableToken)]);
        setIntParams([
            effectiveCreatedEnabled ? 1 : 0,
            valueChangedEnabled && canChangeValue ? 1 : 0,
            effectiveDeletedEnabled ? 1 : 0,
            (effectiveIncreasedEnabled ? 1 : 0) | (effectiveDecreasedEnabled ? 2 : 0) | (effectiveUnchangedEnabled ? 4 : 0),
            originMask,
            mode
        ]);
    };

    const effectiveOriginMask = originMask < 0 || originMask === 0 ? ORIGIN_EVERY_BIT : originMask;
    const isOriginChecked = (bit: number) => (effectiveOriginMask & (1 << bit)) !== 0;
    const toggleOrigin = (bit: number, checked: boolean) => {
        const nextMask = checked ? effectiveOriginMask | (1 << bit) : effectiveOriginMask & ~(1 << bit);

        setOriginMask(nextMask === ORIGIN_EVERY_BIT ? ORIGIN_ALL : nextMask);
    };

    const optionRow = (checked: boolean, disabled: boolean, labelKey: string, onChange: (checked: boolean) => void) => (
        <label className="flex items-center gap-1">
            <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChange} />
            <Text>{LocalizeText(labelKey)}</Text>
        </label>
    );

    // AIR VariableUpdate: the mode, the variable (off in mode 1), then the options and the origins, both collapsed.
    // forceFurniSelection: the variable boxes are always pickable; mode 1 watches them.
    return (
        <NativeTextTree>
            <WiredTriggerBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID} save={save}>
                <div className="octane-wired__give-var octane-wired__give-var--trigger-variable">
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variables.trigger_mode', 'Choose the variable by:')}</Text>
                        {MODES.map((option) => (
                            <label key={option.value} className="flex items-center gap-1">
                                <Radio checked={mode === option.value} name="variableChangedTriggerMode" onCheckedChange={() => setMode(option.value)} />
                                <Text>{localizeWithFallback(option.key, option.fallback)}</Text>
                            </label>
                        ))}
                    </div>

                    <div className="octane-wired__divider" />

                    <fieldset className={`flex flex-col gap-1 border-0 p-0 m-0 ${pickedBoxes ? 'opacity-50' : ''}`} data-testid="variable-selection" disabled={pickedBoxes}>
                        <div className="octane-wired__give-var-heading">
                            <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGET_BUTTONS.map((button) => (
                                    <BaseButton
                                        key={button.key}
                                        type="button"
                                        disabled={pickedBoxes}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${targetType === button.key ? 'is-active' : ''}`}
                                        onClick={() => {
                                            if (targetType === button.key) return;

                                            setTargetType(button.key);
                                            setVariableToken('');
                                        }}
                                    >
                                        <img src={button.icon} alt={button.key} />
                                    </BaseButton>
                                ))}
                            </div>
                        </div>

                        <WiredVariablePicker
                            entries={resolvedVariableEntries}
                            recentScope="variable-triggers"
                            selectedToken={variableToken}
                            onSelect={(entry) => setVariableToken(entry.token)}
                        />
                    </fieldset>

                    <div className="octane-wired__divider" />

                    <CollapsibleSection className="flex flex-col gap-1" title={<Text bold>{LocalizeText('wiredfurni.params.variables.trigger_options')}</Text>}>
                        <div className="flex flex-col gap-1">
                            {optionRow(effectiveCreatedEnabled, !canCreateAndDelete, 'wiredfurni.params.variables.trigger_options.0', setCreatedEnabled)}
                            {optionRow(valueChangedEnabled && canChangeValue, !canChangeValue, 'wiredfurni.params.variables.trigger_options.1', setValueChangedEnabled)}
                            <div className="ml-3 flex flex-col gap-1">
                                {optionRow(effectiveIncreasedEnabled, !valueChangedEnabled || !canChangeValue, 'wiredfurni.params.variables.trigger_options.1.0', setIncreasedEnabled)}
                                {optionRow(effectiveDecreasedEnabled, !valueChangedEnabled || !canChangeValue, 'wiredfurni.params.variables.trigger_options.1.1', setDecreasedEnabled)}
                                {optionRow(effectiveUnchangedEnabled, !valueChangedEnabled || !canChangeValue, 'wiredfurni.params.variables.trigger_options.1.2', setUnchangedEnabled)}
                            </div>
                            {optionRow(effectiveDeletedEnabled, !canCreateAndDelete, 'wiredfurni.params.variables.trigger_options.2', setDeletedEnabled)}
                        </div>
                    </CollapsibleSection>

                    <div className="octane-wired__divider" />

                    <CollapsibleSection className="flex flex-col gap-1" title={<Text bold>{localizeWithFallback('wiredfurni.params.variables.trigger_origin', 'Allow the trigger from:')}</Text>}>
                        <div className="flex flex-col gap-1">
                            {ORIGIN_OPTIONS.map((option) => (
                                <div key={option.bit} className="flex flex-col">
                                    <label className="flex items-center gap-1">
                                        <Checkbox checked={isOriginChecked(option.bit)} disabled={isOriginDisabled(option.bit)} onCheckedChange={(nextChecked) => toggleOrigin(option.bit, nextChecked)} />
                                        <Text>{localizeWithFallback(`wiredfurni.params.variables.trigger_origin.${option.bit}`, option.fallback)}</Text>
                                    </label>
                                    {option.info && (
                                        <Text small className="ml-5 text-black/60 whitespace-pre-line">
                                            {localizeWithFallback(`wiredfurni.params.variables.trigger_origin.${option.bit}.info`, option.info)}
                                        </Text>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                </div>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
