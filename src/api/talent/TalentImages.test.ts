import { describe, expect, it } from 'vitest';
import { talentImageName, talentImageSources, talentProductIconUrl } from './TalentImages';

describe('talent pictures', () => {
    it('reads the picture name from its library url', () => {
        expect(talentImageName('http://h/c_images/talent/helper_3.png')).toBe('helper_3');
        expect(talentImageName('lib/talent/reward_product_duck.png?v=2')).toBe('reward_product_duck');
        expect(talentImageName('lib/other/x.png')).toBe('');
    });

    it('tries the library, then the bundled copy, then what else is given', () => {
        const bundled = { helper_3: '/assets/helper_3.png' };

        expect(talentImageSources('lib/talent/helper_3.png', bundled)).toEqual(['lib/talent/helper_3.png', '/assets/helper_3.png']);
        expect(talentImageSources('lib/talent/reward_product_duck.png', bundled, 'icons/duck_icon.png', '')).toEqual([
            'lib/talent/reward_product_duck.png',
            'icons/duck_icon.png'
        ]);
    });

    it('builds a product furni icon from the icon template', () => {
        expect(talentProductIconUrl('icons/%libname%%param%_icon.png', 'duck')).toBe('icons/duck_icon.png');
        expect(talentProductIconUrl('', 'duck')).toBe('');
        expect(talentProductIconUrl('icons/%libname%_icon.png', ' ')).toBe('');
    });
});
