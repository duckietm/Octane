import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const DEFAULT_CONNECTOR_PLACEHOLDER = '0=text 1\n1=text 2\n2 = text 3';
const MAX_CONNECTOR_LINES = 30;
const MAX_CONNECTOR_CHARACTERS = 1000;

interface IConnectorFieldOption {
    id: number;
    name: string;
}

interface IConnectorEditorData {
    fieldId?: number;
    fields?: IConnectorFieldOption[];
    mappingsText?: string;
}

const truncateMappingsText = (value: string) => {
    const normalizedValue = (value ?? '').replace(/\r/g, '');
    const lines = normalizedValue.split('\n');
    const limitedByLines = lines.slice(0, MAX_CONNECTOR_LINES).join('\n');

    return limitedByLines.length > MAX_CONNECTOR_CHARACTERS ? limitedByLines.slice(0, MAX_CONNECTOR_CHARACTERS) : limitedByLines;
};

const getLineCount = (value: string) => {
    if (!value.length) return 0;

    return value.split('\n').length;
};

export const WiredExtraVariableTextConnectorView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mappingsText, setMappingsText] = useState('');
    const [fieldId, setFieldId] = useState(0);
    const [fields, setFields] = useState<IConnectorFieldOption[]>([]);

    useEffect(() => {
        if (!trigger) return;

        const rawValue = trigger.stringData || '';

        if (rawValue.trim().startsWith('{')) {
            try {
                const data = JSON.parse(rawValue) as IConnectorEditorData;

                setMappingsText(truncateMappingsText(data.mappingsText || ''));
                setFieldId(Math.max(0, data.fieldId || 0));
                setFields([...(data.fields || [])].filter((field) => field.id > 0 && !!field.name));
                return;
            } catch {
                // Fall through to the legacy raw text format.
            }
        }

        setMappingsText(truncateMappingsText(rawValue));
        setFieldId(0);
        setFields([]);
    }, [trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam(JSON.stringify({ mappingsText: mappingsText ?? '', fieldId }));
    };

    const handleTextChange = (value: string) => setMappingsText(truncateMappingsText(value));

    const placeholderText = (() => {
        const localizedText = LocalizeText('wiredfurni.params.variables.connect_text.caption');

        if (!localizedText || localizedText === 'wiredfurni.params.variables.connect_text.caption') return DEFAULT_CONNECTOR_PLACEHOLDER;
        if (localizedText.includes('0,text0') || localizedText.includes('1,text1')) return DEFAULT_CONNECTOR_PLACEHOLDER;

        return localizedText;
    })();

    const lineCount = getLineCount(mappingsText);
    const characterCount = mappingsText.length;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 400 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.variables.connect_text.title')}</Text>
                {!!fields.length && (
                    <label className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.array.field')}</Text>
                        <select className="form-select form-select-sm" value={fieldId} onChange={(event) => setFieldId(parseInt(event.target.value, 10) || 0)}>
                            <option value={0}>{LocalizeText('wiredfurni.params.variables.single_value')}</option>
                            {fields.map((field) => (
                                <option key={field.id} value={field.id}>
                                    {field.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <textarea
                    className="form-control form-control-sm octane-wired__resizable-textarea"
                    maxLength={MAX_CONNECTOR_CHARACTERS}
                    placeholder={placeholderText}
                    value={mappingsText}
                    onChange={(event) => handleTextChange(event.target.value)}
                />
                <Text small>{`${lineCount}/${MAX_CONNECTOR_LINES} righe - ${characterCount}/${MAX_CONNECTOR_CHARACTERS} caratteri`}</Text>
                <WiredTextFormattingHelp />
            </div>
        </WiredExtraBaseView>
    );
};
