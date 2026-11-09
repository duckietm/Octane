import { RoomObjectVariable } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { GetOwnRoomObject, LocalizeText } from '../../../api';
import { Button, Text } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Select } from '../../../common/Select';

/** Official DEFAULT_CODES of the hand item boxes: 0 ("no hand item") comes first, with its own text. */
export const DEFAULT_HAND_ITEM_IDS: number[] = [0, 2, 5, 7, 8, 9, 10, 27];

/** The dropdown ids: the defaults, the view's extra codes, then (official ensureOptionExists) an unknown stored id at the end. */
export const resolveHandItemOptions = (handItemId: number, extraItemIds: number[] = []): number[] => {
    const values = [...DEFAULT_HAND_ITEM_IDS];

    for (const id of extraItemIds) if (!values.includes(id)) values.push(id);

    if (handItemId >= 0 && !values.includes(handItemId)) values.push(handItemId);

    return values;
};

interface WiredHandItemFieldProps {
    handItemId: number;
    onChange: (value: number) => void;
    labelKey?: string;
    /** The dropdown's official tooltip. */
    tooltipKey?: string;
    showCopyButton?: boolean;
    // Extra hand-item codes for views whose official code list differs from the
    // shared default (e.g. BOT_GIVE_HAND_ITEM adds 1126/1127/1128, which the
    // condition/selector variants do NOT have).
    extraItemIds?: number[];
}

export const WiredHandItemField: FC<WiredHandItemFieldProps> = (props) => {
    const {
        handItemId = 0,
        onChange = null,
        labelKey = 'wiredfurni.params.handitem',
        tooltipKey = 'wiredfurni.tooltip.handitem',
        showCopyButton = false,
        extraItemIds = []
    } = props;

    const options = useMemo(() => resolveHandItemOptions(handItemId, extraItemIds), [handItemId, extraItemIds]);

    // Official label `${handitem<id>}`.
    const getLabel = (value: number) => {
        const key = `handitem${value}`;
        const localized = LocalizeText(key);

        if (localized && localized !== key) return localized;

        return value === 0 ? '------' : `${value}`;
    };

    const copyOwnHandItem = () => {
        const roomObject = GetOwnRoomObject();
        const copiedHandItem = roomObject?.model?.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT) || 0;

        onChange && onChange(copiedHandItem);
    };

    // Official: the dropdown and the capture button stacked in the hand item section.
    return (
        <NativeTextTree>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText(labelKey)}</Text>
                <Select
                    className="form-select form-select-sm w-full"
                    title={LocalizeText(tooltipKey)}
                    value={Math.max(0, handItemId)}
                    onChange={(event) => onChange(parseInt(event.target.value))}
                >
                    {options.map((value) => (
                        <option key={value} value={value}>
                            {getLabel(value)}
                        </option>
                    ))}
                </Select>
                {showCopyButton && (
                    <Button className="self-start" variant="secondary" onClick={copyOwnHandItem}>
                        {LocalizeText('wiredfurni.params.capture.handitem')}
                    </Button>
                )}
            </div>
        </NativeTextTree>
    );
};
