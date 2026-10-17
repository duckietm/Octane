import { FC, useEffect, useMemo, useState } from 'react';
import { fromOfficialVariableTarget, LocalizeText, localizeWithFallback, toOfficialVariableTarget, WiredFurniType } from '../../../../api';
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
    IWiredVariablePickerEntry,
    normalizeVariableTokenFromWire,
    withoutExecutionContextVariables
} from '../WiredVariablePickerData';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { BaseButton } from '../../../../common/BaseButton';

type VariableTargetType = 'user' | 'furni' | 'global';

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_GLOBAL = 3;

// Where a change may come from; the server labels each write and the trigger keeps a bit mask of
// the origins it listens to (-1 = every origin, which is also what a box saved before the mask means).
const ORIGIN_ALL = -1;
const ORIGIN_OPTIONS = [
    // The official bits: 0 this room, 1 another room (never happens here, so not offered), 2
    // inspection (our creator tools), 3 external (our web API).
    { bit: 0, key: 'wiredfurni.params.variables.trigger_origin.0', fallback: 'A wired box in this room' },
    { bit: 2, key: 'wiredfurni.params.variables.trigger_origin.2', fallback: 'The creator tools' },
    { bit: 3, key: 'wiredfurni.params.variables.trigger_origin.3', fallback: 'The web API' }
] as const;
const ORIGIN_EVERY_BIT = ORIGIN_OPTIONS.reduce((mask, option) => mask | (1 << option.bit), 0);

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
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
        default:
            return TARGET_USER;
    }
};

export const WiredTriggerVariableChangedView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
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
    const effectiveCreatedEnabled = targetType === 'global' ? false : createdEnabled;
    const effectiveDeletedEnabled = targetType === 'global' ? false : deletedEnabled;
    const effectiveIncreasedEnabled = valueChangedEnabled && increasedEnabled;
    const effectiveDecreasedEnabled = valueChangedEnabled && decreasedEnabled;
    const effectiveUnchangedEnabled = valueChangedEnabled && unchangedEnabled;

    useEffect(() => {
        if (!trigger) return;

        const intData = trigger.intData || [];

        // Official layout: [created, value changed, deleted, (bit 0 increased, 1 decreased, 2
        // unchanged), origins (-1 every one), mode]; ours follows: [variable target (official ids)].
        const changes = intData.length > 3 ? intData[3] : 7;

        setTargetType(normalizeTargetType(intData.length > 6 ? fromOfficialVariableTarget(intData[6]) : TARGET_USER));
        setVariableToken(normalizeVariableTokenFromWire(trigger.stringData || ''));
        setCreatedEnabled(intData.length <= 0 || intData[0] === 1);
        setValueChangedEnabled(intData.length <= 1 || intData[1] === 1);
        setDeletedEnabled(intData.length <= 2 || intData[2] === 1);
        setIncreasedEnabled((changes & 1) !== 0);
        setDecreasedEnabled((changes & 2) !== 0);
        setUnchangedEnabled((changes & 4) !== 0);
        setOriginMask(intData.length > 4 ? intData[4] : ORIGIN_ALL);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'global') return;

        setCreatedEnabled(false);
        setDeletedEnabled(false);
    }, [targetType]);

    const save = () => {
        setStringParam(variableToken);
        setIntParams([
            effectiveCreatedEnabled ? 1 : 0,
            valueChangedEnabled ? 1 : 0,
            effectiveDeletedEnabled ? 1 : 0,
            (effectiveIncreasedEnabled ? 1 : 0) | (effectiveDecreasedEnabled ? 2 : 0) | (effectiveUnchangedEnabled ? 4 : 0),
            originMask,
            0,
            toOfficialVariableTarget(getTargetValue(targetType))
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
                            <BaseButton
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

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.variables.trigger_options')}</Text>

                    <label className="flex items-center gap-1">
                        <Checkbox checked={effectiveCreatedEnabled} disabled={targetType === 'global'} onCheckedChange={(nextChecked) => setCreatedEnabled(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.0')}</Text>
                    </label>

                    <label className="flex items-center gap-1">
                        <Checkbox checked={valueChangedEnabled} onCheckedChange={(nextChecked) => setValueChangedEnabled(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1')}</Text>
                    </label>

                    <div className="ml-3 flex flex-col gap-1">
                        <label className="flex items-center gap-1">
                            <Checkbox checked={effectiveIncreasedEnabled} disabled={!valueChangedEnabled} onCheckedChange={(nextChecked) => setIncreasedEnabled(nextChecked)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.0')}</Text>
                        </label>
                        <label className="flex items-center gap-1">
                            <Checkbox checked={effectiveDecreasedEnabled} disabled={!valueChangedEnabled} onCheckedChange={(nextChecked) => setDecreasedEnabled(nextChecked)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.1')}</Text>
                        </label>
                        <label className="flex items-center gap-1">
                            <Checkbox checked={effectiveUnchangedEnabled} disabled={!valueChangedEnabled} onCheckedChange={(nextChecked) => setUnchangedEnabled(nextChecked)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.1.2')}</Text>
                        </label>
                    </div>

                    <label className="flex items-center gap-1">
                        <Checkbox checked={effectiveDeletedEnabled} disabled={targetType === 'global'} onCheckedChange={(nextChecked) => setDeletedEnabled(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.trigger_options.2')}</Text>
                    </label>
                </div>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.variables.trigger_origin', 'Changed by:')}</Text>
                    {ORIGIN_OPTIONS.map((option) => (
                        <label key={option.bit} className="flex items-center gap-1">
                            <Checkbox checked={isOriginChecked(option.bit)} onCheckedChange={(nextChecked) => toggleOrigin(option.bit, nextChecked)} />
                            <Text>{localizeWithFallback(option.key, option.fallback)}</Text>
                        </label>
                    ))}
                </div>
            </div>
        </WiredTriggerBaseView>
    );
};
