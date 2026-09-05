import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { CLICKED_USER_SOURCE, FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type ReferenceMode = 'constant' | 'variable';
type SelectionMode = 'destination' | 'reference';

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
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const SOURCE_SECONDARY_SELECTED = 101;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const COMPARISON_OPTIONS = [
    { value: 0, label: '>' },
    { value: 1, label: '≥' },
    { value: 2, label: '=' },
    { value: 3, label: '≤' },
    { value: 4, label: '<' },
    { value: 5, label: '≠' }
];

const SECONDARY_FURNI_SOURCES: WiredSourceOption[] = sortWiredSourceOptions(
    [
        { value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.furni.0' },
        { value: SOURCE_SECONDARY_SELECTED, label: 'wiredfurni.params.sources.furni.101' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const GLOBAL_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.global' }];
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'Current execution' }];

const parseIds = (value: string): number[] => {
    if (!value?.length) return [];

    const ids = new Set<number>();

    for (const part of value.split(/[;,\t]/)) {
        const parsedValue = parseInt(part.trim(), 10);

        if (!Number.isNaN(parsedValue) && parsedValue > 0) ids.add(parsedValue);
    }

    return [...ids];
};

const serializeIds = (ids: number[]) => (ids?.length ? ids.filter((id) => id > 0).join(';') : '');
const parseStringData = (value: string) => (value?.length ? value.split('\t', -1) : []);
const serializeStringData = (destinationVariableToken: string, referenceVariableToken: string, referenceFurniIds: number[]) =>
    `${destinationVariableToken || ''}\t${referenceVariableToken || ''}\t${serializeIds(referenceFurniIds)}`;

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

const resolveSourceOptions = (baseOptions: WiredSourceOption[], selectedValue: number, fallbackOptions: WiredSourceOption[]) => {
    if (!baseOptions.length) return baseOptions;
    if (baseOptions.some((option) => option.value === selectedValue)) return baseOptions;

    const fallbackOption = fallbackOptions.find((option) => option.value === selectedValue);

    if (!fallbackOption) return baseOptions;

    return [...baseOptions, fallbackOption];
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

const isGlobalTarget = (targetType: VariableTargetType) => targetType === 'global';
const isFurniTarget = (targetType: VariableTargetType) => targetType === 'furni';
const isContextTarget = (targetType: VariableTargetType) => targetType === 'context';

export const WiredConditionVariableValueMatchView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setAllowsFurni = null, setFurniIds = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [comparison, setComparison] = useState(2);
    const [referenceMode, setReferenceMode] = useState<ReferenceMode>('constant');
    const [referenceConstantValueInput, setReferenceConstantValueInput] = useState('0');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);
    const [destinationFurniIds, setDestinationFurniIds] = useState<number[]>([]);
    const [referenceFurniIds, setReferenceFurniIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('destination');
    const highlightedIds = useRef<number[]>([]);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(FURNI_SOURCES, 'furni'), []);
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);
    const targetDefinitions = useMemo(
        () => getTargetDefinitions(targetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]
    );
    const referenceDefinitions = useMemo(
        () => getTargetDefinitions(referenceTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, referenceTargetType, roomVariableDefinitions, userVariableDefinitions]
    );
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(targetType, 'change-reference', targetDefinitions), [targetDefinitions, targetType]);
    const referenceVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries(referenceTargetType, 'change-reference', referenceDefinitions),
        [referenceDefinitions, referenceTargetType]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(targetType, variableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [targetType, variableEntries, variableToken]);
    const resolvedReferenceVariableEntries = useMemo(() => {
        if (!referenceVariableToken) return referenceVariableEntries;
        if (flattenWiredVariablePickerEntries(referenceVariableEntries).some((entry) => entry.token === referenceVariableToken))
            return referenceVariableEntries;

        const fallbackEntry = createFallbackVariableEntry(referenceTargetType, referenceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...referenceVariableEntries] : referenceVariableEntries;
    }, [referenceTargetType, referenceVariableEntries, referenceVariableToken]);

    const destinationSelectionEnabled = isFurniTarget(targetType) && furniSource === SOURCE_SELECTED;
    const referenceSelectionEnabled = referenceMode === 'variable' && isFurniTarget(referenceTargetType) && referenceFurniSource === SOURCE_SECONDARY_SELECTED;
    const destinationSelectedSourceValue = isFurniTarget(targetType)
        ? furniSource
        : isGlobalTarget(targetType) || isContextTarget(targetType)
          ? SOURCE_TRIGGER
          : userSource;
    const referenceSelectedSourceValue = isFurniTarget(referenceTargetType)
        ? referenceFurniSource
        : isGlobalTarget(referenceTargetType) || isContextTarget(referenceTargetType)
          ? SOURCE_TRIGGER
          : referenceUserSource;

    const destinationSourceOptions = useMemo(() => {
        if (isFurniTarget(targetType)) return resolveSourceOptions(orderedFurniSources, destinationSelectedSourceValue, orderedFurniSources);
        if (isGlobalTarget(targetType)) return GLOBAL_SOURCE_OPTIONS;
        if (isContextTarget(targetType)) return CONTEXT_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, destinationSelectedSourceValue, userSourceFallbackOptions);
    }, [destinationSelectedSourceValue, orderedFurniSources, orderedUserSources, targetType, userSourceFallbackOptions]);

    const referenceSourceOptions = useMemo(() => {
        if (isFurniTarget(referenceTargetType)) return resolveSourceOptions(SECONDARY_FURNI_SOURCES, referenceSelectedSourceValue, SECONDARY_FURNI_SOURCES);
        if (isGlobalTarget(referenceTargetType)) return GLOBAL_SOURCE_OPTIONS;
        if (isContextTarget(referenceTargetType)) return CONTEXT_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, referenceSelectedSourceValue, userSourceFallbackOptions);
    }, [orderedUserSources, referenceSelectedSourceValue, referenceTargetType, userSourceFallbackOptions]);

    const syncHighlights = useCallback((nextDestinationIds: number[], nextReferenceIds: number[]) => {
        if (highlightedIds.current.length) {
            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        }

        const secondarySet = new Set(nextReferenceIds);
        const primaryOnlyIds = nextDestinationIds.filter((id) => !secondarySet.has(id));

        if (primaryOnlyIds.length) WiredSelectionVisualizer.applySelectionShaderToFurni(primaryOnlyIds);
        if (nextReferenceIds.length) WiredSelectionVisualizer.applySecondarySelectionShaderToFurni(nextReferenceIds);

        highlightedIds.current = Array.from(new Set([...nextDestinationIds, ...nextReferenceIds]));
    }, []);

    const switchSelection = useCallback(
        (mode: SelectionMode) => {
            if (mode === 'destination' && !destinationSelectionEnabled) return;
            if (mode === 'reference' && !referenceSelectionEnabled) return;

            const nextDestinationIds = selectionMode === 'destination' ? [...furniIds] : [...destinationFurniIds];
            const nextReferenceIds = selectionMode === 'reference' ? [...furniIds] : [...referenceFurniIds];

            setDestinationFurniIds(nextDestinationIds);
            setReferenceFurniIds(nextReferenceIds);
            setSelectionMode(mode);
            setFurniIds([...(mode === 'destination' ? nextDestinationIds : nextReferenceIds)]);
        },
        [destinationFurniIds, destinationSelectionEnabled, furniIds, referenceFurniIds, referenceSelectionEnabled, selectionMode, setFurniIds]
    );

    useEffect(() => {
        if (!trigger) return;

        const stringParts = parseStringData(trigger.stringData);
        const nextTargetType = normalizeTargetType(trigger.intData.length > 0 ? trigger.intData[0] : TARGET_USER);
        const nextReferenceTargetType = normalizeTargetType(trigger.intData.length > 4 ? trigger.intData[4] : TARGET_USER);
        const nextDestinationFurniIds = [...(trigger.selectedItems ?? [])];
        const nextReferenceFurniIds = parseIds(stringParts.length > 2 ? stringParts[2] : '');

        setTargetType(nextTargetType);
        setVariableToken(normalizeVariableTokenFromWire(stringParts.length > 0 ? stringParts[0] : ''));
        setComparison(trigger.intData.length > 1 ? trigger.intData[1] : 2);
        setReferenceMode((trigger.intData.length > 2 ? trigger.intData[2] : REFERENCE_CONSTANT) === REFERENCE_VARIABLE ? 'variable' : 'constant');
        setReferenceConstantValueInput((trigger.intData.length > 3 ? trigger.intData[3] : 0).toString());
        setReferenceTargetType(nextReferenceTargetType);
        setReferenceVariableToken(normalizeVariableTokenFromWire(stringParts.length > 1 ? stringParts[1] : ''));
        setUserSource(trigger.intData.length > 5 ? trigger.intData[5] : SOURCE_TRIGGER);
        setFurniSource(trigger.intData.length > 6 ? trigger.intData[6] : nextDestinationFurniIds.length ? SOURCE_SELECTED : SOURCE_TRIGGER);
        setReferenceUserSource(trigger.intData.length > 7 ? trigger.intData[7] : SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.intData.length > 8 ? trigger.intData[8] : nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER);
        setQuantifier(trigger.intData.length > 9 ? (trigger.intData[9] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL) : QUANTIFIER_ALL);
        setDestinationFurniIds(nextDestinationFurniIds);
        setReferenceFurniIds(nextReferenceFurniIds);
        setSelectionMode('destination');
        setFurniIds([...nextDestinationFurniIds]);
    }, [setFurniIds, trigger]);

    useEffect(() => {
        if (selectionMode === 'destination') setDestinationFurniIds([...furniIds]);
        else setReferenceFurniIds([...furniIds]);
    }, [furniIds, selectionMode]);

    useEffect(() => syncHighlights(destinationFurniIds, referenceFurniIds), [destinationFurniIds, referenceFurniIds, syncHighlights]);

    useEffect(() => {
        if (selectionMode === 'destination' && !destinationSelectionEnabled && referenceSelectionEnabled) {
            switchSelection('reference');
            return;
        }

        if (selectionMode === 'reference' && !referenceSelectionEnabled && destinationSelectionEnabled) {
            switchSelection('destination');
            return;
        }

        const canEditSelection = selectionMode === 'destination' ? destinationSelectionEnabled : referenceSelectionEnabled;

        setAllowsFurni(canEditSelection ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE);
    }, [destinationSelectionEnabled, referenceSelectionEnabled, selectionMode, setAllowsFurni, switchSelection]);

    useEffect(() => {
        return () => {
            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    const save = () => {
        const nextDestinationFurniIds = selectionMode === 'destination' ? [...furniIds] : [...destinationFurniIds];
        const nextReferenceFurniIds = selectionMode === 'reference' ? [...furniIds] : [...referenceFurniIds];
        const parsedReferenceConstantValue = parseInt(referenceConstantValueInput.trim(), 10);

        setDestinationFurniIds(nextDestinationFurniIds);
        setReferenceFurniIds(nextReferenceFurniIds);
        setStringParam(serializeStringData(variableToken, referenceMode === 'variable' ? referenceVariableToken : '', nextReferenceFurniIds));
        setIntParams([
            getTargetValue(targetType),
            comparison,
            referenceMode === 'variable' ? REFERENCE_VARIABLE : REFERENCE_CONSTANT,
            Number.isFinite(parsedReferenceConstantValue) ? parsedReferenceConstantValue : 0,
            getTargetValue(referenceTargetType),
            userSource,
            furniSource,
            referenceUserSource,
            referenceFurniSource,
            quantifier
        ]);
        setFurniIds(isFurniTarget(targetType) && furniSource === SOURCE_SELECTED ? [...nextDestinationFurniIds] : []);
    };

    const validate = () => {
        if (!variableToken) return false;
        if (referenceMode === 'variable' && !referenceVariableToken) return false;

        return true;
    };

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    const handleTargetChange = (nextTargetType: VariableTargetType) => {
        if (nextTargetType === targetType) return;

        setTargetType(nextTargetType);
        setVariableToken('');
    };

    const handleReferenceTargetChange = (nextTargetType: VariableTargetType) => {
        if (nextTargetType === referenceTargetType) return;

        setReferenceTargetType(nextTargetType);
        setReferenceVariableToken('');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
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
                                <input
                                    checked={quantifier === value}
                                    className="form-check-input"
                                    name="wiredConditionVariableValueQuantifier"
                                    type="radio"
                                    onChange={() => setQuantifier(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.variables.${value}`)}</Text>
                            </label>
                        ))}
                    </div>

                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.merged.title.variables_destination"
                        options={destinationSourceOptions}
                        value={destinationSelectedSourceValue}
                        selectionKind="primary"
                        selectionActive={destinationSelectionEnabled}
                        selectionCount={destinationFurniIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SELECTED]}
                        showSelectionToggle={false}
                        onChange={(value) => {
                            if (isFurniTarget(targetType)) {
                                setFurniSource(value);
                                return;
                            }

                            if (targetType === 'user') {
                                setUserSource(value);
                            }
                        }}
                    />

                    {referenceMode === 'variable' && (
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.merged.title.variables_reference"
                            options={referenceSourceOptions}
                            value={referenceSelectedSourceValue}
                            selectionKind="secondary"
                            selectionActive={referenceSelectionEnabled}
                            selectionCount={referenceFurniIds.length}
                            selectionLimit={selectionLimit}
                            selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                            showSelectionToggle={false}
                            onChange={(value) => {
                                if (isFurniTarget(referenceTargetType)) {
                                    setReferenceFurniSource(value);
                                    return;
                                }

                                if (referenceTargetType === 'user') {
                                    setReferenceUserSource(value);
                                }
                            }}
                        />
                    )}
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
                    <div className="octane-wired__give-var-section-title">
                        {localizeWithFallback('wiredfurni.params.comparison_selection', LocalizeText('wiredfurni.params.choose_type'))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {COMPARISON_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center gap-1">
                                <input
                                    checked={comparison === option.value}
                                    className="form-check-input"
                                    name="wiredConditionVariableComparison"
                                    type="radio"
                                    onChange={() => setComparison(option.value)}
                                />
                                <Text>{option.label}</Text>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.reference_value')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={referenceMode === 'constant'} type="radio" onChange={() => setReferenceMode('constant')} />
                        <Text>{localizeWithFallback('wiredfurni.params.variables.reference_value.set_value', LocalizeText('wiredfurni.params.operator.2'))}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            type="number"
                            value={referenceConstantValueInput}
                            onChange={(event) => setReferenceConstantValueInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <input checked={referenceMode === 'variable'} type="radio" onChange={() => setReferenceMode('variable')} />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGET_BUTTONS.map((button) => (
                                    <button
                                        key={`reference-${button.key}`}
                                        type="button"
                                        disabled={button.disabled || referenceMode !== 'variable'}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${referenceTargetType === button.key ? 'is-active' : ''}`}
                                        onClick={() => handleReferenceTargetChange(button.key)}
                                    >
                                        <img src={button.icon} alt={button.key} />
                                    </button>
                                ))}
                            </div>
                        </label>

                        {referenceMode === 'variable' && (
                            <WiredVariablePicker
                                entries={resolvedReferenceVariableEntries}
                                recentScope="variable-conditions"
                                selectedToken={referenceVariableToken}
                                onSelect={(entry) => setReferenceVariableToken(entry.token)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
