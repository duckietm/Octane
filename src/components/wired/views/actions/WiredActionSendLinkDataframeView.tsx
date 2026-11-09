import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localizeWithFallback, WiredFurniType, WiredSelectionVisualizer } from '../../../../api';
import {
    emptySendRow,
    ILinkSendRow,
    LINK_DATAFRAME_MAX_KEY_LENGTH,
    LINK_DATAFRAME_MAX_MESSAGE_BYTES,
    LINK_DATAFRAME_MAX_ROWS,
    LINK_SEND_MESSAGE,
    LINK_SEND_NUMBER,
    LINK_SEND_VARIABLE_TEXT,
    LINK_SEND_VARIABLE_VALUE,
    LINK_TARGET_CONTEXT,
    LINK_TARGET_FURNI,
    LINK_TARGET_GLOBAL,
    LINK_TARGET_USER,
    linkSendError,
    readLinkSend,
    writeLinkSend
} from '../../../../api/wired/WiredLinkDataframe';
import { Text } from '../../../../common';
import { useNotification, useWired, useWiredTools } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry, normalizeVariableTokenFromWire, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { NumberInput } from '../../../../common/NumberInput';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const LINK_SOURCES = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];
const ROW_FURNI_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.furni.0' },
    { value: 101, label: 'wiredfurni.params.sources.furni.101' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' },
    { value: 201, label: 'wiredfurni.params.sources.furni.201' }
];
const ROW_USER_SOURCES = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];
const TARGETS: { value: number; picker: WiredVariablePickerTarget; key: string }[] = [
    { value: LINK_TARGET_USER, picker: 'user', key: 'wiredfurni.params.variables.target.user' },
    { value: LINK_TARGET_FURNI, picker: 'furni', key: 'wiredfurni.params.variables.target.furni' },
    { value: LINK_TARGET_GLOBAL, picker: 'global', key: 'wiredfurni.params.variables.target.global' },
    { value: LINK_TARGET_CONTEXT, picker: 'context', key: 'wiredfurni.params.variables.target.context' }
];

/** Row furni source 101: the second pick list (stuffIds2), as AIR's "other picked furni". */
const SOURCE_OTHER_PICKS = 101;

type PickList = 'endpoints' | 'other';

interface IRowState extends ILinkSendRow
{
    furniSource: number;
    userSource: number;
}

/**
 * Official send link dataframe (64, AIR SendLinkDataframe / LinkDataframeSendPreset): up to 12 rows, each a key and a
 * value: a number (typed, or a variable's value), a variable's text, or a custom message. Variable rows read their
 * holders from their own furni and user source (AIR mergedSelections: furni slot i + 1, user slot i).
 */
export const WiredActionSendLinkDataframeView: FC<{}> = () =>
{
    const { trigger = null, furniIds = [], setFurniIds = null, setFurniIds2 = null, setIntParams = null, setStringParam = null, setVariableIds = null, setSourceTypes = null } = useWired();
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();
    const { simpleAlert = null } = useNotification();
    const [ endpointSource, setEndpointSource ] = useState(100);
    const [ rows, setRows ] = useState<IRowState[]>([]);
    const [ invalid, setInvalid ] = useState(false);
    const [ endpointIds, setEndpointIds ] = useState<number[]>([]);
    const [ otherIds, setOtherIds ] = useState<number[]>([]);
    const [ pickList, setPickList ] = useState<PickList>('endpoints');
    const highlightedIds = useRef<number[]>([]);

    useEffect(() =>
    {
        if(!trigger) return;

        const read = readLinkSend(trigger.intData ?? [], trigger.stringData ?? '', trigger.variableIds ?? []);

        setInvalid(read === null);
        setEndpointSource((trigger.furniSourceTypes?.[0] === 200) ? 200 : 100);
        setRows((read ?? []).map((row, index) => ({
            ...row,
            variableId: normalizeVariableTokenFromWire(row.variableId),
            furniSource: trigger.furniSourceTypes?.[index + 1] ?? 0,
            userSource: trigger.userSourceTypes?.[index] ?? 0
        })));
        setEndpointIds(trigger.selectedItems ?? []);
        setOtherIds(trigger.selectedItems2 ? [ ...trigger.selectedItems2 ] : []);
        setPickList('endpoints');
    }, [ trigger ]);

    // A furni variable row on "other picked furni" reads the second pick list (AIR's dual furni picking).
    const usesOtherPicks = rows.some(row => (row.target === LINK_TARGET_FURNI) && (row.mode === LINK_SEND_VARIABLE_VALUE || row.mode === LINK_SEND_VARIABLE_TEXT) && (row.furniSource === SOURCE_OTHER_PICKS));

    // The picking in the room edits the active list.
    useEffect(() =>
    {
        if(pickList === 'endpoints') setEndpointIds(furniIds);
        else setOtherIds(furniIds);
    }, [ furniIds, pickList ]);

    useEffect(() =>
    {
        highlightedIds.current = WiredSelectionVisualizer.showPickLists(highlightedIds.current, endpointIds, usesOtherPicks ? otherIds : []);
    }, [ endpointIds, otherIds, usesOtherPicks ]);

    useEffect(() =>
    {
        WiredSelectionVisualizer.setEditingPickList((pickList === 'other') ? 2 : 1);
    }, [ pickList ]);

    useEffect(() => () =>
    {
        WiredSelectionVisualizer.setEditingPickList(1);

        if(!highlightedIds.current.length) return;

        WiredSelectionVisualizer.clearSelectionShaderFromFurni(highlightedIds.current);
        WiredSelectionVisualizer.clearSecondarySelectionShaderFromFurni(highlightedIds.current);
        highlightedIds.current = [];
    }, []);

    const switchPickList = useCallback((next: PickList) =>
    {
        if(next === pickList) return;
        if(next === 'other' && !usesOtherPicks) return;

        const nextEndpointIds = (pickList === 'endpoints') ? [ ...furniIds ] : [ ...endpointIds ];
        const nextOtherIds = (pickList === 'other') ? [ ...furniIds ] : [ ...otherIds ];

        setEndpointIds(nextEndpointIds);
        setOtherIds(nextOtherIds);
        setPickList(next);
        setFurniIds?.([ ...((next === 'endpoints') ? nextEndpointIds : nextOtherIds) ]);
    }, [ pickList, usesOtherPicks, furniIds, endpointIds, otherIds, setFurniIds ]);

    // No row reads the second list any more: go back to picking the endpoints.
    useEffect(() =>
    {
        if(!usesOtherPicks && pickList === 'other') switchPickList('endpoints');
    }, [ usesOtherPicks, pickList, switchPickList ]);

    const entriesByTarget = useMemo(() => ({
        user: buildWiredVariablePickerEntries('user', 'change-reference', userVariableDefinitions),
        furni: buildWiredVariablePickerEntries('furni', 'change-reference', furniVariableDefinitions),
        global: buildWiredVariablePickerEntries('global', 'change-reference', roomVariableDefinitions),
        context: buildWiredVariablePickerEntries('context', 'change-reference', contextVariableDefinitions)
    }), [ userVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, contextVariableDefinitions ]);

    const setCount = (count: number) => setRows(current =>
    {
        const next = current.slice(0, count);

        while(next.length < count) next.push({ ...emptySendRow(), furniSource: 0, userSource: 0 });

        return next;
    });

    const updateRow = (index: number, patch: Partial<IRowState>) => setRows(current => current.map((row, i) => ((i === index) ? { ...row, ...patch } : row)));

    const validate = () =>
    {
        const error = linkSendError(rows);

        if(!error) return true;

        const message = localizeWithFallback(error.key, error.key);

        simpleAlert?.(error.row ? localizeWithFallback('wiredfurni.params.link.row_error', `Row ${ error.row }: ${ message }`, [ 'number', 'error' ], [ String(error.row), message ]) : message);

        return false;
    };

    const save = () =>
    {
        const nextEndpointIds = (pickList === 'endpoints') ? [ ...furniIds ] : [ ...endpointIds ];
        const nextOtherIds = (pickList === 'other') ? [ ...furniIds ] : [ ...otherIds ];

        // The first list is what the box saves as its picks.
        if(pickList === 'other')
        {
            setPickList('endpoints');
            setFurniIds?.(nextEndpointIds);
        }

        const stored = writeLinkSend(rows);
        const furni = [ endpointSource ];
        const users: number[] = [];

        for(let i = 0; i < LINK_DATAFRAME_MAX_ROWS; i++)
        {
            furni.push(rows[i]?.furniSource ?? 0);
            users.push(rows[i]?.userSource ?? 0);
        }

        setIntParams(stored.intParams);
        setStringParam(stored.stringParam);
        setVariableIds(stored.variableIds);
        setSourceTypes({ furni, users });
        setFurniIds2?.(usesOtherPicks ? nextOtherIds.filter(id => (id > 0)) : []);
    };

    const selectionLimit = trigger?.maximumItemSelectionCount ?? 0;

    // The dropdown offers number, variable text and message; "number" is a typed value or a variable's value.
    const modeChoice = (row: IRowState) => ((row.mode === LINK_SEND_VARIABLE_VALUE) ? LINK_SEND_NUMBER : row.mode);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={ true }
                requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
                save={ save }
                validate={ validate }
                widthModifier={ 1.4 }
                allowScrolling
                selectionPreview={
                    <div className="flex flex-col gap-2">
                        <WiredFurniSelectionSourceRow
                            title={ localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links') }
                            titleIsLiteral={ true }
                            options={ [ { value: 100, label: 'wiredfurni.params.sources.furni.100' } ] }
                            value={ 100 }
                            selectionKind="primary"
                            selectionActive={ pickList === 'endpoints' }
                            selectionCount={ endpointIds.length }
                            selectionLimit={ selectionLimit }
                            selectionEnabledValues={ [ 100 ] }
                            showSelectionToggle={ usesOtherPicks }
                            onChange={ () =>
                            {} }
                            onSelectionActivate={ () => switchPickList('endpoints') } />
                        { usesOtherPicks && (
                            <WiredFurniSelectionSourceRow
                                title={ localizeWithFallback('wiredfurni.params.link.source_furni', 'Variable source furni') }
                                titleIsLiteral={ true }
                                options={ [ { value: SOURCE_OTHER_PICKS, label: 'wiredfurni.params.sources.furni.101' } ] }
                                value={ SOURCE_OTHER_PICKS }
                                selectionKind="secondary"
                                selectionActive={ pickList === 'other' }
                                selectionCount={ otherIds.length }
                                selectionLimit={ selectionLimit }
                                selectionEnabledValues={ [ SOURCE_OTHER_PICKS ] }
                                onChange={ () =>
                                {} }
                                onSelectionActivate={ () => switchPickList('other') } />
                        ) }
                    </div>
                }
                footer={ <WiredSourcesSelector showFurni={ true } furniSource={ endpointSource } furniSources={ LINK_SOURCES } furniTitle={ localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links') } onChangeFurni={ setEndpointSource } /> }
            >
                { invalid && <Text small className="text-[#ad3434]">{ localizeWithFallback('wiredfurni.error.link.invalid_dataframe', 'The dataframe configuration is invalid.') }</Text> }
                <div className="flex items-center justify-between gap-2">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.link.row_count', 'Row count') }</Text>
                    <Select className="form-select form-select-sm w-[70px]" value={ rows.length } onChange={ event => setCount(parseInt(event.target.value, 10)) }>
                        { Array.from({ length: LINK_DATAFRAME_MAX_ROWS + 1 }, (_, count) => <option key={ count } value={ count }>{ count }</option>) }
                    </Select>
                </div>
                <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
                    { rows.map((row, index) =>
                    {
                        const target = TARGETS.find(entry => (entry.value === row.target)) ?? TARGETS[0];
                        const usesVariable = (row.mode === LINK_SEND_VARIABLE_VALUE) || (row.mode === LINK_SEND_VARIABLE_TEXT);

                        return (
                            <div key={ index } className="flex flex-col gap-1 rounded border border-[#d6d1c4] p-1">
                                <Text bold small>{ localizeWithFallback('wiredfurni.params.link.row', `Row ${ index + 1 }`, [ 'number' ], [ String(index + 1) ]) }</Text>
                                <div className="flex items-center gap-1">
                                    <Text small>{ localizeWithFallback('wiredfurni.params.link.key', 'Key') }</Text>
                                    <input className="form-control form-control-sm grow" maxLength={ LINK_DATAFRAME_MAX_KEY_LENGTH } type="text" value={ row.key } onChange={ event => updateRow(index, { key: event.target.value }) } />
                                    <Select className="form-select form-select-sm w-[120px]" value={ modeChoice(row) } onChange={ event => updateRow(index, { mode: parseInt(event.target.value, 10) }) }>
                                        <option value={ LINK_SEND_NUMBER }>{ localizeWithFallback('wiredfurni.params.link.source.number', 'Number') }</option>
                                        <option value={ LINK_SEND_VARIABLE_TEXT }>{ localizeWithFallback('wiredfurni.params.link.source.variable_text', 'Variable text') }</option>
                                        <option value={ LINK_SEND_MESSAGE }>{ localizeWithFallback('wiredfurni.params.link.source.message', 'Custom message') }</option>
                                    </Select>
                                </div>
                                { (row.mode === LINK_SEND_MESSAGE) && (
                                    <div className="flex items-center gap-1">
                                        <Text small>{ localizeWithFallback('wiredfurni.params.link.message', 'Message:') }</Text>
                                        <input className="form-control form-control-sm grow" maxLength={ LINK_DATAFRAME_MAX_MESSAGE_BYTES } type="text" value={ row.text } onChange={ event => updateRow(index, { text: event.target.value }) } />
                                    </div>
                                ) }
                                { (row.mode !== LINK_SEND_MESSAGE) && (
                                    <div className="flex flex-col gap-1">
                                        { (row.mode !== LINK_SEND_VARIABLE_TEXT) && (
                                            <label className="flex cursor-pointer items-center gap-1">
                                                <Checkbox checked={ row.mode === LINK_SEND_VARIABLE_VALUE } onCheckedChange={ nextChecked => updateRow(index, { mode: nextChecked ? LINK_SEND_VARIABLE_VALUE : LINK_SEND_NUMBER }) } />
                                                <Text small>{ localizeWithFallback('wiredfurni.params.link.source.variable_value', 'Variable value') }</Text>
                                            </label>
                                        ) }
                                        { !usesVariable && (
                                            <div className="flex items-center gap-1">
                                                <Text small>{ localizeWithFallback('wiredfurni.params.link.value', 'Value') }</Text>
                                                <NumberInput className="form-control form-control-sm grow" value={ row.literal } onChange={ event => updateRow(index, { literal: Math.max(-2147483648, Math.min(2147483647, parseInt(event.target.value || '0', 10) || 0)) }) } />
                                            </div>
                                        ) }
                                        { usesVariable && (
                                            <>
                                                <Select className="form-select form-select-sm" value={ row.target } onChange={ event => updateRow(index, { target: parseInt(event.target.value, 10), variableId: '' }) }>
                                                    { TARGETS.map(entry => <option key={ entry.value } value={ entry.value }>{ localizeWithFallback(entry.key, entry.picker) }</option>) }
                                                </Select>
                                                <WiredVariablePicker entries={ entriesByTarget[target.picker] as IWiredVariablePickerEntry[] } recentScope="link-dataframe-send" selectedToken={ row.variableId } onSelect={ entry => updateRow(index, { variableId: entry.token }) } onClear={ () => updateRow(index, { variableId: '' }) } />
                                                { (row.target === LINK_TARGET_FURNI) && <WiredSourcesSelector showFurni={ true } furniSource={ row.furniSource } furniSources={ ROW_FURNI_SOURCES } furniTitle={ localizeWithFallback('wiredfurni.params.link.source_furni', 'Variable source furni') } onChangeFurni={ value => updateRow(index, { furniSource: value }) } /> }
                                                { (row.target === LINK_TARGET_USER) && <WiredSourcesSelector showUsers={ true } userSource={ row.userSource } userSources={ ROW_USER_SOURCES } usersTitle={ localizeWithFallback('wiredfurni.params.link.source_users', 'Variable source users') } onChangeUsers={ value => updateRow(index, { userSource: value }) } /> }
                                            </>
                                        ) }
                                    </div>
                                ) }
                            </div>
                        );
                    }) }
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
