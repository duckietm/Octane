import { FC, useEffect, useMemo, useState } from 'react';
import {
    IWiredVariableFxParams,
    IWiredVariableFxTokens,
    localizeWithFallback,
    readWiredVariableFxParams,
    readWiredVariableFxTokens,
    WIRED_FX_CATEGORY,
    WIRED_FX_COLOR_DYNAMIC_LEVELLING,
    WIRED_FX_COLOR_DYNAMIC_TEAM,
    WIRED_FX_COLOR_NOT_APPLICABLE,
    WIRED_FX_ICONS,
    WIRED_FX_LEVEL_BARS,
    WIRED_FX_NUMBER_ALIGNMENTS,
    WIRED_FX_OVERRIDE_TARGET,
    WIRED_FX_PALETTE,
    WIRED_FX_SEGMENTS_MAX,
    WIRED_FX_SHOW_DURATION_MAX_MS,
    WIRED_FX_SHOW_DURATION_MIN_MS,
    WIRED_FX_SHOW_MODE,
    WIRED_FX_SOURCE,
    WIRED_FX_VISIBILITY,
    WIRED_FX_WIDTHS,
    WiredFurniType,
    wiredVariableFxRendererSupportsSegments,
    wiredVariableFxSegmentRenderer,
    wiredVariableFxStyles,
    wiredVariableFxUsesRange,
    writeWiredVariableFxParams,
    writeWiredVariableFxTokens
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry, WiredVariablePickerTarget, withoutExecutionContextVariables } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';

export interface WiredExtraVariableFxViewProps {
    category: number;
}

const SOURCE_OPTIONS = [
    { value: WIRED_FX_SOURCE.USER, key: 'wiredfurni.params.variablefx.source.user', fallback: 'User variable on this tile' },
    { value: WIRED_FX_SOURCE.FURNI, key: 'wiredfurni.params.variablefx.source.furni', fallback: 'Furni variable on this tile' }
];

const VISIBILITY_OPTIONS = [
    { value: WIRED_FX_VISIBILITY.EVERYONE, key: 'wiredfurni.params.variablefx.visibility.everyone', fallback: 'Everyone' },
    { value: WIRED_FX_VISIBILITY.ONLY_USER, key: 'wiredfurni.params.variablefx.visibility.only_user', fallback: 'Only the user it belongs to' },
    { value: WIRED_FX_VISIBILITY.GAME_TEAM, key: 'wiredfurni.params.variablefx.visibility.game_team', fallback: 'The user and their game team' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE, key: 'wiredfurni.params.variablefx.visibility.has_variable', fallback: 'Users who have a variable' },
    { value: WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE, key: 'wiredfurni.params.variablefx.visibility.has_variable_with_value', fallback: 'Users whose variable has a value' }
];

const SHOW_MODE_OPTIONS = [
    { value: WIRED_FX_SHOW_MODE.ALWAYS, key: 'wiredfurni.params.variablefx.show.always', fallback: 'Always' },
    { value: WIRED_FX_SHOW_MODE.WHEN_CHANGES, key: 'wiredfurni.params.variablefx.show.when_changes', fallback: 'While the value changes' },
    { value: WIRED_FX_SHOW_MODE.NEVER, key: 'wiredfurni.params.variablefx.show.never', fallback: 'Never (hidden)' }
];

const TARGET_OPTIONS = [
    { value: WIRED_FX_OVERRIDE_TARGET.HOLDER, key: 'wiredfurni.params.variablefx.override.holder', fallback: "The holder's own variable" },
    { value: WIRED_FX_OVERRIDE_TARGET.GLOBAL, key: 'wiredfurni.params.variablefx.override.global', fallback: 'A room variable' }
];

const LEVEL_BAR_OPTIONS = [
    { value: WIRED_FX_LEVEL_BARS[0], key: 'wiredfurni.params.variablefx.style.block', fallback: 'Blocks' },
    { value: WIRED_FX_LEVEL_BARS[1], key: 'wiredfurni.params.variablefx.style.striped', fallback: 'Striped' },
    { value: WIRED_FX_LEVEL_BARS[2], key: 'wiredfurni.params.variablefx.style.arrow', fallback: 'Arrows' }
];

const CATEGORY_TITLES: Record<number, { key: string; fallback: string }> = {
    [WIRED_FX_CATEGORY.HEALTH_POINTS]: { key: 'wiredfurni.params.variablefx.category.health', fallback: 'Health points' },
    [WIRED_FX_CATEGORY.PROGRESS_BAR]: { key: 'wiredfurni.params.variablefx.category.progress', fallback: 'Progress bar' },
    [WIRED_FX_CATEGORY.LEVELLING_PROGRESS]: { key: 'wiredfurni.params.variablefx.category.level', fallback: 'Levelling progress' },
    [WIRED_FX_CATEGORY.STATUS_BAR]: { key: 'wiredfurni.params.variablefx.category.status', fallback: 'Status bar' },
    [WIRED_FX_CATEGORY.BOSS_BAR]: { key: 'wiredfurni.params.variablefx.category.boss', fallback: 'Boss bar' },
    [WIRED_FX_CATEGORY.NUMBER_DISPLAY]: { key: 'wiredfurni.params.variablefx.category.number', fallback: 'Number display' }
};

/** Only user-made variables carry an item id the server can look up; internal ones are left out. */
const customOnly = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] =>
    entries
        .map((entry) => (entry.children?.length ? { ...entry, children: customOnly(entry.children) } : entry))
        .filter((entry) => (entry.children ? entry.children.length > 0 : entry.kind === 'custom'));

const toInt = (raw: string, fallback: number) => {
    const parsed = parseInt(raw, 10);

    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The one editor of the six variable fx boxes. What differs per category is which fields make
 * sense: levels and plain numbers have no range, a level badge picks the bar it draws, a number
 * display places its icon, segments only apply to segmented bars.
 */
export const WiredExtraVariableFxView: FC<WiredExtraVariableFxViewProps> = (props) => {
    const { category } = props;
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const tools = useWiredTools();
    // AIR's override and audience pickers leave pointers out: an fx is drawn without a running stack.
    const userVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.userVariableDefinitions), [tools.userVariableDefinitions]);
    const furniVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.furniVariableDefinitions), [tools.furniVariableDefinitions]);
    const roomVariableDefinitions = useMemo(() => withoutExecutionContextVariables(tools.roomVariableDefinitions), [tools.roomVariableDefinitions]);
    const [params, setParams] = useState<IWiredVariableFxParams>(() => readWiredVariableFxParams([], category));
    const [tokens, setTokens] = useState<IWiredVariableFxTokens>(() => readWiredVariableFxTokens(''));
    const [rangeError, setRangeError] = useState(false);

    const usesRange = wiredVariableFxUsesRange(category);
    const styles = wiredVariableFxStyles(category);
    const segmentRenderer = wiredVariableFxSegmentRenderer(category, params.styleId, params.categoryExtra);
    const supportsSegments = wiredVariableFxRendererSupportsSegments(segmentRenderer);
    const holderTarget: WiredVariablePickerTarget = params.source === WIRED_FX_SOURCE.FURNI ? 'furni' : 'user';
    const needsAudience = params.visibility === WIRED_FX_VISIBILITY.HAS_VARIABLE || params.visibility === WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE;
    const showsIcon = category === WIRED_FX_CATEGORY.NUMBER_DISPLAY || category === WIRED_FX_CATEGORY.BOSS_BAR;

    const holderEntries = useMemo(
        () =>
            customOnly(
                buildWiredVariablePickerEntries(holderTarget, 'change-reference', holderTarget === 'furni' ? furniVariableDefinitions : userVariableDefinitions)
            ),
        [holderTarget, userVariableDefinitions, furniVariableDefinitions]
    );
    const roomEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('global', 'change-reference', roomVariableDefinitions)), [roomVariableDefinitions]);
    const audienceEntries = useMemo(() => customOnly(buildWiredVariablePickerEntries('user', 'change-reference', userVariableDefinitions)), [userVariableDefinitions]);

    useEffect(() => {
        setParams(readWiredVariableFxParams(trigger?.intData ?? [], category));
        setTokens(readWiredVariableFxTokens(trigger?.stringData ?? ''));
        setRangeError(false);
    }, [trigger, category]);

    const patch = (changes: Partial<IWiredVariableFxParams>) => setParams((previous) => ({ ...previous, ...changes }));
    const patchTokens = (changes: Partial<IWiredVariableFxTokens>) => setTokens((previous) => ({ ...previous, ...changes }));

    const validate = () => {
        const invalid = usesRange && params.defaultMax <= params.defaultMin;

        setRangeError(invalid);

        return !invalid;
    };

    const save = () => {
        setIntParams(writeWiredVariableFxParams(params));
        setStringParam(writeWiredVariableFxTokens(tokens));
    };

    const select = (label: string, value: number, options: { value: number; key: string; fallback: string }[], onChange: (value: number) => void) => (
        <div className="flex flex-col gap-1">
            <Text bold>{label}</Text>
            <Select className="form-select form-select-sm" value={value} onChange={(event) => onChange(Number(event.target.value))}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {localizeWithFallback(option.key, option.fallback)}
                    </option>
                ))}
            </Select>
        </div>
    );

    const overrideRow = (
        label: string,
        enabled: boolean,
        target: number,
        token: string,
        onChange: (enabled: boolean, target: number, token: string) => void,
        scope: string
    ) => (
        <div className="flex flex-col gap-1 octane-wired-fx-editor__override">
            <label className="flex items-center gap-1 cursor-pointer">
                <Checkbox checked={enabled} onCheckedChange={(nextChecked) => onChange(nextChecked, target, token)} />
                <Text bold>{label}</Text>
            </label>
            {enabled && (
                <div className="flex flex-col gap-1 pl-4">
                    <Select className="form-select form-select-sm" value={target} onChange={(event) => onChange(enabled, Number(event.target.value), '')}>
                        {TARGET_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {localizeWithFallback(option.key, option.fallback)}
                            </option>
                        ))}
                    </Select>
                    <WiredVariablePicker
                        entries={target === WIRED_FX_OVERRIDE_TARGET.GLOBAL ? roomEntries : holderEntries}
                        recentScope={scope}
                        selectedToken={token}
                        onSelect={(entry) => onChange(enabled, target, entry.token)}
                    />
                </div>
            )}
        </div>
    );

    const title = CATEGORY_TITLES[category] ?? CATEGORY_TITLES[WIRED_FX_CATEGORY.PROGRESS_BAR];
    const categoryLabel = localizeWithFallback(title.key, title.fallback);

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} widthModifier={1.45}>
            <div className="flex flex-col gap-2 octane-wired-fx-editor">
                <Text small={true}>
                    {localizeWithFallback(
                        'wiredfurni.params.variablefx.intro',
                        `${categoryLabel} drawn over every user or furni holding the variable box on this tile.`,
                        ['category'],
                        [categoryLabel]
                    )}
                </Text>

                {select(localizeWithFallback('wiredfurni.params.variablefx.source', 'Variable shown'), params.source, SOURCE_OPTIONS, (source) => {
                    patch({ source });
                    patchTokens({ overrideMinToken: '', overrideMaxToken: '' });
                })}

                {select(localizeWithFallback('wiredfurni.params.variablefx.visibility', 'Who sees it'), params.visibility, VISIBILITY_OPTIONS, (visibility) =>
                    patch({ visibility })
                )}

                {needsAudience && (
                    <div className="flex flex-col gap-1 pl-4">
                        <WiredVariablePicker
                            entries={audienceEntries}
                            recentScope="variable-fx-audience"
                            selectedToken={tokens.audienceToken}
                            onSelect={(entry) => patchTokens({ audienceToken: entry.token })}
                        />
                        {params.visibility === WIRED_FX_VISIBILITY.HAS_VARIABLE_WITH_VALUE && (
                            <div className="flex items-center gap-1">
                                <Text>{localizeWithFallback('wiredfurni.params.variablefx.audience_value', 'with value')}</Text>
                                <OctaneInput
                                    type="number"
                                    inputSize="sm"
                                    data-testid="fx-audience-value"
                                    value={params.audienceValue}
                                    onChange={(event) => patch({ audienceValue: toInt(event.target.value, 0) })}
                                />
                            </div>
                        )}
                    </div>
                )}

                {select(localizeWithFallback('wiredfurni.params.variablefx.show', 'Show'), params.showMode, SHOW_MODE_OPTIONS, (showMode) => patch({ showMode }))}

                {params.showMode === WIRED_FX_SHOW_MODE.WHEN_CHANGES && (
                    <div className="flex items-center gap-1 pl-4">
                        <Text>{localizeWithFallback('wiredfurni.params.variablefx.show_duration', 'for (ms)')}</Text>
                        <OctaneInput
                            type="number"
                            inputSize="sm"
                            data-testid="fx-show-duration"
                            min={WIRED_FX_SHOW_DURATION_MIN_MS}
                            max={WIRED_FX_SHOW_DURATION_MAX_MS}
                            step={100}
                            value={params.showDurationMs}
                            onChange={(event) =>
                                patch({
                                    showDurationMs: Math.max(WIRED_FX_SHOW_DURATION_MIN_MS, Math.min(WIRED_FX_SHOW_DURATION_MAX_MS, toInt(event.target.value, WIRED_FX_SHOW_DURATION_MIN_MS)))
                                })
                            }
                        />
                    </div>
                )}

                {select(
                    localizeWithFallback('wiredfurni.params.variablefx.style', 'Style'),
                    params.styleId,
                    styles.map((entry) => ({ value: entry.styleId, key: entry.key, fallback: entry.fallback })),
                    (styleId) => patch({ styleId })
                )}

                {category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS && params.styleId === 0 && (
                    <div className="pl-4">
                        {select(localizeWithFallback('wiredfurni.params.variablefx.level_bar', 'Bar beside the badge'), params.categoryExtra, LEVEL_BAR_OPTIONS, (categoryExtra) =>
                            patch({ categoryExtra })
                        )}
                    </div>
                )}

                {showsIcon && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.icon', 'Icon')}</Text>
                        <Select className="form-select form-select-sm" data-testid="fx-icon" value={tokens.icon} onChange={(event) => patchTokens({ icon: event.target.value })}>
                            <option value="">{localizeWithFallback('wiredfurni.params.variablefx.icon.none', 'None')}</option>
                            {WIRED_FX_ICONS.map((icon) => (
                                <option key={icon} value={icon}>
                                    {localizeWithFallback(`wiredfurni.params.variablefx.icon.${icon}`, icon.replace(/_/g, ' '))}
                                </option>
                            ))}
                        </Select>
                        {category === WIRED_FX_CATEGORY.NUMBER_DISPLAY && tokens.icon && (
                            <Select className="form-select form-select-sm" value={params.categoryExtra} onChange={(event) => patch({ categoryExtra: Number(event.target.value) })}>
                                {WIRED_FX_NUMBER_ALIGNMENTS.map((alignment, index) => (
                                    <option key={alignment} value={index}>
                                        {localizeWithFallback(`wiredfurni.params.variablefx.icon_alignment.${alignment}`, alignment)}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.color', 'Colour')}</Text>
                        <Select className="form-select form-select-sm" data-testid="fx-color" value={params.colorId} onChange={(event) => patch({ colorId: Number(event.target.value) })}>
                            <option value={WIRED_FX_COLOR_NOT_APPLICABLE}>{localizeWithFallback('wiredfurni.params.variablefx.color.default', "The style's own")}</option>
                            <option value={WIRED_FX_COLOR_DYNAMIC_LEVELLING}>{localizeWithFallback('wiredfurni.params.variablefx.color.levelling', 'By level (red to green)')}</option>
                            <option value={WIRED_FX_COLOR_DYNAMIC_TEAM}>{localizeWithFallback('wiredfurni.params.variablefx.color.team', "The holder's team colour")}</option>
                            {WIRED_FX_PALETTE.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                    {localizeWithFallback(entry.key, entry.fallback)}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.width', 'Width')}</Text>
                        <Select className="form-select form-select-sm" value={params.widthId} onChange={(event) => patch({ widthId: Number(event.target.value) })}>
                            {WIRED_FX_WIDTHS.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                    {localizeWithFallback(entry.key, entry.fallback)}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {supportsSegments && (
                    <div className="flex items-center gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.segments', 'Segments (0 = continuous)')}</Text>
                        <OctaneInput
                            type="number"
                            inputSize="sm"
                            data-testid="fx-segments"
                            min={0}
                            max={WIRED_FX_SEGMENTS_MAX}
                            value={params.segments}
                            onChange={(event) => patch({ segments: Math.max(0, Math.min(WIRED_FX_SEGMENTS_MAX, toInt(event.target.value, 0))) })}
                        />
                    </div>
                )}

                {usesRange && (
                    <>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.min', 'Minimum')}</Text>
                                <OctaneInput type="number" inputSize="sm" data-testid="fx-min" value={params.defaultMin} onChange={(event) => patch({ defaultMin: toInt(event.target.value, 0) })} />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <Text bold>{localizeWithFallback('wiredfurni.params.variablefx.max', 'Maximum')}</Text>
                                <OctaneInput type="number" inputSize="sm" data-testid="fx-max" value={params.defaultMax} onChange={(event) => patch({ defaultMax: toInt(event.target.value, 100) })} />
                            </div>
                        </div>
                        {rangeError && (
                            <Text small={true} className="text-red-500">
                                {localizeWithFallback('wiredfurni.params.variablefx.validation.range', 'The maximum has to be above the minimum.')}
                            </Text>
                        )}
                        {overrideRow(
                            localizeWithFallback('wiredfurni.params.variablefx.override_min', 'Take the minimum from a variable'),
                            params.overrideMinEnabled,
                            params.overrideMinTarget,
                            tokens.overrideMinToken,
                            (enabled, target, token) => {
                                patch({ overrideMinEnabled: enabled, overrideMinTarget: target });
                                patchTokens({ overrideMinToken: token });
                            },
                            'variable-fx-override-min'
                        )}
                        {overrideRow(
                            localizeWithFallback('wiredfurni.params.variablefx.override_max', 'Take the maximum from a variable'),
                            params.overrideMaxEnabled,
                            params.overrideMaxTarget,
                            tokens.overrideMaxToken,
                            (enabled, target, token) => {
                                patch({ overrideMaxEnabled: enabled, overrideMaxTarget: target });
                                patchTokens({ overrideMaxToken: token });
                            },
                            'variable-fx-override-max'
                        )}
                    </>
                )}

                {category === WIRED_FX_CATEGORY.LEVELLING_PROGRESS && (
                    <Text small={true}>
                        {localizeWithFallback(
                            'wiredfurni.params.variablefx.level_hint',
                            'Levels come from the level-up system addon on the same tile; without one the badge shows level 1.'
                        )}
                    </Text>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
