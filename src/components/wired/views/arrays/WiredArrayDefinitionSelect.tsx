import { FC, useMemo } from 'react';
import { IWiredArrayEditorDefinition, localizeWithFallback, wiredArrayDefinitionsOfType } from '../../../../api';
import { Text } from '../../../../common';
import { WIRED_ARRAY_TARGETS } from './WiredArrayValueField';
import { Radio } from '../../../../common/Radio';

const FALLBACK_TARGET_LABELS: Record<number, string> = {
    0: 'Furni',
    1: 'Room',
    2: 'User',
    3: 'Context'
};

interface WiredArrayDefinitionSelectProps {
    definitions: IWiredArrayEditorDefinition[];
    itemId: number;
    variableType: number;
    requiresWritable?: boolean;
    onChange: (variableType: number, itemId: number) => void;
}

export const WiredArrayDefinitionSelect: FC<WiredArrayDefinitionSelectProps> = (props) => {
    const { definitions, itemId, variableType, requiresWritable = false, onChange } = props;
    const available = useMemo(() => wiredArrayDefinitionsOfType(definitions, variableType), [definitions, variableType]);
    const selected = useMemo(() => available.find((definition) => definition.itemId === itemId) ?? null, [available, itemId]);

    return (
        <div className="flex flex-col gap-1">
            <Text bold>{localizeWithFallback('wiredfurni.params.arrays.variable', 'Array variable')}</Text>
            <div className="flex flex-wrap gap-2">
                {WIRED_ARRAY_TARGETS.map((entry) => (
                    <label key={entry.type} className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={variableType === entry.type} name="wiredArrayDefinitionTarget" onCheckedChange={() => onChange(entry.type, 0)} />
                        <Text>{localizeWithFallback(entry.label, FALLBACK_TARGET_LABELS[entry.type])}</Text>
                    </label>
                ))}
            </div>
            <select
                className="form-select form-select-sm"
                value={itemId}
                onChange={(event) => onChange(variableType, parseInt(event.target.value, 10))}
            >
                <option value={0}>{localizeWithFallback('wiredfurni.params.arrays.variable.none', 'Choose an array…')}</option>
                {available.map((definition) => (
                    <option key={definition.itemId} value={definition.itemId}>
                        {definition.name} ({definition.arrayMode === 'slots' ? definition.maxEntries : '…'})
                    </option>
                ))}
            </select>
            {!available.length && (
                <Text small className="text-black/60">
                    {localizeWithFallback(
                        'wiredfurni.params.arrays.variable.empty',
                        'This room has no array variable of that kind yet. Place a variable box and switch it to an array first.'
                    )}
                </Text>
            )}
            {requiresWritable && selected && !selected.writable && (
                <Text small className="text-black/60">
                    {localizeWithFallback('wiredfurni.params.arrays.variable.readonly', 'This array is read-only, so the box will not be able to change it.')}
                </Text>
            )}
        </div>
    );
};
