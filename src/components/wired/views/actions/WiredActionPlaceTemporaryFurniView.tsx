import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { flattenWiredVariablePickerEntries, getCustomVariableItemId } from '../WiredVariablePickerData';
import { customVariablePickerEntries, normalizeWiredValueTarget, variableTokenFromId, WiredValueOrVariableSection } from '../WiredValueOrVariableSection';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const SOURCE_TRIGGER = 0;
const SOURCE_PICKED = 100;
const MAX_OFFSET = 64;
const MAX_OFFSET_ALTITUDE = 8000;

const TARGET_FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' }
    ],
    'furni'
);

const TARGET_USER_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 11, label: 'wiredfurni.params.sources.users.11' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' },
        { value: 201, label: 'wiredfurni.params.sources.users.201' }
    ],
    'users'
);

const clamp = (value: number, bound: number) => Math.max(-bound, Math.min(bound, isNaN(value) ? 0 : value));

/**
 * The official "place furni" (code 55): places temporary copies of the picked furni, as they were when
 * the box was saved. Int params [targetIsUser, location, altitude, offsetX, offsetY, offsetAltitude,
 * spawnWithVariable, valueIsVariable, value, valueTarget]; furni sources [picks, target furni, value
 * furni], user sources [target user, value user]. Spawning with a variable gives every copy a furni
 * variable; its value is a number or another variable's (value target 0 furni, 1 user, -10 global,
 * -20 context). The two variables travel in the string param as "spawnId\tvalueId".
 */
export const WiredActionPlaceTemporaryFurniView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [ targetIsUser, setTargetIsUser ] = useState(false);
    const [ location, setLocation ] = useState(0);
    const [ altitude, setAltitude ] = useState(0);
    const [ offsetX, setOffsetX ] = useState(0);
    const [ offsetY, setOffsetY ] = useState(0);
    const [ offsetAltitude, setOffsetAltitude ] = useState(0);
    const [ showOffsets, setShowOffsets ] = useState(false);
    const [ targetFurniSource, setTargetFurniSource ] = useState(SOURCE_TRIGGER);
    const [ targetUserSource, setTargetUserSource ] = useState(SOURCE_TRIGGER);
    const [ spawnWithVariable, setSpawnWithVariable ] = useState(false);
    const [ spawnToken, setSpawnToken ] = useState('');
    const [ valueIsVariable, setValueIsVariable ] = useState(false);
    const [ value, setValue ] = useState('0');
    const [ valueTarget, setValueTarget ] = useState(0);
    const [ valueToken, setValueToken ] = useState('');
    const [ valueFurniSource, setValueFurniSource ] = useState(SOURCE_TRIGGER);
    const [ valueUserSource, setValueUserSource ] = useState(SOURCE_TRIGGER);
    const availableUserSources = useAvailableUserSources(trigger, TARGET_USER_SOURCES);
    const { furniVariableDefinitions = [] } = useWiredTools();
    const spawnEntries = useMemo(
        () => customVariablePickerEntries('furni', 'give', furniVariableDefinitions.filter(definition => !definition.isReadOnly), spawnToken),
        [ furniVariableDefinitions, spawnToken ]
    );
    const spawnEntry = flattenWiredVariablePickerEntries(spawnEntries).find(entry => entry.token === spawnToken) ?? null;
    const spawnHasValue = spawnEntry?.hasValue ?? true;

    useEffect(() =>
    {
        if(!trigger) return;

        const params = trigger.intData ?? [];

        setTargetIsUser(params[0] === 1);
        setLocation(params[1] === 1 ? 1 : 0);
        setAltitude([ 1, 2 ].includes(params[2]) ? params[2] : 0);
        setOffsetX(clamp(params[3] ?? 0, MAX_OFFSET));
        setOffsetY(clamp(params[4] ?? 0, MAX_OFFSET));
        setOffsetAltitude(clamp(params[5] ?? 0, MAX_OFFSET_ALTITUDE));
        setShowOffsets(!!(params[3] || params[4] || params[5]));
        setTargetFurniSource(trigger.furniSourceTypes?.[1] ?? SOURCE_TRIGGER);
        setTargetUserSource(trigger.userSourceTypes?.[0] ?? SOURCE_TRIGGER);

        const variables = (trigger.stringData ?? '').split('\t');

        setSpawnWithVariable(params[6] === 1);
        setValueIsVariable(params[7] === 1);
        setValue(String(params[8] ?? 0));
        setValueTarget(normalizeWiredValueTarget(params[9]));
        setSpawnToken(variableTokenFromId(variables[0]));
        setValueToken(variableTokenFromId(variables[1]));
        setValueFurniSource(trigger.furniSourceTypes?.[2] ?? SOURCE_TRIGGER);
        setValueUserSource(trigger.userSourceTypes?.[1] ?? SOURCE_TRIGGER);
    }, [ trigger ]);

    const save = () =>
    {
        const parsedValue = parseInt(value, 10);
        const spawn = [ spawnWithVariable ? 1 : 0, valueIsVariable ? 1 : 0, Number.isFinite(parsedValue) ? parsedValue : 0, valueTarget ];

        setIntParams([ targetIsUser ? 1 : 0, location, altitude, offsetX, offsetY, offsetAltitude, ...spawn ]);
        setStringParam(`${ getCustomVariableItemId(spawnToken) }\t${ getCustomVariableItemId(valueToken) }`);
        setSourceTypes({
            furni: [ SOURCE_PICKED, targetFurniSource, valueFurniSource ],
            users: [ targetUserSource, valueUserSource ]
        });
    };

    const validate = () =>
    {
        if(!spawnWithVariable) return true;
        if(getCustomVariableItemId(spawnToken) <= 0) return false;

        return !(spawnHasValue && valueIsVariable && getCustomVariableItemId(valueToken) <= 0);
    };

    const sourceButtons = (isUser: boolean, onChange: (isUser: boolean) => void) => (
        <div className="octane-wired__give-var-targets">
            { [ { key: 'furni', icon: sourceFurniIcon, isUser: false }, { key: 'user', icon: sourceUserIcon, isUser: true } ].map(button => (
                <button
                    key={ button.key }
                    type="button"
                    title={ LocalizeText(`wiredfurni.params.sources.${ button.isUser ? 'users' : 'furni' }.title`) }
                    className={ `octane-wired__give-var-target octane-wired__give-var-target--${ button.key } ${ isUser === button.isUser ? 'is-active' : '' }` }
                    onClick={ () => onChange(button.isUser) }>
                    <img src={ button.icon } alt={ button.key } />
                </button>
            )) }
        </div>
    );

    const customTargetUsed = location === 1 || altitude === 2;
    const radio = (name: string, value: number, current: number, onChange: (value: number) => void, label: string, info?: string) => (
        <label key={ `${ name }${ value }` } className="flex items-start gap-1">
            <Radio name={ name } checked={ current === value } onCheckedChange={() => onChange(value)} />
            <span className="flex flex-col">
                <Text>{ label }</Text>
                { info && <Text small className="text-muted">{ info }</Text> }
            </span>
        </label>
    );
    const offsetInput = (label: string, value: number, bound: number, onChange: (value: number) => void) => (
        <div className="flex items-center gap-1">
            <Text small>{ label }</Text>
            <input type="number" className="form-control form-control-sm" style={ { width: 72 } } min={ -bound } max={ bound } value={ value } onChange={ event => onChange(clamp(parseInt(event.target.value, 10), bound)) } />
        </div>
    );

    return (
        <WiredActionBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID } save={ save } validate={ validate } widthModifier={ 1.2 }>
            <div className="flex flex-col gap-2">
                <Text small>{ localizeWithFallback('wiredfurni.params.place_furni.usage_info', 'Places temporary copies of the picked furni, as they are when you save.') }</Text>

                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.place_furni.target_location', 'Location') }</Text>
                    { radio('placeLocation', 0, location, setLocation, localizeWithFallback('wiredfurni.params.place_furni.target_location.0', 'Where the furni stood'), localizeWithFallback('wiredfurni.params.place_furni.target_location.0.info', '')) }
                    { radio('placeLocation', 1, location, setLocation, localizeWithFallback('wiredfurni.params.place_furni.target_location.1', 'At the custom target')) }
                </div>

                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.place_furni.target_altitude', 'Altitude') }</Text>
                    { [ 0, 1, 2 ].map(value => radio('placeAltitude', value, altitude, setAltitude, localizeWithFallback(`wiredfurni.params.place_furni.target_altitude.${ value }`, [ 'On top of the location', 'The furni\'s own altitude', 'The custom target\'s altitude' ][value]))) }
                </div>

                <div className="flex flex-col gap-1">
                    <button type="button" className="btn btn-link p-0 align-self-start" onClick={ () => setShowOffsets(value => !value) }>
                        <Text bold>{ localizeWithFallback('wiredfurni.params.place_furni.offsets', 'Offsets') }</Text>
                    </button>
                    { showOffsets &&
                        <div className="flex flex-wrap items-center gap-3">
                            { offsetInput(localizeWithFallback('wiredfurni.params.place_furni.offsets.x', 'x:'), offsetX, MAX_OFFSET, setOffsetX) }
                            { offsetInput(localizeWithFallback('wiredfurni.params.place_furni.offsets.y', 'y:'), offsetY, MAX_OFFSET, setOffsetY) }
                            { offsetInput(localizeWithFallback('wiredfurni.params.place_furni.offsets.altitude', 'altitude:'), offsetAltitude, MAX_OFFSET_ALTITUDE, setOffsetAltitude) }
                        </div> }
                </div>

                <hr className="m-0 bg-dark" />

                <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-1">
                        <Checkbox checked={ spawnWithVariable } onCheckedChange={(nextChecked) => setSpawnWithVariable(nextChecked)} />
                        <Text bold>{ localizeWithFallback('wiredfurni.params.place_furni.spawn_with_variable', 'Spawn with variable') }</Text>
                    </label>
                    { spawnWithVariable &&
                        <>
                            <WiredVariablePicker entries={ spawnEntries } recentScope="variable-effects" selectedToken={ spawnToken } onSelect={ entry => setSpawnToken(entry.token) } />
                            { !furniVariableDefinitions.length && <Text small>No wf_var_furni variables found in this room.</Text> }
                            { spawnHasValue &&
                                <WiredValueOrVariableSection
                                    name="placeValueMode"
                                    isVariable={ valueIsVariable }
                                    value={ value }
                                    target={ valueTarget }
                                    token={ valueToken }
                                    furniSource={ valueFurniSource }
                                    userSource={ valueUserSource }
                                    onIsVariableChange={ setValueIsVariable }
                                    onValueChange={ setValue }
                                    onTargetChange={ setValueTarget }
                                    onTokenChange={ setValueToken }
                                    onFurniSourceChange={ setValueFurniSource }
                                    onUserSourceChange={ setValueUserSource } /> }
                        </> }
                </div>

                <hr className="m-0 bg-dark" />

                <div className={ customTargetUsed ? '' : 'opacity-50 pointer-events-none' }>
                    <WiredFurniSelectionSourceRow
                        title="wiredfurni.params.sources.merged.title.custom_target"
                        options={ targetIsUser ? availableUserSources : TARGET_FURNI_SOURCES }
                        value={ targetIsUser ? targetUserSource : targetFurniSource }
                        selectionKind={ targetIsUser ? 'primary' : 'secondary' }
                        selectionActive={ false }
                        selectionCount={ 0 }
                        selectionLimit={ 0 }
                        selectionEnabledValues={ [] }
                        showSelectionToggle={ false }
                        headerContent={ sourceButtons(targetIsUser, setTargetIsUser) }
                        onChange={ value => (targetIsUser ? setTargetUserSource(value) : setTargetFurniSource(value)) } />
                </div>
            </div>
        </WiredActionBaseView>
    );
};
