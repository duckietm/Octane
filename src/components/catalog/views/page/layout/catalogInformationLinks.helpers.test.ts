import { describe, expect, it } from 'vitest';
import { getCatalogInformationImageLink } from './catalogInformationLinks.helpers';

describe('catalog information layout links', () => {
    it('makes the monkey teaser and store banner (image slots 1 and 2) open the app store link', () => {
        expect(getCatalogInformationImageLink('monkey', 1)).toEqual({ localizationKey: 'link.format.monkey', fallbackUrl: 'http://store.apple.com/' });
        expect(getCatalogInformationImageLink('monkey', 2)?.localizationKey).toBe('link.format.monkey');
        expect(getCatalogInformationImageLink('niko', 1)?.localizationKey).toBe('link.format.niko');
    });

    it('keeps the header image and every other layout inert', () => {
        expect(getCatalogInformationImageLink('monkey', 0)).toBeNull();
        expect(getCatalogInformationImageLink('monkey', 3)).toBeNull();
        expect(getCatalogInformationImageLink('info_duckets', 1)).toBeNull();
        expect(getCatalogInformationImageLink('', 1)).toBeNull();
    });
});
