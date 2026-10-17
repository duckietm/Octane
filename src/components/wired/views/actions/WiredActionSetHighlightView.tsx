import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useNotification, useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';
import {
    normalizeWiredActionSetHighlight,
    serializeWiredActionSetHighlight,
    snapWiredHighlightStrength,
    WIRED_HIGHLIGHT_AUDIENCE_EVERYONE,
    WIRED_HIGHLIGHT_AUDIENCE_SOURCE_USERS,
    WIRED_HIGHLIGHT_COLOR_TINT,
    WIRED_HIGHLIGHT_COLORS,
    WIRED_HIGHLIGHT_SELECTED_FURNI_SOURCE,
    WIRED_HIGHLIGHT_TYPES,
    WIRED_HIGHLIGHT_ANIMATION_STEADY,
    wiredHighlightAnimations,
    wiredHighlightDarkenLevels,
    wiredHighlightHasColor,
    wiredHighlightStrengthOptions,
    WiredActionSetHighlightState
} from './WiredActionSetHighlightState';
import { ToggleButton } from '../../../../common/ToggleButton';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';

const TYPE_FALLBACKS = ['Outline', 'Soft glow', 'Darken', 'Colour tint', 'Brighten', 'Neon aura'];
const EASING_FALLBACKS = ['Instant', 'Linear', 'Ease in', 'Ease out', 'Ease in and out'];

const hexColor = (color: number) => `#${(color & 0xFFFFFF).toString(16).padStart(6, '0')}`;

/** Official set furni highlight (62): audience, type, strength, colour, animation and easing, on furni or users. */
export const WiredActionSetHighlightView: FC<{}> = () => {
    const { trigger = null, setFurniIds = null, setIntParams = null, setSourceTypes = null } = useWired();
    const { simpleAlert = null } = useNotification();
    const darkenLevels = useMemo(() => wiredHighlightDarkenLevels(GetConfigurationValue<string>('wired.furni_highlight.darken_levels', '')), []);
    const read = () => normalizeWiredActionSetHighlight(trigger?.intData, trigger?.furniSourceTypes, trigger?.userSourceTypes, darkenLevels);
    const [state, setState] = useState<WiredActionSetHighlightState>(read);
    const everyoneInfoShown = useRef(false);

    useEffect(() => {
        const next = read();

        // Official: a box already showing to everyone does not explain it again.
        if (next.audience === WIRED_HIGHLIGHT_AUDIENCE_EVERYONE) everyoneInfoShown.current = true;
        setState(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger]);

    const update = (patch: Partial<WiredActionSetHighlightState>) => setState((current) => ({ ...current, ...patch }));

    const changeAudience = (audience: number) => {
        if (audience === WIRED_HIGHLIGHT_AUDIENCE_EVERYONE && !everyoneInfoShown.current && simpleAlert) {
            everyoneInfoShown.current = true;
            simpleAlert(
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.body', 'Stack this effect with "When a user enters the room" to keep it after re-entering.'),
                null,
                null,
                null,
                localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone_info.title', 'Keeping this effect visible after re-entering')
            );
        }

        update({ audience });
    };

    const changeType = (highlightType: number) =>
        setState((current) => {
            const animations = wiredHighlightAnimations(highlightType);

            return {
                ...current,
                highlightType,
                strength: snapWiredHighlightStrength(highlightType, current.strength, darkenLevels),
                animation: animations.includes(current.animation) ? current.animation : animations[0],
                // Colour tint has no white.
                color: highlightType === WIRED_HIGHLIGHT_COLOR_TINT && current.color === WIRED_HIGHLIGHT_COLORS[0] ? WIRED_HIGHLIGHT_COLORS[1] : current.color
            };
        });

    const save = () => {
        const wire = serializeWiredActionSetHighlight(state);

        setIntParams(wire.intParams);
        setSourceTypes({ furni: wire.furniSources, users: wire.userSources });
        if (state.targetUsers || state.furniSource !== WIRED_HIGHLIGHT_SELECTED_FURNI_SOURCE) setFurniIds?.([]);
    };

    const strengthOptions = wiredHighlightStrengthOptions(state.highlightType, darkenLevels);
    const strengthLabel = (level: number) =>
        level === 0
            ? localizeWithFallback('wiredfurni.params.set_furni_highlight.off', 'Off')
            : level < 0
              ? localizeWithFallback('wiredfurni.params.set_furni_highlight.on', 'On')
              : LocalizeText('wiredfurni.params.set_furni_highlight.level', ['level'], [String(level)]);
    const palette = state.highlightType === WIRED_HIGHLIGHT_COLOR_TINT ? WIRED_HIGHLIGHT_COLORS.slice(1) : WIRED_HIGHLIGHT_COLORS;
    const hasColor = wiredHighlightHasColor(state.highlightType);
    const showWarning = !state.targetUsers && state.highlightType === WIRED_HIGHLIGHT_COLOR_TINT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={state.targetUsers ? WiredFurniType.STUFF_SELECTION_OPTION_NONE : WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <Text bold>{localizeWithFallback('wiredfurni.params.sources.merged.title.target', 'Select target:')}</Text>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-1">
                            <Radio checked={!state.targetUsers} name="wiredHighlightTarget" onCheckedChange={() => update({ targetUsers: false })} />
                            <Text>{localizeWithFallback('wiredfurni.params.sources.furni.title', 'Furni')}</Text>
                        </label>
                        <label className="flex items-center gap-1">
                            <Radio checked={state.targetUsers} name="wiredHighlightTarget" onCheckedChange={() => update({ targetUsers: true })} />
                            <Text>{localizeWithFallback('wiredfurni.params.sources.users.title', 'Users')}</Text>
                        </label>
                    </div>
                    {state.targetUsers ? (
                        <WiredSourcesSelector showUsers={true} userSlot={1} userSource={state.targetUserSource} onChangeUsers={(targetUserSource) => update({ targetUserSource })} />
                    ) : (
                        <WiredSourcesSelector showFurni={true} furniSource={state.furniSource} onChangeFurni={(furniSource) => update({ furniSource })} />
                    )}
                    {state.audience === WIRED_HIGHLIGHT_AUDIENCE_SOURCE_USERS && (
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
                <Select className="form-select form-select-sm" value={state.audience} onChange={(event) => changeAudience(Number(event.target.value))}>
                    <option value={WIRED_HIGHLIGHT_AUDIENCE_SOURCE_USERS}>{localizeWithFallback('wiredfurni.params.furni_visualization.audience.selected_users', 'Selected users')}</option>
                    <option value={WIRED_HIGHLIGHT_AUDIENCE_EVERYONE}>{localizeWithFallback('wiredfurni.params.furni_visualization.audience.everyone', 'Everyone, also users who enter later')}</option>
                </Select>
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_highlight.type', 'Highlight type:')}</Text>
                <Select aria-label="highlight type" className="form-select form-select-sm" value={state.highlightType} onChange={(event) => changeType(Number(event.target.value))}>
                    {WIRED_HIGHLIGHT_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {localizeWithFallback(`wiredfurni.params.set_furni_highlight.type.${type}`, TYPE_FALLBACKS[type])}
                        </option>
                    ))}
                </Select>
                {showWarning && <Text small variant="danger">{localizeWithFallback('wiredfurni.params.set_furni_highlight.normal_furni_warning', 'This highlight type does not work on items outside Builders Club.')}</Text>}
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_highlight.strength', 'Strength:')}</Text>
                <Select aria-label="highlight strength" className="form-select form-select-sm" value={state.strength} onChange={(event) => update({ strength: Number(event.target.value) })}>
                    {strengthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {strengthLabel(option.level)}
                        </option>
                    ))}
                </Select>
            </div>

            <div className={`flex flex-col gap-1 ${hasColor ? '' : 'opacity-50 pointer-events-none'}`}>
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_highlight.color', 'Highlight colour:')}</Text>
                <div className="flex flex-wrap gap-1">
                    {palette.map((color) => (
                        <ToggleButton
                            key={color}
                            aria-label={hexColor(color)}
                            pressed={state.color === color}
                            className={`h-[14px] w-[14px] border ${state.color === color ? 'border-black' : 'border-[#9a9a9a]'}`}
                            style={{ background: hexColor(color) }}
                            type="button"
                            onClick={() => update({ color })}
                        />
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_highlight.animation', 'Animation:')}</Text>
                <Select aria-label="highlight animation" className="form-select form-select-sm" value={state.animation} onChange={(event) => update({ animation: Number(event.target.value) })}>
                    {wiredHighlightAnimations(state.highlightType).map((animation) => (
                        <option key={animation} value={animation}>
                            {localizeWithFallback(`wiredfurni.params.set_furni_highlight.animation.${animation}`, animation === 0 ? 'Steady' : 'Pulse')}
                        </option>
                    ))}
                </Select>
            </div>

            <div className={`flex flex-col gap-1 ${state.animation === WIRED_HIGHLIGHT_ANIMATION_STEADY ? '' : 'opacity-50 pointer-events-none'}`}>
                <Text bold>{localizeWithFallback('wiredfurni.params.set_furni_highlight.easing', 'Transition:')}</Text>
                <Select aria-label="highlight easing" className="form-select form-select-sm" value={state.easing} onChange={(event) => update({ easing: Number(event.target.value) })}>
                    {EASING_FALLBACKS.map((fallback, value) => (
                        <option key={value} value={value}>
                            {localizeWithFallback(`wiredfurni.params.set_furni_highlight.easing.${value}`, fallback)}
                        </option>
                    ))}
                </Select>
            </div>
        </WiredActionBaseView>
    );
};
