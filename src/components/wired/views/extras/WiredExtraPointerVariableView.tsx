import { FC, useEffect, useMemo, useState } from 'react';
import { BaseButton } from '../../../../common/BaseButton';
import {
    isPointerAccessorCandidate,
    LocalizeText,
    POINTER_SOURCE_CONTEXT,
    POINTER_SOURCE_FURNI,
    POINTER_SOURCE_GLOBAL,
    POINTER_SOURCE_USER,
    readPointerEditor,
    WiredFurniType,
    writePointerEditor
} from '../../../../api';
import contextVariableIcon from '../../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createCustomVariableToken, getCustomVariableItemId, IWiredVariablePickerEntry } from '../WiredVariablePickerData';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MAX_NAME_LENGTH = 40;

/** AIR's header source type selector: the variable list the pointer is listed in. */
const SOURCE_BUTTONS: Array<{ value: number; key: string; icon: string }> = [
    { value: POINTER_SOURCE_FURNI, key: 'furni', icon: furniVariableIcon },
    { value: POINTER_SOURCE_USER, key: 'user', icon: userVariableIcon },
    { value: POINTER_SOURCE_GLOBAL, key: 'global', icon: globalVariableIcon },
    { value: POINTER_SOURCE_CONTEXT, key: 'context', icon: contextVariableIcon }
];

const normalizeVariableName = (value: string) => {
    let normalizedValue = (value ?? '').replace(/[\t\r\n]/g, '');

    if(normalizedValue.includes('=')) normalizedValue = normalizedValue.substring(0, normalizedValue.indexOf('=')).trim();

    while(normalizedValue.startsWith('@') || normalizedValue.startsWith('~')) normalizedValue = normalizedValue.substring(1);

    normalizedValue = normalizedValue.replace(/\s+/g, '_');
    normalizedValue = normalizedValue.replace(/[^A-Za-z0-9_]/g, '');

    return normalizedValue.slice(0, MAX_NAME_LENGTH);
};

/**
 * The official pointer variable editor (AIR `PointerVariable`): the usage note, the variable's name and the accessor,
 * a context variable that holds the furni id of the pointed variable's WIRED box while a stack runs. The header
 * selector picks which variable list (furni, user, global, context) the pointer is listed in.
 */
export const WiredExtraPointerVariableView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null } = useWired();
    const { contextVariableDefinitions = [] } = useWiredTools();
    const [variableName, setVariableName] = useState('');
    const [sourceType, setSourceType] = useState(POINTER_SOURCE_FURNI);
    const [accessorToken, setAccessorToken] = useState('');

    useEffect(() => {
        if(!trigger) return;

        const state = readPointerEditor(trigger.intData ?? [], trigger.stringData ?? '', trigger.variableIds ?? []);

        setVariableName(normalizeVariableName(state.name));
        setSourceType(state.sourceType);
        setAccessorToken(createCustomVariableToken(state.accessorId));
    }, [trigger]);

    // AIR's accessor filter: a user-made context variable with a value that needs no running stack.
    const accessorEntries = useMemo(
        () => buildWiredVariablePickerEntries('context', 'change-reference', contextVariableDefinitions.filter(isPointerAccessorCandidate))
            .filter((entry) => entry.kind === 'custom'),
        [contextVariableDefinitions]
    );

    const save = () => {
        const data = writePointerEditor({ sourceType, name: normalizeVariableName(variableName), accessorId: getCustomVariableItemId(accessorToken) });

        setIntParams(data.intParams);
        setStringParam(data.stringParam);
        setVariableIds(data.variableIds);
    };

    const validate = () => !!normalizeVariableName(variableName) && getCustomVariableItemId(accessorToken) > 0;

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 280 }}>
            <div className="flex flex-col gap-2">
                <div className="octane-wired__give-var-targets" role="radiogroup">
                    {SOURCE_BUTTONS.map((button) => (
                        <BaseButton
                            key={button.key}
                            type="button"
                            aria-checked={sourceType === button.value}
                            aria-label={button.key}
                            role="radio"
                            className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${sourceType === button.value ? 'is-active' : ''}`}
                            onClick={() => setSourceType(button.value)}
                        >
                            <img src={button.icon} alt={button.key} />
                        </BaseButton>
                    ))}
                </div>
                <Text small className="whitespace-pre-line">{LocalizeText('wiredfurni.params.variables.pointer.usage_info').replace(/\\n/g, '\n')}</Text>
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.variable_name')}</Text>
                    <OctaneInput
                        maxLength={MAX_NAME_LENGTH}
                        type="text"
                        value={variableName}
                        onChange={(event) => setVariableName(normalizeVariableName(event.target.value))}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Text>{LocalizeText('wiredfurni.params.variables.pointer.accessor')}</Text>
                    <WiredVariablePicker
                        entries={accessorEntries as IWiredVariablePickerEntry[]}
                        recentScope="variable-pointer"
                        selectedToken={accessorToken}
                        onSelect={(entry) => setAccessorToken(entry.token)}
                        onClear={() => setAccessorToken('')}
                    />
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
