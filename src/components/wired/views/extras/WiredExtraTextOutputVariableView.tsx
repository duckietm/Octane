import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { fromOfficialVariableTarget, LocalizeText, localizeWithFallback, toOfficialVariableTarget, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { CLICKED_USER_SOURCE_VALUE, REACHED_USER_SOURCE_VALUE, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    isCustomVariableToken,
    normalizeVariableTokenFromWire
} from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredPlaceholderPreview } from './WiredPlaceholderPreview';
import { Radio } from '../../../../common/Radio';
import { BaseButton } from '../../../../common/BaseButton';

type VariableTargetType = 'user' | 'furni' | 'global' | 'context';

interface IVariableDefinition {
    availability: number;
    hasValue: boolean;
    isTextConnected: boolean;
    itemId: number;
    isReadOnly?: boolean;
    name: string;
}

const TARGET_USER = 0;
const TARGET_FURNI = 1;
const TARGET_CONTEXT = 2;
const TARGET_GLOBAL = 3;
const DISPLAY_NUMERIC = 1;
const DISPLAY_TEXTUAL = 2;
const TYPE_SINGLE = 1;
const TYPE_MULTIPLE = 2;
const DEFAULT_PLACEHOLDER_NAME = '';
const DEFAULT_DELIMITER = ', ';
const MAX_PLACEHOLDER_NAME_LENGTH = 32;
const MAX_DELIMITER_LENGTH = 16;
const PLACEHOLDER_WRAPPER_PATTERN = /^\$\((.*)\)$/;

const TARGET_BUTTONS: Array<{ key: VariableTargetType; icon: string; disabled?: boolean }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

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

const normalizeDisplayType = (value: number) => (value === DISPLAY_TEXTUAL ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC);
const normalizePlaceholderType = (value: number) => (value === TYPE_MULTIPLE ? TYPE_MULTIPLE : TYPE_SINGLE);
const normalizeUserSource = (value: number) => (value === 0 || value === 200 || value === 201 || value === CLICKED_USER_SOURCE_VALUE || value === REACHED_USER_SOURCE_VALUE ? value : 0);
const normalizeFurniSource = (value: number) => (value === 0 || value === 100 || value === 200 || value === 201 ? value : 0);
const normalizePlaceholderName = (value: string) => {
    let normalizedValue = (value ?? '').trim().replace(/[\t\r\n]/g, '');

    if (PLACEHOLDER_WRAPPER_PATTERN.test(normalizedValue)) {
        normalizedValue = normalizedValue.substring(2, normalizedValue.length - 1).trim();
    }

    return normalizedValue.slice(0, MAX_PLACEHOLDER_NAME_LENGTH);
};

const normalizeDelimiter = (value: string) => {
    if (value === undefined || value === null) return DEFAULT_DELIMITER;

    return value.replace(/[\t\r\n]/g, '').slice(0, MAX_DELIMITER_LENGTH);
};

const splitStringData = (value: string) => {
    if (!value?.length) return ['', DEFAULT_PLACEHOLDER_NAME, DEFAULT_DELIMITER];

    const parts = value.split('\t');

    if (parts.length === 1) return [parts[0], DEFAULT_PLACEHOLDER_NAME, DEFAULT_DELIMITER];
    if (parts.length === 2) return [parts[0], parts[1], DEFAULT_DELIMITER];

    return [parts[0], parts[1], parts[2]];
};

/** The placeholder name Habbo suggests for a variable: no `@`/`~` prefix, dots as underscores. */
const flatVariableName = (name: string) => (name ?? '').replace('@', '').replace('~', '').replace(/\./g, '_');

/** Global and context variables have one value, so they have no "multiple" placeholder. */
const isSingleValueTarget = (target: VariableTargetType) => target === 'global' || target === 'context';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

const serializeStringData = (variableToken: string, placeholderName: string, delimiter: string) =>
    `${variableToken || ''}\t${normalizePlaceholderName(placeholderName)}\t${normalizeDelimiter(delimiter)}`;

export const WiredExtraTextOutputVariableView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [targetType, setTargetType] = useState<VariableTargetType>('user');
    const [variableToken, setVariableToken] = useState('');
    const [displayType, setDisplayType] = useState(DISPLAY_NUMERIC);
    const [placeholderType, setPlaceholderType] = useState(TYPE_SINGLE);
    const [placeholderName, setPlaceholderName] = useState(DEFAULT_PLACEHOLDER_NAME);
    const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
    const [userSource, setUserSource] = useState(0);
    const [furniSource, setFurniSource] = useState(0);
    // Each variable target remembers the variable last chosen on it while the editor is open.
    const selectionByTarget = useRef<Partial<Record<VariableTargetType, string>>>({});

    const targetDefinitions = useMemo(
        () => getTargetDefinitions(targetType, userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetType, userVariableDefinitions]
    );
    const variableEntries = useMemo(() => buildWiredVariablePickerEntries(targetType, 'change-reference', targetDefinitions), [targetDefinitions, targetType]);
    const resolvedVariableEntries = useMemo(() => {
        if (!variableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === variableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(targetType, variableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [targetType, variableEntries, variableToken]);

    const selectedCustomDefinition = useMemo(() => {
        if (!isCustomVariableToken(variableToken)) return null;

        const itemId = getCustomVariableItemId(variableToken);

        return targetDefinitions.find((definition) => definition.itemId === itemId) ?? null;
    }, [targetDefinitions, variableToken]);

    const canUseTextDisplay = !!selectedCustomDefinition?.isTextConnected;
    // A stored custom variable whose definition has not arrived yet: keep its saved display mode.
    const definitionPending = isCustomVariableToken(variableToken) && !selectedCustomDefinition;
    const textDisplayAllowed = canUseTextDisplay || definitionPending;

    const variableName = (token: string) => {
        if (!token) return '';

        return flattenWiredVariablePickerEntries(resolvedVariableEntries).find((entry) => entry.token === token)?.displayLabel ?? '';
    };

    useEffect(() => {
        if (!trigger) return;

        const [nextVariableToken, nextPlaceholderName, nextDelimiter] = splitStringData(trigger.stringData);

        // Official layout: [every holder 0/1, variable target (official ids), text mode 0/1]; the
        // holders' sources in the official slots.
        setTargetType(normalizeTargetType(trigger.intData.length > 1 ? fromOfficialVariableTarget(trigger.intData[1]) : TARGET_USER));
        setVariableToken(normalizeVariableTokenFromWire(nextVariableToken));
        setDisplayType(trigger.intData[2] === 1 ? DISPLAY_TEXTUAL : DISPLAY_NUMERIC);
        setPlaceholderType(trigger.intData[0] === 1 ? TYPE_MULTIPLE : TYPE_SINGLE);
        setUserSource(normalizeUserSource(trigger.userSourceTypes?.[0] ?? 0));
        setFurniSource(normalizeFurniSource(trigger.furniSourceTypes?.[0] ?? 0));
        setPlaceholderName(normalizePlaceholderName(nextPlaceholderName));
        setDelimiter(normalizeDelimiter(nextDelimiter));
        setFurniIds([...(trigger.selectedItems ?? [])]);
        selectionByTarget.current = {};
    }, [setFurniIds, trigger]);

    useEffect(() => {
        if (textDisplayAllowed || displayType !== DISPLAY_TEXTUAL) return;

        setDisplayType(DISPLAY_NUMERIC);
    }, [textDisplayAllowed, displayType]);

    useEffect(() => {
        if (isSingleValueTarget(targetType) && placeholderType === TYPE_MULTIPLE) setPlaceholderType(TYPE_SINGLE);
    }, [placeholderType, targetType]);

    const previewToken = useMemo(() => {
        const effectiveName = normalizePlaceholderName(placeholderName) || 'placeholder';

        return `$(${effectiveName})`;
    }, [placeholderName]);

    const previewHtml = useMemo(() => LocalizeText('wiredfurni.params.texts.placeholder_preview', ['placeholder'], [escapeHtml(previewToken)]), [previewToken]);

    const save = () => {
        setIntParams([
            normalizePlaceholderType(placeholderType) === TYPE_MULTIPLE ? 1 : 0,
            toOfficialVariableTarget(getTargetValue(targetType)),
            textDisplayAllowed && normalizeDisplayType(displayType) === DISPLAY_TEXTUAL ? 1 : 0
        ]);
        setSourceTypes({ furni: [normalizeFurniSource(furniSource)], users: [normalizeUserSource(userSource)] });
        setStringParam(serializeStringData(variableToken, placeholderName, delimiter));
        setFurniIds(targetType === 'furni' && furniSource === 100 ? [...furniIds] : []);
    };

    const validate = () => {
        return !!variableToken;
    };

    const footer = useMemo(() => {
        if (targetType === 'global') {
            return (
                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.variables"
                    options={[{ value: 0, label: 'wiredfurni.params.sources.global' }]}
                    value={0}
                    selectionKind="primary"
                    selectionActive={false}
                    selectionCount={0}
                    selectionLimit={0}
                    selectionEnabledValues={[]}
                    showSelectionToggle={false}
                    onChange={() => null}
                />
            );
        }

        if (targetType === 'context') {
            return (
                <WiredFurniSelectionSourceRow
                    title="wiredfurni.params.sources.merged.title.variables"
                    options={[{ value: 0, label: localizeWithFallback('wiredfurni.params.sources.context', 'Current execution') }]}
                    value={0}
                    selectionKind="primary"
                    selectionActive={false}
                    selectionCount={0}
                    selectionLimit={0}
                    selectionEnabledValues={[]}
                    showSelectionToggle={false}
                    onChange={() => null}
                />
            );
        }

        return (
            <WiredSourcesSelector
                showFurni={targetType === 'furni'}
                showUsers={targetType === 'user'}
                furniSource={furniSource}
                userSource={userSource}
                furniTitle="wiredfurni.params.sources.merged.title.variables"
                usersTitle="wiredfurni.params.sources.merged.title.variables"
                onChangeFurni={(value) => setFurniSource(normalizeFurniSource(value))}
                onChangeUsers={(value) => setUserSource(normalizeUserSource(value))}
            />
        );
    }, [furniSource, targetType, userSource]);

    const handleTargetChange = (nextTargetType: VariableTargetType) => {
        if (nextTargetType === targetType) return;

        selectionByTarget.current[targetType] = variableToken;
        setTargetType(nextTargetType);
        setVariableToken(selectionByTarget.current[nextTargetType] ?? '');
    };

    // Habbo's rule: the name follows the chosen variable while it is empty or still the name it
    // suggested for the previous variable; a name the user typed stays.
    const handleVariableSelect = (token: string) => {
        const previousName = variableName(variableToken);
        const currentName = normalizePlaceholderName(placeholderName);

        if (!currentName.length || (previousName && normalizePlaceholderName(flatVariableName(previousName)) === currentName)) {
            setPlaceholderName(normalizePlaceholderName(flatVariableName(variableName(token))));
        }

        setVariableToken(token);
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={
                targetType === 'furni' ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT : WiredFurniType.STUFF_SELECTION_OPTION_NONE
            }
            save={save}
            validate={validate}
            cardStyle={{ width: 400 }}
            footerCollapsible={false}
            footer={footer}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.placeholder_name')}</Text>
                    <OctaneInput
                        maxLength={MAX_PLACEHOLDER_NAME_LENGTH}
                        type="text"
                        value={placeholderName}
                        onChange={(event) => setPlaceholderName(normalizePlaceholderName(event.target.value))}
                    />
                </div>

                <WiredPlaceholderPreview previewHtml={previewHtml} previewToken={previewToken} />

                <div className="octane-wired__give-var-heading">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                    <div className="octane-wired__give-var-targets">
                        {TARGET_BUTTONS.map((button) => (
                            <BaseButton
                                key={button.key}
                                type="button"
                                disabled={button.disabled}
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${targetType === button.key ? 'is-active' : ''}`}
                                onClick={() => handleTargetChange(button.key)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </BaseButton>
                        ))}
                    </div>
                </div>

                <WiredVariablePicker
                    entries={resolvedVariableEntries}
                    recentScope="variable-text-output"
                    selectedToken={variableToken}
                    onSelect={(entry) => handleVariableSelect(entry.token)}
                />

                <div className="octane-wired__give-var-section">
                    <Text>{LocalizeText('wiredfurni.params.texts.variable_display_type')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={displayType === DISPLAY_NUMERIC} name="wiredTextOutputVariableDisplayType" onCheckedChange={() => setDisplayType(DISPLAY_NUMERIC)} />
                        <Text>{LocalizeText('wiredfurni.params.texts.variable_display_type.1')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={displayType === DISPLAY_TEXTUAL} disabled={!textDisplayAllowed} name="wiredTextOutputVariableDisplayType" onCheckedChange={() => setDisplayType(DISPLAY_TEXTUAL)} />
                        <Text>{LocalizeText('wiredfurni.params.texts.variable_display_type.2')}</Text>
                    </label>
                    <Text small>{LocalizeText('wiredfurni.params.texts.variable_display_type.2.info')}</Text>
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.placeholder_type')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={placeholderType === TYPE_SINGLE} name="wiredTextOutputVariablePlaceholderType" onCheckedChange={() => setPlaceholderType(TYPE_SINGLE)} />
                        <Text>{LocalizeText('wiredfurni.params.texts.placeholder_type.1')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={placeholderType === TYPE_MULTIPLE} disabled={isSingleValueTarget(targetType)} name="wiredTextOutputVariablePlaceholderType" onCheckedChange={() => setPlaceholderType(TYPE_MULTIPLE)} />
                        <Text>{LocalizeText('wiredfurni.params.texts.placeholder_type.2')}</Text>
                    </label>
                </div>

                {placeholderType === TYPE_MULTIPLE && (
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.texts.select_delimiter')}</Text>
                        <OctaneInput
                            maxLength={MAX_DELIMITER_LENGTH}
                            type="text"
                            value={delimiter}
                            onChange={(event) => setDelimiter(normalizeDelimiter(event.target.value))}
                        />
                    </div>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
