import { FC, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Button, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { CLICKED_USER_SOURCE, FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createCustomVariableToken,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { isWiredSameHolderEligible, WiredValueOrVariableInput } from '../WiredValueOrVariableInput';
import { customVariablePickerEntries, normalizeWiredValueTarget, variableTokenFromId, WIRED_VALUE_TARGETS } from '../WiredValueOrVariableField';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WiredActionDelaySection } from './WiredActionDelaySection';

type VariableTargetType = 'user' | 'furni' | 'context';

// Official variable targets (1 user, 0 furni, -20 context).
const TARGET_USER = 1;
const TARGET_FURNI = 0;
const TARGET_CONTEXT = -20;
const REFERENCE_GLOBAL = -10;
const SOURCE_SELECTED = 100;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

const normalizeTargetType = (value: number): VariableTargetType => {
    switch (value) {
        case TARGET_FURNI:
            return 'furni';
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
        case 'context':
            return TARGET_CONTEXT;
        default:
            return TARGET_USER;
    }
};

export const WiredActionGiveVariableView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        actionDelay = 0,
        setActionDelay = null,
        setIntParams = null,
        setFurniIds = null,
        setStringParam = null,
        setSourceTypes = null
    } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [selectedTargetType, setSelectedTargetType] = useState<VariableTargetType>('user');
    const [selectedVariableToken, setSelectedVariableToken] = useState('');
    const [overrideExisting, setOverrideExisting] = useState(false);
    const [initialValueInput, setInitialValueInput] = useState('0');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    const [fromVariable, setFromVariable] = useState(false);
    const [referenceTarget, setReferenceTarget] = useState(REFERENCE_GLOBAL);
    const [referenceToken, setReferenceToken] = useState('');
    const [sameHolder, setSameHolder] = useState(false);
    const [initialValueValid, setInitialValueValid] = useState(true);
    const referenceTargetKey = WIRED_VALUE_TARGETS.find((entry) => entry.value === referenceTarget)?.key ?? 'global';
    const referenceEntries = useMemo(() => {
        const definitions = { furni: furniVariableDefinitions, user: userVariableDefinitions, global: roomVariableDefinitions, context: contextVariableDefinitions }[
            referenceTargetKey
        ];

        return customVariablePickerEntries(referenceTargetKey, 'change-reference', definitions.filter((definition) => definition.hasValue), referenceToken);
    }, [contextVariableDefinitions, furniVariableDefinitions, referenceTargetKey, referenceToken, roomVariableDefinitions, userVariableDefinitions]);
    // AIR ValueOrVariableSection.referenceVariableOnTarget: only for a variable on the destination's own furni or user holder.
    const sameHolderActive = fromVariable && sameHolder && isWiredSameHolderEligible(selectedTargetType, referenceTargetKey);

    const targetDefinitions = useMemo(() => {
        if (selectedTargetType === 'furni') return furniVariableDefinitions;
        if (selectedTargetType === 'context') return contextVariableDefinitions;

        return userVariableDefinitions;
    }, [contextVariableDefinitions, furniVariableDefinitions, selectedTargetType, userVariableDefinitions]);
    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries(selectedTargetType, 'give', targetDefinitions),
        [selectedTargetType, targetDefinitions]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!selectedVariableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === selectedVariableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(selectedTargetType, selectedVariableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [selectedTargetType, selectedVariableToken, variableEntries]);
    const selectedVariableDefinition = useMemo(
        () => flattenWiredVariablePickerEntries(resolvedVariableEntries).find((entry) => entry.token === selectedVariableToken) ?? null,
        [resolvedVariableEntries, selectedVariableToken]
    );
    const availableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const orderedUserSources = useMemo(() => sortWiredSourceOptions(availableUserSources, 'users'), [availableUserSources]);
    const orderedFurniSources = useMemo(() => sortWiredSourceOptions(FURNI_SOURCES, 'furni'), []);
    const sourceOptions = selectedTargetType === 'user' ? orderedUserSources : selectedTargetType === 'furni' ? orderedFurniSources : [];
    const selectedSourceValue = selectedTargetType === 'user' ? userSource : furniSource;
    const resolvedSourceOptions = useMemo(() => {
        if (selectedTargetType === 'context') return [];
        if (sourceOptions.some((option) => option.value === selectedSourceValue)) return sourceOptions;

        const fallbackOptions = selectedTargetType === 'user' ? sortWiredSourceOptions([...USER_SOURCES, CLICKED_USER_SOURCE], 'users') : orderedFurniSources;
        const fallbackOption = fallbackOptions.find((option) => option.value === selectedSourceValue);

        if (!fallbackOption) return sourceOptions;

        return [...sourceOptions, fallbackOption];
    }, [orderedFurniSources, selectedSourceValue, selectedTargetType, sourceOptions]);
    const selectedSourceIndex = resolvedSourceOptions.findIndex((option) => option.value === selectedSourceValue);
    const selectedSourceOption = selectedSourceIndex >= 0 ? resolvedSourceOptions[selectedSourceIndex] : null;

    const handleTargetTypeChange = (value: VariableTargetType) => {
        if (value === selectedTargetType) return;

        setSelectedTargetType(value);
        setSelectedVariableToken('');
    };

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [target, initialHigh, initialLow, override, fromVariable, referenceTarget, sameHolder];
        // string "variable\treferenceVariable"; furni / user slot 0 are the targets.
        const [variableText = '', referenceText = ''] = (trigger.stringData || '').split('\t');
        const parsedVariableItemId = parseInt(variableText.trim(), 10);
        const nextTargetType = normalizeTargetType(trigger.intData.length > 0 ? trigger.intData[0] : TARGET_USER);

        setSelectedTargetType(nextTargetType);
        setSelectedVariableToken(
            normalizeVariableTokenFromWire(
                !Number.isNaN(parsedVariableItemId) && parsedVariableItemId > 0
                    ? String(parsedVariableItemId)
                    : nextTargetType === 'user' && (trigger.selectedItems?.length ?? 0) > 0
                      ? String(trigger.selectedItems[0])
                      : ''
            )
        );
        setInitialValueInput((trigger.intData.length > 2 ? trigger.intData[2] : 0).toString());
        setOverrideExisting(trigger.intData.length > 3 ? trigger.intData[3] === 1 : false);
        setFromVariable(trigger.intData[4] === 1);
        setReferenceTarget(trigger.intData.length > 5 ? normalizeWiredValueTarget(trigger.intData[5]) : REFERENCE_GLOBAL);
        setSameHolder(trigger.intData[6] === 1);
        setReferenceToken(variableTokenFromId(referenceText));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? SOURCE_SELECTED : 0));
    }, [trigger]);

    useEffect(() => {
        if (!selectedVariableDefinition) return;
        if (selectedVariableDefinition.hasValue) return;

        setInitialValueInput('0');
    }, [selectedVariableDefinition]);

    const save = () => {
        const targetValue = getTargetValue(selectedTargetType);
        const parsedInitialValue = parseInt(initialValueInput.trim(), 10);
        const variableItemId = getCustomVariableItemId(selectedVariableToken);

        const initialValue = Number.isFinite(parsedInitialValue) ? parsedInitialValue : 0;
        const referenceItemId = fromVariable ? getCustomVariableItemId(referenceToken) : 0;

        setStringParam(`${variableItemId || ''}\t${referenceItemId}`);
        setIntParams([targetValue, initialValue < 0 ? -1 : 0, initialValue, overrideExisting ? 1 : 0, fromVariable ? 1 : 0, referenceTarget, sameHolderActive ? 1 : 0]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
        setFurniIds(selectedTargetType === 'furni' && furniSource === SOURCE_SELECTED ? [...furniIds] : []);
    };

    const validate = () =>
        getCustomVariableItemId(selectedVariableToken) > 0 &&
        (!selectedVariableDefinition?.hasValue || (initialValueValid && (!fromVariable || getCustomVariableItemId(referenceToken) > 0)));

    const requiresFurni =
        selectedTargetType === 'furni' ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    const missingVariablesText = (() => {
        switch (selectedTargetType) {
            case 'furni':
                return 'No wf_var_furni variables found in this room.';
            case 'context':
                return 'No wf_var_context variables found in this room.';
            default:
                return 'No wf_var_user variables found in this room.';
        }
    })();

    const cycleSource = (direction: number) => {
        if (!resolvedSourceOptions.length) return;

        const currentIndex = selectedSourceIndex >= 0 ? selectedSourceIndex : 0;
        const nextIndex = (currentIndex + direction + resolvedSourceOptions.length) % resolvedSourceOptions.length;
        const nextSourceValue = resolvedSourceOptions[nextIndex].value;

        if (selectedTargetType === 'user') {
            setUserSource(nextSourceValue);

            return;
        }

        if (selectedTargetType === 'furni') {
            setFurniSource(nextSourceValue);
        }
    };

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save} validate={validate} cardStyle={{ width: 244 }} hideDelay={true}>
            <div className="octane-wired__give-var">
                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${selectedTargetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleTargetTypeChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                </div>

                <>
                    <WiredVariablePicker
                        entries={resolvedVariableEntries}
                        recentScope="variable-effects"
                        selectedToken={selectedVariableToken}
                        onSelect={(entry) => setSelectedVariableToken(entry.token)}
                    />

                    {!targetDefinitions.length && <Text small>{missingVariablesText}</Text>}

                    <label className="octane-wired__give-var-checkbox">
                        <input
                            checked={overrideExisting}
                            className="form-check-input"
                            type="checkbox"
                            onChange={(event) => setOverrideExisting(event.target.checked)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.value_settings.override_existing')}</Text>
                    </label>

                    <div className="octane-wired__divider" />

                    <div className="octane-wired__give-var-section">
                        <div className="octane-wired__give-var-section-title">{LocalizeText('wiredfurni.params.variables.value_settings.initial_value')}</div>
                        {/* AIR GiveVariable: the initial value is a value-or-variable section (createValueOrVariableSection). */}
                        <WiredValueOrVariableInput
                            disabled={!selectedVariableDefinition?.hasValue}
                            entries={referenceEntries}
                            isVariable={fromVariable}
                            label={LocalizeText('wiredfurni.params.variables.value_settings.initial_value')}
                            literal={initialValueInput}
                            primaryTarget={selectedTargetType}
                            sameHolder={sameHolder}
                            target={referenceTargetKey}
                            targets={WIRED_VALUE_TARGETS.map((entry) => entry.key)}
                            token={referenceToken}
                            onIsVariableChange={setFromVariable}
                            onLiteralChange={setInitialValueInput}
                            onSameHolderChange={setSameHolder}
                            onTargetChange={(key) => setReferenceTarget(WIRED_VALUE_TARGETS.find((entry) => entry.key === key)?.value ?? REFERENCE_GLOBAL)}
                            onTokenChange={setReferenceToken}
                            onValidityChange={setInitialValueValid}
                        />
                    </div>

                    <div className="octane-wired__divider" />

                    <WiredActionDelaySection value={actionDelay} onChange={setActionDelay} />

                    {selectedTargetType !== 'context' && (
                        <>
                            <div className="octane-wired__divider" />

                            <div className="octane-wired__give-var-section">
                                <div className="octane-wired__give-var-section-title">{localizeWithFallback('wiredfurni.params.sources.merged.title.variables_destination', 'Destinazione variabile:')}</div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        disabled={resolvedSourceOptions.length <= 1}
                                        variant="primary"
                                        classNames={['octane-wired__picker-button']}
                                        className="px-2 py-1"
                                        onClick={() => cycleSource(-1)}
                                    >
                                        <FaChevronLeft />
                                    </Button>
                                    <div className="flex min-w-0 flex-1 items-center justify-center octane-wired__picker-label">
                                        <Text small className="text-center">
                                            {selectedSourceOption ? LocalizeText(selectedSourceOption.label) : '-'}
                                        </Text>
                                    </div>
                                    <Button
                                        disabled={resolvedSourceOptions.length <= 1}
                                        variant="primary"
                                        classNames={['octane-wired__picker-button']}
                                        className="px-2 py-1"
                                        onClick={() => cycleSource(1)}
                                    >
                                        <FaChevronRight />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            </div>
        </WiredActionBaseView>
    );
};
