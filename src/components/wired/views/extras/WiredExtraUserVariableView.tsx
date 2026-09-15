import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { parseVariableDefinition, serializeVariableDefinition, VariableDefinitionArrayEditor, WiredVariableDefinitionData } from '../WiredArrayControls';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const AVAILABILITY_ROOM = 0;
const AVAILABILITY_PERMANENT = 10;
const AVAILABILITY_SHARED = 11;
const MAX_NAME_LENGTH = 40;

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

interface WiredExtraVariableViewProps {
    availabilityRoomValue: number;
    availabilityRoomText: string;
    availabilityRadioName: string;
    showSharedAvailability?: boolean;
}

export const WiredExtraVariableView: FC<WiredExtraVariableViewProps> = (props) => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [definition, setDefinition] = useState<WiredVariableDefinitionData>(() => parseVariableDefinition(''));
    const [hasValue, setHasValue] = useState(false);
    const [availability, setAvailability] = useState(props.availabilityRoomValue);
    const roomAvailabilityText = useMemo(() => {
        const localizedText = props.availabilityRoomText;

        if (localizedText && localizedText !== 'wiredfurni.params.variables.availability.1') return localizedText;

        return localizeWithFallback('wiredfurni.condition.room.active', 'While the room is active');
    }, [props.availabilityRoomText]);
    const normalizeAvailability = useMemo(
        () => (value: number) => {
            if (props.showSharedAvailability && value === AVAILABILITY_SHARED) return AVAILABILITY_SHARED;
            if (value === AVAILABILITY_PERMANENT) return AVAILABILITY_PERMANENT;

            return props.availabilityRoomValue;
        },
        [props.availabilityRoomValue, props.showSharedAvailability]
    );

    useEffect(() => {
        if (!trigger) return;

        const nextDefinition = parseVariableDefinition(trigger.stringData);

        setDefinition({ ...nextDefinition, name: normalizeVariableName(nextDefinition.name) });
        setHasValue(nextDefinition.valueShape === 'array' || (trigger.intData.length > 0 ? trigger.intData[0] === 1 : false));
        const nextAvailability = normalizeAvailability(trigger.intData.length > 1 ? trigger.intData[1] : props.availabilityRoomValue);

        setAvailability(nextAvailability);
    }, [normalizeAvailability, props.availabilityRoomValue, trigger]);

    const save = () => {
        setStringParam(serializeVariableDefinition({ ...definition, name: normalizeVariableName(definition.name) }));
        const nextAvailability = normalizeAvailability(availability);

        setIntParams([definition.valueShape === 'array' || hasValue ? 1 : 0, nextAvailability]);
    };

    const validate = () => {
        if (!definition.name.length) return false;
        if (definition.valueShape !== 'array') return true;
        if (definition.maxEntries < 1 || definition.maxEntries > (definition.serverMaxEntries ?? 2048)) return false;
        if (definition.arrayFormat !== 'record') return true;

        const names = definition.fields.map((field) => field.name.toLowerCase());

        return (
            definition.fields.length >= 1 &&
            definition.fields.length <= 8 &&
            definition.fields.every((field) => !!field.name && !['found', 'index', 'length', 'occupied'].includes(field.name.toLowerCase())) &&
            new Set(names).size === names.length
        );
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
                        value={definition.name}
                        onChange={(event) => setDefinition((current) => ({ ...current, name: normalizeVariableName(event.target.value) }))}
                        onKeyDown={(event) => handleVariableNameKeyDown(event, (value) => setDefinition((current) => ({ ...current, name: value })))}
                    />
                </div>

                <VariableDefinitionArrayEditor
                    definition={definition}
                    onChange={(nextDefinition) => {
                        setDefinition(nextDefinition);
                        if (nextDefinition.valueShape === 'array') {
                            setHasValue(true);
                        }
                    }}
                />

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.settings')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={definition.valueShape === 'array' || hasValue}
                            className="form-check-input"
                            disabled={definition.valueShape === 'array'}
                            type="checkbox"
                            onChange={(event) => setHasValue(event.target.checked)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.settings.has_value')}</Text>
                    </label>
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.availability')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={availability === props.availabilityRoomValue}
                            className="form-check-input"
                            name={props.availabilityRadioName}
                            type="radio"
                            onChange={() => setAvailability(props.availabilityRoomValue)}
                        />
                        <Text>{roomAvailabilityText}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={availability === AVAILABILITY_PERMANENT}
                            className="form-check-input"
                            name={props.availabilityRadioName}
                            type="radio"
                            onChange={() => setAvailability(AVAILABILITY_PERMANENT)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.availability.10')}</Text>
                    </label>
                    {!!props.showSharedAvailability && (
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                checked={availability === AVAILABILITY_SHARED}
                                className="form-check-input"
                                name={props.availabilityRadioName}
                                type="radio"
                                onChange={() => setAvailability(AVAILABILITY_SHARED)}
                            />
                            <Text>{LocalizeText('wiredfurni.params.variables.availability.11')}</Text>
                        </label>
                    )}
                </div>
            </div>
        </WiredExtraBaseView>
    );
};

export const WiredExtraUserVariableView: FC<{}> = () => {
    return (
        <WiredExtraVariableView
            availabilityRadioName="wiredUserVariableAvailability"
            availabilityRoomText={LocalizeText('wiredfurni.params.variables.availability.0')}
            availabilityRoomValue={AVAILABILITY_ROOM}
            showSharedAvailability={true}
        />
    );
};
