import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import {
    normalizeWiredActionChangeOpacity,
    serializeWiredActionChangeOpacity,
    WIRED_OPACITY_DEFAULT_DURATION,
    WIRED_OPACITY_EASING_INSTANT,
    WIRED_OPACITY_MAXIMUM,
    WIRED_OPACITY_MAXIMUM_DURATION,
    WIRED_OPACITY_MINIMUM,
    WIRED_OPACITY_SELECTED_FURNI_SOURCE,
    WIRED_OPACITY_VISIBILITY_EVERYONE,
    WIRED_OPACITY_VISIBILITY_SOURCE_USERS,
    WiredActionChangeOpacityState
} from './WiredActionChangeOpacityState';

const EASING_OPTIONS = [
    { value: WIRED_OPACITY_EASING_INSTANT, key: 'wiredfurni.params.easing.instant', label: 'Instant' },
    { value: 1, key: 'wiredfurni.params.easing.linear', label: 'Linear' },
    { value: 2, key: 'wiredfurni.params.easing.ease_in', label: 'Ease in' },
    { value: 3, key: 'wiredfurni.params.easing.ease_out', label: 'Ease out' },
    { value: 4, key: 'wiredfurni.params.easing.ease_in_out', label: 'Ease in-out' }
];

export const WiredActionChangeOpacityView: FC<{}> = () => {
    const { trigger = null, setFurniIds = null, setIntParams = null } = useWired();
    const [state, setState] = useState<WiredActionChangeOpacityState>(() => normalizeWiredActionChangeOpacity(trigger?.intData));

    useEffect(() => {
        setState(normalizeWiredActionChangeOpacity(trigger?.intData));
    }, [trigger]);

    const update = (patch: Partial<WiredActionChangeOpacityState>) => setState((current) => ({ ...current, ...patch }));
    const save = () => {
        setIntParams(serializeWiredActionChangeOpacity(state));
        if (state.furniSource !== WIRED_OPACITY_SELECTED_FURNI_SOURCE) setFurniIds?.([]);
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <WiredSourcesSelector
                    showFurni={true}
                    showUsers={state.visibility === WIRED_OPACITY_VISIBILITY_SOURCE_USERS}
                    furniSource={state.furniSource}
                    userSource={state.userSource}
                    onChangeFurni={(furniSource) => update({ furniSource })}
                    onChangeUsers={(userSource) => update({ userSource })}
                />
            }
        >
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.opacity.visibility_selection.title', 'Who should see this opacity change?')}</Text>
                <label className="flex items-center gap-1">
                    <input
                        checked={state.visibility === WIRED_OPACITY_VISIBILITY_SOURCE_USERS}
                        className="form-check-input"
                        name="wiredOpacityVisibility"
                        type="radio"
                        onChange={() => update({ visibility: WIRED_OPACITY_VISIBILITY_SOURCE_USERS })}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.show_message.visibility_selection.0', 'Only the selected users')}</Text>
                </label>
                <label className="flex items-center gap-1">
                    <input
                        checked={state.visibility === WIRED_OPACITY_VISIBILITY_EVERYONE}
                        className="form-check-input"
                        name="wiredOpacityVisibility"
                        type="radio"
                        onChange={() => update({ visibility: WIRED_OPACITY_VISIBILITY_EVERYONE })}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.show_message.visibility_selection.1', 'Everyone in the room')}</Text>
                </label>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                    <Text bold>{localizeWithFallback('wiredfurni.params.opacity.visibility_amount', 'Opacity')}</Text>
                    <input
                        aria-label="Opacity percentage"
                        className="form-control form-control-sm max-w-[80px]"
                        max={WIRED_OPACITY_MAXIMUM}
                        min={WIRED_OPACITY_MINIMUM}
                        type="number"
                        value={state.opacity}
                        onChange={(event) => update({ opacity: Number(event.target.value) })}
                    />
                </div>
                <Slider
                    max={WIRED_OPACITY_MAXIMUM}
                    min={WIRED_OPACITY_MINIMUM}
                    step={1}
                    value={state.opacity}
                    onChange={(opacity) => update({ opacity: opacity as number })}
                />
                <label className="flex items-center gap-1">
                    <input
                        checked={state.clickThrough}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => update({ clickThrough: event.target.checked })}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.opacity.clickthrough', 'Allow clicks to pass through transparent furni')}</Text>
                </label>
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.easing_function', 'Transition')}</Text>
                <select className="form-select form-select-sm" value={state.easing} onChange={(event) => update({ easing: Number(event.target.value) })}>
                    {EASING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.key, option.label)}
                        </option>
                    ))}
                </select>
                {state.easing !== WIRED_OPACITY_EASING_INSTANT && (
                    <label className="flex items-center justify-between gap-2">
                        <Text>{localizeWithFallback('wiredfurni.params.variables.duration', 'Duration (seconds, 0 = default)')}</Text>
                        <input
                            aria-label="Transition duration in seconds, 0 uses the default transition"
                            className="form-control form-control-sm max-w-[80px]"
                            max={WIRED_OPACITY_MAXIMUM_DURATION}
                            min={WIRED_OPACITY_DEFAULT_DURATION}
                            type="number"
                            value={state.duration}
                            onChange={(event) => update({ duration: Number(event.target.value) })}
                        />
                    </label>
                )}
            </div>
        </WiredActionBaseView>
    );
};
