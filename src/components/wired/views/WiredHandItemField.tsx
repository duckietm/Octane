import { RoomObjectVariable } from '@octane/renderer';
import { FC, useMemo } from 'react';
import { GetOwnRoomObject, LocalizeText } from '../../../api';
import { Button, Text } from '../../../common';

export const DEFAULT_HAND_ITEM_IDS: number[] = [2, 5, 7, 8, 9, 10, 27];

interface WiredHandItemFieldProps {
    handItemId: number;
    onChange: (value: number) => void;
    labelKey?: string;
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
        showCopyButton = false,
        extraItemIds = [],
    } = props;

    const options = useMemo(() => {
        const values = [...DEFAULT_HAND_ITEM_IDS];

        for (const id of extraItemIds) if (!values.includes(id)) values.push(id);

        if (handItemId > 0 && !values.includes(handItemId)) values.unshift(handItemId);

        return values;
    }, [handItemId, extraItemIds]);

    const getLabel = (value: number) => {
        const key = `handitem${value}`;
        const localized = LocalizeText(key);

        if (localized && localized !== key) return localized;

        return `${value}`;
    };

    const copyOwnHandItem = () => {
        const roomObject = GetOwnRoomObject();
        const copiedHandItem = roomObject?.model?.getValue<number>(RoomObjectVariable.FIGURE_CARRY_OBJECT) || 0;

        onChange && onChange(copiedHandItem);
    };

    return (
        <div className="flex flex-col gap-1">
            <Text bold>{LocalizeText(labelKey)}</Text>
            <div className="flex items-center gap-2">
                <select className="form-select form-select-sm flex-1" value={handItemId} onChange={(event) => onChange(parseInt(event.target.value))}>
                    <option value={0}>------</option>
                    {options.map((value) => (
                        <option key={value} value={value}>
                            {getLabel(value)}
                        </option>
                    ))}
                </select>
                {showCopyButton && (
                    <Button variant="secondary" onClick={copyOwnHandItem}>
                        {LocalizeText('wiredfurni.params.capture.handitem')}
                    </Button>
                )}
            </div>
        </div>
    );
};
