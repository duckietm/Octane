import type { IWiredArrayInspectionData } from '@octane/renderer';
import { FormEvent, useEffect, useState } from 'react';
import { Button, Text } from '../../common';

interface WiredArrayInspectionViewProps {
    canModify: boolean;
    data: IWiredArrayInspectionData;
    onPageChange: (page: number) => void;
    onUpdateField: (index: number, fieldId: number, value: string) => void;
}

export const WiredArrayInspectionView = ({ canModify, data, onPageChange, onUpdateField }: WiredArrayInspectionViewProps) => {
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const definition = data.definition;

    useEffect(() => setDrafts({}), [data.definition?.itemId, data.ownerId, data.page, data.entries]);

    if (!definition) return null;

    const submit = (event: FormEvent, index: number, fieldId: number, originalValue: string) => {
        event.preventDefault();
        const key = `${index}:${fieldId}`;
        const nextValue = (drafts[key] ?? originalValue).trim();

        if (!/^-?\d+$/.test(nextValue) || nextValue === originalValue) return;
        onUpdateField(index, fieldId, nextValue);
    };

    return (
        <div className="rounded border border-[#bdb8ab] bg-white p-2 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#555]">
                <Text bold>{`${definition.name} · ${definition.arrayFormat} ${definition.arrayMode}`}</Text>
                <span>{`Length ${data.logicalLength} · Occupied ${data.occupiedCount} · Max ${definition.maxEntries}`}</span>
            </div>
            {!data.hasArray && <Text small>This array has not been created for the selected owner.</Text>}
            {data.hasArray && (
                <div className="max-h-[210px] overflow-auto border border-[#dedad0]">
                    <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-[#f5f2ea] text-[#666]">
                            <tr>
                                <th className="px-2 py-1 text-left">Index</th>
                                {definition.fields.map((field) => (
                                    <th key={field.id} className="px-2 py-1 text-right">
                                        {field.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries.map((entry, rowIndex) => (
                                <tr key={entry.index} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}>
                                    <td className="px-2 py-1 text-[#555]">{entry.index}</td>
                                    {definition.fields.map((field) => {
                                        const key = `${entry.index}:${field.id}`;
                                        const rawValue = entry.values[String(field.id)] ?? '0';
                                        const connectedText = entry.connectedText[String(field.id)];
                                        const editable = canModify && definition.writable;

                                        return (
                                            <td key={field.id} className="px-2 py-1 text-right">
                                                {editable ? (
                                                    <form onSubmit={(event) => submit(event, entry.index, field.id, rawValue)}>
                                                        <input
                                                            aria-label={`${definition.name} ${field.name} at index ${entry.index}`}
                                                            className="w-[92px] rounded border border-[#b8b2a4] px-1 py-[2px] text-right"
                                                            inputMode="numeric"
                                                            value={drafts[key] ?? rawValue}
                                                            onBlur={(event) => submit(event, entry.index, field.id, rawValue)}
                                                            onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
                                                        />
                                                    </form>
                                                ) : (
                                                    <span>{rawValue}</span>
                                                )}
                                                {connectedText !== undefined && <div className="text-[10px] text-[#777]">{connectedText}</div>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data.hasArray && (
                <div className="flex items-center justify-end gap-2 text-[11px]">
                    <Button disabled={data.page <= 0} variant="secondary" onClick={() => onPageChange(data.page - 1)}>
                        Previous
                    </Button>
                    <span>{`Page ${data.page + 1} / ${data.pageCount}`}</span>
                    <Button disabled={data.page >= data.pageCount - 1} variant="secondary" onClick={() => onPageChange(data.page + 1)}>
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};
