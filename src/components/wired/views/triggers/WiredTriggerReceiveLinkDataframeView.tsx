import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import {
    emptyReceiveRow,
    ILinkReceiveRow,
    LINK_DATAFRAME_MAX_KEY_LENGTH,
    LINK_DATAFRAME_MAX_ROWS,
    LINK_RECEIVE_PLACEHOLDER,
    LINK_RECEIVE_VARIABLE,
    linkReceiveError,
    readLinkReceive,
    writeLinkReceive
} from '../../../../api/wired/WiredLinkDataframe';
import { Text } from '../../../../common';
import { useNotification, useWired, useWiredTools } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, IWiredVariablePickerEntry, normalizeVariableTokenFromWire } from '../WiredVariablePickerData';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const LINK_SOURCES = [ { value: 100, label: 'wiredfurni.params.sources.furni.100' } ];

/**
 * Official receive link dataframe (30, AIR ReceiveLinkDataframe / LinkDataframeReceivePreset): up to 12 rows, each a
 * key and where its value goes, a text placeholder of the stack or a writable user-made context variable.
 */
export const WiredTriggerReceiveLinkDataframeView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setSourceTypes = null } = useWired();
    const { contextVariableDefinitions = [] } = useWiredTools();
    const { simpleAlert = null } = useNotification();
    const [ rows, setRows ] = useState<ILinkReceiveRow[]>([]);
    const [ invalid, setInvalid ] = useState(false);

    useEffect(() =>
    {
        if(!trigger) return;

        const read = readLinkReceive(trigger.intData ?? [], trigger.stringData ?? '', trigger.variableIds ?? []);

        setInvalid(read === null);
        setRows((read ?? []).map(row => ({ ...row, variableId: normalizeVariableTokenFromWire(row.variableId) })));
    }, [ trigger ]);

    // AIR LinkDataframeReceiveRowPreset.variableFilter: a user-made context variable with a value that can be written.
    const contextEntries = useMemo(() => buildWiredVariablePickerEntries('context', 'change-destination', contextVariableDefinitions.filter(definition => definition.itemId > 0 && definition.hasValue && !definition.isReadOnly))
        .filter(entry => entry.kind === 'custom'), [ contextVariableDefinitions ]);

    const setCount = (count: number) => setRows(current =>
    {
        const next = current.slice(0, count);

        while(next.length < count) next.push(emptyReceiveRow());

        return next;
    });

    const updateRow = (index: number, patch: Partial<ILinkReceiveRow>) => setRows(current => current.map((row, i) => ((i === index) ? { ...row, ...patch } : row)));

    const validate = () =>
    {
        const error = linkReceiveError(rows);

        if(!error) return true;

        const message = localizeWithFallback(error.key, error.key);

        simpleAlert?.(error.row ? localizeWithFallback('wiredfurni.params.link.row_error', `Row ${ error.row }: ${ message }`, [ 'number', 'error' ], [ String(error.row), message ]) : message);

        return false;
    };

    const save = () =>
    {
        const stored = writeLinkReceive(rows);

        setIntParams(stored.intParams);
        setStringParam(stored.stringParam);
        setVariableIds(stored.variableIds);
        setSourceTypes({ furni: [ 100 ], users: [] });
    };

    return (
        <NativeTextTree>
            <WiredTriggerBaseView
                hasSpecialInput={ true }
                requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_BY_ID }
                save={ save }
                validate={ validate }
                widthModifier={ 1.4 }
                allowScrolling
                footer={ <WiredSourcesSelector showFurni={ true } furniSource={ 100 } furniSources={ LINK_SOURCES } furniTitle={ localizeWithFallback('wiredfurni.params.link.endpoints', 'WIRED Links') } onChangeFurni={ () => undefined } /> }
            >
                { invalid && <Text small className="text-[#ad3434]">{ localizeWithFallback('wiredfurni.error.link.invalid_dataframe', 'The dataframe configuration is invalid.') }</Text> }
                <div className="flex items-center justify-between gap-2">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.link.row_count', 'Row count') }</Text>
                    <Select className="form-select form-select-sm w-[70px]" value={ rows.length } onChange={ event => setCount(parseInt(event.target.value, 10)) }>
                        { Array.from({ length: LINK_DATAFRAME_MAX_ROWS + 1 }, (_, count) => <option key={ count } value={ count }>{ count }</option>) }
                    </Select>
                </div>
                <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
                    { rows.map((row, index) => (
                        <div key={ index } className="flex flex-col gap-1 rounded border border-[#d6d1c4] p-1">
                            <Text bold small>{ localizeWithFallback('wiredfurni.params.link.row', `Row ${ index + 1 }`, [ 'number' ], [ String(index + 1) ]) }</Text>
                            <div className="flex items-center gap-1">
                                <Text small>{ localizeWithFallback('wiredfurni.params.link.key', 'Key') }</Text>
                                <input className="form-control form-control-sm grow" maxLength={ LINK_DATAFRAME_MAX_KEY_LENGTH } type="text" value={ row.key } onChange={ event => updateRow(index, { key: event.target.value }) } />
                                <Select className="form-select form-select-sm w-[130px]" value={ row.kind } onChange={ event => updateRow(index, { kind: parseInt(event.target.value, 10) }) }>
                                    <option value={ LINK_RECEIVE_PLACEHOLDER }>{ localizeWithFallback('wiredfurni.params.link.destination.placeholder', 'Text placeholder') }</option>
                                    <option value={ LINK_RECEIVE_VARIABLE }>{ localizeWithFallback('wiredfurni.params.link.destination.variable', 'Context variable') }</option>
                                </Select>
                            </div>
                            { (row.kind === LINK_RECEIVE_PLACEHOLDER)
                                ? (
                                    <div className="flex items-center gap-1">
                                        <Text small>{ localizeWithFallback('wiredfurni.params.link.placeholder', 'Placeholder') }</Text>
                                        <input className="form-control form-control-sm grow" maxLength={ LINK_DATAFRAME_MAX_KEY_LENGTH } type="text" value={ row.placeholder } onChange={ event => updateRow(index, { placeholder: event.target.value.toLowerCase() }) } />
                                    </div>
                                )
                                : (
                                    <div className="flex flex-col gap-1">
                                        <Text small>{ localizeWithFallback('wiredfurni.params.link.capture_variable', 'Variable:') }</Text>
                                        <WiredVariablePicker entries={ contextEntries as IWiredVariablePickerEntry[] } recentScope="link-dataframe-receive" selectedToken={ row.variableId } onSelect={ entry => updateRow(index, { variableId: entry.token }) } onClear={ () => updateRow(index, { variableId: '' }) } />
                                    </div>
                                ) }
                        </div>
                    )) }
                </div>
            </WiredTriggerBaseView>
        </NativeTextTree>
    );
};
