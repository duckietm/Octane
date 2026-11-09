import { describe, expect, it } from 'vitest';
import { getCatalogHeaderDescription, getCatalogTextElementName } from './catalogLocalization.helpers';

const localization = (texts: string[]) => ({ getText: (index: number) => texts[index] ?? '' }) as any;

describe('standard catalog page localization mapping', () => {
    it('uses the first default text as the catalog header description', () => {
        expect(getCatalogTextElementName(0, 'default_3x3')).toBe('catalog.header.description');
        expect(getCatalogHeaderDescription('default_3x3', localization(['Header copy', 'Product copy']))).toBe('Header copy');
    });

    it('does not leak page content into the header for specialized layouts', () => {
        expect(getCatalogTextElementName(0, 'frontpage4')).toBe('ctlg_txt1');
        expect(getCatalogTextElementName(0, 'trophies')).toBe('trophy.description');
        expect(getCatalogTextElementName(0, 'builders_club_frontpage')).toBe('ctlg_description');
        expect(getCatalogHeaderDescription('frontpage4', localization(['Front-page body']))).toBe('');
        expect(getCatalogHeaderDescription('trophies', localization(['Trophy body']))).toBe('');
    });
});
