import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandheldBuildToolsView } from './HandheldBuildToolsView';

const setup = () => {
    const props = {
        title: 'Throne',
        height: 1.5,
        onMove: vi.fn(),
        onRotate: vi.fn(),
        onHeightStep: vi.fn(),
        onHeightChange: vi.fn(),
        onHeightBlur: vi.fn(),
        onBack: vi.fn(),
        onClose: vi.fn()
    };

    render(<HandheldBuildToolsView {...props} />);

    return props;
};

afterEach(cleanup);

describe('HandheldBuildToolsView', () => {
    it('shows only the build controls, as a page with a way back', () => {
        const props = setup();

        expect(document.querySelector('.octane-handheld-drawer')).toHaveAttribute('data-page');
        expect(document.querySelectorAll('.octane-handheld-drawer__action')).toHaveLength(0);
        expect(screen.getByRole('spinbutton')).toHaveValue('1.5');

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(props.onBack).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('steps the furni one tile in each of the four directions', () => {
        const props = setup();

        for (const name of ['Move up-left', 'Move up-right', 'Move down-left', 'Move down-right']) fireEvent.click(screen.getByRole('button', { name }));

        expect(props.onMove.mock.calls).toEqual([
            [-1, 0],
            [0, -1],
            [0, 1],
            [1, 0]
        ]);
    });

    it('turns both ways and steps the height by a tile, a tenth and a hundredth', () => {
        const props = setup();

        fireEvent.click(screen.getByRole('button', { name: 'Turn left' }));
        fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
        expect(props.onRotate.mock.calls).toEqual([[-1], [1]]);

        for (const name of ['+1', '+0.1', '+0.01', '-1', '-0.1', '-0.01']) fireEvent.click(screen.getByRole('button', { name }));

        expect(props.onHeightStep.mock.calls.map(([amount]) => amount)).toEqual([1, 0.1, 0.01, -1, -0.1, -0.01]);
    });
});
