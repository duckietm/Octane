import { FC, useEffect, useMemo, useState } from 'react';
import { fromOfficialVariableTarget, LocalizeText, localizeWithFallback, toOfficialVariableTarget, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    IWiredVariablePickerEntry,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { normalizeWiredValueTarget, variableTokenFromId, WiredValueOrVariableSection } from '../WiredValueOrVariableSection';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    itemId: number;
    name: string;
}

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const TARGET_GLOBAL = 3;
const COMPARE_VALUE_CREATED = 0;
const COMPARE_VALUE_UPDATED = 1;
const COMPARISON_LOWER_THAN = 0;
const COMPARISON_HIGHER_THAN = 2;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const GLOBAL_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'Current execution' }];
const COMPARE_VALUE_OPTIONS = [COMPARE_VALUE_CREATED, COMPARE_VALUE_UPDATED];
const COMPARISON_OPTIONS = [COMPARISON_LOWER_THAN, COMPARISON_HIGHER_THAN];
const DURATION_UNITS = [0, 1, 2, 3, 4, 5, 6, 7];

const getTargetValue = (value: VariableTargetType) => {
    switch (value) {
        case 'furni':
            return TARGET_FURNI;
        case 'global':
            return TARGET_GLOBAL;
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_GLOBAL:
            return 'global';
        case TARGET_CONTEXT:
            return 'context';
        default:
            return 'user';
    }
};

const getTargetDefinitions = (
    targetType: VariableTargetType,
    userDefinitions: IVariableDefinition[],
    furniDefinitions: IVariableDefinition[],
    roomDefinitions: IVariableDefinition[],
    contextDefinitions: IVariableDefinition[]
) => {
    switch (targetType) {
        case 'furni':
            return furniDefinitions;
        case 'global':
            return roomDefinitions;
        case 'context':
            return contextDefinitions;
        default:
            return userDefinitions;
    }
};

const buildCustomVariableEntries = (target: VariableTargetType, definitions: IVariableDefinition[]): IWiredVariablePickerEntry[] => {
    return [...definitions]
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.itemId - right.itemId)
        .map((definition) => ({
            id: `custom:${definition.itemId}`,
            token: `custom:${definition.itemId}`,
            label: definition.name,
            displayLabel: definition.name,
            searchableText: definition.name,
            selectable: true,
            hasValue: !!definition.hasValue,
            kind: 'custom',
            target
        }));
};

const getSourceTitle = () => LocalizeText('wiredfurni.params.sources.merged.title.variables');

export const WiredConditionVariableAgeMatchView: FC<{}> = () => {
    // Official layout: [target, comparison, useUpdate, durationHigh, durationLow, unit, fromVariable, durationTarget,
    // our quantifier], "variable\tdurationVariable" in the string, the furni and users in the official slots.
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [fromVariable, setFromVariable] = useState(false);
    const [durationTarget, setDurationTarget] = useState(-10);
    const [durationToken, setDurationToken] = useState('');
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [compareValue, setCompareValue] = useState(COMPARE_VALUE_CREATED);
    const [comparison, setComparison] = useState(COMPARISON_LOWER_THAN);
    const [durationInput, setDurationInput] = useState('0');
    const [durationUnit, setDurationUnit] = useState(1);
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(FURNI_SOURCES, 'furni'), []);
    const variableDefinitions = useMemo(
        () => getTargetDefinitions(targetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]
    );
    const variableEntries = useMemo(() => buildCustomVariableEntries(targetType, variableDefinitions), [targetType, variableDefinitions]);
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(targetType, variableToken);
        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [targetType, variableEntries, variableToken]);
    const sourceOptions = useMemo(() => {
        switch (targetType) {
            case 'furni':
                return orderedFurniSources;
            case 'global':
                return GLOBAL_SOURCE_OPTIONS;
            case 'context':
                return CONTEXT_SOURCE_OPTIONS;
            default:
                return orderedUserSources;
        }
    }, [orderedFurniSources, orderedUserSources, targetType]);

    const sourceValue = targetType === 'furni' ? furniSource : targetType === 'user' ? userSource : SOURCE_TRIGGER;
    const requiresFurni =
        targetType === 'furni' && furniSource === SOURCE_SELECTED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    useEffect(() => {
        if (!trigger) return;

        const intData = trigger.intData || [];
        const nextTargetType = normalizeTargetType(intData.length > 0 ? fromOfficialVariableTarget(intData[0]) : TARGET_USER);
        const [variableText = '', durationText = ''] = (trigger.stringData || '').split('\t');

        setTargetType(nextTargetType);
        setVariableToken(normalizeVariableTokenFromWire(variableText));
        setComparison(intData.length > 1 && intData[1] === COMPARISON_HIGHER_THAN ? COMPARISON_HIGHER_THAN : COMPARISON_LOWER_THAN);
        setCompareValue(intData.length > 2 && intData[2] === COMPARE_VALUE_UPDATED ? COMPARE_VALUE_UPDATED : COMPARE_VALUE_CREATED);
        setDurationInput(String(intData.length > 4 ? intData[4] : 0));
        setDurationUnit(intData.length > 5 ? intData[5] : 1);
        setFromVariable(intData[6] === 1);
        setDurationTarget(normalizeWiredValueTarget(intData.length > 7 ? intData[7] : -10));
        setDurationToken(variableTokenFromId(durationText));
        setUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? SOURCE_SELECTED : SOURCE_TRIGGER));
        setQuantifier(intData.length > 8 && intData[8] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'user') return;
        if (orderedUserSources.some((option) => option.value === userSource)) return;

        setUserSource(SOURCE_TRIGGER);
    }, [orderedUserSources, targetType, userSource]);

    useEffect(() => {
        if (targetType !== 'global') return;
        if (compareValue === COMPARE_VALUE_UPDATED) return;

        setCompareValue(COMPARE_VALUE_UPDATED);
    }, [targetType, compareValue]);

    const save = () => {
        const parsedDuration = parseInt(durationInput.trim(), 10);

        const durationVariableId = fromVariable ? getCustomVariableItemId(durationToken) : 0;

        setStringParam(`${variableToken}\t${durationVariableId}`);
        setIntParams([
            toOfficialVariableTarget(getTargetValue(targetType)),
            comparison,
            compareValue,
            0,
            Number.isFinite(parsedDuration) ? Math.max(0, parsedDuration) : 0,
            durationUnit,
            fromVariable && durationVariableId > 0 ? 1 : 0,
            durationTarget,
            quantifier
        ]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });

        if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) setFurniIds([]);
    };

    const validate = () => {
        if (!variableToken.length) return false;
        if (targetType === 'global' && compareValue !== COMPARE_VALUE_UPDATED) return false;

        return true;
    };

    const handleTargetChange = (nextTargetType: VariableTargetType) => {
        if (nextTargetType === targetType) return;

        setTargetType(nextTargetType);
        setVariableToken('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            cardStyle={{ width: 244 }}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                        {[QUANTIFIER_ALL, QUANTIFIER_ANY].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={quantifier === value} name="wiredConditionVariableAgeQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.variables.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredFurniSelectionSourceRow
                        title={getSourceTitle()}
                        titleIsLiteral={true}
                        options={sourceOptions}
                        value={sourceValue}
                        selectionKind="primary"
                        selectionActive={requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                        selectionCount={furniIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SELECTED]}
                        showSelectionToggle={false}
                        onChange={(value) => {
                            if (targetType === 'furni') {
                                setFurniSource(value);
                                return;
                            }

                            if (targetType === 'user') {
                                setUserSource(value);
                            }
                        }}
                    />
                </div>
            }
        >
            <div className="octane-wired__give-var">
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                disabled={button.disabled}
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${targetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleTargetChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedVariableEntries}
                    recentScope="variable-conditions"
                    selectedToken={variableToken}
                    onSelect={(entry) => setVariableToken(entry.token)}
                />

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.compare_value')}</div>
                    {COMPARE_VALUE_OPTIONS.map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <Radio checked={compareValue === value} disabled={targetType === 'global' && value === COMPARE_VALUE_CREATED} name="wiredConditionVariableAgeCompareValue" onCheckedChange={() => setCompareValue(value)} />
                            <Text>{LocalizeText(`wiredfurni.params.variables.compare_value.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.choose_type')}</div>
                    {COMPARISON_OPTIONS.map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <Radio checked={comparison === value} name="wiredConditionVariableAgeComparison" onCheckedChange={() => setComparison(value)} />
                            <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                        </label>
                    ))}
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.time_selection')}</div>
                    <WiredValueOrVariableSection
                        name="variableAgeDuration"
                        hideSources={true}
                        min={0}
                        isVariable={fromVariable}
                        value={durationInput}
                        target={durationTarget}
                        token={durationToken}
                        furniSource={furniSource}
                        userSource={userSource}
                        onIsVariableChange={setFromVariable}
                        onValueChange={setDurationInput}
                        onTargetChange={setDurationTarget}
                        onTokenChange={setDurationToken}
                        onFurniSourceChange={() => null}
                        onUserSourceChange={() => null}
                    />
                    <div className="flex items-center gap-2">
                        <Text>{localizeWithFallback('wiredfurni.params.variables.duration.unit', LocalizeText('wiredfurni.params.variables.duration'))}</Text>
                        <Select
                            className="min-w-0 flex-1 rounded border border-[#b8b2a4] bg-white px-2 py-[3px] text-[12px]"
                            value={durationUnit}
                            onChange={(event) => setDurationUnit(Number(event.target.value))}
                        >
                            {DURATION_UNITS.map((unit) => (
                                <option key={unit} value={unit}>
                                    {LocalizeText(`wiredfurni.params.variables.duration.${unit}`)}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
