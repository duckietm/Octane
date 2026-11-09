import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ handlers: new Map<unknown, (event: unknown) => void>() }));

vi.mock('../../../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../api')>()),
    GetFurnitureData: () => null,
    GetImageIconUrlForProduct: (_type: string, classId: number) => (classId === 30 ? null : `icon/${classId}.png`),
    LocalizeText: (key: string, _names?: string[], values?: string[]) => (values?.length ? `${key}:${values.join(',')}` : key),
    // The hotel's texts have the AIR levels 1-5, not level 6.
    localizeWithFallback: (key: string, fallback: string) => (key === 'recycler.prizes.category.6' ? fallback : key),
    SendMessageComposer: vi.fn()
}));

vi.mock('../../../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../hooks')>()),
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));

vi.mock('../../../../../../common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../../../common')>()),
    LayoutFurniImageView: (props: { productClassId: number }) => <span>furni {props.productClassId}</span>
}));

import { RecyclerPrizesMessageEvent } from '@octane/renderer';
import { CatalogLayoutRecyclerPrizesView } from './CatalogLayoutRecyclerPrizesView';

const prize = (name: string, productClassId: number) => ({ name, productClassId, productType: 's', count: 1 });

describe('recycler prizes page (AIR layout_recycler_prizes_xml)', () => {
    afterEach(cleanup);

    beforeEach(() => state.handlers.clear());

    it('lists the levels with AIR odds and previews the chosen prize', () => {
        const page = { localization: { getImage: (index: number) => (index === 1 ? 'teaser.png' : null), getText: () => '' } } as any;
        const { container } = render(<CatalogLayoutRecyclerPrizesView page={page} hideNavigation={() => undefined} />);

        act(() =>
            state.handlers.get(RecyclerPrizesMessageEvent)?.({
                getParser: () => ({
                    levels: [
                        { levelId: 6, chance: 5000, products: [prize('Dragon lamp', 60)] },
                        { levelId: 2, chance: 4, products: [prize('Lamp', 20)] },
                        { levelId: 1, chance: 1, products: [prize('Chair', 10)] }
                    ]
                })
            })
        );

        const heads = Array.from(container.querySelectorAll('.octane-catalog-air-prizes__level-head')).map((head) => head.textContent);

        expect(heads).toEqual([
            '★recycler.prizes.category.1',
            '★recycler.prizes.category.2 - recycler.prizes.odds:1:4',
            // Mythic, level 6: the client's own name when the texts lack one.
            '★Mythic - recycler.prizes.odds:1:5000'
        ]);
        expect(container.querySelector('.octane-catalog-air-prizes__teaser')).toHaveAttribute('src', 'teaser.png');

        fireEvent.click(screen.getByRole('button', { name: 'Lamp' }));

        expect(container.querySelector('.octane-catalog-air-prizes__name')).toHaveTextContent('Lamp');
        // The level tiles show the furni icons.
        expect(screen.getByRole('button', { name: 'Chair' }).querySelector('img')).toHaveAttribute('src', 'icon/10.png');
        expect(container.querySelector('.octane-catalog-air-prizes__teaser')).toBeNull();
    });
});
