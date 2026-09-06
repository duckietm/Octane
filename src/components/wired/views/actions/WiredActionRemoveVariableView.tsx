import { FC, useEffect, useMemo, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GetWiredTimeLocale, LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Button, Slider, Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { CLICKED_USER_SOURCE, FURNI_SOURCES, sortWiredSourceOptions, USER_SOURCES, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredActionBaseView } from './WiredActionBaseView';

type VariableTargetType = 'user' | 'furni' | 'context';

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
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

export const WiredActionRemoveVariableView: FC<{}> = () => {
    const {
        trigger = null,
        furniIds = [],
        actionDelay = 0,
        setActionDelay = null,
        setIntParams = null,
        setFurniIds = null,
        setStringParam = null
    } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [selectedTargetType, setSelectedTargetType] = useState<VariableTargetType>('user');
    const [selectedVariableToken, setSelectedVariableToken] = useState('');
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);

    const targetDefinitions = useMemo(() => {
        const definitions = (() => {
            switch (selectedTargetType) {
                case 'furni':
                    return furniVariableDefinitions;
                case 'context':
                    return contextVariableDefinitions;
                default:
                    return userVariableDefinitions;
            }
        })();

        return definitions;
    }, [contextVariableDefinitions, furniVariableDefinitions, selectedTargetType, userVariableDefinitions]);
    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries(selectedTargetType, 'remove', targetDefinitions),
        [selectedTargetType, targetDefinitions]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!selectedVariableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === selectedVariableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(selectedTargetType, selectedVariableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [selectedTargetType, selectedVariableToken, variableEntries]);

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

        const parsedVariableItemId = parseInt((trigger.stringData || '').trim(), 10);
        const nextTargetType = normalizeTargetType(trigger.intData.length > 0 ? trigger.intData[0] : TARGET_USER);

        setSelectedTargetType(nextTargetType);
        setSelectedVariableToken(
            normalizeVariableTokenFromWire(!Number.isNaN(parsedVariableItemId) && parsedVariableItemId > 0 ? String(parsedVariableItemId) : '')
        );
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setFurniSource(trigger.intData.length > 2 ? trigger.intData[2] : (trigger.selectedItems?.length ?? 0) > 0 ? SOURCE_SELECTED : 0);
    }, [trigger]);

    const save = () => {
        const targetValue = getTargetValue(selectedTargetType);
        const variableItemId = getCustomVariableItemId(selectedVariableToken);

        setStringParam(variableItemId ? String(variableItemId) : '');
        setIntParams([targetValue, userSource, furniSource]);
        setFurniIds(selectedTargetType === 'furni' && furniSource === SOURCE_SELECTED ? [...furniIds] : []);
    };

    const validate = () => getCustomVariableItemId(selectedVariableToken) > 0;

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

                <WiredVariablePicker
                    entries={resolvedVariableEntries}
                    recentScope="variable-effects"
                    selectedToken={selectedVariableToken}
                    onSelect={(entry) => setSelectedVariableToken(entry.token)}
                />

                {!targetDefinitions.length && <Text small>{missingVariablesText}</Text>}

                <div className="octane-wired__divider" />

                <div className="octane-wired__give-var-section">
                    <div className="octane-wired__give-var-section-title">
                        {LocalizeText('wiredfurni.params.delay', ['seconds'], [GetWiredTimeLocale(actionDelay)])}
                    </div>
                    <Slider max={20} min={0} value={actionDelay} onChange={(event) => setActionDelay(event)} />
                </div>

                {selectedTargetType !== 'context' && (
                    <>
                        <div className="octane-wired__divider" />

                        <div className="octane-wired__give-var-section">
                            <div className="octane-wired__give-var-section-title">{localizeWithFallback('wiredfurni.params.sources.merged.title.variables', 'Fonte variabile:')}</div>
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
            </div>
        </WiredActionBaseView>
    );
};
