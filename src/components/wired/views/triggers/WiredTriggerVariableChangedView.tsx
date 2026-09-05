import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
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
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';

type VariableTargetType = 'user' | 'furni' | 'global';

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_GLOBAL = 3;

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
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [createdEnabled, setCreatedEnabled] = useState(true);
    const [valueChangedEnabled, setValueChangedEnabled] = useState(true);
    const [increasedEnabled, setIncreasedEnabled] = useState(true);
    const [decreasedEnabled, setDecreasedEnabled] = useState(true);
    const [unchangedEnabled, setUnchangedEnabled] = useState(true);
    const [deletedEnabled, setDeletedEnabled] = useState(true);

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

        setTargetType(normalizeTargetType(intData.length > 0 ? intData[0] : TARGET_USER));
        setVariableToken(normalizeVariableTokenFromWire(trigger.stringData || ''));
        setCreatedEnabled(intData.length <= 1 || intData[1] === 1);
        setValueChangedEnabled(intData.length <= 2 || intData[2] === 1);
        setIncreasedEnabled(intData.length <= 3 || intData[3] === 1);
        setDecreasedEnabled(intData.length <= 4 || intData[4] === 1);
        setUnchangedEnabled(intData.length <= 5 || intData[5] === 1);
        setDeletedEnabled(intData.length <= 6 || intData[6] === 1);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'global') return;

        setCreatedEnabled(false);
        setDeletedEnabled(false);
    }, [targetType]);

    const save = () => {
        setStringParam(variableToken);
        setIntParams([
            getTargetValue(targetType),
            effectiveCreatedEnabled ? 1 : 0,
            valueChangedEnabled ? 1 : 0,
            effectiveIncreasedEnabled ? 1 : 0,
            effectiveDecreasedEnabled ? 1 : 0,
            effectiveUnchangedEnabled ? 1 : 0,
            effectiveDeletedEnabled ? 1 : 0
        ]);
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
            </div>
        </WiredTriggerBaseView>
    );
};
