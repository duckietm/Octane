import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { parseVariableDefinition, serializeVariableDefinition, VariableDefinitionArrayEditor, WiredVariableDefinitionData } from '../WiredArrayControls';
import { WiredExtraBaseView } from './WiredExtraBaseView';

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

export const WiredExtraContextVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [definition, setDefinition] = useState<WiredVariableDefinitionData>(() => parseVariableDefinition(''));
    const [hasValue, setHasValue] = useState(false);

    useEffect(() => {
        if (!trigger) return;

        const nextDefinition = parseVariableDefinition(trigger.stringData);

        setDefinition({ ...nextDefinition, name: normalizeVariableName(nextDefinition.name) });
        setHasValue(nextDefinition.valueShape === 'array' || (trigger.intData.length > 0 ? trigger.intData[0] === 1 : false));
    }, [trigger]);

    const save = () => {
        setStringParam(serializeVariableDefinition({ ...definition, name: normalizeVariableName(definition.name) }));
        setIntParams([definition.valueShape === 'array' || hasValue ? 1 : 0]);
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
                        if (nextDefinition.valueShape === 'array') setHasValue(true);
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
            </div>
        </WiredExtraBaseView>
    );
};
