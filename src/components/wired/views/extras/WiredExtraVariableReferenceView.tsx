import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const MAX_NAME_LENGTH = 40;
/** AIR wired context SHARED_VARIABLE_LIST: the shared variables of the owner's other rooms. */
const SHARED_VARIABLE_LIST_CONTEXT = 4;

export interface IReferenceSharedVariable {
    roomId: number;
    roomName: string;
    variableId: string;
    variableName: string;
}

interface IReferenceRoom {
    roomId: number;
    roomName: string;
    variables: IReferenceSharedVariable[];
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

/** Our earlier editor's JSON string: the shared variable as room, item id and target (0 user, 3 global). */
const readLegacyEditor = (stringData: string) => {
    try {
        const legacy = JSON.parse(stringData) as { variableName?: string; sourceVariableItemId?: number; sourceTargetType?: number; readOnly?: boolean };
        const itemId = legacy.sourceVariableItemId ?? 0;

        return {
            name: legacy.variableName ?? '',
            readOnly: legacy.readOnly !== false,
            variableId: itemId > 0 ? `${legacy.sourceTargetType === 3 ? 'room' : 'user'}:${itemId}` : ''
        };
    } catch {
        return { name: '', readOnly: true, variableId: '' };
    }
};

/** The editor state as AIR's ReferenceVariable reads it: name, [readOnly], the shared variable's id and the shared list. */
export const readReferenceEditor = (trigger: {
    stringData?: string;
    intData?: number[];
    variableIds?: string[];
    contexts?: Array<{ type: number; sharedVariables?: Array<{ roomId: number; roomName: string; variable: { variableId: string; variableName: string } }> }>;
}) => {
    const shared: IReferenceSharedVariable[] = (trigger.contexts ?? [])
        .filter((context) => context.type === SHARED_VARIABLE_LIST_CONTEXT)
        .flatMap((context) => context.sharedVariables ?? [])
        .map((entry) => ({ roomId: entry.roomId, roomName: entry.roomName, variableId: entry.variable.variableId, variableName: entry.variable.variableName }));
    const stringData = trigger.stringData ?? '';

    if (stringData.trim().startsWith('{')) return { ...readLegacyEditor(stringData), shared };

    return { name: stringData, readOnly: (trigger.intData?.[0] ?? 1) !== 0, variableId: trigger.variableIds?.[0] ?? '', shared };
};

/** AIR's rooms, sorted by name, each with its shared variables. */
const groupByRoom = (shared: IReferenceSharedVariable[]): IReferenceRoom[] => {
    const rooms = new Map<number, IReferenceRoom>();

    for (const variable of shared) {
        if (!rooms.has(variable.roomId)) rooms.set(variable.roomId, { roomId: variable.roomId, roomName: variable.roomName, variables: [] });

        rooms.get(variable.roomId).variables.push(variable);
    }

    return [...rooms.values()].sort((a, b) => a.roomName.localeCompare(b.roomName));
};

/**
 * AIR's reference variable (ReferenceVariable): the name, the room of the owner and its shared variable, and read only.
 * Ints `[readOnly]`, string the name, variable ids `[shared variable]`. The name follows the chosen variable while it was
 * empty or still the previous variable's name.
 */
export const WiredExtraVariableReferenceView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [readOnly, setReadOnly] = useState(true);
    const [variableId, setVariableId] = useState('');
    const [roomId, setRoomId] = useState(-1);
    const [shared, setShared] = useState<IReferenceSharedVariable[]>([]);

    useEffect(() => {
        if (!trigger) return;

        const state = readReferenceEditor(trigger);

        setVariableName(normalizeVariableName(state.name));
        setReadOnly(state.readOnly);
        setVariableId(state.variableId);
        setShared(state.shared);
        setRoomId(state.shared.find((variable) => variable.variableId === state.variableId)?.roomId ?? -1);
    }, [trigger]);

    const rooms = useMemo(() => groupByRoom(shared), [shared]);
    const roomVariables = rooms.find((room) => room.roomId === roomId)?.variables ?? [];
    const disabled = !shared.length;

    const selectVariable = (nextId: string) => {
        const previous = shared.find((variable) => variable.variableId === variableId);
        const next = roomVariables.find((variable) => variable.variableId === nextId);

        if (!variableName || (previous && previous.variableName === variableName)) setVariableName(normalizeVariableName(next?.variableName ?? ''));

        setVariableId(next ? nextId : '');
    };

    const selectRoom = (nextRoomId: number) => {
        if (nextRoomId === roomId) return;

        setRoomId(nextRoomId);
        selectVariable('');
    };

    const save = () => {
        setIntParams([readOnly ? 1 : 0]);
        setStringParam(normalizeVariableName(variableName));
        setVariableIds(variableId ? [variableId] : []);
    };

    const validate = () => !!normalizeVariableName(variableName).length && !!variableId;

    return (
        <NativeTextTree>
            <WiredExtraBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                validate={validate}
                cardStyle={{ width: 400 }}
            >
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                        <OctaneInput
                            disabled={disabled}
                            maxLength={MAX_NAME_LENGTH}
                            type="text"
                            value={variableName}
                            onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                            onKeyDown={(event) => handleVariableNameKeyDown(event, setVariableName)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.room_selection')}</Text>
                        <Select
                            aria-label={LocalizeText('wiredfurni.params.variables.room_selection.tooltip')}
                            className="form-select form-select-sm"
                            disabled={disabled}
                            value={roomId}
                            onChange={(event) => selectRoom(parseInt(event.target.value, 10))}
                        >
                            <option value={-1}>{LocalizeText('wiredfurni.params.variables.room_selection.tooltip')}</option>
                            {rooms.map((room) => (
                                <option key={room.roomId} value={room.roomId}>
                                    {room.roomName}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_ref_selection')}</Text>
                        <Select
                            aria-label={LocalizeText('wiredfurni.params.variables.variable_selection.tooltip')}
                            className="form-select form-select-sm"
                            disabled={disabled}
                            value={variableId}
                            onChange={(event) => selectVariable(event.target.value)}
                        >
                            <option value="">{LocalizeText('wiredfurni.params.variables.variable_selection.tooltip')}</option>
                            {roomVariables.map((variable) => (
                                <option key={variable.variableId} value={variable.variableId}>
                                    {variable.variableName}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.settings')}</Text>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={readOnly} disabled={disabled} onCheckedChange={(nextChecked) => setReadOnly(nextChecked)} />
                            <Text>{LocalizeText('wiredfurni.params.variables.settings.read_only')}</Text>
                        </label>
                    </div>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
