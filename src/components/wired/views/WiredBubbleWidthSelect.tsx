import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Text } from '../../../common';

/** -1 keeps the room setting; 0, 1 and 2 are wide, normal and thin, as the room setting names them. */
export const WIRED_BUBBLE_WIDTH_OPTIONS: number[] = [-1, 0, 1, 2];

const FALLBACKS: Record<number, string> = {
    [-1]: 'Room setting',
    0: 'Wide',
    1: 'Normal',
    2: 'Thin'
};

export interface WiredBubbleWidthSelectProps {
    value: number;
    onChange: (value: number) => void;
}

/** The bubble-width picker the official messaging boxes carry, shared by every box that talks. */
export const WiredBubbleWidthSelect: FC<WiredBubbleWidthSelectProps> = ({ value, onChange }) => (
    <label className="flex flex-col gap-1">
        <Text bold>{localizeWithFallback('wiredfurni.params.show_message.bubble_width.title', 'Bubble width')}</Text>
        <select className="form-select form-select-sm" value={value} onChange={(event) => onChange(Number(event.target.value))}>
            {WIRED_BUBBLE_WIDTH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                    {localizeWithFallback(`wiredfurni.params.show_message.bubble_width.${option}`, FALLBACKS[option])}
                </option>
            ))}
        </select>
    </label>
);
