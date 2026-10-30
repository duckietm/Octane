import { memo, useMemo } from 'react';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface CatalogGuildFurniRecolorFilterProps {
    colorA?: string;
    colorB?: string;
}

export const GUILD_FURNI_RECOLOR_FILTER_ID = 'guild-furni-recolor';
const OUTLINE_LEVEL = 0.08;

const toUnit = (hex: string, offset: number): number => {
    const value = parseInt(hex.substr(offset, 2), 16);

    return (isNaN(value) ? 0 : value) / 255;
};

export const CatalogGuildFurniRecolorFilter = memo((props: CatalogGuildFurniRecolorFilterProps) => {
    const { colorA = null, colorB = null } = props;

    const tables = useMemo(() => {
        if (!colorA || colorA.length < 6 || !colorB || colorB.length < 6) return null;

        const aR = toUnit(colorA, 0),
            aG = toUnit(colorA, 2),
            aB = toUnit(colorA, 4);
        const bR = toUnit(colorB, 0),
            bG = toUnit(colorB, 2),
            bB = toUnit(colorB, 4);

        return {
            r: `${OUTLINE_LEVEL} ${bR} ${bR} ${aR} ${aR} ${aR}`,
            g: `${OUTLINE_LEVEL} ${bG} ${bG} ${aG} ${aG} ${aG}`,
            b: `${OUTLINE_LEVEL} ${bB} ${bB} ${aB} ${aB} ${aB}`
        };
    }, [colorA, colorB]);

    if (!tables) return null;

    return (
        <NativeTextTree>
            <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id={GUILD_FURNI_RECOLOR_FILTER_ID} colorInterpolationFilters="sRGB">
                    <feComponentTransfer>
                        <feFuncR type="table" tableValues={tables.r} />
                        <feFuncG type="table" tableValues={tables.g} />
                        <feFuncB type="table" tableValues={tables.b} />
                    </feComponentTransfer>
                </filter>
            </svg>
        </NativeTextTree>
    );
});

CatalogGuildFurniRecolorFilter.displayName = 'CatalogGuildFurniRecolorFilter';
