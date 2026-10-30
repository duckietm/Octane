import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MAX_NAME_LENGTH = 40;
const SPLITTER = '\t';

const normalizeVariableName = (value: string) => {
    let normalizedValue = (value ?? '').replace(/[\t\r\n]/g, '');

    if (normalizedValue.includes('=')) normalizedValue = normalizedValue.substring(0, normalizedValue.indexOf('=')).trim();

    while (normalizedValue.startsWith('@') || normalizedValue.startsWith('~')) normalizedValue = normalizedValue.substring(1);

    normalizedValue = normalizedValue.replace(/\s+/g, '_');
    normalizedValue = normalizedValue.replace(/[^A-Za-z0-9_]/g, '');

    return normalizedValue.slice(0, MAX_NAME_LENGTH);
};

/** `name\tcode` as AIR splits it; a string without a tab is the code alone (our earlier daily task editor). */
export const readNamedCode = (stringData: string, maxCodeLength: number): [string, string] => {
    const value = stringData ?? '';
    const split = value.indexOf(SPLITTER);
    const [name, code] = split < 0 ? ['', value] : [value.substring(0, split), value.substring(split + 1)];

    return [normalizeVariableName(name), code.replace(/[\t\r\n]/g, '').slice(0, maxCodeLength)];
};

interface WiredExtraNamedCodeVariableViewProps {
    /** The code section's title key (AIR: variables.quest_name, quest_chain_name, daily_task_name). */
    codeTitleKey: string;
    maxCodeLength: number;
    placeholder?: string;
}

/**
 * AIR's quest, quest chain and daily task variables (QuestVariable, QuestChainVariable, DailyTaskVariable): the
 * variable's name, then the code of the quest, chain or task. No int params; string `name\tcode`.
 */
export const WiredExtraNamedCodeVariableView: FC<WiredExtraNamedCodeVariableViewProps> = ({ codeTitleKey, maxCodeLength, placeholder = '' }) => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [variableName, setVariableName] = useState('');
    const [code, setCode] = useState('');

    useEffect(() => {
        if (!trigger) return;

        const [nextName, nextCode] = readNamedCode(trigger.stringData, maxCodeLength);

        setVariableName(nextName);
        setCode(nextCode);
    }, [maxCodeLength, trigger]);

    const save = () => {
        setIntParams([]);
        setStringParam(`${normalizeVariableName(variableName)}${SPLITTER}${code.replace(/[\t\r\n]/g, '').slice(0, maxCodeLength)}`);
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                        <OctaneInput
                            aria-label={LocalizeText('wiredfurni.params.variables.variable_name')}
                            maxLength={MAX_NAME_LENGTH}
                            type="text"
                            value={variableName}
                            onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>{LocalizeText(codeTitleKey)}</Text>
                        <OctaneInput
                            aria-label={LocalizeText(codeTitleKey)}
                            maxLength={maxCodeLength}
                            placeholder={placeholder}
                            type="text"
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/[\t\r\n]/g, ''))}
                        />
                    </div>
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
