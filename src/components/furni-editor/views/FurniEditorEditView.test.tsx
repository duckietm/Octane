import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogRef, FurniDetail, FurniItem } from '../../../hooks/furni-editor';
import { FurniEditorEditView } from './FurniEditorEditView';

vi.mock('../../../api', () => ({
    CopyToClipboard: () => Promise.resolve(true)
}));

vi.mock('../../../common', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button type="button" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
    Column: ({ children }: any) => <div>{children}</div>,
    Flex: ({ children }: any) => <div>{children}</div>,
    Text: ({ children }: any) => <span>{children}</span>,
    LayoutFurniIconImageView: () => null,
    LayoutFurniImageView: () => null
}));

const item: FurniDetail = {
    id: 42,
    spriteId: 4200,
    itemName: 'throne',
    publicName: 'Throne',
    type: 's',
    width: 1,
    length: 1,
    stackHeight: 1.5,
    allowStack: false,
    allowWalk: false,
    allowSit: true,
    allowLay: false,
    interactionType: 'default',
    interactionModesCount: 1,
    allowGift: true,
    allowTrade: true,
    allowRecycle: true,
    allowMarketplaceSell: true,
    allowInventoryStack: true,
    vendingIds: '',
    customparams: '',
    effectIdMale: 0,
    effectIdFemale: 0,
    clothingOnWalk: '',
    multiheight: '',
    description: 'Royal seat',
    usageCount: 3
};

const catalogItems: CatalogRef[] = [
    { id: 7, catalogName: 'throne', costCredits: 25, costPoints: 0, pointsType: 0, pageId: 3, pageName: 'Rares' },
    { id: 8, catalogName: 'throne_bundle', costCredits: 0, costPoints: 10, pointsType: 5, pageId: 9, pageName: 'Diamonds' }
];

const renderView = (overrides: Partial<React.ComponentProps<typeof FurniEditorEditView>> = {}) => {
    const props = {
        item,
        catalogItems,
        furniDataEntry: null,
        furniDataDiagnostic: null,
        interactions: ['default', 'gate'],
        relatedItems: [] as FurniItem[],
        loading: false,
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onBack: vi.fn(),
        onUpdateFurnidata: vi.fn(),
        onRevertFurnidata: vi.fn(),
        onUpdateFurnidataStructure: vi.fn(),
        onSyncPublicName: vi.fn(),
        onImportText: vi.fn(),
        importResult: null,
        ...overrides
    };

    render(<FurniEditorEditView {...props} />);

    return props;
};

afterEach(() => cleanup());

describe('FurniEditorEditView', () => {
    it('renders the items_base fields that the server accepts but the form used to hide', () => {
        renderView({ item: { ...item, effectIdMale: 12, effectIdFemale: 13, clothingOnWalk: 'ch-210', vendingIds: '1,2', multiheight: '0.5,1.0' } });

        expect(screen.getByLabelText('Effect ID (male)')).toHaveValue(12);
        expect(screen.getByLabelText('Effect ID (female)')).toHaveValue(13);
        expect(screen.getByLabelText('Clothing on walk')).toHaveValue('ch-210');
        expect(screen.getByLabelText('Vending IDs')).toHaveValue('1,2');
        expect(screen.getByLabelText('Multiheight')).toHaveValue('0.5,1.0');
        expect(screen.getByLabelText('Description (DB)')).toHaveValue('Royal seat');
    });

    it('confirms a save through a diff of the changed fields only, without the immutable identity columns', () => {
        const onUpdate = vi.fn<(id: number, fields: Record<string, unknown>) => void>();
        renderView({ onUpdate });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Multiheight'), { target: { value: '0.5,1.0' } });

        fireEvent.click(screen.getByRole('button', { name: 'Save (2)' }));

        const dialog = screen.getByRole('dialog', { name: 'Confirm changes' });
        expect(within(dialog).getByText('Effect ID (male)')).toBeInTheDocument();
        expect(within(dialog).getByText('Multiheight')).toBeInTheDocument();
        expect(within(dialog).queryByText('Width')).toBeNull();
        expect(onUpdate).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

        expect(onUpdate).toHaveBeenCalledTimes(1);
        const [id, fields] = onUpdate.mock.calls[0];
        expect(id).toBe(42);
        expect(fields).toMatchObject({ effectIdMale: 5, multiheight: '0.5,1.0', width: 1 });
        expect(fields).not.toHaveProperty('itemName');
        expect(fields).not.toHaveProperty('spriteId');
        expect(fields).not.toHaveProperty('type');
    });

    it('rejects values outside the server bounds before offering the save', () => {
        renderView();

        fireEvent.change(screen.getByLabelText('Multiheight'), { target: { value: 'x'.repeat(51) } });

        expect(screen.getByText('Max 50 chars')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save (1)' })).toBeDisabled();
    });

    it('lists the catalogue offers that sell this furni', () => {
        renderView();

        const section = screen.getByTestId('furni-editor-catalog');
        expect(within(section).getByText('Rares')).toBeInTheDocument();
        expect(within(section).getByText('25 credits')).toBeInTheDocument();
        expect(within(section).getByText('Diamonds')).toBeInTheDocument();
        expect(within(section).getByText('10 points (type 5)')).toBeInTheDocument();
    });

    it('says so when the furni is not sold anywhere', () => {
        renderView({ catalogItems: [] });

        expect(within(screen.getByTestId('furni-editor-catalog')).getByText('Not in the catalogue')).toBeInTheDocument();
    });

    it('guards a dirty form behind an in-app dialog instead of window.confirm', () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        const { onBack } = renderView();

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(onBack).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog', { name: 'Unsaved changes' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Discard' }));

        expect(onBack).toHaveBeenCalledTimes(1);
        confirmSpy.mockRestore();
    });

    it('flags a stored interaction type that no server class is registered for, and keeps it selectable', () => {
        renderView({ item: { ...item, interactionType: 'wf_trg_typo' } });

        expect(screen.getByText('No class registered for this type: the furni behaves as default')).toBeInTheDocument();
        expect(screen.getByLabelText('Interaction type')).toHaveValue('wf_trg_typo');
    });

    it('does not flag a registered interaction type, whatever its case', () => {
        renderView({ item: { ...item, interactionType: 'Gate' } });

        expect(screen.queryByText('No class registered for this type: the furni behaves as default')).toBeNull();
    });

    it('shows one field group at a time and marks the groups holding unsaved changes', () => {
        renderView();

        const names = screen.getByRole('tab', { name: 'Names' });
        const behaviour = screen.getByRole('tab', { name: 'Behaviour' });
        expect(names).toHaveAttribute('aria-selected', 'true');
        expect(behaviour).toHaveAttribute('aria-selected', 'false');

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });

        expect(within(behaviour).getByLabelText('1 unsaved')).toBeInTheDocument();
        expect(within(names).queryByLabelText(/unsaved/)).toBeNull();

        fireEvent.click(behaviour);
        expect(behaviour).toHaveAttribute('aria-selected', 'true');
    });

    it('lists every unsaved change in the sidebar and jumps to the catalogue from its status row', () => {
        renderView();

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        expect(screen.getByText('1 unsaved change')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '2 offers ›' }));
        expect(screen.getByRole('tab', { name: 'Catalogue' })).toHaveAttribute('aria-selected', 'true');
    });

    it('offers a per-field revert that puts the stored value back', () => {
        renderView();

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        fireEvent.change(screen.getByLabelText('Multiheight'), { target: { value: '1' } });
        expect(screen.getByRole('button', { name: 'Save (2)' })).toBeEnabled();

        fireEvent.click(screen.getByRole('button', { name: 'Revert Effect ID (male)' }));

        expect(screen.getByLabelText('Effect ID (male)')).toHaveValue(0);
        expect(screen.getByLabelText('Multiheight')).toHaveValue('1');
        expect(screen.getByRole('button', { name: 'Save (1)' })).toBeEnabled();
    });

    it('jumps to a field by name, switching to its group', () => {
        vi.useFakeTimers();
        renderView();

        fireEvent.change(screen.getByLabelText('Jump to field'), { target: { value: 'multi' } });
        vi.runAllTimers();

        expect(screen.getByRole('tab', { name: 'Behaviour' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByLabelText('Multiheight')).toHaveFocus();
        expect(screen.getByLabelText('Jump to field')).toHaveValue('');
        vi.useRealTimers();
    });

    it('previews the furni with rotation, a state stepper and the stored footprint', () => {
        renderView({ item: { ...item, width: 2, length: 3, interactionModesCount: 3 } });

        const preview = screen.getByTestId('furni-editor-preview');
        expect(within(preview).getByLabelText('Footprint 2 by 3').children).toHaveLength(6);

        const rotate = within(preview).getByRole('button', { name: 'Rotate, facing 2' });
        fireEvent.click(rotate);
        expect(within(preview).getByRole('button', { name: 'Rotate, facing 4' })).toBeInTheDocument();

        fireEvent.click(within(preview).getByRole('button', { name: 'Next state, showing base of 3' }));
        expect(within(preview).getByRole('button', { name: 'Next state, showing 1 of 3' })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Width'), { target: { value: '4' } });
        expect(within(preview).getByLabelText('Footprint 4 by 3').children).toHaveLength(12);
    });

    it('suggests the interaction type the classname points at, and applies it in one click', () => {
        renderView({
            item: { ...item, itemName: 'wf_trg_enter_room', interactionType: 'default' },
            interactions: ['default', 'gate', 'wf_trg_enter_room', 'teleport']
        });

        const suggestion = screen.getByRole('button', { name: /Suggested: wf_trg_enter_room/ });
        fireEvent.click(suggestion);

        expect(screen.getByLabelText('Interaction type')).toHaveValue('wf_trg_enter_room');
        expect(screen.queryByRole('button', { name: /Suggested:/ })).toBeNull();
    });

    it('filters the registered types while typing and takes the first match on Enter', () => {
        renderView({ interactions: ['default', 'gate', 'guild_gate', 'teleport'] });

        const picker = screen.getByLabelText('Interaction type');
        fireEvent.focus(picker);
        fireEvent.change(picker, { target: { value: 'gat' } });

        const list = screen.getByRole('listbox');
        expect(
            within(list)
                .getAllByRole('option')
                .map((o) => o.textContent)
        ).toEqual(['gate', 'guild_gate']);

        fireEvent.keyDown(picker, { key: 'Enter' });
        expect(picker).toHaveValue('gate');
        expect(screen.getByRole('button', { name: 'Save (1)' })).toBeEnabled();
    });

    it('offers what furnidata says about footprint, flags and description, one click each or all at once', () => {
        renderView({
            furniDataEntry: {
                classname: 'throne',
                xdim: 2,
                ydim: 1,
                canstandon: true,
                cansiton: true,
                canlayon: false,
                tradeable: true,
                recyclable: false,
                description: 'Royal seat'
            },
            item: { ...item, description: '' }
        });

        expect(screen.getByRole('button', { name: '4 suggestions ›' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Apply Width 2' }));
        expect(screen.getByRole('spinbutton', { name: 'Width' })).toHaveValue(2);
        expect(screen.queryByRole('button', { name: 'Apply Width 2' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'apply all' }));
        expect(screen.getByLabelText('Description (DB)')).toHaveValue('Royal seat');
        expect(screen.getByRole('button', { name: 'Walk', pressed: true })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Recycle', pressed: false })).toBeInTheDocument();
        expect(screen.queryByText(/suggestion/)).toBeNull();
        expect(screen.getByRole('button', { name: 'Save (4)' })).toBeEnabled();
    });

    it('ignores a furnidata entry that belongs to another classname', () => {
        renderView({ furniDataEntry: { classname: 'other_chair', xdim: 4, ydim: 4 } });

        expect(screen.queryByRole('button', { name: /suggestion/ })).toBeNull();
    });

    it('proposes the state count a type drives and warns when a list-driven type has an empty list', () => {
        renderView({ item: { ...item, interactionType: 'gate' }, interactions: ['default', 'gate', 'vendingmachine'] });

        fireEvent.click(screen.getByRole('button', { name: 'Apply Modes 2' }));
        expect(screen.getByLabelText('Modes')).toHaveValue(2);

        const picker = screen.getByLabelText('Interaction type');
        fireEvent.focus(picker);
        fireEvent.change(picker, { target: { value: 'vending' } });
        fireEvent.keyDown(picker, { key: 'Enter' });

        expect(screen.getByRole('note')).toHaveTextContent('vendingmachine hands out nothing without vending ids');
        expect(screen.getByRole('button', { name: '1 warning ›' })).toBeInTheDocument();
    });

    it('flags a furnidata entry whose id is not the sprite id', () => {
        renderView({ furniDataEntry: { classname: 'throne', id: 4201 } });

        expect(screen.getByText('Furnidata id 4201 ≠ sprite')).toBeInTheDocument();
    });

    it('warns in the diff when a placement field changes on a furni standing in rooms', () => {
        renderView();

        fireEvent.change(screen.getByRole('spinbutton', { name: 'Width' }), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save (1)' }));

        const dialog = screen.getByRole('dialog', { name: 'Confirm changes' });
        expect(within(dialog).getByRole('note')).toHaveTextContent('3 placed furni will take the new footprint');
    });

    it('offers to undo the last save once the stored values have moved', () => {
        const onUpdate = vi.fn();
        const { rerender } = render(
            <FurniEditorEditView
                item={item}
                catalogItems={[]}
                furniDataEntry={null}
                furniDataDiagnostic={null}
                interactions={['default']}
                relatedItems={[]}
                loading={false}
                onUpdate={onUpdate}
                onDelete={vi.fn()}
                onBack={vi.fn()}
                onUpdateFurnidata={vi.fn()}
                onRevertFurnidata={vi.fn()}
                onUpdateFurnidataStructure={vi.fn()}
                onSyncPublicName={vi.fn()}
                onImportText={vi.fn()}
                importResult={null}
            />
        );

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save (1)' }));
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Confirm changes' })).getByRole('button', { name: 'Confirm' }));
        expect(screen.queryByRole('button', { name: 'Undo last save' })).toBeNull();

        rerender(
            <FurniEditorEditView
                item={{ ...item, effectIdMale: 5 }}
                catalogItems={[]}
                furniDataEntry={null}
                furniDataDiagnostic={null}
                interactions={['default']}
                relatedItems={[]}
                loading={false}
                onUpdate={onUpdate}
                onDelete={vi.fn()}
                onBack={vi.fn()}
                onUpdateFurnidata={vi.fn()}
                onRevertFurnidata={vi.fn()}
                onUpdateFurnidataStructure={vi.fn()}
                onSyncPublicName={vi.fn()}
                onImportText={vi.fn()}
                importResult={null}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Undo last save' }));
        expect(screen.getByLabelText('Effect ID (male)')).toHaveValue(0);
        expect(screen.getByRole('button', { name: 'Save (1)' })).toBeEnabled();
    });

    it('lists duplicates and line siblings from the probe, and offers the line majority under the field', () => {
        const row = (id: number, itemName: string, spriteId: number, width = 1): FurniItem => ({
            id,
            spriteId,
            itemName,
            publicName: itemName,
            type: 's',
            width,
            length: 1,
            stackHeight: 1.5,
            allowStack: false,
            allowWalk: false,
            allowSit: true,
            allowLay: false,
            interactionType: 'default',
            interactionModesCount: 1
        });
        renderView({
            item: { ...item, itemName: 'throne_gold' },
            relatedItems: [
                row(42, 'throne_gold', 4200),
                row(50, 'throne_gold', 4300),
                row(51, 'throne', 4301, 2),
                row(52, 'throne_silver', 4302, 2),
                row(53, 'lamp', 4200)
            ]
        });

        expect(screen.getByText('2 duplicates')).toBeInTheDocument();
        expect(within(screen.getByTestId('furni-editor-duplicates')).getAllByRole('button')).toHaveLength(2);
        expect(within(screen.getByTestId('furni-editor-siblings')).getAllByRole('button')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Apply Width 2' })).toHaveAttribute('title', '2 of 2 in the line');
    });

    it('writes the DB structural values into the furnidata entry after confirmation', () => {
        const onUpdateFurnidataStructure = vi.fn();
        renderView({
            onUpdateFurnidataStructure,
            furniDataEntry: { classname: 'throne', xdim: 2, ydim: 1, height: 1.5, canstandon: false, cansiton: false, canlayon: false }
        });

        expect(within(screen.getByTestId('furni-editor-structure')).getAllByText(/xdim|cansiton/)).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'Write DB values into furnidata' }));
        fireEvent.click(within(screen.getByRole('dialog', { name: 'Rewrite furnidata structure?' })).getByRole('button', { name: 'Write' }));

        expect(onUpdateFurnidataStructure).toHaveBeenCalledWith(42, { xdim: 1, cansiton: true });
    });

    it('resets every field to the stored values with one click', () => {
        renderView();

        fireEvent.change(screen.getByLabelText('Effect ID (male)'), { target: { value: '5' } });
        fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

        expect(screen.getByLabelText('Effect ID (male)')).toHaveValue(0);
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
});
