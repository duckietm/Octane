import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@octane/renderer', () => ({ GetTickerTime: () => 0 }));
vi.mock('../../../../api', () => ({
    CatalogType: { BUILDER: 'BUILDERS_CLUB', NORMAL: 'NORMAL' },
    FriendlyTime: { format: () => '84 dagen' },
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string, parameters: string[] = [], values: string[] = []) => {
        const texts: Record<string, string> = {
            'builder.header.title': 'Jouw BC status: %BCSTATUS%',
            'builder.header.status.member': 'Full Member',
            'builder.header.status.membership': 'Resterende dagen: %DURATION%',
            'builder.header.status.limit': 'Geleende items: %COUNT%/%LIMIT%'
        };
        let text = texts[key] ?? key;

        parameters.forEach((parameter, index) => (text = text.replace(`%${parameter}%`, values[index])));

        return text;
    },
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));
vi.mock('../../../../hooks', () => ({
    useCatalogData: () => ({ furniCount: 2, furniLimit: 1000, secondsLeft: 3600, secondsLeftWithGrace: 0, updateTime: 0 }),
    useCatalogUiState: () => ({ currentType: 'BUILDERS_CLUB' })
}));

import { CatalogBuildersClubStatusView } from './CatalogBuildersClubStatusView';

describe('Builders Club header (AIR builder.header.status.*)', () => {
    it('draws the duration, count and limit as the orange bold values', () => {
        const { container } = render(<CatalogBuildersClubStatusView />);
        const lines = container.querySelectorAll('.octane-catalog-standard-header-description');
        const values = Array.from(container.querySelectorAll('.octane-catalog-builder-header-value')).map((value) => value.textContent);

        expect(lines[0]).toHaveTextContent('Resterende dagen: 84 dagen');
        expect(lines[1]).toHaveTextContent('Geleende items: 2/1000');
        expect(values).toEqual(['84 dagen', '2', '1000']);
    });
});
