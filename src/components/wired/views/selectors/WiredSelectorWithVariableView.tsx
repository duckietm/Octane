import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
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
    normalizeVariableTokenFromWire,
    WiredVariablePickerTarget
} from '../WiredVariablePickerData';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type ReferenceMode = 'constant' | 'variable';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    itemId: number;
    name: string;
}

interface WiredSelectorWithVariableViewProps {
    selectorTarget: 'user' | 'furni';
}

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const TARGET_GLOBAL = 3;
const REFERENCE_CONSTANT = 0;
const REFERENCE_VARIABLE = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SECONDARY_SELECTED = 101;

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
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [{ value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Current execution') }];

const parseStringData = (value: string) => (value?.length ? value.split('\t', -1) : []);

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

const getReferenceDefinitions = (
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

const resolveSourceOptions = (baseOptions: WiredSourceOption[], selectedValue: number, fallbackOptions: WiredSourceOption[]) => {
    if (!baseOptions.length) return baseOptions;
    if (baseOptions.some((option) => option.value === selectedValue)) return baseOptions;

    const fallbackOption = fallbackOptions.find((option) => option.value === selectedValue);

    return fallbackOption ? [...baseOptions, fallbackOption] : baseOptions;
};

export const WiredSelectorWithVariableView: FC<WiredSelectorWithVariableViewProps> = ({ selectorTarget }) => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [variableToken, setVariableToken] = useState('');
    const [selectByValue, setSelectByValue] = useState(false);
    const [comparison, setComparison] = useState(2);
    const [referenceMode, setReferenceMode] = useState<ReferenceMode>('constant');
    const [referenceConstantValueInput, setReferenceConstantValueInput] = useState('0');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniIds, setReferenceFurniIds] = useState<number[]>([]);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(SECONDARY_FURNI_SOURCES, 'furni'), []);
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);
    const mainDefinitions = selectorTarget === 'user' ? userVariableDefinitions : furniVariableDefinitions;
    const mainEntries = useMemo(
        () => buildWiredVariablePickerEntries(selectorTarget as WiredVariablePickerTarget, 'condition', mainDefinitions),
        [mainDefinitions, selectorTarget]
    );
    const resolvedMainEntries = useMemo(() => {
        if (!variableToken) return mainEntries;
        if (flattenWiredVariablePickerEntries(mainEntries).some((entry) => entry.token === variableToken)) return mainEntries;

        const fallbackEntry = createFallbackVariableEntry(selectorTarget, variableToken);
        return fallbackEntry ? [fallbackEntry, ...mainEntries] : mainEntries;
    }, [mainEntries, selectorTarget, variableToken]);
    const selectedMainEntry = useMemo(
        () => flattenWiredVariablePickerEntries(resolvedMainEntries).find((entry) => entry.token === variableToken) || null,
        [resolvedMainEntries, variableToken]
    );
    const canSelectByValue = !!selectedMainEntry?.hasValue;

    const referenceDefinitions = useMemo(
        () =>
            getReferenceDefinitions(
                referenceTargetType,
                userVariableDefinitions,
                furniVariableDefinitions,
                roomVariableDefinitions,
                contextVariableDefinitions
            ),
        [contextVariableDefinitions, furniVariableDefinitions, referenceTargetType, roomVariableDefinitions, userVariableDefinitions]
    );
    const referenceEntries = useMemo(
        () => buildWiredVariablePickerEntries(referenceTargetType, 'change-reference', referenceDefinitions),
        [referenceDefinitions, referenceTargetType]
    );
    const resolvedReferenceEntries = useMemo(() => {
        if (!referenceVariableToken) return referenceEntries;
        if (flattenWiredVariablePickerEntries(referenceEntries).some((entry) => entry.token === referenceVariableToken)) return referenceEntries;

        const fallbackEntry = createFallbackVariableEntry(referenceTargetType, referenceVariableToken);
        return fallbackEntry ? [fallbackEntry, ...referenceEntries] : referenceEntries;
    }, [referenceEntries, referenceTargetType, referenceVariableToken]);

    const referenceSelectionEnabled =
        selectByValue && referenceMode === 'variable' && referenceTargetType === 'furni' && referenceFurniSource === SOURCE_SECONDARY_SELECTED;
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;
    const requiresFurni = referenceSelectionEnabled ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    const selectedReferenceSourceValue =
        referenceTargetType === 'furni'
            ? referenceFurniSource
            : referenceTargetType === 'global' || referenceTargetType === 'context'
              ? SOURCE_TRIGGER
              : referenceUserSource;

    const referenceSourceOptions = useMemo(() => {
        if (referenceTargetType === 'furni') return resolveSourceOptions(orderedFurniSources, selectedReferenceSourceValue, orderedFurniSources);
        if (referenceTargetType === 'global') return GLOBAL_SOURCE_OPTIONS;
        if (referenceTargetType === 'context') return CONTEXT_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, selectedReferenceSourceValue, userSourceFallbackOptions);
    }, [orderedFurniSources, orderedUserSources, referenceTargetType, selectedReferenceSourceValue, userSourceFallbackOptions]);

    useEffect(() => {
        if (!trigger) return;

        const stringParts = parseStringData(trigger.stringData);
        const nextReferenceFurniIds = [...(trigger.selectedItems ?? [])];

        setVariableToken(normalizeVariableTokenFromWire(stringParts.length > 0 ? stringParts[0] : ''));
        setReferenceVariableToken(normalizeVariableTokenFromWire(stringParts.length > 1 ? stringParts[1] : ''));
        setSelectByValue(trigger.intData.length > 0 ? trigger.intData[0] === 1 : false);
        setComparison(trigger.intData.length > 1 ? trigger.intData[1] : 2);
        setReferenceMode((trigger.intData.length > 2 ? trigger.intData[2] : REFERENCE_CONSTANT) === REFERENCE_VARIABLE ? 'variable' : 'constant');
        setReferenceConstantValueInput((trigger.intData.length > 3 ? trigger.intData[3] : 0).toString());
        setReferenceTargetType(normalizeTargetType(trigger.intData.length > 4 ? trigger.intData[4] : TARGET_USER));
        setReferenceUserSource(trigger.intData.length > 5 ? trigger.intData[5] : SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.intData.length > 6 ? trigger.intData[6] : nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER);
        setFilterExisting(trigger.intData.length > 7 ? trigger.intData[7] === 1 : false);
        setInvert(trigger.intData.length > 8 ? trigger.intData[8] === 1 : false);
        setReferenceFurniIds(nextReferenceFurniIds);
        setFurniIds(nextReferenceFurniIds);
    }, [setFurniIds, trigger]);

    useEffect(() => {
        if (!canSelectByValue && selectByValue) setSelectByValue(false);
    }, [canSelectByValue, selectByValue]);

    useEffect(() => {
        if (referenceSelectionEnabled) setReferenceFurniIds([...furniIds]);
    }, [furniIds, referenceSelectionEnabled]);

    useEffect(() => {
        if (referenceTargetType !== 'user') return;
        if (orderedUserSources.some((option) => option.value === referenceUserSource)) return;

        setReferenceUserSource(SOURCE_TRIGGER);
    }, [orderedUserSources, referenceTargetType, referenceUserSource]);

    const save = () => {
        const nextReferenceFurniIds = referenceSelectionEnabled ? [...furniIds] : [...referenceFurniIds];
        const parsedReferenceConstantValue = parseInt(referenceConstantValueInput.trim(), 10);

        setReferenceFurniIds(nextReferenceFurniIds);
        setStringParam(`${variableToken || ''}\t${selectByValue && referenceMode === 'variable' ? referenceVariableToken : ''}`);
        setIntParams([
            selectByValue ? 1 : 0,
            comparison,
            referenceMode === 'variable' ? REFERENCE_VARIABLE : REFERENCE_CONSTANT,
            Number.isFinite(parsedReferenceConstantValue) ? parsedReferenceConstantValue : 0,
            getTargetValue(referenceTargetType),
            referenceUserSource,
            referenceFurniSource,
            filterExisting ? 1 : 0,
            invert ? 1 : 0
        ]);
        setFurniIds(referenceSelectionEnabled ? nextReferenceFurniIds : []);
    };

    const validate = () => {
        if (!variableToken) return false;
        if (selectByValue && !canSelectByValue) return false;
        if (selectByValue && referenceMode === 'variable' && !referenceVariableToken) return false;

        return true;
    };

    const handleReferenceTargetChange = (targetType: VariableTargetType) => {
        if (targetType === referenceTargetType) return;

        if (referenceSelectionEnabled) setFurniIds([...furniIds]);
        if (referenceTargetType === 'furni') setFurniIds([]);

        setReferenceTargetType(targetType);
        setReferenceVariableToken('');
    };

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} validate={validate} hideDelay={true} cardStyle={{ width: 260 }}>
            <div className="octane-wired__give-var">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <WiredVariablePicker
                        entries={resolvedMainEntries}
                        recentScope={`variable-selectors-${selectorTarget}`}
                        selectedToken={variableToken}
                        onSelect={(entry) => setVariableToken(entry.token)}
                    />
                </div>

                <div className="octane-wired__divider" />

                <label className="flex items-center gap-2">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectByValue}
                        disabled={!canSelectByValue}
                        onChange={(event) => setSelectByValue(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.variables.value_settings.select_by_value')}</Text>
                </label>

                <div className={`flex flex-col gap-2 ${!selectByValue ? 'opacity-60' : ''}`}>
                    <div className="octane-wired__divider" />
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.comparison_selection')}</Text>
                        <div className="flex flex-wrap items-center gap-2">
                            {COMPARISON_OPTIONS.map((option) => (
                                <label key={option.value} className="flex items-center gap-1">
                                    <input
                                        checked={comparison === option.value}
                                        className="form-check-input"
                                        type="radio"
                                        disabled={!selectByValue}
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
                            <input
                                checked={referenceMode === 'constant'}
                                type="radio"
                                disabled={!selectByValue}
                                onChange={() => setReferenceMode('constant')}
                            />
                            <Text>{LocalizeText('wiredfurni.params.operator.2')}</Text>
                            <OctaneInput
                                className="octane-wired__give-var-number"
                                type="number"
                                value={referenceConstantValueInput}
                                disabled={!selectByValue}
                                onChange={(event) => setReferenceConstantValueInput(event.target.value)}
                            />
                        </label>

                        <div className="octane-wired__change-var-reference-block">
                            <label className="octane-wired__change-var-radio">
                                <input
                                    checked={referenceMode === 'variable'}
                                    type="radio"
                                    disabled={!selectByValue}
                                    onChange={() => setReferenceMode('variable')}
                                />
                                <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                                <div className="octane-wired__give-var-targets">
                                    {TARGET_BUTTONS.map((button) => (
                                        <button
                                            key={`reference-${button.key}`}
                                            type="button"
                                            disabled={button.disabled || !selectByValue || referenceMode !== 'variable'}
                                            className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${referenceTargetType === button.key ? 'is-active' : ''}`}
                                            onClick={() => handleReferenceTargetChange(button.key)}
                                        >
                                            <img src={button.icon} alt={button.key} />
                                        </button>
                                    ))}
                                </div>
                            </label>

                            {selectByValue && referenceMode === 'variable' && (
                                <WiredVariablePicker
                                    entries={resolvedReferenceEntries}
                                    recentScope="variable-selectors-reference"
                                    selectedToken={referenceVariableToken}
                                    onSelect={(entry) => setReferenceVariableToken(entry.token)}
                                />
                            )}
                        </div>
                    </div>

                    {selectByValue && referenceMode === 'variable' && (
                        <>
                            <div className="octane-wired__divider" />
                            <WiredFurniSelectionSourceRow
                                title="wiredfurni.params.sources.merged.title.variables_reference"
                                options={referenceSourceOptions}
                                value={selectedReferenceSourceValue}
                                selectionKind="primary"
                                selectionActive={true}
                                selectionCount={referenceSelectionEnabled ? furniIds.length : referenceFurniIds.length}
                                selectionLimit={selectionLimit}
                                selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                                showSelectionToggle={false}
                                onChange={(value) => {
                                    if (referenceTargetType === 'furni') {
                                        if (referenceFurniSource === SOURCE_SECONDARY_SELECTED) setReferenceFurniIds([...furniIds]);

                                        setReferenceFurniSource(value);
                                        setFurniIds(value === SOURCE_SECONDARY_SELECTED ? [...referenceFurniIds] : []);
                                        return;
                                    }

                                    if (referenceTargetType === 'user') setReferenceUserSource(value);
                                }}
                            />
                        </>
                    )}
                </div>

                <div className="octane-wired__divider" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        checked={filterExisting}
                        onChange={(event) => setFilterExisting(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input className="form-check-input" type="checkbox" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
