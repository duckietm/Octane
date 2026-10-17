import { FC, useEffect, useRef, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useNotification, useWired } from '../../../../hooks';
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
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const EASING_FALLBACKS = ['Instant', 'Linear', 'Ease in', 'Ease out', 'Ease in and out'];

type VisibilityChoice = 'visible' | 'invisible' | 'custom';

const visibilityChoice = (opacity: number): VisibilityChoice =>
    opacity >= WIRED_OPACITY_MAXIMUM ? 'visible' : opacity <= WIRED_OPACITY_MINIMUM ? 'invisible' : 'custom';

/**
 * Official set furni transparency (61): audience, visible / invisible, click handling and easing.
 * Ours on top: an in-between transparency and the transition seconds.
 */
export const WiredActionChangeOpacityView: FC<{}> = () => {
    const { trigger = null, setFurniIds = null, setIntParams = null, setSourceTypes = null } = useWired();
    const { simpleAlert = null } = useNotification();
    const read = () => normalizeWiredActionChangeOpacity(trigger?.intData, trigger?.furniSourceTypes, trigger?.userSourceTypes);
    const [state, setState] = useState<WiredActionChangeOpacityState>(read);
    const everyoneInfoShown = useRef(false);

    useEffect(() => {
        setState(read());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger]);

    const update = (patch: Partial<WiredActionChangeOpacityState>) => setState((current) => ({ ...current, ...patch }));

    const changeAudience = (visibility: number) => {
        // Official: choosing "everyone" the first time explains how to keep it after re-entering.
        if (visibility === WIRED_OPACITY_VISIBILITY_EVERYONE && !everyoneInfoShown.current && simpleAlert) {
            everyoneInfoShown.current = true;
            simpleAlert(
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.body', 'Stack this effect with "When a user enters the room" to keep it after re-entering.'),
                null,
                null,
                null,
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.title', 'Keeping this effect visible after re-entering')
            );
        }

        update({ visibility });
    };

    const changeVisibility = (choice: VisibilityChoice) => {
        if (choice === 'visible') update({ opacity: WIRED_OPACITY_MAXIMUM });
        else if (choice === 'invisible') update({ opacity: WIRED_OPACITY_MINIMUM });
        else update({ opacity: 50 });
    };

    const save = () => {
        const wire = serializeWiredActionChangeOpacity(state);

        setIntParams(wire.intParams);
        setSourceTypes({ furni: wire.furniSources, users: wire.userSources });
        if (state.targetUsers || state.furniSource !== WIRED_OPACITY_SELECTED_FURNI_SOURCE) setFurniIds?.([]);
    };

    const choice = visibilityChoice(state.opacity);
    const radio = (value: VisibilityChoice, key: string, fallback: string) => (
        <label className="flex items-center gap-1">
            <Radio checked={choice === value} name="wiredTransparency" onCheckedChange={() => changeVisibility(value)} />
            <Text>{localizeWithFallback(key, fallback)}</Text>
        </label>
    );

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={state.targetUsers ? WiredFurniType.STUFF_SELECTION_OPTION_NONE : WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <Text bold>{localizeWithFallback('wiredfurni.params.sources.merged.title.target', 'Select target:')}</Text>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-1">
                            <input checked={!state.targetUsers} className="form-check-input" name="wiredTransparencyTarget" type="radio" onChange={() => update({ targetUsers: false })} />
                            <Text>{localizeWithFallback('wiredfurni.params.sources.furni.title', 'Furni')}</Text>
                        </label>
                        <label className="flex items-center gap-1">
                            <input checked={state.targetUsers} className="form-check-input" name="wiredTransparencyTarget" type="radio" onChange={() => update({ targetUsers: true })} />
                            <Text>{localizeWithFallback('wiredfurni.params.sources.users.title', 'Users')}</Text>
                        </label>
                    </div>
                    {state.targetUsers ? (
                        <WiredSourcesSelector showUsers={true} userSlot={1} userSource={state.targetUserSource} onChangeUsers={(targetUserSource) => update({ targetUserSource })} />
                    ) : (
                        <WiredSourcesSelector showFurni={true} furniSource={state.furniSource} onChangeFurni={(furniSource) => update({ furniSource })} />
                    )}
                    {state.visibility === WIRED_OPACITY_VISIBILITY_SOURCE_USERS && (
                        <WiredSourcesSelector
                            showUsers={true}
                            usersTitle="wiredfurni.params.visualization.visibility_audience"
                            userSource={state.userSource}
                            onChangeUsers={(userSource) => update({ userSource })}
                        />
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.furni_visualization.audience', 'Who should see the effect?')}</Text>
                <select className="form-select form-select-sm" value={state.visibility} onChange={(event) => changeAudience(Number(event.target.value))}>
                    <option value={WIRED_OPACITY_VISIBILITY_SOURCE_USERS}>{localizeWithFallback('wiredfurni.params.furni_visualization.audience.selected_users', 'Selected users')}</option>
                    <option value={WIRED_OPACITY_VISIBILITY_EVERYONE}>{localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone', 'Everyone, also users who enter later')}</option>
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_transparency.visibility', 'Visibility:')}</Text>
                {radio('visible', 'wiredfurni.params.set_furni_transparency.visible', 'Visible')}
                {radio('invisible', 'wiredfurni.params.set_furni_transparency.invisible', 'Invisible')}
                {radio('custom', 'wiredfurni.params.opacity.visibility_amount', 'Opacity')}
                {choice === 'custom' && (
                    <div className="flex items-center gap-2">
                        <Slider
                            max={WIRED_OPACITY_MAXIMUM - 1}
                            min={WIRED_OPACITY_MINIMUM + 1}
                            step={1}
                            value={state.opacity}
                            onChange={(opacity) => update({ opacity: opacity as number })}
                        />
                        <Text small>{state.opacity}%</Text>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_transparency.click_handling', 'Click handling:')}</Text>
                <label className="flex items-center gap-1">
                    <Checkbox checked={state.clickThrough} onCheckedChange={(nextChecked) => update({ clickThrough: nextChecked })} />
                    <Text>{localizeWithFallback('wiredfurni.params.set_furni_transparency.allow_click_through', 'The target cannot be clicked')}</Text>
                </label>
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_transparency.easing', 'Transition:')}</Text>
                <select className="form-select form-select-sm" value={state.easing} onChange={(event) => update({ easing: Number(event.target.value) })}>
                    {EASING_FALLBACKS.map((fallback, value) => (
                        <option key={value} value={value}>
                            {localizeWithFallback(`wiredfurni.params.set_furni_transparency.easing.${value}`, fallback)}
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
