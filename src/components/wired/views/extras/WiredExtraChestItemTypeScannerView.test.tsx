import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    setIntParams: vi.fn(),
    setStringParam: vi.fn(),
    setVariableIds: vi.fn(),
    setSourceTypes: vi.fn(),
    setFurniIds: vi.fn(),
    setFurniIds2: vi.fn(),
    setAllowsFurni: vi.fn(),
    save: null as null | (() => void),
    validate: null as null | (() => boolean),
    footer: null as ReactNode,
    showSelection: true as boolean,
    pickerEntries: [] as Array<{ token: string; label: string }>,
    pickerSelect: null as null | ((entry: { token: string }) => void),
    rows: [] as Array<{ title: string; value: number }>
}));

let trigger: Record<string, unknown> | null = null;
let contextVariableDefinitions: Array<Record<string, unknown>> = [];

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        applySelectionShaderToFurni: vi.fn(),
        applySecondarySelectionShaderToFurni: vi.fn(),
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn()
    }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({
        trigger,
        furniIds: (trigger?.selectedItems as number[]) ?? [],
        setFurniIds: mocks.setFurniIds,
        setFurniIds2: mocks.setFurniIds2,
        setIntParams: mocks.setIntParams,
        setStringParam: mocks.setStringParam,
        setVariableIds: mocks.setVariableIds,
        setSourceTypes: mocks.setSourceTypes,
        setAllowsFurni: mocks.setAllowsFurni
    }),
    useWiredTools: () => ({ contextVariableDefinitions })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    FURNI_SOURCES: [{ value: 100, label: 'wiredfurni.params.sources.furni.100' }],
    sortWiredSourceOptions: (options: unknown[]) => options
}));

vi.mock('../WiredValueOrVariableField', () => ({
    variableTokenFromId: (text: string) => (parseInt(text, 10) > 0 ? `custom:${parseInt(text, 10)}` : '')
}));

vi.mock('../WiredFurniSelectionSourceRow', () => ({
    WiredFurniSelectionSourceRow: (props: { title: string; value: number }) => {
        mocks.rows.push({ title: props.title, value: props.value });

        return <div data-testid="source-row">{props.title}</div>;
    }
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: (props: { entries: Array<{ token: string; label: string }>; onSelect: (entry: { token: string }) => void }) => {
        mocks.pickerEntries = props.entries;
        mocks.pickerSelect = props.onSelect;

        return <div data-testid="picker" />;
    }
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save, validate, footer, showSelection }: PropsWithChildren<{ save: () => void; validate: () => boolean; footer: ReactNode; showSelection: boolean }>) => {
        mocks.save = save;
        mocks.validate = validate;
        mocks.showSelection = showSelection;

        return (
            <div>
                {children}
                {footer}
            </div>
        );
    }
}));

import { isChestScannerVariableCandidate, WiredExtraChestItemTypeScannerView } from './WiredExtraChestItemTypeScannerView';

describe('WiredExtraChestItemTypeScannerView', () => {
    beforeEach(() => {
        trigger = {
            intData: [1],
            stringData: '',
            variableIds: ['5'],
            selectedItems: [300],
            selectedItems2: [500],
            furniSourceTypes: [100, 101],
            maximumItemSelectionCount: 20
        };
        contextVariableDefinitions = [
            { itemId: 5, name: 'in_chest', hasValue: true, availability: 0, isTextConnected: false },
            { itemId: 6, name: 'flag', hasValue: false, availability: 0, isTextConnected: false },
            { itemId: 7, name: 'ptr', hasValue: true, availability: 0, isTextConnected: false, requiresExecutionContext: true },
            { itemId: 8, name: 'list', hasValue: true, availability: 0, isTextConnected: false, valueShape: 'array' }
        ];
        mocks.rows = [];
        Object.values(mocks).forEach((value) => (typeof value === 'function' && 'mockClear' in value ? value.mockClear() : null));
    });

    afterEach(() => cleanup());

    it('shows the usage note, the collapsed scan options and the official source titles', () => {
        render(<WiredExtraChestItemTypeScannerView />);

        expect(screen.getByText('wiredfurni.params.chest_item_type_scanner.info')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.chest_item_type_scanner')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.chest_item_type_scanner.0')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.chest_item_type_scanner.1')).toBeTruthy();
        expect(screen.getByText('wiredfurni.params.chest_item_type_scanner').closest('details')?.open).toBe(false);
        expect(screen.getAllByTestId('source-row').map((row) => row.textContent)).toEqual([
            'wiredfurni.params.sources.furni.title.item_types',
            'wiredfurni.params.sources.furni.title.chests'
        ]);
        expect(mocks.showSelection).toBe(false);
    });

    it('offers only context variables with a value the room may write', () => {
        render(<WiredExtraChestItemTypeScannerView />);

        expect(mocks.pickerEntries.map((entry) => entry.label)).toEqual(['in_chest']);
        expect(isChestScannerVariableCandidate({ itemId: 9, hasValue: true, isReadOnly: true })).toBe(false);
    });

    it('opens on the stored definition and saves the official layout', () => {
        render(<WiredExtraChestItemTypeScannerView />);

        expect(screen.getAllByRole('radio')[1]).toBeChecked();
        fireEvent.click(screen.getAllByRole('radio')[0]);
        mocks.save();

        expect(mocks.setIntParams).toHaveBeenCalledWith([0]);
        expect(mocks.setStringParam).toHaveBeenCalledWith('');
        expect(mocks.setVariableIds).toHaveBeenCalledWith(['ctx:5']);
        expect(mocks.setSourceTypes).toHaveBeenCalledWith({ furni: [100, 101], users: [] });
        expect(mocks.setFurniIds2).toHaveBeenCalledWith([500]);
    });

    it('needs a variable before it saves', () => {
        trigger = { intData: [], stringData: '', variableIds: [], selectedItems: [], selectedItems2: [], furniSourceTypes: [] };
        render(<WiredExtraChestItemTypeScannerView />);

        expect(mocks.validate()).toBe(false);
        expect(screen.getAllByRole('radio')[0]).toBeChecked();
    });
});
