import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredToolsState } from '../../../../hooks';
import {
    availableTimeUtilModes,
    ITimeUtilVariableCapabilities,
    isTimeUtilSubVariableSelected,
    ITimeUtilSubVariable,
    normalizeTimeUtilMask,
    normalizeTimeUtilMode,
    setTimeUtilSubVariableSelected,
    TIME_UTIL_ADVANCED_SUB_VARIABLES,
    TIME_UTIL_MODE_VALUE,
    TIME_UTIL_SUB_VARIABLES,
    isTimeUtilModeWritable,
    timeUtilPartName,
    timeUtilTimestampName
} from './timeUtilitiesParams';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MODE_FALLBACKS = ['Variable value', 'Creation time', 'Last update time'];
const SUB_VARIABLE_KEY = 'wiredfurni.params.time_util.subvariable.';

export const WiredExtraTimeUtilitiesView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mask, setMask] = useState(0);
    const [mode, setMode] = useState(TIME_UTIL_MODE_VALUE);
    const [isCalendarOpen, setIsCalendarOpen] = useState(true);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [storedMode, setStoredMode] = useState(TIME_UTIL_MODE_VALUE);
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredToolsState() ?? {};
    // The room's variables as the official ruleset lists them: room variables have no creation time.
    const variables = useMemo<ITimeUtilVariableCapabilities[]>(
        () => [
            ...[...userVariableDefinitions, ...furniVariableDefinitions, ...contextVariableDefinitions].map((definition) => ({
                hasValue: !!definition.hasValue,
                canReadCreationTime: true,
                canReadLastUpdateTime: true
            })),
            ...roomVariableDefinitions.map((definition) => ({ hasValue: !!definition.hasValue, canReadCreationTime: false, canReadLastUpdateTime: true }))
        ],
        [userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions]
    );
    const modes = useMemo(() => availableTimeUtilModes(variables, storedMode), [variables, storedMode]);

    useEffect(() => {
        const intData = trigger?.intData ?? [];

        setMask(normalizeTimeUtilMask(intData[0] ?? 0));
        const nextMode = normalizeTimeUtilMode(intData[1] ?? TIME_UTIL_MODE_VALUE);

        setMode(nextMode);
        setStoredMode(nextMode);
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeTimeUtilMask(mask), normalizeTimeUtilMode(mode)]);
        setStringParam('');
    };

    const timestampName = timeUtilTimestampName(mode);

    const renderSubVariables = (subVariables: ITimeUtilSubVariable[]) => (
        <div className="octane-wired__levelup-subvariables">
            {subVariables.map((subVariable) => (
                <div key={subVariable.id} className="octane-wired__levelup-subvariable-row">
                    <label className="octane-wired__levelup-subvariable-label">
                        <Checkbox checked={isTimeUtilSubVariableSelected(mask, subVariable.id)} onCheckedChange={(nextChecked) => setMask((value) => setTimeUtilSubVariableSelected(value, subVariable.id, nextChecked))} />
                        <Text>{localizeWithFallback(`${SUB_VARIABLE_KEY}${subVariable.id}`, subVariable.label)}</Text>
                    </label>
                    <input className="octane-wired__levelup-subvariable-token" readOnly tabIndex={-1} type="text" value={timeUtilPartName(mode, subVariable.name)} />
                </div>
            ))}
        </div>
    );

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 300 }}>
                <div className="octane-wired__levelup">
                    <div className="octane-wired__levelup-section">
                        <Text bold>{localizeWithFallback('wiredfurni.params.choose_type', 'Read the variable as:')}</Text>
                        {/* Official: a dropdown of the modes the room's variables can be read as. */}
                        <Select
                            aria-label={localizeWithFallback('wiredfurni.params.choose_type', 'Read the variable as:')}
                            className="form-select form-select-sm w-full"
                            value={mode}
                            onChange={(event) => setMode(normalizeTimeUtilMode(parseInt(event.target.value, 10)))}
                        >
                            {modes.map((option) => (
                                <option key={option} value={option}>
                                    {localizeWithFallback(`wiredfurni.params.time_util.mode.${option}`, MODE_FALLBACKS[option])}
                                </option>
                            ))}
                        </Select>
                        <Text small>
                            {isTimeUtilModeWritable(mode)
                                ? localizeWithFallback('wiredfurni.params.time_util.writable_info', 'Writing a part moves the variable by that part.')
                                : localizeWithFallback('wiredfurni.params.time_util.readonly_info', 'The parts of a timestamp are read-only.')}
                        </Text>
                        {timestampName && (
                            <div className="octane-wired__levelup-subvariable-row">
                                <Text>{localizeWithFallback('wiredfurni.params.time_util.timestamp', 'Timestamp')}</Text>
                                <input className="octane-wired__levelup-subvariable-token" readOnly tabIndex={-1} type="text" value={timestampName} />
                            </div>
                        )}
                    </div>

                    <div className="octane-wired__divider" />

                    <div className="octane-wired__levelup-section">
                        <BaseButton type="button" className="octane-wired__levelup-section-header" onClick={() => setIsCalendarOpen((value) => !value)}>
                            <Text bold>{localizeWithFallback('wiredfurni.params.create_subvariables', 'Create sub-variables:')}</Text>
                            <span className={`octane-wired__levelup-chevron ${isCalendarOpen ? 'is-open' : ''}`}>^</span>
                        </BaseButton>
                        {isCalendarOpen && renderSubVariables(TIME_UTIL_SUB_VARIABLES)}
                    </div>

                    <div className="octane-wired__divider" />

                    <div className="octane-wired__levelup-section">
                        <BaseButton type="button" className="octane-wired__levelup-section-header" onClick={() => setIsAdvancedOpen((value) => !value)}>
                            <Text bold>{localizeWithFallback('wiredfurni.params.create_subvariables.advanced', 'Advanced sub-variables:')}</Text>
                            <span className={`octane-wired__levelup-chevron ${isAdvancedOpen ? 'is-open' : ''}`}>^</span>
                        </BaseButton>
                        {isAdvancedOpen && (
                            <>
                                <Text small>
                                    {localizeWithFallback(
                                        'wiredfurni.params.time_util.advanced_info',
                                        'These sub-variables count from 1970. Use them to compare how many time units lie between two timestamps.'
                                    )}
                                </Text>
                                {renderSubVariables(TIME_UTIL_ADVANCED_SUB_VARIABLES)}
                            </>
                        )}
                    </div>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
