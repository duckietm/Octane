import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Slider, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    normalizeVariableTokenFromWire,
    WiredVariablePickerTarget
} from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { BaseButton } from '../../../../common/BaseButton';

/**
 * Habbo's "movement curve" (wf_xtra_mov_curve): how high the furni the stack moves jump, typed or
 * read from a variable. Our easing curves sit under the advanced options.
 * Official int params: [strength from variable, strength, variable target (official ids)]; ours follow:
 * [curve, intensity]. String param: the variable token; its user and furni source in the official slots.
 */

type VariableTarget = 'user' | 'furni' | 'global' | 'context';

const CURVE_OPTIONS: { value: number; label: string }[] = [
    { value: 7, label: 'Jump' },
    { value: 0, label: 'Linear' },
    { value: 1, label: 'Ease in' },
    { value: 2, label: 'Ease out' },
    { value: 3, label: 'Ease in / out' },
    { value: 4, label: 'Bounce' },
    { value: 5, label: 'Elastic' },
    { value: 6, label: 'Drop' }
];

const CURVE_JUMP = 7;
const CURVE_MAX = 7;
const INTENSITY_DEFAULT = 100;
const STRENGTH_MIN = -1000;
const STRENGTH_MAX = 1000;
const STRENGTH_DEFAULT = 80;
const SOURCE_TRIGGER = 0;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGETS: Array<{ key: VariableTarget; value: number; icon: string }> = [
    { key: 'furni', value: 0, icon: furniVariableIcon },
    { key: 'user', value: 1, icon: userVariableIcon },
    { key: 'global', value: -10, icon: globalVariableIcon },
    { key: 'context', value: -20, icon: contextVariableIcon }
];

const FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);
const GLOBAL_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCES: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Context variables') }];

const clamp = (value: number, min: number, max: number, fallback: number) => (Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback);
const targetOf = (value: number): VariableTarget => TARGETS.find((target) => target.value === value)?.key ?? 'user';
const targetValue = (key: VariableTarget) => TARGETS.find((target) => target.key === key)?.value ?? 1;

export const WiredExtraMovementCurveView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [curveType, setCurveType] = useState(CURVE_JUMP);
    const [intensity, setIntensity] = useState(INTENSITY_DEFAULT);
    const [strengthInput, setStrengthInput] = useState(String(STRENGTH_DEFAULT));
    const [fromVariable, setFromVariable] = useState(false);
    const [target, setTarget] = useState<VariableTarget>('user');
    const [variableToken, setVariableToken] = useState('');
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);

    const userSources = sortWiredSourceOptions(useAvailableUserSources(trigger, USER_SOURCES), 'users');

    const definitions =
        target === 'furni'
            ? furniVariableDefinitions
            : target === 'global'
              ? roomVariableDefinitions
              : target === 'context'
                ? contextVariableDefinitions
                : userVariableDefinitions;
    const entries = useMemo(() => {
        const built = buildWiredVariablePickerEntries(target as WiredVariablePickerTarget, 'change-reference', definitions);
        if (!variableToken || flattenWiredVariablePickerEntries(built).some((entry) => entry.token === variableToken)) return built;

        const fallback = createFallbackVariableEntry(target, variableToken);
        return fallback ? [fallback, ...built] : built;
    }, [definitions, target, variableToken]);

    const picksFurni = fromVariable && target === 'furni' && furniSource === SOURCE_SECONDARY_SELECTED;
    const sourceOptions = target === 'furni' ? FURNI_SOURCES : target === 'global' ? GLOBAL_SOURCES : target === 'context' ? CONTEXT_SOURCES : userSources;
    const sourceValue = target === 'furni' ? furniSource : target === 'user' ? userSource : SOURCE_TRIGGER;

    useEffect(() => {
        if (!trigger) return;

        const ints = trigger.intData ?? [];

        setFromVariable(ints.length > 0 && ints[0] === 1);
        setStrengthInput(String(ints.length > 1 ? clamp(ints[1], STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT) : STRENGTH_DEFAULT));
        setTarget(targetOf(ints.length > 2 ? ints[2] : 1));
        setCurveType(ints.length > 3 ? clamp(ints[3], 0, CURVE_MAX, CURVE_JUMP) : CURVE_JUMP);
        setIntensity(ints.length > 4 ? clamp(ints[4], 0, 100, INTENSITY_DEFAULT) : INTENSITY_DEFAULT);
        setUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? SOURCE_TRIGGER);
        setVariableToken(normalizeVariableTokenFromWire(trigger.stringData ?? ''));
    }, [trigger]);

    const chooseTarget = (next: VariableTarget) => {
        if (next === target) return;
        if (target === 'furni') setFurniIds([]);

        setTarget(next);
        setVariableToken('');
    };

    const save = () => {
        setIntParams([
            fromVariable ? 1 : 0,
            clamp(parseInt(strengthInput, 10), STRENGTH_MIN, STRENGTH_MAX, STRENGTH_DEFAULT),
            targetValue(target),
            curveType,
            intensity
        ]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
        setStringParam(fromVariable ? variableToken : '');
        if (!picksFurni) setFurniIds([]);
    };

    const isJump = curveType === CURVE_JUMP;

    const footer = (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.movement_curve.style', 'Curve style')}</Text>
                <Select className="form-select form-select-sm" value={curveType} onChange={(event) => setCurveType(clamp(parseInt(event.target.value, 10), 0, CURVE_MAX, CURVE_JUMP))}>
                    {CURVE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(`wiredfurni.params.movement_curve.style.${option.value}`, option.label)}
                        </option>
                    ))}
                </Select>
            </div>
            {!isJump && curveType > 0 && (
                <div className="flex flex-col gap-1">
                    <Text bold>
                        {localizeWithFallback('wiredfurni.params.movement_curve.intensity', 'Intensity')} ({intensity}%)
                    </Text>
                    <Slider max={100} min={0} step={1} value={intensity} onChange={(value) => setIntensity(clamp(value as number, 0, 100, INTENSITY_DEFAULT))} />
                </div>
            )}
        </div>
    );

    return (
        <WiredExtraBaseView
            footer={footer}
            hasSpecialInput={true}
            requiresFurni={picksFurni ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={() => !(isJump && fromVariable && !variableToken)}
        >
            <div className="octane-wired__give-var">
                <div className={`octane-wired__give-var-section ${isJump ? '' : 'opacity-50 pointer-events-none'}`}>
                    <div className="octane-wired__give-var-section-title">{localizeWithFallback('wiredfurni.params.movement_curve', 'Movement curve:')}</div>
                    <label className="octane-wired__change-var-radio">
                        <Radio checked={!fromVariable} onCheckedChange={() => setFromVariable(false)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.reference_value.set_value')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            max={STRENGTH_MAX}
                            min={STRENGTH_MIN}
                            type="number"
                            value={strengthInput}
                            onChange={(event) => setStrengthInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <Radio checked={fromVariable} onCheckedChange={() => setFromVariable(true)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGETS.map((button) => (
                                    <BaseButton
                                        key={button.key}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${target === button.key ? 'is-active' : ''}`}
                                        disabled={!fromVariable}
                                        type="button"
                                        onClick={() => chooseTarget(button.key)}
                                    >
                                        <img alt={button.key} src={button.icon} />
                                    </BaseButton>
                                ))}
                            </div>
                        </label>

                        <div className={fromVariable ? '' : 'opacity-50 pointer-events-none'}>
                            <WiredVariablePicker
                                entries={entries}
                                recentScope="movement-curve-reference"
                                selectedToken={variableToken}
                                onSelect={(entry) => setVariableToken(entry.token)}
                            />
                        </div>
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className={fromVariable && isJump ? '' : 'opacity-50 pointer-events-none'}>
                    <WiredFurniSelectionSourceRow
                        options={sourceOptions}
                        selectionActive={true}
                        selectionCount={furniIds.length}
                        selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                        selectionKind="primary"
                        selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                        showSelectionToggle={false}
                        title="wiredfurni.params.sources.merged.title.variables_reference"
                        value={sourceValue}
                        onChange={(value) => {
                            if (target === 'furni') {
                                setFurniSource(value);
                                if (value !== SOURCE_SECONDARY_SELECTED) setFurniIds([]);
                                return;
                            }

                            if (target === 'user') setUserSource(value);
                        }}
                    />
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
