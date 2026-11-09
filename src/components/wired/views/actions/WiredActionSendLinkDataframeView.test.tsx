import { cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setFurniIds = vi.fn();
const setFurniIds2 = vi.fn();
const setVariableIds = vi.fn();
const setSourceTypes = vi.fn();
const noFurni: number[] = [];
let trigger: Record<string, unknown> | null = null;
let rowsRead: unknown[] = [];
let baseProps: { save: () => void } | null = null;

vi.mock('../../../../api', () => ({
    localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 },
    WiredSelectionVisualizer: {
        clearSelectionShaderFromFurni: vi.fn(),
        clearSecondarySelectionShaderFromFurni: vi.fn(),
        setEditingPickList: vi.fn(),
        showPickLists: vi.fn(() => [])
    }
}));
vi.mock('../../../../api/wired/WiredLinkDataframe', () => ({
    emptySendRow: () => ({ key: '', mode: 0, literal: 0, text: '', target: 0, variableId: '' }),
    LINK_DATAFRAME_MAX_KEY_LENGTH: 32,
    LINK_DATAFRAME_MAX_MESSAGE_BYTES: 255,
    LINK_DATAFRAME_MAX_ROWS: 12,
    LINK_SEND_NUMBER: 0,
    LINK_SEND_VARIABLE_VALUE: 1,
    LINK_SEND_VARIABLE_TEXT: 2,
    LINK_SEND_MESSAGE: 3,
    LINK_TARGET_USER: 0,
    LINK_TARGET_FURNI: 1,
    LINK_TARGET_GLOBAL: 2,
    LINK_TARGET_CONTEXT: 3,
    linkSendError: () => null,
    readLinkSend: () => rowsRead,
    writeLinkSend: () => ({ intParams: [], stringParam: '', variableIds: [] })
}));
vi.mock('../../../../common', () => ({ Text: ({ children }: PropsWithChildren) => <span>{children}</span> }));
vi.mock('../../../../common/Checkbox', () => ({ Checkbox: () => null }));
vi.mock('../../../../common/NumberInput', () => ({ NumberInput: () => null }));
vi.mock('../../../../common/Select', () => ({ Select: () => null }));
vi.mock('../../../../hooks', () => ({
    useNotification: () => ({ simpleAlert: vi.fn() }),
    useWired: () => ({ trigger, furniIds: noFurni, setFurniIds, setFurniIds2, setIntParams, setSourceTypes, setStringParam, setVariableIds }),
    useWiredTools: () => ({})
}));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => null }));
vi.mock('../WiredVariablePicker', () => ({ WiredVariablePicker: () => null }));
vi.mock('../WiredVariablePickerData', () => ({
    buildWiredVariablePickerEntries: () => [],
    normalizeVariableTokenFromWire: (token: string) => token
}));
vi.mock('../WiredFurniSelectionSourceRow', () => ({
    WiredFurniSelectionSourceRow: (props: { options: Array<{ label: string }>; selectionCount: number }) => (
        <div data-testid="pick-row">
            {props.options[0].label}:{props.selectionCount}
        </div>
    )
}));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; selectionPreview?: ReactNode }>) => {
        baseProps = { save: props.save };
        return (
            <div>
                {props.selectionPreview}
                {props.children}
            </div>
        );
    }
}));

const { WiredActionSendLinkDataframeView } = await import('./WiredActionSendLinkDataframeView');

const furniVariableRow = { key: 'h', mode: 1, literal: 0, text: '', target: 1, variableId: 'furni:7' };

describe('WiredActionSendLinkDataframeView second pick list (AIR "other picked furni")', () => {
    beforeEach(() => {
        trigger = { intData: [], stringData: '', variableIds: [], selectedItems: [11], selectedItems2: [55, 56], furniSourceTypes: [100, 101], userSourceTypes: [0] };
        rowsRead = [furniVariableRow];
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('shows and saves the second list while a furni variable row reads "other picked furni"', () => {
        render(<WiredActionSendLinkDataframeView />);

        const rows = screen.getAllByTestId('pick-row');
        expect(rows).toHaveLength(2);
        expect(rows[1]).toHaveTextContent('wiredfurni.params.sources.furni.101:2');

        baseProps?.save();
        expect(setFurniIds2).toHaveBeenLastCalledWith([55, 56]);
        expect(setSourceTypes.mock.calls.at(-1)[0].furni.slice(0, 2)).toEqual([100, 101]);
    });

    it('drops the second list when no row reads it', () => {
        trigger = { ...trigger, furniSourceTypes: [100, 0] };
        render(<WiredActionSendLinkDataframeView />);

        expect(screen.getAllByTestId('pick-row')).toHaveLength(1);

        baseProps?.save();
        expect(setFurniIds2).toHaveBeenLastCalledWith([]);
    });
});
