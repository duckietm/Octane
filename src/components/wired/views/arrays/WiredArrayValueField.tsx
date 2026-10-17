import { FC, useMemo } from 'react';
import {
    createWiredArrayReference,
    IWiredArrayAddress,
    IWiredArrayReference,
    localizeWithFallback,
    WIRED_ARRAY_MODE_CONSTANT,
    WIRED_ARRAY_MODE_VARIABLE,
    WIRED_ARRAY_TYPE_CONTEXT,
    WIRED_ARRAY_TYPE_FURNI,
    WIRED_ARRAY_TYPE_ROOM,
    WIRED_ARRAY_TYPE_USER
} from '../../../../api';
import { Text } from '../../../../common';
import { useWiredTools } from '../../../../hooks';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { Radio } from '../../../../common/Radio';
import { NumberInput } from '../../../../common/NumberInput';

export const WIRED_ARRAY_TARGETS: Array<{ label: string; target: WiredVariablePickerTarget; type: number }> = [
    { label: 'wiredfurni.params.variables.furni', target: 'furni', type: WIRED_ARRAY_TYPE_FURNI },
    { label: 'wiredfurni.params.variables.room', target: 'global', type: WIRED_ARRAY_TYPE_ROOM },
    { label: 'wiredfurni.params.variables.user', target: 'user', type: WIRED_ARRAY_TYPE_USER },
    { label: 'wiredfurni.params.variables.context', target: 'context', type: WIRED_ARRAY_TYPE_CONTEXT }
];

const FALLBACK_TARGET_LABELS: Record<number, string> = {
    [WIRED_ARRAY_TYPE_FURNI]: 'Furni',
    [WIRED_ARRAY_TYPE_ROOM]: 'Room',
    [WIRED_ARRAY_TYPE_USER]: 'User',
    [WIRED_ARRAY_TYPE_CONTEXT]: 'Context'
};

export const wiredArrayPickerTarget = (variableType: number): WiredVariablePickerTarget =>
    WIRED_ARRAY_TARGETS.find((entry) => entry.type === variableType)?.target ?? 'global';

export const wiredArrayTokenItemId = (token: string, fallback: number): number => {
    if (!token) return fallback;
    if (!token.startsWith('custom:')) return 0;

    const parsed = parseInt(token.slice(7), 10);

    return Number.isFinite(parsed) ? parsed : 0;
};

interface WiredArrayValueFieldProps {
    constantMin?: number;
    label: string;
    recentScope: string;
    value: IWiredArrayReference;
    onChange: (value: IWiredArrayReference) => void;
}

export const WiredArrayValueField: FC<WiredArrayValueFieldProps> = (props) => {
    const { constantMin = undefined, label, recentScope, value, onChange } = props;
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredTools();

    const target = wiredArrayPickerTarget(value.variableType);
    const definitions = useMemo(() => {
        switch (value.variableType) {
            case WIRED_ARRAY_TYPE_FURNI:
                return furniVariableDefinitions;
            case WIRED_ARRAY_TYPE_USER:
                return userVariableDefinitions;
            case WIRED_ARRAY_TYPE_CONTEXT:
                return contextVariableDefinitions;
            default:
                return roomVariableDefinitions;
        }
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, userVariableDefinitions, value.variableType]);

    const entries = useMemo(() => buildWiredVariablePickerEntries(target, 'change-reference', definitions), [definitions, target]);
    const resolvedEntries = useMemo(() => {
        if (!value.variableToken) return entries;
        if (flattenWiredVariablePickerEntries(entries).some((entry) => entry.token === value.variableToken)) return entries;

        const fallbackEntry = createFallbackVariableEntry(target, value.variableToken);

        return fallbackEntry ? [fallbackEntry, ...entries] : entries;
    }, [entries, target, value.variableToken]);

    const isVariable = value.mode === WIRED_ARRAY_MODE_VARIABLE;

    return (
        <div className="flex flex-col gap-1">
            <Text bold>{label}</Text>
            <div className="flex gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                    <Radio checked={!isVariable} name={`${recentScope}-mode`} onCheckedChange={() => onChange({ ...value, mode: WIRED_ARRAY_MODE_CONSTANT })} />
                    <Text>{localizeWithFallback('wiredfurni.params.arrays.value.constant', 'Number')}</Text>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    <Radio checked={isVariable} name={`${recentScope}-mode`} onCheckedChange={() => onChange({ ...value, mode: WIRED_ARRAY_MODE_VARIABLE })} />
                    <Text>{localizeWithFallback('wiredfurni.params.arrays.value.variable', 'Variable')}</Text>
                </label>
            </div>

            {!isVariable && (
                <NumberInput className="form-control form-control-sm" min={constantMin} style={{ maxWidth: 160 }} value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })} />
            )}

            {isVariable && (
                <>
                    <div className="flex flex-wrap gap-2">
                        {WIRED_ARRAY_TARGETS.map((entry) => (
                            <label key={entry.type} className="flex items-center gap-1 cursor-pointer">
                                <Radio checked={value.variableType === entry.type} name={`${recentScope}-target`} onCheckedChange={() => onChange({ ...value, variableItemId: 0, variableToken: '', variableType: entry.type })} />
                                <Text>{localizeWithFallback(entry.label, FALLBACK_TARGET_LABELS[entry.type])}</Text>
                            </label>
                        ))}
                    </div>
                    <WiredVariablePicker
                        entries={resolvedEntries}
                        recentScope={recentScope}
                        selectedToken={value.variableToken}
                        onSelect={(entry) =>
                            onChange({ ...value, variableItemId: wiredArrayTokenItemId(entry.token, value.variableItemId), variableToken: entry.token })
                        }
                    />
                </>
            )}
        </div>
    );
};

export const wiredArrayAddressAsValue = (address: IWiredArrayAddress): IWiredArrayReference => ({
    ...createWiredArrayReference(),
    capturePath: address.capturePath,
    mode: address.mode,
    value: String(address.value),
    variableItemId: address.variableItemId,
    variableSource: address.variableSource,
    variableToken: address.variableToken,
    variableType: address.variableType
});

export const wiredArrayValueAsAddress = (value: IWiredArrayReference, previous: IWiredArrayAddress): IWiredArrayAddress => {
    const parsed = parseInt(value.value.trim(), 10);

    return {
        ...previous,
        capturePath: value.capturePath,
        mode: value.mode,
        value: Number.isFinite(parsed) ? parsed : 0,
        variableItemId: value.variableItemId,
        variableSource: value.variableSource,
        variableToken: value.variableToken,
        variableType: value.variableType
    };
};

export const wiredArrayOwnerSources = (variableType: number): Array<{ label: string; value: number }> => {
    if (variableType === WIRED_ARRAY_TYPE_FURNI)
        return [
            { label: 'wiredfurni.params.sources.furni.0', value: 0 },
            { label: 'wiredfurni.params.sources.furni.101', value: 100 },
            { label: 'wiredfurni.params.sources.furni.200', value: 200 },
            { label: 'wiredfurni.params.sources.furni.201', value: 201 }
        ];

    if (variableType === WIRED_ARRAY_TYPE_USER)
        return [
            { label: 'wiredfurni.params.sources.users.0', value: 0 },
            { label: 'wiredfurni.params.sources.users.11', value: 11 },
            { label: 'wiredfurni.params.sources.users.200', value: 200 },
            { label: 'wiredfurni.params.sources.users.201', value: 201 }
        ];

    return [];
};

export const WIRED_ARRAY_OWNER_SOURCE_FALLBACKS: Record<number, string> = {
    0: 'The user or furni that set the stack off',
    11: 'The clicked user',
    100: 'The picked furni',
    200: 'Whatever the selector picked',
    201: 'Whatever the signal carried'
};
