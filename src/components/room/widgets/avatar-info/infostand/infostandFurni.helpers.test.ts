import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string, params?: string[], values?: string[]) => (values?.length ? `${key}:${values.join(',')}` : key)
}));

import { infostandFurniOwnerText, infostandFurniPanelClass } from './infostandFurni.helpers';

const furni = (isBuildersClub: boolean, isTemporary: boolean) => ({ isBuildersClub, isTemporary, ownerName: 'alice' });

describe('infostand furni band (official InfoStandFurniView)', () => {
    it('shows a Builders Club furni on the Builders Club panel with the warehouse as owner', () => {
        expect(infostandFurniPanelClass(furni(true, false))).toContain('builders-club');
        expect(infostandFurniOwnerText(furni(true, false))).toBe('builder.catalog.title');
    });

    it('shows a temporary (Wired) copy on the blue panel with the Wired catalogue as owner', () => {
        expect(infostandFurniPanelClass(furni(false, true))).toContain('temporary');
        expect(infostandFurniOwnerText(furni(false, true))).toBe('temp.catalog.title');
    });

    it('shows a normal furni with its owner', () => {
        expect(infostandFurniPanelClass(furni(false, false))).not.toMatch(/builders-club|temporary/);
        expect(infostandFurniOwnerText(furni(false, false))).toBe('furni.owner:alice');
    });
});

describe('branding options', () => {
    it('splits each setting at its first "=" only', async () => {
        const { parseBrandingOptions } = await import('./infostandFurni.helpers');

        expect(parseBrandingOptions('imageUrl=https://x/a.png?v=2\ta=b=c\t=x\tnoeq\tscale=100')).toEqual({
            keys: ['imageUrl', 'a', 'scale'],
            values: ['https://x/a.png?v=2', 'b=c', '100']
        });
    });

    it('saves the edited values as they are, a cleared number as 0', async () => {
        const { brandingSaveMap, parseBrandingOptions } = await import('./infostandFurni.helpers');
        const { keys, values } = parseBrandingOptions('imageUrl=https://x/a.png?v=2\tclickUrl=\toffsetX=');

        expect([...brandingSaveMap(keys, values)]).toEqual([
            ['imageUrl', 'https://x/a.png?v=2'],
            ['clickUrl', ''],
            ['offsetX', '0']
        ]);
    });
});

describe('parseFurniHeight', () => {
    it('reads an empty or broken field as nothing, not as the floor', async () => {
        const { parseFurniHeight } = await import('./infostandFurni.helpers');

        expect(parseFurniHeight('')).toBeNull();
        expect(parseFurniHeight('   ')).toBeNull();
        expect(parseFurniHeight('abc')).toBeNull();
    });

    it('keeps the height between 0 and 40 with 4 decimals', async () => {
        const { parseFurniHeight, MAX_FURNI_HEIGHT } = await import('./infostandFurni.helpers');

        expect(parseFurniHeight('12.5')).toBe(12.5);
        expect(parseFurniHeight('-3')).toBe(0);
        expect(parseFurniHeight('99')).toBe(MAX_FURNI_HEIGHT);
        expect(parseFurniHeight('1.234567')).toBe(1.2346);
    });
});
