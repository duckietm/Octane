import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setSelectorOptions = vi.fn();
let trigger: { intData: number[]; isFilter?: boolean; isInvert?: boolean } | null = null;
let save: (() => void) | null = null;

const { areaManager } = vi.hoisted(() => ({
    areaManager: {
        activated: true,
        callback: null as ((x: number, y: number, w: number, h: number) => void) | null,
        activate: vi.fn(),
        deactivate: vi.fn(),
        setHighlight: vi.fn(),
        setHighlightType: vi.fn(),
        startSelecting: vi.fn(),
        clearHighlight: vi.fn()
    }
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetRoomEngine: () => ({ areaSelectionManager: areaManager }),
    RoomAreaSelectionManager: { HIGHLIGHT_BRIGHTEN: 'highlight_brighten', HIGHLIGHT_GREEN: 'highlight_green' }
}));

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setSelectorOptions })
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick, disabled }: PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredSelectorBaseView', () => ({
    WiredSelectorBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

import { WiredSelectorInAreaView } from './WiredSelectorInAreaView';
import { decodeNames, encodeNames, limitNamesText } from './WiredSelectorUsersByNameView';

describe('WiredSelectorInAreaView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        areaManager.clearHighlight.mockClear();
        areaManager.setHighlightType.mockClear();
        areaManager.activate.mockImplementation((callback) => {
            areaManager.callback = callback;
            return areaManager.activated;
        });
        areaManager.activated = true;
        save = null;
    });

    it('clears only the highlight and keeps the brighten highlight on invert', () => {
        trigger = { intData: [1, 2, 3, 4], isInvert: true };
        render(<WiredSelectorInAreaView />);

        fireEvent.click(screen.getByText('wiredfurni.params.area_selection.clear'));
        act(() => save());

        expect(areaManager.clearHighlight).toHaveBeenCalled();
        expect(setIntParams).toHaveBeenCalledWith([1, 2, 3, 4]);
        expect(areaManager.setHighlightType).not.toHaveBeenCalled();
        expect(screen.queryByText('wiredfurni.params.area_selection.selected')).toBeNull();
    });

    it('disables select while selecting and takes the picked area', () => {
        trigger = { intData: [] };
        render(<WiredSelectorInAreaView />);

        const select = screen.getByText('wiredfurni.params.area_selection.select');

        fireEvent.click(select);
        expect(select).toBeDisabled();

        act(() => areaManager.callback(5, 6, 2, 2));
        expect(select).not.toBeDisabled();

        act(() => save());
        expect(setIntParams).toHaveBeenCalledWith([5, 6, 2, 2]);
    });

    it('disables both buttons when the area selection cannot be activated', () => {
        areaManager.activated = false;
        trigger = { intData: [] };
        render(<WiredSelectorInAreaView />);

        expect(screen.getByText('wiredfurni.params.area_selection.select')).toBeDisabled();
        expect(screen.getByText('wiredfurni.params.area_selection.clear')).toBeDisabled();
    });
});

describe('Users by name text', () => {
    it('joins the names with tabs and reads tabs back as lines', () => {
        expect(encodeNames('a\nb\r\nc')).toBe('a\tb\tc');
        expect(decodeNames('a\tb')).toBe('a\nb');
        expect(decodeNames('a\nb')).toBe('a\nb');
    });

    it('caps the text at 1000 characters and 20 lines', () => {
        const lines = Array.from({ length: 25 }, (_, index) => `u${index}`).join('\n');

        expect(limitNamesText(lines).split('\n')).toHaveLength(20);
        expect(limitNamesText('x'.repeat(1200))).toHaveLength(1000);
    });
});
