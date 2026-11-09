import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createCustomVariableToken,
    createFallbackVariableEntry,
    createInternalVariableToken,
    flattenWiredVariablePickerEntries,
    getCustomVariableItemId,
    IWiredVariablePickerEntry
} from '../WiredVariablePickerData';
import { fromWiredVariableId, toWiredVariableId, wiredVariableIdTarget } from '../WiredVariableIds';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MAX_NAME_LENGTH = 40;

export type EchoSourceTarget = 'user' | 'furni' | 'global' | 'context';

/** AIR's source selector: furni, user, global, context. */
const TARGET_BUTTONS: Array<{ key: EchoSourceTarget; icon: string }> = [
    { key: 'furni', icon: furniVariableIcon },
    { key: 'user', icon: userVariableIcon },
    { key: 'global', icon: globalVariableIcon },
    { key: 'context', icon: contextVariableIcon }
];

/** The target prefix of a built-in source's variable id, as the server's variable catalog names its targets. */
const LEGACY_TARGETS: Record<number, EchoSourceTarget> = { 0: 'user', 1: 'furni', 2: 'context', 3: 'global' };

interface IEchoDefinition {
    itemId: number;
}

const normalizeVariableName = (value: string) => {
    let normalizedValue = (value ?? '').replace(/[\t\r\n]/g, '');

    if (normalizedValue.includes('=')) normalizedValue = normalizedValue.substring(0, normalizedValue.indexOf('=')).trim();

    while (normalizedValue.startsWith('@') || normalizedValue.startsWith('~')) {
        normalizedValue = normalizedValue.substring(1);
    }

    normalizedValue = normalizedValue.replace(/\s+/g, '_');
    normalizedValue = normalizedValue.replace(/[^A-Za-z0-9_]/g, '');

    return normalizedValue.slice(0, MAX_NAME_LENGTH);
};

/** AIR's flatVariableName: the source's name as a name of its own (no `@` / `~`, other signs as `_`). */
export const flatVariableName = (value: string) =>
    (value ?? '')
        .replace(/^[~@]+/, '')
        .replace(/[^A-Za-z0-9_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, MAX_NAME_LENGTH);

const handleVariableNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, setValue: (value: string) => void) => {
    if (event.key !== ' ') return;

    event.preventDefault();

    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const nextValue = `${input.value.substring(0, start)}_${input.value.substring(end)}`;

    setValue(normalizeVariableName(nextValue));

    window.requestAnimationFrame(() => input.setSelectionRange(Math.min(start + 1, input.value.length + 1), Math.min(start + 1, input.value.length + 1)));
};

/** The source's variable id as the variable list names it: `<target>:<box id>`, Habbo's id for a built-in. */
export const writeEchoSourceId = (target: EchoSourceTarget, token: string) => toWiredVariableId(target, token);

/**
 * The editor state the server sent: AIR's name and source id, or the JSON string of our earlier editor. A box's variable
 * is listed under the target whose definitions hold it.
 */
export const readEchoEditor = (
    stringData: string,
    variableIds: string[],
    definitions: Record<EchoSourceTarget, IEchoDefinition[]>
): { name: string; target: EchoSourceTarget; token: string } => {
    if (stringData?.trim().startsWith('{')) {
        try {
            const legacy = JSON.parse(stringData) as { variableName?: string; sourceTargetType?: number; sourceVariableToken?: string };

            return { name: legacy.variableName ?? '', target: LEGACY_TARGETS[legacy.sourceTargetType ?? 0] ?? 'user', token: (legacy.sourceVariableToken ?? '').trim() };
        } catch {
            return { name: '', target: 'user', token: '' };
        }
    }

    const id = (variableIds?.[0] ?? '').trim();
    const token = fromWiredVariableId(id);
    const named = wiredVariableIdTarget(id);

    if (token.startsWith('internal:')) return { name: stringData ?? '', target: named ?? 'user', token: createInternalVariableToken(token.slice('internal:'.length)) };

    // Our earlier editors sent a box's variable as its bare id: it is listed under the target whose definitions hold it.
    const itemId = getCustomVariableItemId(token);
    const target =
        named ?? (Object.keys(definitions) as EchoSourceTarget[]).find((key) => definitions[key].some((definition) => definition.itemId === itemId)) ?? 'user';

    return { name: stringData ?? '', target, token: createCustomVariableToken(itemId) };
};

/**
 * AIR's echo variable (EchoVariable): the variable's name, then the variable it echoes from the furni, user, global or
 * context list. The name follows the chosen variable while it was empty or still the previous variable's name.
 */
export const WiredExtraVariableEchoView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const [variableName, setVariableName] = useState('');
    const [sourceTargetType, setSourceTargetType] = useState<EchoSourceTarget>('user');
    const [sourceVariableToken, setSourceVariableToken] = useState('');
    const lastAutoName = useRef('');

    const definitionsByTarget = useMemo(
        () => ({ user: userVariableDefinitions, furni: furniVariableDefinitions, global: roomVariableDefinitions, context: contextVariableDefinitions }),
        [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions]
    );

    const variableEntries = useMemo(
        () => buildWiredVariablePickerEntries(sourceTargetType, 'echo', definitionsByTarget[sourceTargetType]),
        [definitionsByTarget, sourceTargetType]
    );
    const resolvedVariableEntries = useMemo(() => {
        if (!sourceVariableToken) return variableEntries;
        if (flattenWiredVariablePickerEntries(variableEntries).some((entry) => entry.token === sourceVariableToken)) return variableEntries;

        const fallbackEntry = createFallbackVariableEntry(sourceTargetType, sourceVariableToken);

        return fallbackEntry ? [fallbackEntry, ...variableEntries] : variableEntries;
    }, [sourceTargetType, sourceVariableToken, variableEntries]);

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setSourceTargetType('user');
            setSourceVariableToken('');
            lastAutoName.current = '';
            return;
        }

        const state = readEchoEditor(trigger.stringData ?? '', trigger.variableIds ?? [], definitionsByTarget);

        setVariableName(normalizeVariableName(state.name));
        setSourceTargetType(state.target);
        setSourceVariableToken(state.token);
        lastAutoName.current = '';
        // The definitions only resolve the target when the editor opens.
    }, [trigger]);

    const selectSource = (entry: IWiredVariablePickerEntry) => {
        const previous = flattenWiredVariablePickerEntries(resolvedVariableEntries).find((candidate) => candidate.token === sourceVariableToken);
        const previousName = lastAutoName.current || (previous ? flatVariableName(previous.displayLabel) : '');
        const nextName = flatVariableName(entry.displayLabel);

        if (!variableName || variableName === previousName) {
            setVariableName(normalizeVariableName(nextName));
            lastAutoName.current = normalizeVariableName(nextName);
        }

        setSourceVariableToken(entry.token);
    };

    const save = () => {
        setIntParams([]);
        setStringParam(normalizeVariableName(variableName));
        setVariableIds(sourceVariableToken ? [writeEchoSourceId(sourceTargetType, sourceVariableToken)] : []);
    };

    const validate = () => !!sourceVariableToken;

    const handleTargetTypeChange = (nextValue: EchoSourceTarget) => {
        if (nextValue === sourceTargetType) return;

        setSourceTargetType(nextValue);
        setSourceVariableToken('');
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                validate={validate}
                cardStyle={{ width: 244 }}
            >
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                        <OctaneInput
                            maxLength={MAX_NAME_LENGTH}
                            type="text"
                            value={variableName}
                            onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                            onKeyDown={(event) => handleVariableNameKeyDown(event, setVariableName)}
                        />
                    </div>

                    <div className="octane-wired__give-var-heading">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_selection')}</Text>
                        <div className="octane-wired__give-var-targets" role="radiogroup">
                            {TARGET_BUTTONS.map((button) => (
                                <BaseButton
                                    key={button.key}
                                    type="button"
                                    aria-checked={sourceTargetType === button.key}
                                    aria-label={button.key}
                                    role="radio"
                                    className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${sourceTargetType === button.key ? 'is-active' : ''}`}
                                    onClick={() => handleTargetTypeChange(button.key)}
                                >
                                    <img src={button.icon} alt={button.key} />
                                </BaseButton>
                            ))}
                        </div>
                    </div>

                    <WiredVariablePicker
                        entries={resolvedVariableEntries as IWiredVariablePickerEntry[]}
                        recentScope="variable-echo"
                        selectedToken={sourceVariableToken}
                        onSelect={selectSource}
                    />
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
