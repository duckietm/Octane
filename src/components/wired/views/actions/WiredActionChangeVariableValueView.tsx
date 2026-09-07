import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Slider, Text } from '../../../../common';
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
import { WiredActionBaseView } from './WiredActionBaseView';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type ReferenceMode = 'constant' | 'variable';
type SelectionMode = 'destination' | 'reference';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
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

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const OPERATION_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 40, 41, 50, 60, 100, 101, 102, 103, 104, 105];

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

export const WiredActionChangeVariableValueView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        actionDelay = 0,
        setActionDelay = null,
        setAllowsFurni = null,
        setFurniIds = null,
        setIntParams = null,
        setStringParam = null
    } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [destinationTargetType, setDestinationTargetType] = useState<VariableTargetType>('user');
    const [destinationVariableToken, setDestinationVariableToken] = useState('');
    const [operation, setOperation] = useState(0);
    const [referenceMode, setReferenceMode] = useState<ReferenceMode>('constant');
    const [referenceConstantValueInput, setReferenceConstantValueInput] = useState('0');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [destinationUserSource, setDestinationUserSource] = useState(SOURCE_TRIGGER);
    const [destinationFurniSource, setDestinationFurniSource] = useState(SOURCE_TRIGGER);
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);
    const [destinationFurniIds, setDestinationFurniIds] = useState<number[]>([]);
    const [referenceFurniIds, setReferenceFurniIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('destination');
    const highlightedIds = useRef<number[]>([]);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(FURNI_SOURCES, 'furni'), []);
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);
    const destinationDefinitions = useMemo(
        () =>
            getTargetDefinitions(destinationTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, destinationTargetType, furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions]
    );
    const referenceDefinitions = useMemo(
        () => getTargetDefinitions(referenceTargetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, referenceTargetType, roomVariableDefinitions, userVariableDefinitions]
    );
    const destinationVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries(destinationTargetType, 'change-destination', destinationDefinitions),
        [destinationDefinitions, destinationTargetType]
    );
    const resolvedDestinationVariableEntries = useMemo(() => {
        if (!destinationVariableToken) return destinationVariableEntries;
        if (flattenWiredVariablePickerEntries(destinationVariableEntries).some((entry) => entry.token === destinationVariableToken))
            return destinationVariableEntries;

        const fallbackEntry = createFallbackVariableEntry(destinationTargetType, destinationVariableToken);

        return fallbackEntry ? [fallbackEntry, ...destinationVariableEntries] : destinationVariableEntries;
    }, [destinationTargetType, destinationVariableEntries, destinationVariableToken]);
    const referenceVariableEntries = useMemo(
        () => buildWiredVariablePickerEntries(referenceTargetType, 'change-reference', referenceDefinitions),
        [referenceDefinitions, referenceTargetType]
    );
    const resolvedReferenceVariableEntries = useMemo(() => {
        if (!referenceVariableToken) return referenceVariableEntries;
        if (flattenWiredVariablePickerEntries(referenceVariableEntries).some((entry) => entry.token === referenceVariableToken))
            return referenceVariableEntries;

        const fallbackEntry = createFallbackVariableEntry(referenceTargetType, referenceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...referenceVariableEntries] : referenceVariableEntries;
    }, [referenceTargetType, referenceVariableEntries, referenceVariableToken]);

    const destinationSelectionEnabled = isFurniTarget(destinationTargetType) && destinationFurniSource === SOURCE_SELECTED;
    const referenceSelectionEnabled = referenceMode === 'variable' && isFurniTarget(referenceTargetType) && referenceFurniSource === SOURCE_SECONDARY_SELECTED;
    const destinationSelectedSourceValue = isFurniTarget(destinationTargetType)
        ? destinationFurniSource
        : isGlobalTarget(destinationTargetType)
          ? SOURCE_TRIGGER
          : destinationUserSource;
    const referenceSelectedSourceValue = isFurniTarget(referenceTargetType)
        ? referenceFurniSource
        : isGlobalTarget(referenceTargetType)
          ? SOURCE_TRIGGER
          : referenceUserSource;

    const destinationSourceOptions = useMemo(() => {
        if (isContextTarget(destinationTargetType)) return CONTEXT_SOURCE_OPTIONS;
        if (isFurniTarget(destinationTargetType)) return resolveSourceOptions(orderedFurniSources, destinationSelectedSourceValue, orderedFurniSources);
        if (isGlobalTarget(destinationTargetType)) return GLOBAL_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, destinationSelectedSourceValue, userSourceFallbackOptions);
    }, [destinationSelectedSourceValue, destinationTargetType, orderedFurniSources, orderedUserSources, userSourceFallbackOptions]);

    const referenceSourceOptions = useMemo(() => {
        if (isContextTarget(referenceTargetType)) return CONTEXT_SOURCE_OPTIONS;
        if (isFurniTarget(referenceTargetType)) return resolveSourceOptions(SECONDARY_FURNI_SOURCES, referenceSelectedSourceValue, SECONDARY_FURNI_SOURCES);
        if (isGlobalTarget(referenceTargetType)) return GLOBAL_SOURCE_OPTIONS;

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
        const nextDestinationTargetType = normalizeTargetType(trigger.intData.length > 0 ? trigger.intData[0] : TARGET_USER);
        const nextReferenceTargetType = normalizeTargetType(trigger.intData.length > 4 ? trigger.intData[4] : TARGET_USER);
        const nextDestinationFurniIds = [...(trigger.selectedItems ?? [])];
        const nextReferenceFurniIds = parseIds(stringParts.length > 2 ? stringParts[2] : '');

        setDestinationTargetType(nextDestinationTargetType);
        setDestinationVariableToken(normalizeVariableTokenFromWire(stringParts.length > 0 ? stringParts[0] : ''));
        setOperation(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setReferenceMode((trigger.intData.length > 2 ? trigger.intData[2] : REFERENCE_CONSTANT) === REFERENCE_VARIABLE ? 'variable' : 'constant');
        setReferenceConstantValueInput((trigger.intData.length > 3 ? trigger.intData[3] : 0).toString());
        setReferenceTargetType(nextReferenceTargetType);
        setReferenceVariableToken(normalizeVariableTokenFromWire(stringParts.length > 1 ? stringParts[1] : ''));
        setDestinationUserSource(trigger.intData.length > 5 ? trigger.intData[5] : SOURCE_TRIGGER);
        setDestinationFurniSource(trigger.intData.length > 6 ? trigger.intData[6] : nextDestinationFurniIds.length ? SOURCE_SELECTED : SOURCE_TRIGGER);
        setReferenceUserSource(trigger.intData.length > 7 ? trigger.intData[7] : SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.intData.length > 8 ? trigger.intData[8] : nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER);
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
        setStringParam(serializeStringData(destinationVariableToken, referenceMode === 'variable' ? referenceVariableToken : '', nextReferenceFurniIds));
        setIntParams([
            getTargetValue(destinationTargetType),
            operation,
            referenceMode === 'variable' ? REFERENCE_VARIABLE : REFERENCE_CONSTANT,
            Number.isFinite(parsedReferenceConstantValue) ? parsedReferenceConstantValue : 0,
            getTargetValue(referenceTargetType),
            destinationUserSource,
            destinationFurniSource,
            referenceUserSource,
            referenceFurniSource
        ]);
        setFurniIds(isFurniTarget(destinationTargetType) && destinationFurniSource === SOURCE_SELECTED ? [...nextDestinationFurniIds] : []);
    };

    const validate = () => {
        if (!destinationVariableToken) return false;
        if (referenceMode === 'variable' && !referenceVariableToken) return false;

        return true;
    };

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    const handleDestinationTargetChange = (targetType: VariableTargetType) => {
        if (targetType === destinationTargetType) return;

        setDestinationTargetType(targetType);
        setDestinationVariableToken('');
    };

    const handleReferenceTargetChange = (targetType: VariableTargetType) => {
        if (targetType === referenceTargetType) return;

        setReferenceTargetType(targetType);
        setReferenceVariableToken('');
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            cardStyle={{ width: 244 }}
            hideDelay={true}
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
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${destinationTargetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleDestinationTargetChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedDestinationVariableEntries}
                    recentScope="variable-effects"
                    selectedToken={destinationVariableToken}
                    onSelect={(entry) => setDestinationVariableToken(entry.token)}
                />

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.operation')}</div>
                    <select
                        className="form-select form-select-sm octane-wired__give-var-select"
                        value={operation}
                        onChange={(event) => setOperation(parseInt(event.target.value, 10))}
                    >
                        {OPERATION_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                                {LocalizeText(`wiredfurni.params.variables.operation.${value}`)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.reference_value')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={referenceMode === 'constant'} type="radio" onChange={() => setReferenceMode('constant')} />
                        <Text>{LocalizeText('wiredfurni.params.operator.2')}</Text>
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
                                recentScope="variable-effects"
                                selectedToken={referenceVariableToken}
                                onSelect={(entry) => setReferenceVariableToken(entry.token)}
                            />
                        )}
                    </div>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">
                        {LocalizeText('wiredfurni.params.delay', ['seconds'], [GetWiredTimeLocale(actionDelay)])}
                    </div>
                    <Slider max={20} min={0} value={actionDelay} onChange={(event) => setActionDelay(event)} />
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.merged.title.variables_destination"
                        options={destinationSourceOptions}
                        value={destinationSelectedSourceValue}
                        selectionKind="primary"
                        selectionActive={selectionMode === 'destination'}
                        selectionCount={destinationFurniIds.length}
                        selectionLimit={selectionLimit}
                        selectionEnabledValues={[SOURCE_SELECTED]}
                        showSelectionToggle={isFurniTarget(destinationTargetType)}
                        onChange={(value) => {
                            if (isFurniTarget(destinationTargetType)) {
                                setDestinationFurniSource(value);
                                return;
                            }

                            if (!isGlobalTarget(destinationTargetType) && !isContextTarget(destinationTargetType)) setDestinationUserSource(value);
                        }}
                        onSelectionActivate={() => switchSelection('destination')}
                    />
                </div>

                {referenceMode === 'variable' && (
                    <>
                        <div className="octane-wired__divider" />
                        <div className="octane-wired__give-var-section">
                            <WiredFurniSelectionSourceRow
                                title="wiredfurni.params.sources.merged.title.variables_reference"
                                options={referenceSourceOptions}
                                value={referenceSelectedSourceValue}
                                selectionKind="secondary"
                                selectionActive={selectionMode === 'reference'}
                                selectionCount={referenceFurniIds.length}
                                selectionLimit={selectionLimit}
                                selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                                showSelectionToggle={isFurniTarget(referenceTargetType)}
                                onChange={(value) => {
                                    if (isFurniTarget(referenceTargetType)) {
                                        setReferenceFurniSource(value);
                                        return;
                                    }

                                    if (!isGlobalTarget(referenceTargetType) && !isContextTarget(referenceTargetType)) setReferenceUserSource(value);
                                }}
                                onSelectionActivate={() => switchSelection('reference')}
                            />
                        </div>
                    </>
                )}
            </div>
        </WiredActionBaseView>
    );
};
