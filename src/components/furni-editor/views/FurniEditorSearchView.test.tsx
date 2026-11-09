import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FurniItem } from '../../../hooks/furni-editor';
import { FurniEditorSearchView } from './FurniEditorSearchView';

vi.mock('../../../common', () => ({
    Column: ({ children }: any) => <div>{children}</div>,
    Flex: ({ children }: any) => <div>{children}</div>,
    Text: ({ children }: any) => <span>{children}</span>,
    LayoutFurniIconImageView: () => null
}));

const row = (id: number, itemName: string, interactionType: string): FurniItem => ({
    id,
    spriteId: id,
    itemName,
    publicName: itemName,
    type: 's',
    width: 1,
    length: 1,
    stackHeight: 1,
    allowStack: true,
    allowWalk: false,
    allowSit: false,
    allowLay: false,
    interactionType,
    interactionModesCount: 1
});

afterEach(() => cleanup());

describe('FurniEditorSearchView', () => {
    it('dots the rows worth a look and can show only those', () => {
        const items = [row(1, 'throne', 'default'), row(2, 'wf_trg_enter_room', 'default'), row(3, 'hc_lamp', 'wf_trg_typo')];
        render(
            <FurniEditorSearchView
                items={items}
                total={3}
                page={1}
                loading={false}
                interactions={['default', 'wf_trg_enter_room']}
                onSearch={vi.fn()}
                onSelect={vi.fn()}
            />
        );

        expect(screen.getByLabelText('classname suggests "wf_trg_enter_room" (classname is a registered type)')).toBeInTheDocument();
        expect(screen.getByLabelText('type "wf_trg_typo" has no class, behaves as default')).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(4);

        fireEvent.click(screen.getByRole('button', { name: '2 to check on this page' }));

        expect(screen.getAllByRole('row')).toHaveLength(3);
        expect(screen.queryByText('throne')).toBeNull();
    });

    it('shows no filter when every row is fine', () => {
        render(
            <FurniEditorSearchView
                items={[row(1, 'throne', 'default')]}
                total={1}
                page={1}
                loading={false}
                interactions={['default']}
                onSearch={vi.fn()}
                onSelect={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /to check/ })).toBeNull();
    });
});
