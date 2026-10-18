import { FC, useEffect, useMemo, useState } from 'react';
import { fromOfficialComparison, fromOfficialVariableTarget, LocalizeText, localizeWithFallback, toOfficialComparison, toOfficialVariableTarget, WiredFurniType } from '../../../../api';
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
const SOURCE_TRIGGER = 0;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const REFERENCE_TARGETS: VariableTargetType[] = ['furni', 'user', 'global', 'context'];

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
    // Official layout: [comparison, reference (0 none, 1 value, 2 variable), value high, value low, reference
    // target, same holder]; the reference is read on the official source slots, filter / invert are the
    // official selector fields.
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null, setSourceTypes = null, setSelectorOptions = null } = useWired();
    const [sameHolder, setSameHolder] = useState(false);
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
    const [referenceValid, setReferenceValid] = useState(true);

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
        const d = trigger.intData;
        const reference = d.length > 1 ? d[1] : 0;

        setComparison(d.length > 0 ? fromOfficialComparison(d[0]) : 2);
        setSelectByValue(reference === 1 || reference === 2);
        setReferenceMode(reference === 2 ? 'variable' : 'constant');
        setReferenceConstantValueInput((d.length > 3 ? d[3] : 0).toString());
        setReferenceTargetType(normalizeTargetType(d.length > 4 ? fromOfficialVariableTarget(d[4]) : TARGET_USER));
        setSameHolder(d[5] === 1);
        setReferenceUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.furniSourceTypes?.[0] ?? (nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER));
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
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

    // AIR WithVariable.setValueSelectionVisibility: the comparison and the reference value need a variable with a value
    // and "select by value". The same holder only counts for a variable reference on the selector's own holder type
    // (variableSource is the primary target; readIntParamsFromForm), and then the reference source is locked.
    const valueSelectionDisabled = !selectByValue || !canSelectByValue;
    const sameHolderActive = selectByValue && referenceMode === 'variable' && sameHolder && isWiredSameHolderEligible(selectorTarget, referenceTargetType);

    const save = () => {
        const nextReferenceFurniIds = referenceSelectionEnabled ? [...furniIds] : [...referenceFurniIds];
        const parsedReferenceConstantValue = parseInt(referenceConstantValueInput.trim(), 10);

        setReferenceFurniIds(nextReferenceFurniIds);
        setStringParam(`${variableToken || ''}\t${selectByValue && referenceMode === 'variable' ? referenceVariableToken : ''}`);
        const constantValue = Number.isFinite(parsedReferenceConstantValue) ? parsedReferenceConstantValue : 0;

        setIntParams([
            toOfficialComparison(comparison),
            !selectByValue ? 0 : referenceMode === 'variable' ? 2 : 1,
            constantValue < 0 ? -1 : 0,
            constantValue,
            toOfficialVariableTarget(getTargetValue(referenceTargetType)),
            sameHolderActive ? 1 : 0
        ]);
        setSourceTypes({ furni: [referenceFurniSource], users: [referenceUserSource] });
        setSelectorOptions({ filter: filterExisting, invert });
        setFurniIds(referenceSelectionEnabled ? nextReferenceFurniIds : []);
    };

    const validate = () => {
        if (!variableToken) return false;
        if (selectByValue && !canSelectByValue) return false;
        if (selectByValue && referenceMode === 'variable' && !referenceVariableToken) return false;
        if (selectByValue && !referenceValid) return false;

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

                <div className={`flex flex-col gap-2 ${valueSelectionDisabled ? 'opacity-60' : ''}`}>
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
                                        disabled={valueSelectionDisabled}
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
                        <WiredValueOrVariableInput
                            disabled={valueSelectionDisabled}
                            entries={resolvedReferenceEntries}
                            isVariable={referenceMode === 'variable'}
                            label={LocalizeText('wiredfurni.params.variables.reference_value')}
                            literal={referenceConstantValueInput}
                            primaryTarget={selectorTarget}
                            sameHolder={sameHolder}
                            target={referenceTargetType}
                            targets={REFERENCE_TARGETS}
                            token={referenceVariableToken}
                            renderSource={({ typeSelector, locked }) => (
                                // AIR WithVariable: the reference value section claims merged slot 0 (isInputSourceDisabled: a
                                // disabled section or the same holder locks it).
                                <fieldset className="octane-wired__value-popup-locked" disabled={locked || valueSelectionDisabled}>
                                    <WiredFurniSelectionSourceRow
                                        headerContent={typeSelector}
                                        options={referenceSourceOptions}
                                        selectionActive={true}
                                        selectionCount={referenceSelectionEnabled ? furniIds.length : referenceFurniIds.length}
                                        selectionEnabledValues={[SOURCE_SECONDARY_SELECTED]}
                                        selectionKind="primary"
                                        selectionLimit={selectionLimit}
                                        showSelectionToggle={false}
                                        title="wiredfurni.params.sources.merged.title.variables"
                                        value={selectedReferenceSourceValue}
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
                                </fieldset>
                            )}
                            onIsVariableChange={(isVariable) => setReferenceMode(isVariable ? 'variable' : 'constant')}
                            onLiteralChange={setReferenceConstantValueInput}
                            onSameHolderChange={setSameHolder}
                            onTargetChange={handleReferenceTargetChange}
                            onTokenChange={setReferenceVariableToken}
                            onValidityChange={setReferenceValid}
                        />
                    </div>
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
