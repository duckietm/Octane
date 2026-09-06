import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredPlaceholderPreview } from './WiredPlaceholderPreview';

const TYPE_SINGLE = 1;
const TYPE_MULTIPLE = 2;
const DEFAULT_PLACEHOLDER_NAME = '';
const DEFAULT_DELIMITER = ', ';
const MAX_PLACEHOLDER_NAME_LENGTH = 32;
const MAX_DELIMITER_LENGTH = 16;
const PLACEHOLDER_WRAPPER_PATTERN = /^\$\((.*)\)$/;

const normalizePlaceholderType = (value: number) => (value === TYPE_MULTIPLE ? TYPE_MULTIPLE : TYPE_SINGLE);
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
    if (!value?.length) return [DEFAULT_PLACEHOLDER_NAME, DEFAULT_DELIMITER];

    const parts = value.split('\t');

    if (parts.length <= 1) return [value, DEFAULT_DELIMITER];

    return [parts[0], parts[1]];
};

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const WiredExtraTextOutputFurniNameView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [placeholderName, setPlaceholderName] = useState(DEFAULT_PLACEHOLDER_NAME);
    const [placeholderType, setPlaceholderType] = useState(TYPE_SINGLE);
    const [delimiter, setDelimiter] = useState(DEFAULT_DELIMITER);
    const [furniSource, setFurniSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const [nextPlaceholderName, nextDelimiter] = splitStringData(trigger.stringData);

        setPlaceholderName(normalizePlaceholderName(nextPlaceholderName));
        setDelimiter(normalizeDelimiter(nextDelimiter));
        setPlaceholderType(normalizePlaceholderType(trigger.intData.length > 0 ? trigger.intData[0] : TYPE_SINGLE));
        setFurniSource(normalizeFurniSource(trigger.intData.length > 1 ? trigger.intData[1] : 0));
    }, [trigger]);

    const previewToken = useMemo(() => {
        const effectiveName = normalizePlaceholderName(placeholderName) || 'placeholder';

        return `$(${effectiveName})`;
    }, [placeholderName]);

    const previewHtml = useMemo(() => LocalizeText('wiredfurni.params.texts.placeholder_preview', ['placeholder'], [escapeHtml(previewToken)]), [previewToken]);

    const save = () => {
        setIntParams([normalizePlaceholderType(placeholderType), normalizeFurniSource(furniSource)]);
        setStringParam(`${normalizePlaceholderName(placeholderName)}\t${normalizeDelimiter(delimiter)}`);
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            cardStyle={{ width: 400 }}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={(value) => setFurniSource(normalizeFurniSource(value))} />}
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
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.texts.placeholder_type')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={placeholderType === TYPE_SINGLE}
                            className="form-check-input"
                            name="wiredTextOutputFurniNameType"
                            type="radio"
                            onChange={() => setPlaceholderType(TYPE_SINGLE)}
                        />
                        <Text>{localizeWithFallback('wiredfurni.params.texts.placeholder_type.furni.1', LocalizeText('wiredfurni.params.texts.placeholder_type.1'))}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            checked={placeholderType === TYPE_MULTIPLE}
                            className="form-check-input"
                            name="wiredTextOutputFurniNameType"
                            type="radio"
                            onChange={() => setPlaceholderType(TYPE_MULTIPLE)}
                        />
                        <Text>{localizeWithFallback('wiredfurni.params.texts.placeholder_type.furni.2', LocalizeText('wiredfurni.params.texts.placeholder_type.2'))}</Text>
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
