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
import { CLICKED_USER_SOURCE, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    normalizeVariableTokenFromWire,
    WiredVariablePickerTarget
} from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';
type AmountMode = 'constant' | 'variable';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    itemId: number;
    name: string;
}

interface WiredExtraFilterByVariableViewProps {
    target: 'user' | 'furni';
}

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const TARGET_GLOBAL = 3;
const AMOUNT_CONSTANT = 0;
const AMOUNT_VARIABLE = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SECONDARY_SELECTED = 101;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const SORT_OPTIONS = [0, 1, 2, 3, 4, 5];

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
const CONTEXT_SOURCE_OPTIONS: WiredSourceOption[] = [
    { value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Current execution') }
];

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

export const WiredExtraFilterByVariableView: FC<WiredExtraFilterByVariableViewProps> = ({ target }) => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [variableToken, setVariableToken] = useState('');
    const [sortBy, setSortBy] = useState(0);
    const [amountMode, setAmountMode] = useState<AmountMode>('constant');
    const [amountInput, setAmountInput] = useState('1');
    const [referenceTargetType, setReferenceTargetType] = useState<VariableTargetType>('user');
    const [referenceVariableToken, setReferenceVariableToken] = useState('');
    const [referenceUserSource, setReferenceUserSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniSource, setReferenceFurniSource] = useState(SOURCE_TRIGGER);
    const [referenceFurniIds, setReferenceFurniIds] = useState<number[]>([]);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const userSourceFallbackOptions = useMemo(() => sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users'), []);

    const mainDefinitions = target === 'user' ? userVariableDefinitions : furniVariableDefinitions;
    const mainEntries = useMemo(
        () => buildWiredVariablePickerEntries(target as WiredVariablePickerTarget, 'filter-main', mainDefinitions),
        [mainDefinitions, target]
    );
    const resolvedMainEntries = useMemo(() => {
        if (!variableToken) return mainEntries;
        if (flattenWiredVariablePickerEntries(mainEntries).some((entry) => entry.token === variableToken)) return mainEntries;

        const fallbackEntry = createFallbackVariableEntry(target, variableToken);
        return fallbackEntry ? [fallbackEntry, ...mainEntries] : mainEntries;
    }, [mainEntries, target, variableToken]);

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

    const referenceSelectionEnabled = amountMode === 'variable' && referenceTargetType === 'furni' && referenceFurniSource === SOURCE_SECONDARY_SELECTED;
    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;
    const requiresFurni = referenceSelectionEnabled ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    const selectedReferenceSourceValue =
        referenceTargetType === 'furni'
            ? referenceFurniSource
            : referenceTargetType === 'global' || referenceTargetType === 'context'
              ? SOURCE_TRIGGER
              : referenceUserSource;

    const referenceSourceOptions = useMemo(() => {
        if (referenceTargetType === 'furni') return resolveSourceOptions(SECONDARY_FURNI_SOURCES, selectedReferenceSourceValue, SECONDARY_FURNI_SOURCES);
        if (referenceTargetType === 'global') return GLOBAL_SOURCE_OPTIONS;
        if (referenceTargetType === 'context') return CONTEXT_SOURCE_OPTIONS;

        return resolveSourceOptions(orderedUserSources, selectedReferenceSourceValue, userSourceFallbackOptions);
    }, [orderedUserSources, referenceTargetType, selectedReferenceSourceValue, userSourceFallbackOptions]);

    useEffect(() => {
        if (!trigger) return;

        const stringParts = parseStringData(trigger.stringData);
        const nextReferenceFurniIds = [...(trigger.selectedItems ?? [])];

        setVariableToken(normalizeVariableTokenFromWire(stringParts.length > 0 ? stringParts[0] : ''));
        setReferenceVariableToken(normalizeVariableTokenFromWire(stringParts.length > 1 ? stringParts[1] : ''));
        setSortBy(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setAmountMode((trigger.intData.length > 1 ? trigger.intData[1] : AMOUNT_CONSTANT) === AMOUNT_VARIABLE ? 'variable' : 'constant');
        setAmountInput((trigger.intData.length > 2 ? trigger.intData[2] : 1).toString());
        setReferenceTargetType(normalizeTargetType(trigger.intData.length > 3 ? trigger.intData[3] : TARGET_USER));
        setReferenceUserSource(trigger.intData.length > 4 ? trigger.intData[4] : SOURCE_TRIGGER);
        setReferenceFurniSource(trigger.intData.length > 5 ? trigger.intData[5] : nextReferenceFurniIds.length ? SOURCE_SECONDARY_SELECTED : SOURCE_TRIGGER);
        setReferenceFurniIds(nextReferenceFurniIds);
        setFurniIds(nextReferenceFurniIds);
    }, [setFurniIds, trigger]);

    useEffect(() => {
        if (referenceSelectionEnabled) setReferenceFurniIds([...furniIds]);
    }, [furniIds, referenceSelectionEnabled]);

    useEffect(() => {
        if (referenceTargetType !== 'user') return;
        if (orderedUserSources.some((option) => option.value === referenceUserSource)) return;

        setReferenceUserSource(SOURCE_TRIGGER);
    }, [orderedUserSources, referenceTargetType, referenceUserSource]);

    const save = () => {
        const parsedAmount = parseInt(amountInput.trim(), 10);
        const nextReferenceFurniIds = referenceSelectionEnabled ? [...furniIds] : [...referenceFurniIds];

        setReferenceFurniIds(nextReferenceFurniIds);
        setStringParam(`${variableToken || ''}\t${amountMode === 'variable' ? referenceVariableToken : ''}`);
        setIntParams([
            sortBy,
            amountMode === 'variable' ? AMOUNT_VARIABLE : AMOUNT_CONSTANT,
            Number.isFinite(parsedAmount) ? parsedAmount : 0,
            getTargetValue(referenceTargetType),
            referenceUserSource,
            referenceFurniSource
        ]);
        setFurniIds(referenceSelectionEnabled ? nextReferenceFurniIds : []);
    };

    const validate = () => {
        if (!variableToken) return false;
        if (amountMode === 'variable' && !referenceVariableToken) return false;

        return true;
    };

    const handleReferenceTargetChange = (targetType: VariableTargetType) => {
        if (targetType === referenceTargetType) return;

        if (referenceTargetType === 'furni') setFurniIds([]);

        setReferenceTargetType(targetType);
        setReferenceVariableToken('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} validate={validate} cardStyle={{ width: 260 }}>
            <div className="octane-wired__give-var">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <WiredVariablePicker
                        entries={resolvedMainEntries}
                        recentScope={`variable-extra-${target}`}
                        selectedToken={variableToken}
                        onSelect={(entry) => setVariableToken(entry.token)}
                    />
                </div>

                <div className="octane-wired__divider" />

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.sort_by')}</Text>
                    <select className="form-select form-select-sm" value={sortBy} onChange={(event) => setSortBy(parseInt(event.target.value, 10) || 0)}>
                        {SORT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {LocalizeText(`wiredfurni.params.variables.sort_by.${option}`)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.setfilter')}</div>
                    <label className="octane-wired__change-var-radio">
                        <input checked={amountMode === 'constant'} type="radio" onChange={() => setAmountMode('constant')} />
                        <Text>{LocalizeText('wiredfurni.params.variables.reference_value.set_value')}</Text>
                        <OctaneInput
                            className="octane-wired__give-var-number"
                            type="number"
                            min={1}
                            max={1000}
                            value={amountInput}
                            onChange={(event) => setAmountInput(event.target.value)}
                        />
                    </label>

                    <div className="octane-wired__change-var-reference-block">
                        <label className="octane-wired__change-var-radio">
                            <input checked={amountMode === 'variable'} type="radio" onChange={() => setAmountMode('variable')} />
                            <Text>{LocalizeText('wiredfurni.params.variables.reference_value.from_variable')}</Text>
                            <div className="octane-wired__give-var-targets">
                                {TARGET_BUTTONS.map((button) => (
                                    <button
                                        key={`reference-${button.key}`}
                                        type="button"
                                        disabled={button.disabled || amountMode !== 'variable'}
                                        className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${referenceTargetType === button.key ? 'is-active' : ''}`}
                                        onClick={() => handleReferenceTargetChange(button.key)}
                                    >
                                        <img src={button.icon} alt={button.key} />
                                    </button>
                                ))}
                            </div>
                        </label>

                        {amountMode === 'variable' && (
                            <WiredVariablePicker
                                entries={resolvedReferenceEntries}
                                recentScope={`variable-extra-reference-${target}`}
                                selectedToken={referenceVariableToken}
                                onSelect={(entry) => setReferenceVariableToken(entry.token)}
                            />
                        )}
                    </div>
                </div>

                {amountMode === 'variable' && (
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
        </WiredExtraBaseView>
    );
};
