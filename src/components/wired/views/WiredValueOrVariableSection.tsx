import { FC, useMemo } from 'react';
import { localizeWithFallback } from '../../../api';
import contextVariableIcon from '../../../assets/images/wired/var/icon_source_context_clean.png';
import furniVariableIcon from '../../../assets/images/wired/var/icon_source_furni.png';
import globalVariableIcon from '../../../assets/images/wired/var/icon_source_global.png';
import userVariableIcon from '../../../assets/images/wired/var/icon_source_user.png';
import { Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectionSourceRow } from './WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources } from './WiredSourcesSelector';
import { WiredVariablePicker } from './WiredVariablePicker';
import {
    buildWiredVariablePickerEntries,
    createCustomVariableToken,
    createFallbackVariableEntry,
    flattenWiredVariablePickerEntries,
    IWiredVariableDefinitionLike,
    IWiredVariablePickerEntry,
    isCustomVariableToken,
    WiredVariablePickerTarget,
    WiredVariablePickerUsage
} from './WiredVariablePickerData';
import { Radio } from '../../../common/Radio';
import { NumberInput } from '../../../common/NumberInput';
import { BaseButton } from '../../../common/BaseButton';

/** Where an official value variable is read, with the official variable target ids. */
export const WIRED_VALUE_TARGETS: Array<{ key: WiredVariablePickerTarget; value: number; icon: string }> = [
    { key: 'furni', value: 0, icon: furniVariableIcon },
    { key: 'user', value: 1, icon: userVariableIcon },
    { key: 'global', value: -10, icon: globalVariableIcon },
    { key: 'context', value: -20, icon: contextVariableIcon }
];

export const normalizeWiredValueTarget = (value: number) => (WIRED_VALUE_TARGETS.some(target => target.value === value) ? value : 0);

const VALUE_FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const VALUE_USER_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 11, label: 'wiredfurni.params.sources.users.11' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' },
        { value: 201, label: 'wiredfurni.params.sources.users.201' }
    ],
    'users'
);

/** The server gives and reads only variables made in the room (custom), not internal ones. */
const customOnly = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] =>
    entries.flatMap(entry =>
    {
        if(entry.children?.length)
        {
            const children = customOnly(entry.children);

            return children.length ? [ { ...entry, children } ] : [];
        }

        return isCustomVariableToken(entry.token) ? [ entry ] : [];
    });

/** Picker entries of the room's own variables, keeping a saved one that is gone. */
export const customVariablePickerEntries = (target: WiredVariablePickerTarget, usage: WiredVariablePickerUsage, definitions: IWiredVariableDefinitionLike[], token: string) =>
{
    const entries = customOnly(buildWiredVariablePickerEntries(target, usage, definitions));

    if(!token || flattenWiredVariablePickerEntries(entries).some(entry => entry.token === token)) return entries;

    const fallback = createFallbackVariableEntry(target, token);

    return fallback ? [ fallback, ...entries ] : entries;
};

/** A variable token from the id the server sends as text. */
export const variableTokenFromId = (text: string) =>
{
    const id = parseInt((text ?? '').trim(), 10);

    return id > 0 ? createCustomVariableToken(id) : '';
};

interface WiredValueOrVariableSectionProps {
    name: string;
    isVariable: boolean;
    value: string;
    target: number;
    token: string;
    furniSource: number;
    userSource: number;
    min?: number;
    /** The variable is read on the box's own selection: no source rows of its own. */
    hideSources?: boolean;
    /** The official targets this box offers (all four by default). */
    targets?: number[];
    onIsVariableChange: (isVariable: boolean) => void;
    onValueChange: (value: string) => void;
    onTargetChange: (target: number) => void;
    onTokenChange: (token: string) => void;
    onFurniSourceChange: (source: number) => void;
    onUserSourceChange: (source: number) => void;
}

/**
 * The official value-or-variable input: a number, or a variable read on the first holder of its
 * target (furni and user read on a source of their own, global and context need none).
 */
export const WiredValueOrVariableSection: FC<WiredValueOrVariableSectionProps> = props =>
{
    const { name, isVariable, value, target, token, furniSource, userSource, min = undefined, hideSources = false, targets = null } = props;
    const { trigger = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const availableUserSources = useAvailableUserSources(trigger, VALUE_USER_SOURCES);
    const targetKey = WIRED_VALUE_TARGETS.find(entry => entry.value === target)?.key ?? 'furni';
    const entries = useMemo(() =>
    {
        const definitions = { furni: furniVariableDefinitions, user: userVariableDefinitions, global: roomVariableDefinitions, context: contextVariableDefinitions }[targetKey];

        return customVariablePickerEntries(targetKey, 'change-reference', definitions.filter(definition => definition.hasValue), token);
    }, [ contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetKey, token, userVariableDefinitions ]);

    const radio = (mode: boolean, label: string) => (
        <label className="flex items-center gap-1">
            <Radio name={ name } checked={ isVariable === mode } onCheckedChange={() => props.onIsVariableChange(mode)} />
            <Text>{ label }</Text>
        </label>
    );

    return (
        <div className="flex flex-col gap-1">
            { radio(false, localizeWithFallback('wiredfurni.params.variables.reference_type.constant', 'Value')) }
            { !isVariable &&
                <NumberInput className="form-control form-control-sm" style={ { width: 110 } } min={ min } value={ value } onChange={ event => props.onValueChange(event.target.value) } /> }
            { radio(true, localizeWithFallback('wiredfurni.params.variables.reference_type.variable', 'Value of a variable')) }
            { isVariable &&
                <>
                    <div className="octane-wired__give-var-targets">
                        { WIRED_VALUE_TARGETS.filter(entry => !targets || targets.includes(entry.value)).map(entry => (
                            <BaseButton
                                key={ entry.key }
                                type="button"
                                className={ `octane-wired__give-var-target octane-wired__give-var-target--${ entry.key } ${ target === entry.value ? 'is-active' : '' }` }
                                onClick={ () =>
                                {
                                    if(entry.value === target) return;
                                    props.onTargetChange(entry.value);
                                    props.onTokenChange('');
                                } }>
                                <img src={ entry.icon } alt={ entry.key } />
                            </BaseButton>
                        )) }
                    </div>
                    <WiredVariablePicker entries={ entries } recentScope="variable-references" selectedToken={ token } onSelect={ entry => props.onTokenChange(entry.token) } />
                    { !hideSources && (target === 0 || target === 1) &&
                        <WiredFurniSelectionSourceRow
                            title="wiredfurni.params.sources.merged.title.variables_reference"
                            options={ target === 1 ? availableUserSources : VALUE_FURNI_SOURCES }
                            value={ target === 1 ? userSource : furniSource }
                            selectionKind="secondary"
                            selectionActive={ false }
                            selectionCount={ 0 }
                            selectionLimit={ 0 }
                            selectionEnabledValues={ [] }
                            showSelectionToggle={ false }
                            onChange={ source => (target === 1 ? props.onUserSourceChange(source) : props.onFurniSourceChange(source)) } /> }
                </> }
        </div>
    );
};
