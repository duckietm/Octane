import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { formatWiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const DEFAULT_CONNECTOR_PLACEHOLDER = '0=text 1\n1=text 2\n2 = text 3\n_=any other value';
const MAX_CONNECTOR_LINES = 30;
const MAX_CONNECTOR_CHARACTERS = 1000;

// AIR's text area shows 30 lines but takes any number of them; the server refuses more than 1000 bytes.
const truncateMappingsText = (value: string) => {
    const normalizedValue = (value ?? '').replace(/\r/g, '');

    return normalizedValue.length > MAX_CONNECTOR_CHARACTERS ? normalizedValue.slice(0, MAX_CONNECTOR_CHARACTERS) : normalizedValue;
};

const getLineCount = (value: string) => {
    if (!value.length) return 0;

    return value.split('\n').length;
};

export const WiredExtraVariableTextConnectorView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [mappingsText, setMappingsText] = useState('');
    const [fieldId, setFieldId] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        // Official: the "value=text" lines as plain text ("_=text" for any other value); ours
        // follows: [array field id].
        setMappingsText(truncateMappingsText(trigger.stringData || ''));
        setFieldId(trigger.intData?.[0] ?? 0);
    }, [trigger]);

    const save = () => {
        setIntParams(fieldId > 0 ? [fieldId] : []);
        setStringParam(mappingsText ?? '');
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
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.variables.connect_text.title')}</Text>
                    <textarea
                        className="form-control form-control-sm octane-wired__resizable-textarea"
                        maxLength={MAX_CONNECTOR_CHARACTERS}
                        placeholder={placeholderText}
                        value={mappingsText}
                        onChange={(event) => handleTextChange(event.target.value)}
                    />
                    <Text small>{formatWiredTextCounter(lineCount, characterCount, MAX_CONNECTOR_CHARACTERS, MAX_CONNECTOR_LINES)}</Text>
                    <WiredTextFormattingHelp />
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
