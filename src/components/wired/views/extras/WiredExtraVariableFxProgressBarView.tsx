import { FC, useEffect, useMemo, useState } from 'react';
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

const SHOW_MODE_NEVER = 0;
const SHOW_MODE_WHEN_VARIABLE_CHANGES = 1;
const SHOW_MODE_ALWAYS = 2;

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
 * There is no catalog of named styles/colors/widths/renderers anywhere in this codebase yet - the
 * renderer side implements exactly one renderer so far (a classic progress bar) and does not yet
 * consume style, color or width at all. Offering a small numeric range keeps the field byte-correct
 * and forward compatible without inventing option names nothing has defined.
 */
const VISUALIZATION_OPTION_VALUES = [0, 1, 2, 3, 4];

const defaultIntParams = (): number[] => new Array(INT_PARAM_COUNT).fill(0);

const rawIntParams = (intData: number[] | undefined | null): number[] =>
    intData && intData.length >= INT_PARAM_COUNT ? intData : defaultIntParams();

const normalizeShowMode = (value: number) =>
    value === SHOW_MODE_WHEN_VARIABLE_CHANGES || value === SHOW_MODE_ALWAYS ? value : SHOW_MODE_NEVER;

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

export const WiredExtraVariableFxProgressBarView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, variableIds = [], setVariableIds = null } = useWired();
    const { roomVariableDefinitions = [] } = useWiredTools();

    const [styleId, setStyleId] = useState(0);
    const [colorId, setColorId] = useState(0);
    const [widthId, setWidthId] = useState(0);
    const [rendererId, setRendererId] = useState(0);

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

        // WiredExtraVariableFxBase.serializeWiredData now echoes the override/audience ids back in
        // codec order [overrideMinVariableId, overrideMaxVariableId, audienceVariableId], seeded by
        // useWired in the same tick it sets `trigger` - restore them instead of resetting to ''.
        setOverrideMinVariableToken(variableIds[0] ?? '');
        setOverrideMaxVariableToken(variableIds[1] ?? '');
    }, [trigger, variableIds]);

    const toggleTriggerMaskBit = (bit: number) => setShowTriggerMask((current) => (current & bit ? current & ~bit : current | bit));

    const validate = () => (!overrideMinEnabled || !!overrideMinVariableToken) && (!overrideMaxEnabled || !!overrideMaxVariableToken);

    const save = () => {
        // Everything this window does not expose (sourceType, visibility, the audience value pair,
        // segments) rides through unchanged from whatever the box opened with.
        const params = [...rawIntParams(trigger?.intData)];

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
        // params[18..19] audienceVariableValue, params[20] segments: left as read from `raw` above.

        setIntParams(params);
        setStringParam(trigger?.stringData ?? '');
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
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.section.visualization')}</Text>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.style')}</Text>
                        <select className="form-select form-select-sm" value={styleId} onChange={(event) => setStyleId(Number(event.target.value) || 0)}>
                            {VISUALIZATION_OPTION_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.color')}</Text>
                        <select className="form-select form-select-sm" value={colorId} onChange={(event) => setColorId(Number(event.target.value) || 0)}>
                            {VISUALIZATION_OPTION_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.width')}</Text>
                        <select className="form-select form-select-sm" value={widthId} onChange={(event) => setWidthId(Number(event.target.value) || 0)}>
                            {VISUALIZATION_OPTION_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.renderer')}</Text>
                        <select className="form-select form-select-sm" value={rendererId} onChange={(event) => setRendererId(Number(event.target.value) || 0)}>
                            {VISUALIZATION_OPTION_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.section.visibility')}</Text>
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
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.increased')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={(showTriggerMask & TRIGGER_MASK_DECREASED) !== 0}
                                className="form-check-input"
                                type="checkbox"
                                onChange={() => toggleTriggerMaskBit(TRIGGER_MASK_DECREASED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.decreased')}</Text>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={(showTriggerMask & TRIGGER_MASK_UNCHANGED) !== 0}
                                className="form-check-input"
                                type="checkbox"
                                onChange={() => toggleTriggerMaskBit(TRIGGER_MASK_UNCHANGED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.update_mask.unchanged')}</Text>
                        </label>
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variablefx.section.range')}</Text>
                    <div className="flex items-center justify-between gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.range.min')}</Text>
                        <OctaneInput
                            className="max-w-[100px]"
                            type="number"
                            value={defaultMinValue}
                            onChange={(event) => setDefaultMinValue(parseInt(event.target.value, 10) || 0)}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <Text>{LocalizeText('wiredfurni.params.variablefx.range.max')}</Text>
                        <OctaneInput
                            className="max-w-[100px]"
                            type="number"
                            value={defaultMaxValue}
                            onChange={(event) => setDefaultMaxValue(parseInt(event.target.value, 10) || 0)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={overrideMinEnabled}
                                className="form-check-input"
                                type="checkbox"
                                onChange={(event) => setOverrideMinEnabled(event.target.checked)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variablefx.range.override_min')}</Text>
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
                            <Text>{LocalizeText('wiredfurni.params.variablefx.range.override_max')}</Text>
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
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
