// Ported from plus-emulator/volt (by Dennis, GPL-3.0).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const widget = vi.hoisted(() => ({
    state: {} as Record<string, unknown>
}));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../api')>()),
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../hooks', async () => {
    const helpers = await import('../../../../hooks/rooms/widgets/furniture/useFurnitureAreaHideWidget.helpers');

    return { getAreaHideControlState: helpers.getAreaHideControlState, useFurnitureAreaHideWidget: () => widget.state };
});

import { FurnitureAreaHideView } from './FurnitureAreaHideView';

const open = (change: Record<string, unknown> = {}) => {
    widget.state = {
        objectId: 5,
        isOn: false,
        wallItems: false,
        inverted: true,
        invisibility: false,
        selecting: false,
        selectionActive: true,
        setWallItems: vi.fn(),
        setInverted: vi.fn(),
        setInvisibility: vi.fn(),
        startSelecting: vi.fn(),
        clearSelection: vi.fn(),
        toggleOnOff: vi.fn(),
        onClose: vi.fn(),
        ...change
    };

    return render(<FurnitureAreaHideView />);
};

const button = (name: string) => document.querySelector(`[data-native-name="${name}"]`) as HTMLElement;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('FurnitureAreaHideView (AIR area_hide_ui)', () => {
    it('draws the 292x334 style 3 frame with its texts, options and buttons', () => {
        open();

        expect(screen.getByRole('dialog', { name: 'widget.areahide.title' }).style.width).toBe('292px');
        expect(screen.getByText('widget.areahide.area_selection.info')).toBeTruthy();
        expect(button('select_button').getAttribute('data-native-enabled')).toBe('true');
        expect(button('invert_checkbox').getAttribute('aria-pressed')).toBe('true');
        expect(button('on_off_button').textContent).toBe('widget.areahide.button.on');
    });

    it('starts the selection, toggles an option and switches the hider on', () => {
        open();

        fireEvent.click(button('select_button'));
        fireEvent.click(button('wallitems_checkbox'));
        fireEvent.click(button('on_off_button'));

        expect(widget.state.startSelecting).toHaveBeenCalledTimes(1);
        expect(widget.state.setWallItems).toHaveBeenCalledWith(true);
        expect(widget.state.toggleOnOff).toHaveBeenCalledTimes(1);
    });

    it('keeps Select Area off while an area is being chosen', () => {
        open({ selecting: true });

        fireEvent.click(button('select_button'));

        expect(button('select_button').getAttribute('data-native-enabled')).toBe('false');
        expect(widget.state.startSelecting).not.toHaveBeenCalled();
    });

    it('locks the selection and the options while the area is hidden', () => {
        open({ isOn: true, selectionActive: false });

        fireEvent.click(button('clear_button'));
        fireEvent.click(button('invisiblity_checkbox'));

        expect(widget.state.clearSelection).not.toHaveBeenCalled();
        expect(widget.state.setInvisibility).not.toHaveBeenCalled();
        expect(button('on_off_button').textContent).toBe('widget.areahide.button.off');
    });
});
