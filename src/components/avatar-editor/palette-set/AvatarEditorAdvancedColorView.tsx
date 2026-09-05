import { IPartColor } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { ColorUtils, GetClubMemberLevel, IAvatarEditorCategory } from '../../../api';
import { useAvatarEditor } from '../../../hooks';

const DEBOUNCE_MS = 150;

const findNearestColor = (hex: string, colors: IPartColor[]): IPartColor | null => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const maxLevel = GetClubMemberLevel();
    let nearest: IPartColor | null = null;
    let minDist = Infinity;

    for (const color of colors) {
        if (color.clubLevel > maxLevel) continue;

        const cr = (color.rgb >> 16) & 0xff;
        const cg = (color.rgb >> 8) & 0xff;
        const cb = color.rgb & 0xff;
        const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;

        if (dist < minDist) {
            minDist = dist;
            nearest = color;
        }
    }

    return nearest;
};

export const AvatarEditorAdvancedColorView: FC<{
    category: IAvatarEditorCategory;
    paletteIndex: number;
}> = ({ category, paletteIndex }) => {
    const { selectedColorParts = null, selectEditorColor = null } = useAvatarEditor();
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const selectedColor = useMemo(() => {
        if (!selectedColorParts?.[category?.setType]?.[paletteIndex]) return null;

        return selectedColorParts[category.setType][paletteIndex];
    }, [category, selectedColorParts, paletteIndex]);

    const hexColor = useMemo(() => ColorUtils.makeColorNumberHex((selectedColor?.rgb ?? 0) & 0xffffff), [selectedColor]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const colors = category?.colorItems?.[paletteIndex];

            if (!colors) return;

            const value = e.target.value;

            if (debounceRef.current) clearTimeout(debounceRef.current);

            debounceRef.current = setTimeout(() => {
                const nearest = findNearestColor(value, colors);

                if (nearest) selectEditorColor(category.setType, paletteIndex, nearest.id);
            }, DEBOUNCE_MS);
        },
        [category, paletteIndex, selectEditorColor]
    );

    return (
        <div className="flex h-full p-1.5">
            <div
                className="flex-1 rounded-lg cursor-pointer relative border-2 border-white/20 overflow-hidden"
                style={{ backgroundColor: hexColor }}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="color"
                    value={hexColor}
                    onChange={handleChange}
                    className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                />
                <div className="absolute bottom-0 left-0 right-0 py-1 text-center bg-black/40">
                    <span className="text-xs font-mono font-bold text-white">{hexColor.toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
};
