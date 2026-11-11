/* @vitest-environment jsdom */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TalentImageView } from './TalentImageView';

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfigurationValue: (key: string, fallback: unknown) => (key === 'furni.asset.icon.url' ? 'icons/%libname%%param%_icon.png' : fallback)
}));

describe('TalentImageView', () => {
    afterEach(cleanup);

    it('falls back from the library to the bundled picture', () => {
        const { container } = render(<TalentImageView src="lib/talent/helper_1.png" />);
        const image = () => container.querySelector('img');

        expect(image()).toHaveAttribute('src', 'lib/talent/helper_1.png');

        fireEvent.error(image());

        expect(image().getAttribute('src')).toContain('helper_1');
        expect(image().getAttribute('src')).not.toBe('lib/talent/helper_1.png');
    });

    it('ends on the furni icon for a product without a picture, then shows nothing', () => {
        const { container } = render(<TalentImageView productCode="duck" src="lib/talent/reward_product_duck.png" />);

        fireEvent.error(container.querySelector('img'));

        expect(container.querySelector('img')).toHaveAttribute('src', 'icons/duck_icon.png');

        fireEvent.error(container.querySelector('img'));

        expect(container.querySelector('img')).toBeNull();
    });
});
