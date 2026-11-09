import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setFurniIds = vi.fn();
const setFurniIds2 = vi.fn();
const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setAllowsFurni = vi.fn();
const setSourceTypes = vi.fn();
const noFurni: number[] = [];
let trigger: Record<string, unknown> | null = null;
let baseProps: { save: () => void } | null = null;

vi.mock('../../../../api', () => ({
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1, STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE: 3 },
    WiredSelectionVisualizer: {
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn(),
        setEditingPickList: vi.fn(),
        showPickLists: vi.fn(() => [])
    }
}));
vi.mock('../../../../hooks', async () => {
    const { useCallback, useState } = await vi.importActual<typeof import('react')>('react');

    return {
        // The live picks follow setFurniIds, as useWired's do.
        useWired: () => {
            const [furniIds, setLiveFurniIds] = useState<number[]>(noFurni);
            const setLive = useCallback((ids: number[]) => {
                setFurniIds(ids);
                setLiveFurniIds(ids);
            }, []);

            return {
                trigger,
                furniIds,
                setFurniIds: setLive,
                setFurniIds2,
                setIntParams,
                setStringParam,
                setAllowsFurni,
                setSourceTypes
            };
        }
    };
});
vi.mock('../WiredSourcesSelector', () => ({
    FURNI_SOURCES: [
        { value: 0, label: 'wiredfurni.params.sources.furni.0' },
        { value: 100, label: 'wiredfurni.params.sources.furni.100' }
    ],
    sortWiredSourceOptions: (options: unknown[]) => options
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({ WiredFurniSelectionSourceRow: () => null }));
vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: (props: PropsWithChildren<{ save: () => void; selectionPreview?: ReactNode }>) => {
        baseProps = { save: props.save };
        return <div>{props.selectionPreview}</div>;
    }
}));

import { act } from '@testing-library/react';

const { WiredConditionFurniIsOfTypeView } = await import('./WiredConditionFurniIsOfTypeView');

describe('WiredConditionFurniIsOfTypeView (AIR StuffTypeMatches)', () => {
    beforeEach(() => {
        trigger = { intData: [], stringData: '', selectedItems: [5], selectedItems2: [9], furniSourceTypes: [100, 101] };
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('saves the checked furni as the picks and the types as the other picks, with both sources and no ints', () => {
        render(<WiredConditionFurniIsOfTypeView />);

        act(() => baseProps?.save());
        expect(setFurniIds).toHaveBeenLastCalledWith([5]);
        expect(setFurniIds2).toHaveBeenLastCalledWith([9]);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [100, 101], users: [] });
        expect(setIntParams).toHaveBeenLastCalledWith([]);
        expect(setStringParam).toHaveBeenLastCalledWith('');
    });

    it('drops the other picks when no slot reads them', () => {
        trigger = { ...trigger, furniSourceTypes: [100, 0] };
        render(<WiredConditionFurniIsOfTypeView />);

        act(() => baseProps?.save());
        expect(setFurniIds).toHaveBeenLastCalledWith([5]);
        expect(setFurniIds2).toHaveBeenLastCalledWith([]);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [100, 0], users: [] });
    });

    it('keeps editing the other picks when only they are read', () => {
        trigger = { ...trigger, furniSourceTypes: [0, 101] };
        render(<WiredConditionFurniIsOfTypeView />);

        act(() => baseProps?.save());
        expect(setFurniIds).toHaveBeenLastCalledWith([9]);
        expect(setFurniIds2).toHaveBeenLastCalledWith([9]);
        expect(setSourceTypes).toHaveBeenLastCalledWith({ furni: [0, 101], users: [] });
    });
});
