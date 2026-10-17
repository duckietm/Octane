import { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import {
    clampProjectileParam,
    decodeProjectileTokens,
    defaultProjectileParams,
    encodeProjectileTokens,
    isProjectileVariableEnabled,
    LocalizeText,
    localizeWithFallback,
    normalizeProjectileParams,
    PROJECTILE_DISTANCE_FIXED,
    PROJECTILE_DISTANCE_NORMAL,
    PROJECTILE_DISTANCE_OVERSHOOT,
    PROJECTILE_INTERNAL_VARIABLES,
    PROJECTILE_PARAM_BUNNY_HOP,
    PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION,
    PROJECTILE_PARAM_CURVE_STRENGTH,
    PROJECTILE_PARAM_DIRECTIONAL_SYSTEM,
    PROJECTILE_PARAM_DISTANCE_BY_HEIGHT,
    PROJECTILE_PARAM_DISTANCE_BY_X,
    PROJECTILE_PARAM_DISTANCE_BY_Y,
    PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE,
    PROJECTILE_PARAM_DISTANCE_IS_VARIABLE,
    PROJECTILE_PARAM_DISTANCE_MODE,
    PROJECTILE_PARAM_DISTANCE_TARGET,
    PROJECTILE_PARAM_DISTANCE_TILES,
    PROJECTILE_PARAM_DISTANCE_USER_SOURCE,
    PROJECTILE_PARAM_INTERNAL_VARIABLES,
    PROJECTILE_PARAM_ROTATE,
    PROJECTILE_PARAM_ROTATION_OFFSET,
    PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE,
    PROJECTILE_PARAM_SHOOTER_SOURCE,
    PROJECTILE_PARAM_SPEED_INCREASE,
    PROJECTILE_PARAM_TIME_FURNI_SOURCE,
    PROJECTILE_PARAM_TIME_IS_VARIABLE,
    PROJECTILE_PARAM_TIME_PER_TILE,
    PROJECTILE_PARAM_TIME_TARGET,
    PROJECTILE_PARAM_TIME_USER_SOURCE,
    toggleProjectileVariable,
    WiredFurniType
} from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectorView } from '../WiredFurniSelectorView';
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
import { WiredProjectileDirectionGrid } from './WiredProjectileDirectionGrid';
import { Checkbox as BaseCheckbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { NumberInput } from '../../../../common/NumberInput';
import { BaseButton } from '../../../../common/BaseButton';

const DIRECTIONAL_SYSTEMS: Array<{ fallback: string; value: number }> = [
    { fallback: '8 directions, straight', value: 0 },
    { fallback: '8 directions, diffuse', value: 1 },
    { fallback: '4 directions, prefer vertical', value: 2 },
    { fallback: '4 directions, prefer horizontal', value: 3 }
];

const DISTANCE_MODES: Array<{ fallback: string; key: string; value: number }> = [
    { fallback: 'Fly to the target', key: 'normal', value: PROJECTILE_DISTANCE_NORMAL },
    { fallback: 'Fly past the target', key: 'overshoot', value: PROJECTILE_DISTANCE_OVERSHOOT },
    { fallback: 'Always fly the same distance', key: 'fixed', value: PROJECTILE_DISTANCE_FIXED }
];

const DISTANCE_AXES: Array<{ fallback: string; key: string; param: number }> = [
    { fallback: 'X', key: 'x', param: PROJECTILE_PARAM_DISTANCE_BY_X },
    { fallback: 'Y', key: 'y', param: PROJECTILE_PARAM_DISTANCE_BY_Y },
    { fallback: 'Height', key: 'height', param: PROJECTILE_PARAM_DISTANCE_BY_HEIGHT }
];

/** Variable targets as the server numbers them. */
const VARIABLE_TARGETS: Array<{ key: WiredVariablePickerTarget; value: number; fallback: string }> = [
    { key: 'furni', value: 1, fallback: 'Furni' },
    { key: 'user', value: 0, fallback: 'User' },
    { key: 'global', value: 3, fallback: 'Global' },
    { key: 'context', value: 2, fallback: 'Context' }
];

const SOURCE_TRIGGER = 0;
const SOURCE_PROJECTILES = 101;

const FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_PROJECTILES, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

type SectionKey = 'info' | 'direction' | 'trajectory' | 'time' | 'rotation' | 'variables';

const INITIALLY_OPEN: Record<SectionKey, boolean> = {
    info: true,
    direction: true,
    trajectory: false,
    time: false,
    rotation: true,
    variables: false
};

const text = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
    localizeWithFallback(`wiredfurni.params.projectile.${key}`, fallback, parameters, replacements);

const targetKeyOf = (value: number): WiredVariablePickerTarget => VARIABLE_TARGETS.find((target) => target.value === value)?.key ?? 'user';

const ProjectileSection: FC<PropsWithChildren<{ title: string; open: boolean; first?: boolean; onToggle: () => void }>> = (props) => {
    const { title, open, first = false, onToggle, children } = props;

    return (
        <>
            {!first && <div className="octane-wired__divider" />}
            <div className="octane-wired__projectile-section">
                <BaseButton aria-expanded={open} className="octane-wired__projectile-section-header" type="button" onClick={onToggle}>
                    <Text bold>{title}</Text>
                    {open ? <FaChevronUp className="octane-wired__projectile-chevron" /> : <FaChevronDown className="octane-wired__projectile-chevron" />}
                </BaseButton>
                {open && <div className="octane-wired__projectile-section-body">{children}</div>}
            </div>
        </>
    );
};

const Checkbox: FC<{ checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }> = (props) => {
    const { checked, disabled = false, label, onChange } = props;

    return (
        <label className={`flex items-center gap-1 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <BaseCheckbox checked={checked} disabled={disabled} onCheckedChange={onChange} />
            <Text small>{label}</Text>
        </label>
    );
};

const NumberField: FC<{ disabled?: boolean; label: string; value: number; onChange: (value: number) => void }> = ({ disabled = false, label, value, onChange }) => (
    <label className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <Text small>{label}</Text>
        <NumberInput className="form-control form-control-sm octane-wired__projectile-number" disabled={disabled} value={value} onChange={(event) => onChange(parseInt(event.target.value, 10))} />
    </label>
);

const SourceSelect: FC<{ label: string; options: WiredSourceOption[]; value: number; onChange: (value: number) => void }> = ({ label, options, value, onChange }) => (
    <label className="flex items-center justify-between gap-2">
        <Text small>{label}</Text>
        <Select aria-label={label} className="form-select form-select-sm" value={value} onChange={(event) => onChange(parseInt(event.target.value, 10))}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {LocalizeText(option.label)}
                </option>
            ))}
        </Select>
    </label>
);

interface ValueOrVariableProps {
    name: string;
    label: string;
    value: number;
    fromVariable: boolean;
    target: number;
    token: string;
    userSource: number;
    furniSource: number;
    userSources: WiredSourceOption[];
    onValue: (value: number) => void;
    onFromVariable: (fromVariable: boolean) => void;
    onTarget: (target: number) => void;
    onToken: (token: string) => void;
    onUserSource: (source: number) => void;
    onFurniSource: (source: number) => void;
}

/** Habbo's "set value / from variable" pair, as the time per tile and the distance use it. */
const ValueOrVariable: FC<ValueOrVariableProps> = (props) => {
    const { name, label, value, fromVariable, target, token, userSource, furniSource, userSources } = props;
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const targetKey = targetKeyOf(target);

    const entries = useMemo(() => {
        const definitions =
            targetKey === 'furni'
                ? furniVariableDefinitions
                : targetKey === 'global'
                  ? roomVariableDefinitions
                  : targetKey === 'context'
                    ? contextVariableDefinitions
                    : userVariableDefinitions;
        const built = buildWiredVariablePickerEntries(targetKey, 'change-reference', definitions);

        if (!token || flattenWiredVariablePickerEntries(built).some((entry) => entry.token === token)) return built;

        const fallback = createFallbackVariableEntry(targetKey, token);

        return fallback ? [fallback, ...built] : built;
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetKey, token, userVariableDefinitions]);

    return (
        <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 cursor-pointer">
                <Radio checked={!fromVariable} name={name} onCheckedChange={() => props.onFromVariable(false)} />
                <Text small>{label}</Text>
                <NumberInput aria-label={label} className="form-control form-control-sm octane-wired__projectile-number ms-auto" disabled={fromVariable} value={value} onChange={(event) => props.onValue(parseInt(event.target.value, 10))} />
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
                <Radio checked={fromVariable} name={name} onCheckedChange={() => props.onFromVariable(true)} />
                <Text small>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
            </label>
            {fromVariable && (
                <div className="flex flex-col gap-1 octane-wired__projectile-indent">
                    <Select
                        aria-label={`${label} variable type`}
                        className="form-select form-select-sm"
                        value={target}
                        onChange={(event) => {
                            props.onTarget(parseInt(event.target.value, 10));
                            props.onToken('');
                        }}
                    >
                        {VARIABLE_TARGETS.map((option) => (
                            <option key={option.key} value={option.value}>
                                {text(`variable_target.${option.key}`, option.fallback)}
                            </option>
                        ))}
                    </Select>
                    <WiredVariablePicker entries={entries} recentScope="projectile-reference" selectedToken={token} onSelect={(entry) => props.onToken(entry.token)} />
                    {targetKey === 'user' && (
                        <SourceSelect label={text('variable_source', 'Read it from:')} options={userSources} value={userSource} onChange={props.onUserSource} />
                    )}
                    {targetKey === 'furni' && (
                        <SourceSelect label={text('variable_source', 'Read it from:')} options={FURNI_SOURCES} value={furniSource} onChange={props.onFurniSource} />
                    )}
                </div>
            )}
        </div>
    );
};

export const WiredExtraProjectileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [params, setParams] = useState<number[]>(defaultProjectileParams);
    const [timeToken, setTimeToken] = useState('');
    const [distanceToken, setDistanceToken] = useState('');
    const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(INITIALLY_OPEN);
    const userSources = sortWiredSourceOptions(useAvailableUserSources(trigger, USER_SOURCES), 'users');

    useEffect(() => {
        if (!trigger) return;

        const [time, distance] = decodeProjectileTokens(trigger.stringData);

        setParams(normalizeProjectileParams(trigger.intData));
        setTimeToken(normalizeVariableTokenFromWire(time));
        setDistanceToken(normalizeVariableTokenFromWire(distance));
    }, [trigger]);

    const setParam = (index: number, value: number) =>
        setParams((current) => current.map((entry, position) => (position === index ? clampProjectileParam(index, value) : entry)));
    const setFlag = (index: number, checked: boolean) => setParam(index, checked ? 1 : 0);
    const toggleSection = (key: SectionKey) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

    const rotates = params[PROJECTILE_PARAM_ROTATE] === 1;
    const changesShooter = params[PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION] === 1;
    const scalesTime = params[PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE] === 1;
    const distanceMode = params[PROJECTILE_PARAM_DISTANCE_MODE];
    const rotationOffset = params[PROJECTILE_PARAM_ROTATION_OFFSET];
    const variablesMask = params[PROJECTILE_PARAM_INTERNAL_VARIABLES];
    const timeFromVariable = params[PROJECTILE_PARAM_TIME_IS_VARIABLE] === 1;
    const distanceFromVariable = params[PROJECTILE_PARAM_DISTANCE_IS_VARIABLE] === 1;

    const save = () => {
        setIntParams(normalizeProjectileParams(params));
        setStringParam(encodeProjectileTokens(timeFromVariable ? timeToken : '', distanceFromVariable ? distanceToken : ''));
    };

    return (
        <WiredExtraBaseView
            footer={<WiredFurniSelectorView />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            showSelection={false}
            validate={() => !(scalesTime && timeFromVariable && !timeToken) && !(distanceMode !== PROJECTILE_DISTANCE_NORMAL && distanceFromVariable && !distanceToken)}
        >
            <div className="octane-wired__projectile">
                <ProjectileSection first open={openSections.info} title={text('info', 'Usage info:')} onToggle={() => toggleSection('info')}>
                    <Text small>
                        {text(
                            'info.desc',
                            'This box is meant for projectile furni. Use it to add extra features to a projectile that is already being moved by Wired.'
                        )}
                    </Text>
                </ProjectileSection>

                <ProjectileSection open={openSections.direction} title={text('direction', 'Projectile direction:')} onToggle={() => toggleSection('direction')}>
                    <Checkbox
                        checked={rotates}
                        label={text('rotate', 'Rotate the projectile in the moving direction')}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_ROTATE, checked)}
                    />
                    <div className="flex flex-col gap-1">
                        <Text small>{text('system', 'System:')}</Text>
                        <Select
                            aria-label={text('system', 'System:')}
                            className="form-select form-select-sm"
                            disabled={!rotates && !changesShooter}
                            value={params[PROJECTILE_PARAM_DIRECTIONAL_SYSTEM]}
                            onChange={(event) => setParam(PROJECTILE_PARAM_DIRECTIONAL_SYSTEM, parseInt(event.target.value, 10))}
                        >
                            {DIRECTIONAL_SYSTEMS.map((system) => (
                                <option key={system.value} value={system.value}>
                                    {text(`system.${system.value}`, system.fallback)}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <WiredProjectileDirectionGrid disabled={!rotates && !changesShooter} system={params[PROJECTILE_PARAM_DIRECTIONAL_SYSTEM]} />
                    <Checkbox
                        checked={changesShooter}
                        label={text('shooter', "Visually change the shooter's direction")}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION, checked)}
                    />
                    <div className="flex flex-col gap-1 octane-wired__projectile-indent">
                        <Checkbox
                            checked={params[PROJECTILE_PARAM_BUNNY_HOP] === 1}
                            disabled={!changesShooter}
                            label={text('bunny_hop', 'Do a little hop when shooting sideways')}
                            onChange={(checked) => setFlag(PROJECTILE_PARAM_BUNNY_HOP, checked)}
                        />
                        {changesShooter && (
                            <SourceSelect
                                label={text('shooter.source', 'Shooter:')}
                                options={userSources}
                                value={params[PROJECTILE_PARAM_SHOOTER_SOURCE]}
                                onChange={(value) => setParam(PROJECTILE_PARAM_SHOOTER_SOURCE, value)}
                            />
                        )}
                    </div>
                </ProjectileSection>

                <ProjectileSection open={openSections.trajectory} title={text('trajectory', 'Animation trajectory:')} onToggle={() => toggleSection('trajectory')}>
                    <div className="flex flex-col gap-1">
                        {DISTANCE_MODES.map((mode) => (
                            <label key={mode.value} className="flex items-center gap-1 cursor-pointer">
                                <Radio checked={distanceMode === mode.value} name="projectileDistanceMode" onCheckedChange={() => setParam(PROJECTILE_PARAM_DISTANCE_MODE, mode.value)} />
                                <Text small>{text(`distance.${mode.key}`, mode.fallback)}</Text>
                            </label>
                        ))}
                    </div>
                    {distanceMode !== PROJECTILE_DISTANCE_NORMAL && (
                        <div className="octane-wired__projectile-indent">
                            <ValueOrVariable
                                fromVariable={distanceFromVariable}
                                furniSource={params[PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE]}
                                label={text('distance.tiles', 'Tiles:')}
                                name="projectileDistanceValue"
                                target={params[PROJECTILE_PARAM_DISTANCE_TARGET]}
                                token={distanceToken}
                                userSource={params[PROJECTILE_PARAM_DISTANCE_USER_SOURCE]}
                                userSources={userSources}
                                value={params[PROJECTILE_PARAM_DISTANCE_TILES]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_DISTANCE_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_DISTANCE_TARGET, target)}
                                onToken={setDistanceToken}
                                onUserSource={(source) => setParam(PROJECTILE_PARAM_DISTANCE_USER_SOURCE, source)}
                                onValue={(value) => setParam(PROJECTILE_PARAM_DISTANCE_TILES, value)}
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <Text small>
                            {text('curve', 'Curve strength: %value%', ['value'], [String(params[PROJECTILE_PARAM_CURVE_STRENGTH])]).replace(
                                '%value%',
                                String(params[PROJECTILE_PARAM_CURVE_STRENGTH])
                            )}
                        </Text>
                        <Slider
                            max={1000}
                            min={-1000}
                            step={10}
                            value={params[PROJECTILE_PARAM_CURVE_STRENGTH]}
                            onChange={(value) => setParam(PROJECTILE_PARAM_CURVE_STRENGTH, value as number)}
                        />
                    </div>
                </ProjectileSection>

                <ProjectileSection open={openSections.time} title={text('time', 'Animation time:')} onToggle={() => toggleSection('time')}>
                    <Checkbox
                        checked={scalesTime}
                        label={text('time.scale', 'Scale the animation time with the distance')}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE, checked)}
                    />
                    {scalesTime && (
                        <>
                            <ValueOrVariable
                                fromVariable={timeFromVariable}
                                furniSource={params[PROJECTILE_PARAM_TIME_FURNI_SOURCE]}
                                label={text('time.per_tile', 'Time per tile (ms):')}
                                name="projectileTimeValue"
                                target={params[PROJECTILE_PARAM_TIME_TARGET]}
                                token={timeToken}
                                userSource={params[PROJECTILE_PARAM_TIME_USER_SOURCE]}
                                userSources={userSources}
                                value={params[PROJECTILE_PARAM_TIME_PER_TILE]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_TIME_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_TIME_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_TIME_TARGET, target)}
                                onToken={setTimeToken}
                                onUserSource={(source) => setParam(PROJECTILE_PARAM_TIME_USER_SOURCE, source)}
                                onValue={(value) => setParam(PROJECTILE_PARAM_TIME_PER_TILE, value)}
                            />
                            <Text small>{text('time.distance_by', 'Measure the distance by:')}</Text>
                            <div className="flex items-center gap-3 octane-wired__projectile-indent">
                                {DISTANCE_AXES.map((axis) => (
                                    <Checkbox
                                        key={axis.key}
                                        checked={params[axis.param] === 1}
                                        label={text(`time.distance_by.${axis.key}`, axis.fallback)}
                                        onChange={(checked) => setFlag(axis.param, checked)}
                                    />
                                ))}
                            </div>
                            <NumberField
                                label={text('time.speed_increase', 'Speed increase (ms):')}
                                value={params[PROJECTILE_PARAM_SPEED_INCREASE]}
                                onChange={(value) => setParam(PROJECTILE_PARAM_SPEED_INCREASE, value)}
                            />
                        </>
                    )}
                </ProjectileSection>

                <ProjectileSection
                    open={openSections.rotation}
                    title={text('rotation_offset', 'Shift the rotation by %value%', ['value'], [String(rotationOffset)]).replace('%value%', String(rotationOffset))}
                    onToggle={() => toggleSection('rotation')}
                >
                    <Slider max={7} min={0} step={1} value={rotationOffset} onChange={(value) => setParam(PROJECTILE_PARAM_ROTATION_OFFSET, value as number)} />
                </ProjectileSection>

                <ProjectileSection open={openSections.variables} title={text('variables', 'Projectile internal variables:')} onToggle={() => toggleSection('variables')}>
                    {PROJECTILE_INTERNAL_VARIABLES.map((variable, bit) => (
                        <Checkbox
                            key={variable}
                            checked={isProjectileVariableEnabled(variablesMask, bit)}
                            label={variable}
                            onChange={(checked) => setParam(PROJECTILE_PARAM_INTERNAL_VARIABLES, toggleProjectileVariable(variablesMask, bit, checked))}
                        />
                    ))}
                </ProjectileSection>
            </div>
        </WiredExtraBaseView>
    );
};
