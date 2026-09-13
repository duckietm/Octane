import { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * The saved shape mirrors `VariableFxSettingsCodec.write` in the emulator field for field. Index 0
 * (sourceType) through index 20 (segments) is fixed and read positionally on the server; a
 * reordering here is silent everywhere except in game.
 */
const INT_PARAM_COUNT = 21;

/**
 * `VariableFxSettings.SOURCE_*` in the emulator. The source type decides which kind of variable on
 * the box's tile the configuration covers, and it is the only field that decides it - the editor
 * never names a variable. A box that never sets it stays on SOURCE_USER, whose statuses are drawn
 * on the avatar holding the value, a side this slice leaves unbound; so leaving this unexposed
 * meant no configuration the window could produce ever drew anything.
 */
const SOURCE_USER = 0;
const SOURCE_FURNI = 1;
const SOURCE_GLOBAL = 2;

const SHOW_MODE_NEVER = 0;
const SHOW_MODE_WHEN_VARIABLE_CHANGES = 1;
const SHOW_MODE_ALWAYS = 2;

/**
 * The official corpus enumerates four update_mask options (`update_mask.1`-`.4`), not three: `.1`
 * is "variable created", which has no bit exposed by this window at all (there is no
 * TRIGGER_MASK_CREATED here), then `.2`/`.3`/`.4` name increased/decreased/unchanged in the same
 * order as these three bits - so the numbering lines up with this triple only once the missing
 * first option is skipped, not as a direct 1:1 rename.
 */
const TRIGGER_MASK_INCREASED = 2;
const TRIGGER_MASK_DECREASED = 4;
const TRIGGER_MASK_UNCHANGED = 8;

/**
 * `VariableFxSettings.SOURCE_GLOBAL` in the emulator. `overrideMinTarget`/`overrideMaxTarget` name
 * which kind of entity the override variable belongs to; this window only ever offers room-scope
 * (global) variables for an override bound, so the target is always this constant rather than a
 * choice the builder makes.
 */
const OVERRIDE_TARGET_GLOBAL = 2;

/**
 * These are the ids the room renderer actually resolves: `VariableFxRendererRegistry` implements all
 * fifteen official renderers under the official ids, and the emulator passes style, color, width and
 * renderer through untouched, so the dialog is the only thing that decides what a builder can reach.
 * It used to offer 0-4 for every one of them, written when the renderer had a single progress bar;
 * that left nine renderers, twenty-four colors and two widths unreachable.
 *
 * Every id below is one the text corpus names (`wiredfurni.params.variablefx.<family>.<id>`).
 */
const COLOR_OPTION_IDS = [-1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 100, 101, 102, 103, 104, 1000, 1001, 1002];

const WIDTH_OPTION_IDS = [-1, 0, 1, 2, 3, 4, 100];

const RENDERER_OPTION_IDS = [0, 1, 2, 3, 4, 10, 11, 12, 13, 20, 21, 100, 101, 200, 201];

/** The six official categories, each a wired furni of its own on the server (codes 1200-1205). */
const CATEGORY_NAMES: Record<number, string> = {
    0: 'health_points',
    1: 'progress_bar',
    2: 'levelling_progress',
    3: 'status_bar',
    4: 'boss_bar',
    5: 'number_display'
};

/** How many styles each category names in the corpus; the ids run from 0 to count - 1. */
const CATEGORY_STYLE_COUNT: Record<number, number> = {
    0: 4,
    1: 5,
    2: 2,
    3: 22,
    4: 2,
    5: 3
};

const DEFAULT_CATEGORY_ID = 1;

/** Levelling carries a sub-renderer in the 22nd int; number display carries an icon alignment. */
const CATEGORY_LEVELLING = 2;
const CATEGORY_NUMBER = 5;

/** Index of that 22nd int. VariableFxSettingsCodec reads it per addon code, never blindly. */
const TWENTY_SECOND_INDEX = INT_PARAM_COUNT;

/**
 * The official `rendererSupportsSegments`: block progress, arrow progress and the thermometer are
 * the three drawn as discrete pieces, so they are the only ones the segments count means anything
 * for.
 */
const SEGMENT_CAPABLE_RENDERER_IDS = [2, 4, 13];
const MAX_SEGMENTS = 100;
const SEGMENTS_NOT_SPECIFIED = 0;

/** `getSubRendererOptions` for a level-with-progress style: block, striped, arrow. */
const SUB_RENDERER_OPTION_IDS = [2, 3, 4];

const ICON_ALIGNMENT_OPTION_IDS = [0, 1, 2];

/**
 * The icon travels as the box's string param, and the empty string is the official "no icon" - the
 * corpus names that one `…variablefx.icon.none`.
 *
 * The official set is the twenty-two in its `icons_xml`, but only these ten ship as artwork we
 * have; the rest live in the official client's external asset bundle. Offering a name the room
 * cannot draw would promise an icon that never appears, so the list is the drawable set and grows
 * when more artwork lands in `public/assets/images/wired/variablefx/`. The ranch icons the official
 * client also lists are campaign content behind `wired.variablefx.campaign.icons.enabled` and are
 * out for a separate reason.
 */
const ICON_IDS = [
    '', 'burning', 'cash', 'energy', 'fish', 'food', 'honor', 'mana', 'misc_heart', 'misc_skull', 'timeleft'
];

const iconOptionLabel = (iconId: string): string => {
    const key = `wiredfurni.params.variablefx.icon.${iconId === '' ? 'none' : iconId}`;
    const text = LocalizeText(key);

    return text && text !== key ? text : iconId || 'none';
};

/**
 * The official editor keeps visibility and the advanced range folded away behind a header you click,
 * which is what keeps its window short. Ours rendered every section open at once, so the box grew
 * past the useful height and the controls that matter were pushed below the fold.
 */
const CollapsibleSection: FC<PropsWithChildren<{ open: boolean; title: string; onToggle: () => void }>> = ({
    open,
    title,
    onToggle,
    children
}) => (
    <div className="flex flex-col gap-2">
        <button className="octane-wired__advanced-toggle" type="button" onClick={onToggle}>
            {title}
        </button>
        {open && <div className="octane-wired__advanced-body flex flex-col gap-2">{children}</div>}
    </div>
);

const clampSegments = (value: number): number =>
    Number.isFinite(value) ? Math.max(SEGMENTS_NOT_SPECIFIED, Math.min(MAX_SEGMENTS, Math.floor(value))) : SEGMENTS_NOT_SPECIFIED;

const styleOptionIds = (categoryId: number): number[] =>
    Array.from({ length: CATEGORY_STYLE_COUNT[categoryId] ?? CATEGORY_STYLE_COUNT[DEFAULT_CATEGORY_ID] }, (_unused, index) => index);

/**
 * `widthId` 0 is "molto piccolo" in the official corpus (`wiredfurni.params.variablefx.width.0`),
 * not an empty slot - a box that never opens this dropdown must not land there by accident. The
 * emulator's `WiredExtraVariableFxBase.DEFAULT_SETTINGS` starts a never-saved box on this same
 * index 2 ("medio"), so a box that is saved without ever touching this control keeps the neutral
 * width instead of silently shrinking to the smallest band. A box reopened with a genuinely saved
 * `widthId` of 0 is unaffected: the effect below overwrites this initial value with `raw[8]`
 * unconditionally, so a real "molto piccolo" choice is never second-guessed.
 */
const DEFAULT_WIDTH_ID = 2;

/**
 * Every option label follows `wiredfurni.params.variablefx.<family>.<id>`, and the style family is
 * nested one deeper under the category name. Falls back to the bare number when the corpus does not
 * name a given option, so an unnamed id is visible rather than blank.
 */
const visualizationOptionLabel = (family: string, value: number): string => {
    const key = `wiredfurni.params.variablefx.${family}.${value}`;
    const text = LocalizeText(key);

    return text && text !== key ? text : String(value);
};

/**
 * The synthetic vector used when `trigger.intData` is missing or too short to be real saved data
 * (a safety net that does not fire in practice - the emulator always serialises a full-length
 * vector, even for a never-saved box). Every field defaults to 0 except `widthId` (index 8): 0 is
 * the real "molto piccolo" band, not an empty slot, so defaulting to it here would recreate the
 * same silent-shrink bug this window's real restore path (`raw[8]`, below) never has to guess
 * around because the emulator's own default already resolves to the neutral band.
 */
const defaultIntParams = (): number[] => {
    const params = new Array(INT_PARAM_COUNT).fill(0);

    params[8] = DEFAULT_WIDTH_ID;

    return params;
};

const rawIntParams = (intData: number[] | undefined | null): number[] =>
    intData && intData.length >= INT_PARAM_COUNT ? intData : defaultIntParams();

const normalizeShowMode = (value: number) =>
    value === SHOW_MODE_WHEN_VARIABLE_CHANGES || value === SHOW_MODE_ALWAYS ? value : SHOW_MODE_NEVER;

/**
 * The emulator's binding covers nothing for a source type outside these three, so the window never
 * shows or writes back a fourth value: a vector carrying one is repaired to the default on save.
 */
const normalizeSourceType = (value: number) => (value === SOURCE_FURNI || value === SOURCE_GLOBAL ? value : SOURCE_USER);

/** High word first, exactly as `VariableFxSettingsCodec.writeLong` splits it: `(int)(value >> 32)` then `(int) value`. */
const splitLongIntoWords = (value: number): [number, number] => {
    const bigValue = BigInt(Math.trunc(Number.isFinite(value) ? value : 0));
    const highWord = Number(BigInt.asIntN(32, bigValue >> 32n));
    const lowWord = Number(BigInt.asIntN(32, bigValue & 0xffffffffn));

    return [highWord, lowWord];
};

/** Mirrors `VariableFxSettingsCodec.readLong`: `((long) high << 32) | (low & 0xFFFFFFFFL)`. */
const combineWordsIntoLong = (highWord: number, lowWord: number): number => {
    const combined = (BigInt(highWord) << 32n) | (BigInt(lowWord) & 0xffffffffn);

    return Number(combined);
};

interface WiredExtraVariableFxViewProps {
    /** One of the six official categories; the server sends a distinct code per category. */
    categoryId?: number;
}

export const WiredExtraVariableFxProgressBarView: FC<WiredExtraVariableFxViewProps> = ({ categoryId = DEFAULT_CATEGORY_ID }) => {
    const categoryName = CATEGORY_NAMES[categoryId] ?? CATEGORY_NAMES[DEFAULT_CATEGORY_ID];
    const styleIds = styleOptionIds(categoryId);

    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { roomVariableDefinitions = [] } = useWiredTools();

    const [sourceType, setSourceType] = useState(SOURCE_USER);

    const [styleId, setStyleId] = useState(0);
    const [colorId, setColorId] = useState(0);
    const [widthId, setWidthId] = useState(DEFAULT_WIDTH_ID);
    const [rendererId, setRendererId] = useState(0);
    const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
    const [showAdvancedRange, setShowAdvancedRange] = useState(false);
    const [segments, setSegments] = useState(SEGMENTS_NOT_SPECIFIED);
    const [iconId, setIconId] = useState('');
    const [iconAlignment, setIconAlignment] = useState(0);
    const [subRendererId, setSubRendererId] = useState(SUB_RENDERER_OPTION_IDS[0]);

    const [showMode, setShowMode] = useState(SHOW_MODE_NEVER);
    const [showTriggerMask, setShowTriggerMask] = useState(0);
    const [showOnMouseHover, setShowOnMouseHover] = useState(false);
    const [showDuration, setShowDuration] = useState(0);

    const [defaultMinValue, setDefaultMinValue] = useState(0);
    const [defaultMaxValue, setDefaultMaxValue] = useState(0);
    const [overrideMinEnabled, setOverrideMinEnabled] = useState(false);
    const [overrideMaxEnabled, setOverrideMaxEnabled] = useState(false);
    const [overrideMinVariableToken, setOverrideMinVariableToken] = useState('');
    const [overrideMaxVariableToken, setOverrideMaxVariableToken] = useState('');

    // Reading a variable's value as an override bound is a reference, not a write destination.
    const overrideVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries('global', 'change-reference', roomVariableDefinitions),
        [roomVariableDefinitions]
    );

    useEffect(() => {
        if (!trigger) return;

        const raw = rawIntParams(trigger.intData);

        setSourceType(normalizeSourceType(raw[0]));
        setShowMode(normalizeShowMode(raw[2]));
        setShowTriggerMask(raw[3]);
        setShowOnMouseHover(raw[4] !== 0);
        setShowDuration(raw[5]);
        setStyleId(raw[6]);
        setColorId(raw[7]);
        setWidthId(raw[8]);
        setRendererId(raw[9]);
        setDefaultMinValue(combineWordsIntoLong(raw[10], raw[11]));
        setDefaultMaxValue(combineWordsIntoLong(raw[12], raw[13]));
        setOverrideMinEnabled(raw[14] !== 0);
        setOverrideMaxEnabled(raw[15] !== 0);

        // WiredExtraVariableFxBase.serializeWiredData echoes the override/audience ids back in
        // codec order [overrideMinVariableId, overrideMaxVariableId, audienceVariableId] - restore
        // them instead of resetting to ''. They are read off the definition, not off useWired's
        // own variableIds state: save() replaces that state with a fresh array, and depending on
        // its identity here re-ran this effect after every save, re-seeding every control from a
        // `trigger` the server never refreshes. The builder's edit snapped back and the next save
        // wrote the old configuration over the new one. Every sibling extra view seeds on
        // [trigger] alone for the same reason.
        const savedVariableIds = trigger.variableIds ?? [];

        setOverrideMinVariableToken(savedVariableIds[0] ?? '');
        setOverrideMaxVariableToken(savedVariableIds[1] ?? '');

        setSegments(clampSegments(raw[20]));
        setIconId(trigger.stringData ?? '');

        // The 22nd int means different things per category, and is absent for the other four.
        const twentySecond = raw.length > TWENTY_SECOND_INDEX ? raw[TWENTY_SECOND_INDEX] : 0;

        setIconAlignment(ICON_ALIGNMENT_OPTION_IDS.includes(twentySecond) ? twentySecond : ICON_ALIGNMENT_OPTION_IDS[0]);
        setSubRendererId(SUB_RENDERER_OPTION_IDS.includes(twentySecond) ? twentySecond : SUB_RENDERER_OPTION_IDS[0]);
    }, [trigger]);

    const toggleTriggerMaskBit = (bit: number) => setShowTriggerMask((current) => (current & bit ? current & ~bit : current | bit));

    const validate = () => (!overrideMinEnabled || !!overrideMinVariableToken) && (!overrideMaxEnabled || !!overrideMaxVariableToken);

    const showsSegments = SEGMENT_CAPABLE_RENDERER_IDS.includes(rendererId);
    const showsIcon = categoryId === CATEGORY_NUMBER;
    const showsSubRenderer = categoryId === CATEGORY_LEVELLING;

    const save = () => {
        // Everything this window does not expose (visibility, the audience value pair, segments)
        // rides through unchanged from whatever the box opened with.
        const params = [...rawIntParams(trigger?.intData)];

        params[0] = sourceType;
        params[2] = showMode;
        params[3] = showTriggerMask;
        params[4] = showOnMouseHover ? 1 : 0;
        params[5] = showDuration;
        params[6] = styleId;
        params[7] = colorId;
        params[8] = widthId;
        params[9] = rendererId;

        const [minHighWord, minLowWord] = splitLongIntoWords(defaultMinValue);
        params[10] = minHighWord;
        params[11] = minLowWord;

        const [maxHighWord, maxLowWord] = splitLongIntoWords(defaultMaxValue);
        params[12] = maxHighWord;
        params[13] = maxLowWord;

        params[14] = overrideMinEnabled ? 1 : 0;
        params[15] = overrideMaxEnabled ? 1 : 0;
        params[16] = OVERRIDE_TARGET_GLOBAL;
        params[17] = OVERRIDE_TARGET_GLOBAL;
        params[20] = showsSegments ? clampSegments(segments) : SEGMENTS_NOT_SPECIFIED;
        // params[1] visibility and params[18..19] audienceVariableValue are left as read above.

        // Only these two categories own the 22nd slot; writing it on any other would be read back
        // as a field that category does not have.
        if (categoryId === CATEGORY_LEVELLING) params[TWENTY_SECOND_INDEX] = subRendererId;
        else if (categoryId === CATEGORY_NUMBER) params[TWENTY_SECOND_INDEX] = iconAlignment;

        setIntParams(params);
        setStringParam(showsIcon ? iconId : trigger?.stringData ?? '');
        setVariableIds([
            overrideMinEnabled ? overrideMinVariableToken : '',
            overrideMaxEnabled ? overrideMaxVariableToken : '',
            // The audience variable has no control in this window yet.
            ''
        ]);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.section.source')}</Text>
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={sourceType === SOURCE_USER}
                                className="form-check-input"
                                name="wiredVariableFxSourceType"
                                type="radio"
                                onChange={() => setSourceType(SOURCE_USER)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.source.user')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={sourceType === SOURCE_FURNI}
                                className="form-check-input"
                                name="wiredVariableFxSourceType"
                                type="radio"
                                onChange={() => setSourceType(SOURCE_FURNI)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.source.furni')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={sourceType === SOURCE_GLOBAL}
                                className="form-check-input"
                                name="wiredVariableFxSourceType"
                                type="radio"
                                onChange={() => setSourceType(SOURCE_GLOBAL)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.source.global')}</Text>
                        </label>
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.visualization')}</Text>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.style')}</Text>
                        <select className="form-select form-select-sm" value={styleId} onChange={(event) => setStyleId(Number(event.target.value) || 0)}>
                            {styleIds.map((value) => (
                                <option key={value} value={value}>
                                    {visualizationOptionLabel(`style.${categoryName}`, value)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.color')}</Text>
                        <select className="form-select form-select-sm" value={colorId} onChange={(event) => setColorId(Number(event.target.value) || 0)}>
                            {COLOR_OPTION_IDS.map((value) => (
                                <option key={value} value={value}>
                                    {visualizationOptionLabel('color', value)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.width')}</Text>
                        <select className="form-select form-select-sm" value={widthId} onChange={(event) => setWidthId(Number(event.target.value))}>
                            {WIDTH_OPTION_IDS.map((value) => (
                                <option key={value} value={value}>
                                    {visualizationOptionLabel('width', value)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.renderer')}</Text>
                        <select className="form-select form-select-sm" value={rendererId} onChange={(event) => setRendererId(Number(event.target.value) || 0)}>
                            {RENDERER_OPTION_IDS.map((value) => (
                                <option key={value} value={value}>
                                    {visualizationOptionLabel('renderer', value)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {showsSubRenderer && (
                        <div className="flex flex-col gap-1">
                            <Text>{LocalizeText('wiredfurni.params.variablefx.visualization.sub_renderer')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={subRendererId}
                                onChange={(event) => setSubRendererId(Number(event.target.value) || SUB_RENDERER_OPTION_IDS[0])}
                            >
                                {SUB_RENDERER_OPTION_IDS.map((value) => (
                                    <option key={value} value={value}>
                                        {visualizationOptionLabel('renderer', value)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {showsSegments && (
                        <div className="flex flex-col gap-1">
                            <Text>{LocalizeText('wiredfurni.params.variablefx.visualization.segments')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={segments}
                                onChange={(event) => setSegments(clampSegments(Number(event.target.value)))}
                            >
                                <option value={SEGMENTS_NOT_SPECIFIED}>
                                    {LocalizeText('wiredfurni.params.variablefx.visualization.segments.not_specified')}
                                </option>
                                {Array.from({ length: MAX_SEGMENTS }, (_unused, index) => index + 1).map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {showsIcon && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text>{LocalizeText('wiredfurni.params.variablefx.visualization.icon')}</Text>
                                <select className="form-select form-select-sm" value={iconId} onChange={(event) => setIconId(event.target.value)}>
                                    {ICON_IDS.map((value) => (
                                        <option key={value || 'none'} value={value}>
                                            {iconOptionLabel(value)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <Text>{LocalizeText('wiredfurni.params.variablefx.visualization.icon_alignment')}</Text>
                                <select
                                    className="form-select form-select-sm"
                                    value={iconAlignment}
                                    onChange={(event) => setIconAlignment(Number(event.target.value) || 0)}
                                >
                                    {ICON_ALIGNMENT_OPTION_IDS.map((value) => (
                                        <option key={value} value={value}>
                                            {visualizationOptionLabel('icon_alignment', value)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="octane-wired__divider" />

                <CollapsibleSection
                    open={showVisibilitySettings}
                    title={LocalizeText('wiredfurni.params.variablefx.visibility')}
                    onToggle={() => setShowVisibilitySettings((value) => !value)}
                >
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={showMode === SHOW_MODE_NEVER}
                                className="form-check-input"
                                name="wiredVariableFxShowMode"
                                type="radio"
                                onChange={() => setShowMode(SHOW_MODE_NEVER)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.show_mode.never')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={showMode === SHOW_MODE_WHEN_VARIABLE_CHANGES}
                                className="form-check-input"
                                name="wiredVariableFxShowMode"
                                type="radio"
                                onChange={() => setShowMode(SHOW_MODE_WHEN_VARIABLE_CHANGES)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.show_mode.when_variable_changes')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={showMode === SHOW_MODE_ALWAYS}
                                className="form-check-input"
                                name="wiredVariableFxShowMode"
                                type="radio"
                                onChange={() => setShowMode(SHOW_MODE_ALWAYS)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.show_mode.always')}</Text>
                        </label>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.show_duration')}</Text>
                        <OctaneInput
                            className="max-w-[80px]"
                            min={0}
                            type="number"
                            value={showDuration}
                            onChange={(event) => setShowDuration(Math.max(0, parseInt(event.target.value, 10) || 0))}
                        />
                    </div>

                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={showOnMouseHover}
                            className="form-check-input"
                            type="checkbox"
                            onChange={(event) => setShowOnMouseHover(event.target.checked)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variablefx.mouse_hover')}</Text>
                    </label>

                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={(showTriggerMask & TRIGGER_MASK_INCREASED) !== 0}
                                className="form-check-input"
                                type="checkbox"
                                onChange={() => toggleTriggerMaskBit(TRIGGER_MASK_INCREASED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.2')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={(showTriggerMask & TRIGGER_MASK_DECREASED) !== 0}
                                className="form-check-input"
                                type="checkbox"
                                onChange={() => toggleTriggerMaskBit(TRIGGER_MASK_DECREASED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.3')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={(showTriggerMask & TRIGGER_MASK_UNCHANGED) !== 0}
                                className="form-check-input"
                                type="checkbox"
                                onChange={() => toggleTriggerMaskBit(TRIGGER_MASK_UNCHANGED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.4')}</Text>
                        </label>
                    </div>
                </CollapsibleSection>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.value_range')}</Text>
                    <Text small>{LocalizeText('wiredfurni.params.variablefx.value_range.info')}</Text>
                    <div className="flex items-center justify-between gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.value_range.min')}</Text>
                        <OctaneInput
                            className="max-w-[100px]"
                            type="number"
                            value={defaultMinValue}
                            onChange={(event) => setDefaultMinValue(parseInt(event.target.value, 10) || 0)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.value_range.max')}</Text>
                        <OctaneInput
                            className="max-w-[100px]"
                            type="number"
                            value={defaultMaxValue}
                            onChange={(event) => setDefaultMaxValue(parseInt(event.target.value, 10) || 0)}
                        />
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <CollapsibleSection
                    open={showAdvancedRange}
                    title={LocalizeText('wiredfurni.params.variablefx.advanced.range')}
                    onToggle={() => setShowAdvancedRange((value) => !value)}
                >
                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={overrideMinEnabled}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => setOverrideMinEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.advanced.override_min')}</Text>
                        </label>
                        {overrideMinEnabled && (
                            <WiredVariablePicker
                                entries={overrideVariableEntries}
                                recentScope="variable-fx-override-min"
                                selectedToken={overrideMinVariableToken}
                                onSelect={(entry) => setOverrideMinVariableToken(entry.token)}
                            />
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={overrideMaxEnabled}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => setOverrideMaxEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.advanced.override_max')}</Text>
                        </label>
                        {overrideMaxEnabled && (
                            <WiredVariablePicker
                                entries={overrideVariableEntries}
                                recentScope="variable-fx-override-max"
                                selectedToken={overrideMaxVariableToken}
                                onSelect={(entry) => setOverrideMaxVariableToken(entry.token)}
                            />
                        )}
                    </div>
                </CollapsibleSection>
            </div>
        </WiredExtraBaseView>
    );
};
