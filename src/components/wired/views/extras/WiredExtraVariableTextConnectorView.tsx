import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const DEFAULT_CONNECTOR_PLACEHOLDER = '0=text 1\n1=text 2\n2 = text 3';
const MAX_CONNECTOR_LINES = 30;
const MAX_CONNECTOR_CHARACTERS = 1000;

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

    useEffect(() => {
        if (!trigger) return;

        setMappingsText(truncateMappingsText(trigger.stringData || ''));
    }, [trigger]);

    const save = () => {
        setIntParams([]);
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
                <Text small>{`${lineCount}/${MAX_CONNECTOR_LINES} righe - ${characterCount}/${MAX_CONNECTOR_CHARACTERS} caratteri`}</Text>
                <WiredTextFormattingHelp />
            </div>
        </WiredExtraBaseView>
    );
};
