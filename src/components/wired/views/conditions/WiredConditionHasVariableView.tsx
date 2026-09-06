import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionHasVariableViewProps {
    negative?: boolean;
}

type ConditionVariableTargetType = 'user' | 'furni' | 'context';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    itemId: number;
    name: string;
}

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const QUANTIFIER_ALL = 0;
const QUANTIFIER_ANY = 1;

const TARGET_BUTTONS: Array<{ key: ConditionVariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];
const CONTEXT_SOURCE_OPTIONS = [{ value: SOURCE_TRIGGER, label: localizeWithFallback('wiredfurni.params.sources.context', 'Current execution') }];

const getTargetValue = (value: ConditionVariableTargetType) => {
    switch (value) {
        case 'furni':
            return TARGET_FURNI;
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

const normalizeTargetType = (value: number): ConditionVariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
        case TARGET_CONTEXT:
            return 'context';
        default:
            return 'user';
    }
};

const getTargetDefinitions = (
    targetType: ConditionVariableTargetType,
    userDefinitions: IVariableDefinition[],
    furniDefinitions: IVariableDefinition[],
    contextDefinitions: IVariableDefinition[]
) => {
    switch (targetType) {
        case 'furni':
            return furniDefinitions;
        case 'context':
            return contextDefinitions;
        default:
            return userDefinitions;
    }
};

const getSourceTitle = (targetType: ConditionVariableTargetType) => {
    switch (targetType) {
        case 'furni':
            return LocalizeText('wiredfurni.params.sources.furni.title');
        case 'context':
            return LocalizeText('wiredfurni.params.sources.merged.title.variables');
        default:
            return LocalizeText('wiredfurni.params.sources.users.title');
    }
};

export const WiredConditionHasVariableView: FC<WiredConditionHasVariableViewProps> = ({ negative = false }) => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<ConditionVariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);
    const [quantifier, setQuantifier] = useState(QUANTIFIER_ALL);

    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(FURNI_SOURCES, 'furni'), []);
    const variableDefinitions = useMemo(
        () => getTargetDefinitions(targetType, userVariableDefinitions, furniVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, targetType, userVariableDefinitions]
    );
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(targetType, 'condition', variableDefinitions), [targetType, variableDefinitions]);
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
        const nextTargetType = normalizeTargetType(intData.length > 0 ? intData[0] : TARGET_USER);
        const nextUserSource = intData.length > 1 ? intData[1] : SOURCE_TRIGGER;
        const nextFurniSource = intData.length > 2 ? intData[2] : (trigger.selectedItems?.length ?? 0) > 0 ? SOURCE_SELECTED : SOURCE_TRIGGER;
        const nextQuantifier = intData.length > 3 && intData[3] === QUANTIFIER_ANY ? QUANTIFIER_ANY : QUANTIFIER_ALL;

        setTargetType(nextTargetType);
        setVariableToken(normalizeVariableTokenFromWire(trigger.stringData || ''));
        setUserSource(nextUserSource);
        setFurniSource(nextFurniSource);
        setQuantifier(nextQuantifier);
    }, [trigger]);

    useEffect(() => {
        if (targetType !== 'user') return;
        if (orderedUserSources.some((option) => option.value === userSource)) return;

        setUserSource(SOURCE_TRIGGER);
    }, [orderedUserSources, targetType, userSource]);

    const save = () => {
        setStringParam(variableToken);
        setIntParams([getTargetValue(targetType), userSource, furniSource, quantifier]);

        if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) setFurniIds([]);
    };

    const validate = () => !!variableToken.length;

    const handleTargetChange = (nextTargetType: ConditionVariableTargetType) => {
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
                                    name={`wiredConditionHasVariableQuantifier-${negative ? 'neg' : 'pos'}`}
                                    type="radio"
                                    onChange={() => setQuantifier(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.quantifier.variables.${value}`)}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredFurniSelectionSourceRow
                        title={getSourceTitle(targetType)}
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
                                return;
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
            </div>
        </WiredConditionBaseView>
    );
};
