import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const TARGET_USER = 0;
const TARGET_ROOM = 3;
const MAX_NAME_LENGTH = 40;

interface IVariableReferenceEditorVariable {
    hasValue: boolean;
    itemId: number;
    name: string;
    targetType: number;
}

interface IVariableReferenceEditorRoom {
    roomId: number;
    roomName: string;
    variables: IVariableReferenceEditorVariable[];
}

interface IVariableReferenceEditorData {
    readOnly?: boolean;
    rooms?: IVariableReferenceEditorRoom[];
    sourceRoomId?: number;
    sourceRoomName?: string;
    sourceTargetType?: number;
    sourceVariableItemId?: number;
    sourceVariableName?: string;
    variableName?: string;
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

const parseEditorData = (value: string): IVariableReferenceEditorData => {
    if (!value?.trim().startsWith('{')) return {};

    try {
        return (JSON.parse(value) as IVariableReferenceEditorData) || {};
    } catch {
        return {};
    }
};

export const WiredExtraVariableReferenceView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [sourceRoomId, setSourceRoomId] = useState(0);
    const [sourceVariableItemId, setSourceVariableItemId] = useState(0);
    const [sourceTargetType, setSourceTargetType] = useState(TARGET_USER);
    const [readOnly, setReadOnly] = useState(true);
    const [roomOptions, setRoomOptions] = useState<IVariableReferenceEditorRoom[]>([]);
    const [fallbackRoomName, setFallbackRoomName] = useState('');
    const [fallbackVariableName, setFallbackVariableName] = useState('');

    useEffect(() => {
        if (!trigger) {
            setVariableName('');
            setSourceRoomId(0);
            setSourceVariableItemId(0);
            setSourceTargetType(TARGET_USER);
            setReadOnly(true);
            setRoomOptions([]);
            setFallbackRoomName('');
            setFallbackVariableName('');
            return;
        }

        const editorData = parseEditorData(trigger.stringData);

        setVariableName(normalizeVariableName(editorData.variableName || ''));
        setSourceRoomId(editorData.sourceRoomId || 0);
        setSourceVariableItemId(editorData.sourceVariableItemId || 0);
        setSourceTargetType(editorData.sourceTargetType === TARGET_ROOM ? TARGET_ROOM : TARGET_USER);
        setReadOnly(editorData.readOnly !== false);
        setRoomOptions([...(editorData.rooms || [])]);
        setFallbackRoomName((editorData.sourceRoomName || '').trim());
        setFallbackVariableName((editorData.sourceVariableName || '').trim());
    }, [trigger]);

    const mergedRoomOptions = useMemo(() => {
        const nextValue = [...roomOptions];

        if (sourceRoomId <= 0) return nextValue;
        if (nextValue.some((room) => room.roomId === sourceRoomId)) return nextValue;

        nextValue.push({
            roomId: sourceRoomId,
            roomName: fallbackRoomName || `#${sourceRoomId}`,
            variables:
                sourceVariableItemId > 0
                    ? [
                          {
                              itemId: sourceVariableItemId,
                              name: fallbackVariableName || `#${sourceVariableItemId}`,
                              targetType: sourceTargetType,
                              hasValue: true
                          }
                      ]
                    : []
        });

        return nextValue;
    }, [fallbackRoomName, fallbackVariableName, roomOptions, sourceRoomId, sourceTargetType, sourceVariableItemId]);

    const selectedRoom = useMemo(() => mergedRoomOptions.find((option) => option.roomId === sourceRoomId) ?? null, [mergedRoomOptions, sourceRoomId]);
    const selectedRoomVariables = selectedRoom?.variables || [];

    useEffect(() => {
        if (!selectedRoom) {
            if (!sourceRoomId && mergedRoomOptions.length) setSourceRoomId(mergedRoomOptions[0].roomId);
            return;
        }

        const hasSelectedVariable = selectedRoomVariables.some(
            (variable) => variable.itemId === sourceVariableItemId && variable.targetType === sourceTargetType
        );

        if (hasSelectedVariable) return;

        const fallbackVariable = selectedRoomVariables[0];

        if (!fallbackVariable) {
            setSourceVariableItemId(0);
            setSourceTargetType(TARGET_USER);
            return;
        }

        setSourceVariableItemId(fallbackVariable.itemId);
        setSourceTargetType(fallbackVariable.targetType);
    }, [mergedRoomOptions, selectedRoom, selectedRoomVariables, sourceRoomId, sourceTargetType, sourceVariableItemId]);

    const save = () => {
        setIntParams([]);
        setStringParam(
            JSON.stringify({
                variableName: normalizeVariableName(variableName),
                sourceRoomId,
                sourceVariableItemId,
                sourceTargetType,
                readOnly
            })
        );
    };

    const validate = () => !!normalizeVariableName(variableName).length && sourceRoomId > 0 && sourceVariableItemId > 0;

    const getTargetLabel = (targetType: number) => {
        if (targetType === TARGET_ROOM) {
            const globalLabel = LocalizeText('wiredfurni.params.sources.global');

            return globalLabel && globalLabel !== 'wiredfurni.params.sources.global' ? globalLabel : 'Global';
        }

        return 'User';
    };

    return (
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
                        maxLength={MAX_NAME_LENGTH}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                        onKeyDown={(event) => handleVariableNameKeyDown(event, setVariableName)}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.room_selection')}</Text>
                    <select
                        className="form-select form-select-sm"
                        value={sourceRoomId}
                        onChange={(event) => setSourceRoomId(parseInt(event.target.value, 10) || 0)}
                    >
                        <option value={0}>{LocalizeText('wiredfurni.variable_picker.search')}</option>
                        {mergedRoomOptions.map((option) => (
                            <option key={option.roomId} value={option.roomId}>
                                {option.roomName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_ref_selection')}</Text>
                    <select
                        className="form-select form-select-sm"
                        value={`${sourceVariableItemId}:${sourceTargetType}`}
                        onChange={(event) => {
                            const [nextItemId, nextTargetType] = event.target.value.split(':').map((value) => parseInt(value, 10) || 0);

                            setSourceVariableItemId(nextItemId);
                            setSourceTargetType(nextTargetType === TARGET_ROOM ? TARGET_ROOM : TARGET_USER);
                        }}
                    >
                        <option value="0:0">{LocalizeText('wiredfurni.variable_picker.search')}</option>
                        {selectedRoomVariables.map((variable) => (
                            <option key={`${variable.itemId}:${variable.targetType}`} value={`${variable.itemId}:${variable.targetType}`}>
                                {`${variable.name} (${getTargetLabel(variable.targetType)})`}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.settings')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input checked={readOnly} className="form-check-input" type="checkbox" onChange={(event) => setReadOnly(event.target.checked)} />
                        <Text>{LocalizeText('wiredfurni.params.variables.settings.read_only')}</Text>
                    </label>
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
