import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    fromOfficialVariableTarget,
    LocalizeText,
    localizeWithFallback,
    toOfficialVariableTarget,
    WiredFurniType,
    WiredSelectionVisualizer
} from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { CLICKED_USER_SOURCE, FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { isWiredSameHolderEligible, WiredValueOrVariableInput } from '../WiredValueOrVariableInput';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { fromWiredVariableId, toWiredVariableId, wiredVariableIdList } from '../WiredVariableIds';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WiredActionDelaySection } from './WiredActionDelaySection';
import { localizeWiredVariableOperation, WIRED_VARIABLE_ADVANCED_OPERATIONS, WIRED_VARIABLE_BASIC_OPERATIONS, WIRED_VARIABLE_UNARY_OPERATIONS } from './WiredVariableOperations';
import { BaseButton } from '../../../../common/BaseButton';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

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

const REFERENCE_TARGETS: VariableTargetType[] = ['furni', 'user', 'global', 'context'];

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
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
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: 'wiredfurni.params.sources.context' }];

const parseIds = (value: string): number[] => {
    if (!value?.length) return [];

    const ids = new Set<number>();

    for (const part of value.split(/[;,\t]/)) {
        const parsedValue = parseInt(part.trim(), 10);

        if (!Number.isNaN(parsedValue) && parsedValue > 0) ids.add(parsedValue);
    }

    return [...ids];
};

const parseStringData = (value: string) => (value?.length ? value.split('\t', -1) : []);

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
        setFurniIds2 = null,
        setIntParams = null,
        setSourceTypes = null,
        setStringParam = null,
        setVariableIds = null
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
    const [referenceSameHolder, setReferenceSameHolder] = useState(false);
    const [destinationFurniIds, setDestinationFurniIds] = useState<number[]>([]);
    const [referenceFurniIds, setReferenceFurniIds] = useState<number[]>([]);
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('destination');
    const [referenceValid, setReferenceValid] = useState(true);
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
    // The server reads only the destination for these, so the reference controls would be a lie.
    const isUnaryOperation = WIRED_VARIABLE_UNARY_OPERATIONS.includes(operation);
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

    // AIR tints by pick list: the destination picks (stuffIds) the first tint, the reference picks (the second
    // picks, source 101) the blue one.
    const syncHighlights = useCallback((nextDestinationIds: number[], nextReferenceIds: number[]) => {
        highlightedIds.current = WiredSelectionVisualizer.showPickLists(highlightedIds.current, nextDestinationIds, nextReferenceIds);
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

        const intData = trigger.intData ?? [];
        const nextDestinationFurniIds = [...(trigger.selectedItems ?? [])];

        if (intData.length >= 10 && !trigger.variableIds?.length) {
            // Our earlier layout: [target, operation, referenceMode, constant, referenceTarget, destination user / furni
            // source, reference user / furni source, sameHolder] with our targets, the variables and the reference picks
            // in the string.
            const stringParts = parseStringData(trigger.stringData);
            const nextReferenceFurniIds = parseIds(stringParts.length > 2 ? stringParts[2] : '');

            setDestinationTargetType(normalizeTargetType(intData[0]));
            setDestinationVariableToken(normalizeVariableTokenFromWire(stringParts.length > 0 ? stringParts[0] : ''));
            setOperation(intData[1]);
            setReferenceMode(intData[2] === REFERENCE_VARIABLE ? 'variable' : 'constant');
            setReferenceConstantValueInput(intData[3].toString());
            setReferenceTargetType(normalizeTargetType(intData[4]));
            setReferenceVariableToken(normalizeVariableTokenFromWire(stringParts.length > 1 ? stringParts[1] : ''));
            setDestinationUserSource(intData[5]);
            setDestinationFurniSource(intData[6]);
            setReferenceUserSource(intData[7]);
            setReferenceFurniSource(intData[8]);
            setReferenceSameHolder(intData[9] === 1);
            setReferenceFurniIds(nextReferenceFurniIds);
        } else {
            // AIR ChangeVariable: [target, operation, operandIsVariable, operandHigh, operandLow, referenceTarget, sameHolder]
            // with official targets, variable ids [destination, reference], sources slot 0 the destination and slot 1 the
            // reference, the reference picks as the second picks.
            const nextReferenceFurniIds = [...(trigger.selectedItems2 ?? [])];

            setDestinationTargetType(normalizeTargetType(fromOfficialVariableTarget(intData.length > 0 ? intData[0] : 1)));
            setDestinationVariableToken(fromWiredVariableId(trigger.variableIds?.[0] ?? ''));
            setOperation(intData.length > 1 ? intData[1] : 0);
            setReferenceMode((intData.length > 2 ? intData[2] : REFERENCE_CONSTANT) === REFERENCE_VARIABLE ? 'variable' : 'constant');
            setReferenceConstantValueInput((intData.length > 4 ? intData[4] : 0).toString());
            setReferenceTargetType(normalizeTargetType(fromOfficialVariableTarget(intData.length > 5 ? intData[5] : 1)));
            setReferenceVariableToken(fromWiredVariableId(trigger.variableIds?.[1] ?? ''));
            setReferenceSameHolder(intData.length > 6 && intData[6] === 1);
            setDestinationUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
            setDestinationFurniSource(trigger.furniSourceTypes?.[0] ?? (nextDestinationFurniIds.length ? SOURCE_SELECTED : SOURCE_TRIGGER));
            setReferenceUserSource(trigger.userSourceTypes?.[1] ?? SOURCE_TRIGGER);
            setReferenceFurniSource(trigger.furniSourceTypes?.[1] ?? (nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER));
            setReferenceFurniIds(nextReferenceFurniIds);
        }

        setDestinationFurniIds(nextDestinationFurniIds);
        setSelectionMode('destination');
        setFurniIds([...nextDestinationFurniIds]);
    }, [setFurniIds, trigger]);

    useEffect(() => {
        if (selectionMode === 'destination') setDestinationFurniIds([...furniIds]);
        else setReferenceFurniIds([...furniIds]);
    }, [furniIds, selectionMode]);

    useEffect(() => syncHighlights(destinationFurniIds, referenceFurniIds), [destinationFurniIds, referenceFurniIds, syncHighlights]);

    useEffect(() => WiredSelectionVisualizer.setEditingPickList(selectionMode === 'reference' ? 2 : 1), [selectionMode]);

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
            WiredSelectionVisualizer.setEditingPickList(1);

            if (!highlightedIds.current.length) return;

            WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
            WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
            highlightedIds.current = [];
        };
    }, []);

    // AIR ValueOrVariableSection.updateReferenceVariableOnTargetState (L453-481): "use the same furni or user as the
    // target variable" only counts for a variable reference on the destination's own furni or user holder, and then
    // the reference source is locked (ChangeVariable.isInputSourceDisabled). ChangeVariable.readIntParamsFromForm: an
    // operation without operand saves the typed-number option.
    const referenceIsVariable = !isUnaryOperation && referenceMode === 'variable';
    const sameHolderActive = referenceIsVariable && referenceSameHolder && isWiredSameHolderEligible(destinationTargetType, referenceTargetType);

    const save = () => {
        const nextDestinationFurniIds = selectionMode === 'destination' ? [...furniIds] : [...destinationFurniIds];
        const nextReferenceFurniIds = selectionMode === 'reference' ? [...furniIds] : [...referenceFurniIds];
        const parsedReferenceConstantValue = parseInt(referenceConstantValueInput.trim(), 10);

        setDestinationFurniIds(nextDestinationFurniIds);
        setReferenceFurniIds(nextReferenceFurniIds);
        const operand = Number.isFinite(parsedReferenceConstantValue) ? parsedReferenceConstantValue : 0;

        // AIR ChangeVariable.readIntParamsFromForm / readVariableIdsFromForm; the string is left empty.
        setStringParam('');
        setIntParams([
            toOfficialVariableTarget(getTargetValue(destinationTargetType)),
            operation,
            referenceIsVariable ? REFERENCE_VARIABLE : REFERENCE_CONSTANT,
            operand < 0 ? -1 : 0,
            operand,
            toOfficialVariableTarget(getTargetValue(referenceTargetType)),
            sameHolderActive ? 1 : 0
        ]);
        setVariableIds(
            wiredVariableIdList(
                toWiredVariableId(destinationTargetType, destinationVariableToken),
                referenceIsVariable ? toWiredVariableId(referenceTargetType, referenceVariableToken) : ''
            )
        );
        setSourceTypes({ furni: [destinationFurniSource, referenceFurniSource], users: [destinationUserSource, referenceUserSource] });
        setFurniIds(isFurniTarget(destinationTargetType) && destinationFurniSource === SOURCE_SELECTED ? [...nextDestinationFurniIds] : []);
        setFurniIds2(referenceSelectionEnabled ? [...nextReferenceFurniIds] : []);
    };

    const validate = () => {
        if (!destinationVariableToken) return false;
        if (referenceIsVariable && !referenceVariableToken) return false;
        if (!isUnaryOperation && !referenceValid) return false;

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
        <NativeTextTree>
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
                                <BaseButton
                                    key={button.key}
                                    type="button"
                                    disabled={button.disabled}
                                    className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${destinationTargetType === button.key ? 'is-active' : ''}`}
                                    onClick={() => handleDestinationTargetChange(button.key)}
                                >
                                    <img src={button.icon} alt={button.key} />
                                </BaseButton>
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
                        <Select
                            className="form-select form-select-sm octane-wired__give-var-select"
                            title={localizeWithFallback('wiredfurni.params.variables.operation.tooltip', '')}
                            value={operation}
                            onChange={(event) => setOperation(parseInt(event.target.value, 10))}
                        >
                            {WIRED_VARIABLE_BASIC_OPERATIONS.map((value) => (
                                <option key={value} value={value}>
                                    {localizeWiredVariableOperation(value)}
                                </option>
                            ))}
                            <optgroup label={localizeWithFallback('wiredfurni.params.variables.operation.advanced', 'Advanced')}>
                                {WIRED_VARIABLE_ADVANCED_OPERATIONS.map((value) => (
                                    <option key={value} value={value}>
                                        {localizeWiredVariableOperation(value)}
                                    </option>
                                ))}
                            </optgroup>
                        </Select>
                    </div>

                    <div className="octane-wired__divider" />

                    <div className="octane-wired__give-var-section">
                        <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.reference_value')}</div>
                        <WiredValueOrVariableInput
                            disabled={isUnaryOperation}
                            entries={resolvedReferenceVariableEntries}
                            isVariable={referenceMode === 'variable'}
                            label={LocalizeText('wiredfurni.params.variables.reference_value')}
                            literal={referenceConstantValueInput}
                            primaryTarget={destinationTargetType}
                            sameHolder={referenceSameHolder}
                            target={referenceTargetType}
                            targets={REFERENCE_TARGETS}
                            token={referenceVariableToken}
                            renderSource={({ typeSelector, locked }) => (
                                // AIR ChangeVariable: the reference value section claims merged slot 1, so its holder is the popup's
                                // first section; the same holder or an operation without operand disables it (isInputSourceDisabled).
                                <fieldset className="octane-wired__value-popup-locked" disabled={locked || isUnaryOperation}>
                                    <WiredFurniSelectionSourceRow
                                        headerContent={typeSelector}
                                        options={referenceSourceOptions}
                                        selectionActive={selectionMode === 'reference'}
                                        selectionCount={referenceFurniIds.length}
                                        selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                                        selectionKind="secondary"
                                        selectionLimit={selectionLimit}
                                        showSelectionToggle={isFurniTarget(referenceTargetType)}
                                        title="wiredfurni.params.sources.merged.title.variables"
                                        value={referenceSelectedSourceValue}
                                        onChange={(value) => {
                                            if (isFurniTarget(referenceTargetType)) {
                                                setReferenceFurniSource(value);
                                                return;
                                            }

                                            if (!isGlobalTarget(referenceTargetType) && !isContextTarget(referenceTargetType)) setReferenceUserSource(value);
                                        }}
                                        onSelectionActivate={() => switchSelection('reference')}
                                    />
                                </fieldset>
                            )}
                            onIsVariableChange={(isVariable) => setReferenceMode(isVariable ? 'variable' : 'constant')}
                            onLiteralChange={setReferenceConstantValueInput}
                            onSameHolderChange={setReferenceSameHolder}
                            onTargetChange={handleReferenceTargetChange}
                            onTokenChange={setReferenceVariableToken}
                            onValidityChange={setReferenceValid}
                        />
                    </div>

                    <div className="octane-wired__divider" />

                    <WiredActionDelaySection value={actionDelay} onChange={setActionDelay} />

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

                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
