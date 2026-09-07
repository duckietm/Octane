import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const AVAILABILITY_ROOM_ACTIVE = 1;
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

export const WiredExtraRoomVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [availability, setAvailability] = useState(AVAILABILITY_ROOM_ACTIVE);
    const [currentValue, setCurrentValue] = useState(0);

    const normalizedCurrentValue = useMemo(() => (Number.isFinite(currentValue) ? currentValue : 0), [currentValue]);

    useEffect(() => {
        if (!trigger) return;

        setVariableName(normalizeVariableName(trigger.stringData));
        const nextAvailability = trigger.intData.length > 0 ? trigger.intData[0] : AVAILABILITY_ROOM_ACTIVE;

        setAvailability(nextAvailability === AVAILABILITY_PERMANENT || nextAvailability === AVAILABILITY_SHARED ? nextAvailability : AVAILABILITY_ROOM_ACTIVE);
        setCurrentValue(trigger.intData.length > 1 ? trigger.intData[1] : 0);
    }, [trigger]);

    const save = () => {
        setStringParam(normalizeVariableName(variableName));
        setIntParams([availability, normalizedCurrentValue]);
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 400 }}>
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
                    <Text>{LocalizeText('wiredfurni.params.variables.availability')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={availability === AVAILABILITY_ROOM_ACTIVE}
                            className="form-check-input"
                            name="wiredRoomVariableAvailability"
                            type="radio"
                            onChange={() => setAvailability(AVAILABILITY_ROOM_ACTIVE)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.availability.1')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={availability === AVAILABILITY_PERMANENT}
                            className="form-check-input"
                            name="wiredRoomVariableAvailability"
                            type="radio"
                            onChange={() => setAvailability(AVAILABILITY_PERMANENT)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.availability.10')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={availability === AVAILABILITY_SHARED}
                            className="form-check-input"
                            name="wiredRoomVariableAvailability"
                            type="radio"
                            onChange={() => setAvailability(AVAILABILITY_SHARED)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.variables.availability.11')}</Text>
                    </label>
                </div>

                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.inspection')}</Text>
                    <Text>{LocalizeText('wiredfurni.params.variables.inspection.current_value', ['value'], [normalizedCurrentValue.toString()])}</Text>
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
