import { FC } from 'react';
import { Text } from '../../../../common';
import { ChestFurniIconPreview } from '../ChestFurniIconPreview';
import { CONTRACT_KIND_CURRENCY, CONTRACT_KIND_FURNI, ContractTermRow, CURRENCY_OPTIONS } from './contractTermWire';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { NumberInput } from '../../../../common/NumberInput';

interface WiredContractTermRowProps {
    row: ContractTermRow;
    showDirection?: boolean;
    onChange: (patch: Partial<ContractTermRow>) => void;
}

export const WiredContractTermRow: FC<WiredContractTermRowProps> = ({ row, showDirection = false, onChange }) => (
    <div className="flex flex-col gap-2 rounded border border-black/10 p-2">
        {showDirection && (
            <Select
                className="form-select form-select-sm"
                value={row.direction}
                onChange={(event) => onChange({ direction: parseInt(event.target.value, 10) })}
            >
                <option value={0}>PAY</option>
                <option value={1}>RECEIVE</option>
            </Select>
        )}
        <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-1">
                <Radio checked={row.kind === CONTRACT_KIND_CURRENCY} onCheckedChange={() => onChange({ kind: CONTRACT_KIND_CURRENCY })} />
                <Text small>Currency</Text>
            </label>
            <label className="flex items-center gap-1">
                <Radio checked={row.kind === CONTRACT_KIND_FURNI} onCheckedChange={() => onChange({ kind: CONTRACT_KIND_FURNI, wallItem: false, baseItemId: row.baseItemId || 0 })} />
                <Text small>Furni</Text>
            </label>
        </div>
        {row.kind === CONTRACT_KIND_CURRENCY ? (
            <div className="flex flex-col gap-1">
                {CURRENCY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                        <Radio name={`currency-${row.direction}-${row.kind}`} checked={row.currencyType === option.value} onCheckedChange={() => onChange({ currencyType: option.value })} />
                        <Text small>{option.label}</Text>
                    </label>
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-1">
                <ChestFurniIconPreview baseItemId={row.baseItemId} />
                <NumberInput min={0} className="form-control form-control-sm" placeholder="Base item ID" value={row.baseItemId} onChange={(event) => onChange({ baseItemId: Math.max(0, parseInt(event.target.value, 10) || 0) })} />
            </div>
        )}
        <NumberInput min={0} className="form-control form-control-sm" value={row.amount} onChange={(event) => onChange({ amount: Math.max(0, parseInt(event.target.value, 10) || 0) })} />
    </div>
);
