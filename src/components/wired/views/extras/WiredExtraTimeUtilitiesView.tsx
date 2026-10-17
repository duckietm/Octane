import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import {
    isTimeUtilSubVariableSelected,
    ITimeUtilSubVariable,
    normalizeTimeUtilMask,
    normalizeTimeUtilMode,
    setTimeUtilSubVariableSelected,
    TIME_UTIL_ADVANCED_SUB_VARIABLES,
    TIME_UTIL_MODE_VALUE,
    TIME_UTIL_MODES,
    TIME_UTIL_SUB_VARIABLES
} from './timeUtilitiesParams';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const MODE_FALLBACKS = ['Variable value', 'Creation time', 'Last update time'];
const SUB_VARIABLE_KEY = 'wiredfurni.params.time_util.subvariable.';

export const WiredExtraTimeUtilitiesView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mask, setMask] = useState(0);
    const [mode, setMode] = useState(TIME_UTIL_MODE_VALUE);
    const [isCalendarOpen, setIsCalendarOpen] = useState(true);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    useEffect(() => {
        const intData = trigger?.intData ?? [];

        setMask(normalizeTimeUtilMask(intData[0] ?? 0));
        setMode(normalizeTimeUtilMode(intData[1] ?? TIME_UTIL_MODE_VALUE));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeTimeUtilMask(mask), normalizeTimeUtilMode(mode)]);
        setStringParam('');
    };

    const renderSubVariables = (subVariables: ITimeUtilSubVariable[]) => (
        <div className="octane-wired__levelup-subvariables">
            {subVariables.map((subVariable) => (
                <div key={subVariable.id} className="octane-wired__levelup-subvariable-row">
                    <label className="octane-wired__levelup-subvariable-label">
                        <Checkbox checked={isTimeUtilSubVariableSelected(mask, subVariable.id)} onCheckedChange={(nextChecked) => setMask((value) => setTimeUtilSubVariableSelected(value, subVariable.id, nextChecked))} />
                        <Text>{localizeWithFallback(`${SUB_VARIABLE_KEY}${subVariable.id}`, subVariable.label)}</Text>
                    </label>
                    <input className="octane-wired__levelup-subvariable-token" readOnly tabIndex={-1} type="text" value={subVariable.name} />
                </div>
            ))}
        </div>
    );

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 300 }}>
            <div className="octane-wired__levelup">
                <div className="octane-wired__levelup-section">
                    <Text bold>{localizeWithFallback('wiredfurni.params.choose_type', 'Read the variable as:')}</Text>
                    <div className="flex flex-col gap-1">
                        {TIME_UTIL_MODES.map((option) => (
                            <label key={option} className="flex items-center gap-2">
                                <Radio checked={mode === option} name="wiredTimeUtilMode" onCheckedChange={() => setMode(option)} />
                                <Text>{localizeWithFallback(`wiredfurni.params.time_util.mode.${option}`, MODE_FALLBACKS[option])}</Text>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__levelup-section">
                    <button type="button" className="octane-wired__levelup-section-header" onClick={() => setIsCalendarOpen((value) => !value)}>
                        <Text bold>{localizeWithFallback('wiredfurni.params.create_subvariables', 'Create sub-variables:')}</Text>
                        <span className={`octane-wired__levelup-chevron ${isCalendarOpen ? 'is-open' : ''}`}>^</span>
                    </button>
                    {isCalendarOpen && renderSubVariables(TIME_UTIL_SUB_VARIABLES)}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__levelup-section">
                    <button type="button" className="octane-wired__levelup-section-header" onClick={() => setIsAdvancedOpen((value) => !value)}>
                        <Text bold>{localizeWithFallback('wiredfurni.params.create_subvariables.advanced', 'Advanced sub-variables:')}</Text>
                        <span className={`octane-wired__levelup-chevron ${isAdvancedOpen ? 'is-open' : ''}`}>^</span>
                    </button>
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
    );
};
