import { FC } from 'react';
import {
    createWiredArrayCriterion,
    IWiredArrayCriterion,
    IWiredArrayEditorDefinition,
    localizeWithFallback,
    WIRED_ARRAY_COMPARISONS,
    WIRED_ARRAY_MAX_FIELDS,
    wiredArrayComparisonSymbol,
    wiredArrayFieldsOf
} from '../../../../api';
import { Text } from '../../../../common';
import { WiredArrayValueField } from './WiredArrayValueField';
import { Select } from '../../../../common/Select';

interface WiredArrayCriteriaEditorProps {
    criteria: IWiredArrayCriterion[];
    definition: IWiredArrayEditorDefinition | null;
    onChange: (criteria: IWiredArrayCriterion[]) => void;
}

export const WiredArrayCriteriaEditor: FC<WiredArrayCriteriaEditorProps> = (props) => {
    const { criteria, definition, onChange } = props;
    const fields = wiredArrayFieldsOf(definition);

    const replace = (index: number, criterion: IWiredArrayCriterion) => onChange(criteria.map((entry, position) => (position === index ? criterion : entry)));

    return (
        <div className="flex flex-col gap-2">
            <Text bold>{localizeWithFallback('wiredfurni.params.arrays.criteria', 'Entries that match')}</Text>

            {!criteria.length && (
                <Text small className="text-black/60">
                    {localizeWithFallback('wiredfurni.params.arrays.criteria.empty', 'Add at least one rule.')}
                </Text>
            )}

            {criteria.map((criterion, index) => (
                <div key={index} className="flex flex-col gap-1 octane-wired__divider-top">
                    <div className="flex gap-2 items-end">
                        <div className="flex flex-col gap-1">
                            <Text small>{localizeWithFallback('wiredfurni.params.arrays.criteria.field', 'Field')}</Text>
                            <Select
                                className="form-select form-select-sm"
                                value={criterion.fieldId}
                                onChange={(event) => replace(index, { ...criterion, fieldId: parseInt(event.target.value, 10) })}
                            >
                                {fields.map((field) => (
                                    <option key={field.id} value={field.id}>
                                        {field.name || localizeWithFallback('wiredfurni.params.arrays.criteria.value', 'Value')}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Text small>{localizeWithFallback('wiredfurni.params.arrays.criteria.comparison', 'Is')}</Text>
                            <Select
                                className="form-select form-select-sm"
                                value={criterion.comparison}
                                onChange={(event) => replace(index, { ...criterion, comparison: parseInt(event.target.value, 10) })}
                            >
                                {WIRED_ARRAY_COMPARISONS.map((comparison) => (
                                    <option key={comparison} value={comparison}>
                                        {wiredArrayComparisonSymbol(comparison)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <button className="btn btn-sm btn-danger" type="button" onClick={() => onChange(criteria.filter((_, position) => position !== index))}>
                            {localizeWithFallback('wiredfurni.params.arrays.criteria.remove', 'Remove')}
                        </button>
                    </div>
                    <WiredArrayValueField
                        label={localizeWithFallback('wiredfurni.params.arrays.criteria.target', 'Compared with')}
                        recentScope={`array-criterion-${index}`}
                        value={criterion.reference}
                        onChange={(reference) => replace(index, { ...criterion, reference })}
                    />
                </div>
            ))}

            {criteria.length < WIRED_ARRAY_MAX_FIELDS && (
                <button
                    className="btn btn-sm btn-primary"
                    type="button"
                    onClick={() => onChange([...criteria, createWiredArrayCriterion(fields[0]?.id)])}
                >
                    {localizeWithFallback('wiredfurni.params.arrays.criteria.add', 'Add a rule')}
                </button>
            )}
        </div>
    );
};
