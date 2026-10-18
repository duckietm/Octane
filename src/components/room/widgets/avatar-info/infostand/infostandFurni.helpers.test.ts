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
