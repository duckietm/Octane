import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MODE_LINEAR = 1;
const MODE_EXPONENTIAL = 2;
const MODE_MANUAL = 3;

const SUB_CURRENT_LEVEL = 0;
const SUB_CURRENT_XP = 1;
const SUB_LEVEL_PROGRESS = 2;
const SUB_LEVEL_PROGRESS_PERCENT = 3;
const SUB_TOTAL_XP_REQUIRED = 4;
const SUB_XP_REMAINING = 5;
const SUB_IS_AT_MAX = 6;
const SUB_MAX_LEVEL = 7;

const DEFAULT_STEP_SIZE = 100;
const DEFAULT_MAX_LEVEL = 10;
const DEFAULT_FIRST_LEVEL_XP = 100;
const DEFAULT_INCREASE_FACTOR = 100;
const DEFAULT_INTERPOLATION_TEXT = '';
const DEFAULT_SUBVARIABLES = [SUB_CURRENT_LEVEL, SUB_CURRENT_XP];
const DEFAULT_PLACEHOLDER = '5=100            (Level 5 = 100 XP)\n10=500\n20=4000\n...';

interface IVariableLevelUpEditorData {
    mode?: number;
    stepSize?: number;
    maxLevel?: number;
    firstLevelXp?: number;
    increaseFactor?: number;
    interpolationText?: string;
    subvariables?: number[] | null;
}

interface ILevelEntry {
    level: number;
    requiredXp: number;
}

const localizeOrFallback = (key: string, fallback: string, params?: string[], values?: string[]) => {
    const localized = params?.length ? LocalizeText(key, params, values ?? []) : LocalizeText(key);

    return !localized || localized === key ? fallback : localized;
};

const normalizeMode = (value: number) => {
    switch (value) {
        case MODE_EXPONENTIAL:
        case MODE_MANUAL:
            return value;
        default:
            return MODE_LINEAR;
    }
};

const normalizeNonNegativeInt = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;

    return Math.max(0, Math.trunc(value));
};

const normalizePositiveInt = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback;

    return Math.max(1, Math.trunc(value));
};

const normalizeInterpolationText = (value: string) => (value ?? '').replace(/\r/g, '');

const normalizeSubvariables = (value?: number[] | null) => {
    if (value === null) return [...DEFAULT_SUBVARIABLES];
    if (!Array.isArray(value)) return [...DEFAULT_SUBVARIABLES];

    return [...new Set(value.filter((subvariable) => Number.isInteger(subvariable) && subvariable >= SUB_CURRENT_LEVEL && subvariable <= SUB_MAX_LEVEL))];
};

const parseEditorData = (value: string): IVariableLevelUpEditorData => {
    if (!value?.trim()) return {};

    if (!value.trim().startsWith('{')) {
        return {
            mode: MODE_MANUAL,
            interpolationText: normalizeInterpolationText(value)
        };
    }

    try {
        return (JSON.parse(value) as IVariableLevelUpEditorData) || {};
    } catch {
        return {};
    }
};

const parseIntInput = (value: string, fallback: number) => {
    const parsedValue = parseInt((value ?? '').trim(), 10);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseManualAnchors = (value: string) => {
    const anchors = new Map<number, number>();
    const lines = normalizeInterpolationText(value).split('\n');

    for (const rawLine of lines) {
        const trimmedLine = rawLine.trim();

        if (!trimmedLine.length) continue;

        const separator = trimmedLine.includes('=') ? '=' : trimmedLine.includes(',') ? ',' : '';

        if (!separator.length) continue;

        const [rawLevel, rawXp] = trimmedLine.split(separator, 2).map((part) => part.trim());
        const level = parseInt(rawLevel, 10);
        const xp = parseInt(rawXp, 10);

        if (!Number.isFinite(level) || !Number.isFinite(xp) || level <= 0) continue;

        anchors.set(level, Math.max(0, xp));
    }

    if (!anchors.has(1)) anchors.set(1, 0);

    return [...anchors.entries()].sort((left, right) => left[0] - right[0]);
};

const buildLinearEntries = (stepSize: number, maxLevel: number) => {
    const entries: ILevelEntry[] = [];

    for (let level = 1; level <= maxLevel; level++) {
        entries.push({
            level,
            requiredXp: Math.max(0, (level - 1) * stepSize)
        });
    }

    return entries;
};

const buildExponentialEntries = (firstLevelXp: number, increaseFactor: number, maxLevel: number) => {
    const entries: ILevelEntry[] = [{ level: 1, requiredXp: 0 }];
    let nextIncrement = Math.max(0, firstLevelXp);
    let threshold = 0;

    for (let level = 2; level <= maxLevel; level++) {
        threshold += nextIncrement;

        entries.push({
            level,
            requiredXp: Math.max(0, Math.round(threshold))
        });

        nextIncrement = Math.max(0, Math.round(nextIncrement * ((100 + Math.max(0, increaseFactor)) / 100)));
    }

    return entries;
};

const buildManualEntries = (value: string) => {
    const anchors = parseManualAnchors(value);

    if (!anchors.length) return [{ level: 1, requiredXp: 0 }];

    const entries = new Map<number, number>();

    for (let index = 0; index < anchors.length; index++) {
        const [currentLevel, currentXp] = anchors[index];

        entries.set(currentLevel, currentXp);

        if (index >= anchors.length - 1) continue;

        const [nextLevel, nextXp] = anchors[index + 1];

        if (nextLevel <= currentLevel) continue;

        const deltaLevel = nextLevel - currentLevel;
        const deltaXp = nextXp - currentXp;

        for (let level = currentLevel + 1; level < nextLevel; level++) {
            const progress = (level - currentLevel) / deltaLevel;
            entries.set(level, Math.max(0, Math.round(currentXp + deltaXp * progress)));
        }
    }

    return [...entries.entries()].sort((left, right) => left[0] - right[0]).map(([level, requiredXp]) => ({ level, requiredXp }));
};

const buildPreviewEntries = (mode: number, stepSize: number, maxLevel: number, firstLevelXp: number, increaseFactor: number, interpolationText: string) => {
    switch (mode) {
        case MODE_EXPONENTIAL:
            return buildExponentialEntries(firstLevelXp, increaseFactor, maxLevel);
        case MODE_MANUAL:
            return buildManualEntries(interpolationText);
        default:
            return buildLinearEntries(stepSize, maxLevel);
    }
};

export const WiredExtraVariableLevelUpSystemView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mode, setMode] = useState(MODE_LINEAR);
    const [stepSizeInput, setStepSizeInput] = useState(DEFAULT_STEP_SIZE.toString());
    const [maxLevelInput, setMaxLevelInput] = useState(DEFAULT_MAX_LEVEL.toString());
    const [firstLevelXpInput, setFirstLevelXpInput] = useState(DEFAULT_FIRST_LEVEL_XP.toString());
    const [increaseFactorInput, setIncreaseFactorInput] = useState(DEFAULT_INCREASE_FACTOR.toString());
    const [interpolationText, setInterpolationText] = useState(DEFAULT_INTERPOLATION_TEXT);
    const [selectedSubvariables, setSelectedSubvariables] = useState<number[]>(DEFAULT_SUBVARIABLES);
    const [isModeSectionOpen, setIsModeSectionOpen] = useState(true);
    const [isPreviewSectionOpen, setIsPreviewSectionOpen] = useState(true);
    const [isSubvariablesSectionOpen, setIsSubvariablesSectionOpen] = useState(true);

    useEffect(() => {
        if (!trigger) {
            setMode(MODE_LINEAR);
            setStepSizeInput(DEFAULT_STEP_SIZE.toString());
            setMaxLevelInput(DEFAULT_MAX_LEVEL.toString());
            setFirstLevelXpInput(DEFAULT_FIRST_LEVEL_XP.toString());
            setIncreaseFactorInput(DEFAULT_INCREASE_FACTOR.toString());
            setInterpolationText(DEFAULT_INTERPOLATION_TEXT);
            setSelectedSubvariables([...DEFAULT_SUBVARIABLES]);
            return;
        }

        const editorData = parseEditorData(trigger.stringData);

        setMode(normalizeMode(editorData.mode ?? MODE_LINEAR));
        setStepSizeInput(normalizeNonNegativeInt(editorData.stepSize ?? DEFAULT_STEP_SIZE, DEFAULT_STEP_SIZE).toString());
        setMaxLevelInput(normalizePositiveInt(editorData.maxLevel ?? DEFAULT_MAX_LEVEL, DEFAULT_MAX_LEVEL).toString());
        setFirstLevelXpInput(normalizeNonNegativeInt(editorData.firstLevelXp ?? DEFAULT_FIRST_LEVEL_XP, DEFAULT_FIRST_LEVEL_XP).toString());
        setIncreaseFactorInput(normalizeNonNegativeInt(editorData.increaseFactor ?? DEFAULT_INCREASE_FACTOR, DEFAULT_INCREASE_FACTOR).toString());
        setInterpolationText(normalizeInterpolationText(editorData.interpolationText ?? DEFAULT_INTERPOLATION_TEXT));
        setSelectedSubvariables(normalizeSubvariables(editorData.subvariables));
    }, [trigger]);

    const normalizedStepSize = useMemo(() => normalizeNonNegativeInt(parseIntInput(stepSizeInput, DEFAULT_STEP_SIZE), DEFAULT_STEP_SIZE), [stepSizeInput]);
    const normalizedMaxLevel = useMemo(() => normalizePositiveInt(parseIntInput(maxLevelInput, DEFAULT_MAX_LEVEL), DEFAULT_MAX_LEVEL), [maxLevelInput]);
    const normalizedFirstLevelXp = useMemo(
        () => normalizeNonNegativeInt(parseIntInput(firstLevelXpInput, DEFAULT_FIRST_LEVEL_XP), DEFAULT_FIRST_LEVEL_XP),
        [firstLevelXpInput]
    );
    const normalizedIncreaseFactor = useMemo(
        () => normalizeNonNegativeInt(parseIntInput(increaseFactorInput, DEFAULT_INCREASE_FACTOR), DEFAULT_INCREASE_FACTOR),
        [increaseFactorInput]
    );
    const normalizedInterpolation = useMemo(() => normalizeInterpolationText(interpolationText), [interpolationText]);

    const previewEntries = useMemo(
        () => buildPreviewEntries(mode, normalizedStepSize, normalizedMaxLevel, normalizedFirstLevelXp, normalizedIncreaseFactor, normalizedInterpolation),
        [mode, normalizedFirstLevelXp, normalizedIncreaseFactor, normalizedInterpolation, normalizedMaxLevel, normalizedStepSize]
    );

    const interpolationPlaceholder = useMemo(() => {
        const localizedText = LocalizeText('wiredfurni.params.levelup.interpolation_placeholder');

        if (!localizedText || localizedText === 'wiredfurni.params.levelup.interpolation_placeholder') return DEFAULT_PLACEHOLDER;

        return localizedText.includes('5,100') ? localizedText.replace(/,/g, '=') : localizedText;
    }, []);

    const save = () => {
        setIntParams([]);
        setStringParam(
            JSON.stringify({
                mode,
                stepSize: normalizedStepSize,
                maxLevel: normalizedMaxLevel,
                firstLevelXp: normalizedFirstLevelXp,
                increaseFactor: normalizedIncreaseFactor,
                interpolationText: normalizedInterpolation,
                subvariables: [...selectedSubvariables].sort((left, right) => left - right)
            })
        );
    };

    const toggleSubvariable = (subvariable: number) => {
        setSelectedSubvariables((previousValue) => {
            if (previousValue.includes(subvariable)) {
                return previousValue.filter((value) => value !== subvariable);
            }

            return [...previousValue, subvariable].sort((left, right) => left - right);
        });
    };

    const modeOptions = [
        { value: MODE_LINEAR, label: localizeOrFallback('wiredfurni.params.levelup.mode.1', 'Lineare') },
        { value: MODE_EXPONENTIAL, label: localizeOrFallback('wiredfurni.params.levelup.mode.2', 'Esponenziale') },
        {
            value: MODE_MANUAL,
            label: localizeWithFallback('wiredfurni.params.levelup.mode.0', localizeOrFallback('wiredfurni.params.levelup.mode.3', 'Manuale'))
        }
    ];

    const subvariableOptions = [
        { key: SUB_CURRENT_LEVEL, suffix: 'current_level' },
        { key: SUB_CURRENT_XP, suffix: 'current_xp' },
        { key: SUB_LEVEL_PROGRESS, suffix: 'progress' },
        { key: SUB_LEVEL_PROGRESS_PERCENT, suffix: 'progress_percentage' },
        { key: SUB_TOTAL_XP_REQUIRED, suffix: 'xp_required' },
        { key: SUB_XP_REMAINING, suffix: 'xp_remaining' },
        { key: SUB_IS_AT_MAX, suffix: 'is_maxed' },
        { key: SUB_MAX_LEVEL, suffix: 'max_level' }
    ];

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 260 }}>
            <div className="octane-wired__levelup">
                <div className="octane-wired__levelup-section">
                    <button type="button" className="octane-wired__levelup-section-header" onClick={() => setIsModeSectionOpen((value) => !value)}>
                        <Text bold>{LocalizeText('wiredfurni.params.levelup.mode')}</Text>
                        <span className={`octane-wired__levelup-chevron ${isModeSectionOpen ? 'is-open' : ''}`}>^</span>
                    </button>

                    {isModeSectionOpen && (
                        <div className="octane-wired__levelup-section-body">
                            <div className={`octane-wired__levelup-mode-block ${mode === MODE_LINEAR ? 'is-active' : 'is-inactive'}`}>
                                <label className="octane-wired__levelup-mode-label">
                                    <input
                                        checked={mode === MODE_LINEAR}
                                        className="form-check-input"
                                        name="wiredVariableLevelUpMode"
                                        type="radio"
                                        onChange={() => setMode(MODE_LINEAR)}
                                    />
                                    <Text>{localizeOrFallback('wiredfurni.params.levelup.mode.1', 'Lineare')}</Text>
                                </label>
                                <div className="octane-wired__levelup-fields">
                                    <div className="octane-wired__levelup-field-row">
                                        <Text>{LocalizeText('wiredfurni.params.levelup.step_size')}</Text>
                                        <OctaneInput
                                            className="octane-wired__levelup-number"
                                            disabled={mode !== MODE_LINEAR}
                                            type="number"
                                            value={stepSizeInput}
                                            onChange={(event) => setStepSizeInput(event.target.value)}
                                        />
                                    </div>
                                    <div className="octane-wired__levelup-field-row">
                                        <Text>{LocalizeText('wiredfurni.params.levelup.max_level')}</Text>
                                        <OctaneInput
                                            className="octane-wired__levelup-number"
                                            disabled={mode !== MODE_LINEAR}
                                            type="number"
                                            value={maxLevelInput}
                                            onChange={(event) => setMaxLevelInput(event.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={`octane-wired__levelup-mode-block ${mode === MODE_EXPONENTIAL ? 'is-active' : 'is-inactive'}`}>
                                <label className="octane-wired__levelup-mode-label">
                                    <input
                                        checked={mode === MODE_EXPONENTIAL}
                                        className="form-check-input"
                                        name="wiredVariableLevelUpMode"
                                        type="radio"
                                        onChange={() => setMode(MODE_EXPONENTIAL)}
                                    />
                                    <Text>{localizeOrFallback('wiredfurni.params.levelup.mode.2', 'Esponenziale')}</Text>
                                </label>
                                <div className="octane-wired__levelup-fields">
                                    <div className="octane-wired__levelup-field-row">
                                        <Text>{LocalizeText('wiredfurni.params.levelup.first_level_xp')}</Text>
                                        <OctaneInput
                                            className="octane-wired__levelup-number"
                                            disabled={mode !== MODE_EXPONENTIAL}
                                            type="number"
                                            value={firstLevelXpInput}
                                            onChange={(event) => setFirstLevelXpInput(event.target.value)}
                                        />
                                    </div>
                                    <div className="octane-wired__levelup-field-row">
                                        <Text>{LocalizeText('wiredfurni.params.levelup.increase_factor')}</Text>
                                        <OctaneInput
                                            className="octane-wired__levelup-number"
                                            disabled={mode !== MODE_EXPONENTIAL}
                                            type="number"
                                            value={increaseFactorInput}
                                            onChange={(event) => setIncreaseFactorInput(event.target.value)}
                                        />
                                    </div>
                                    <div className="octane-wired__levelup-field-row">
                                        <Text>{LocalizeText('wiredfurni.params.levelup.max_level')}</Text>
                                        <OctaneInput
                                            className="octane-wired__levelup-number"
                                            disabled={mode !== MODE_EXPONENTIAL}
                                            type="number"
                                            value={maxLevelInput}
                                            onChange={(event) => setMaxLevelInput(event.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={`octane-wired__levelup-mode-block ${mode === MODE_MANUAL ? 'is-active' : 'is-inactive'}`}>
                                <label className="octane-wired__levelup-mode-label">
                                    <input
                                        checked={mode === MODE_MANUAL}
                                        className="form-check-input"
                                        name="wiredVariableLevelUpMode"
                                        type="radio"
                                        onChange={() => setMode(MODE_MANUAL)}
                                    />
                                    <Text>
                                        {localizeWithFallback(
                                            'wiredfurni.params.levelup.mode.0',
                                            localizeOrFallback('wiredfurni.params.levelup.mode.3', 'Inserimento manuale')
                                        )}
                                    </Text>
                                </label>
                                <textarea
                                    className="form-control form-control-sm octane-wired__levelup-textarea"
                                    disabled={mode !== MODE_MANUAL}
                                    placeholder={interpolationPlaceholder}
                                    value={interpolationText}
                                    onChange={(event) => setInterpolationText(event.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__levelup-section">
                    <button type="button" className="octane-wired__levelup-section-header" onClick={() => setIsPreviewSectionOpen((value) => !value)}>
                        <Text bold>{LocalizeText('wiredfurni.params.levelup.preview')}</Text>
                        <span className={`octane-wired__levelup-chevron ${isPreviewSectionOpen ? 'is-open' : ''}`}>^</span>
                    </button>

                    {isPreviewSectionOpen && (
                        <div className="octane-wired__levelup-preview">
                            {previewEntries.map((entry) => (
                                <div key={entry.level} className="octane-wired__levelup-preview-entry">
                                    {localizeOrFallback(
                                        'wiredfurni.params.levelup.preview.entry',
                                        `Livello: ${entry.level} - XP: ${entry.requiredXp}`,
                                        ['lvl', 'xp'],
                                        [entry.level.toString(), entry.requiredXp.toString()]
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__levelup-section">
                    <button type="button" className="octane-wired__levelup-section-header" onClick={() => setIsSubvariablesSectionOpen((value) => !value)}>
                        <Text bold>{LocalizeText('wiredfurni.params.create_subvariables')}</Text>
                        <span className={`octane-wired__levelup-chevron ${isSubvariablesSectionOpen ? 'is-open' : ''}`}>^</span>
                    </button>

                    {isSubvariablesSectionOpen && (
                        <div className="octane-wired__levelup-subvariables">
                            {subvariableOptions.map((subvariable) => (
                                <div key={subvariable.key} className="octane-wired__levelup-subvariable-row">
                                    <label className="octane-wired__levelup-subvariable-label">
                                        <input
                                            checked={selectedSubvariables.includes(subvariable.key)}
                                            className="form-check-input"
                                            type="checkbox"
                                            onChange={() => toggleSubvariable(subvariable.key)}
                                        />
                                        <Text>{LocalizeText(`wiredfurni.params.levelup.subvariable.${subvariable.key}`)}</Text>
                                    </label>
                                    <input className="octane-wired__levelup-subvariable-token" readOnly tabIndex={-1} type="text" value={subvariable.suffix} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
