import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FurnitureDimmerLayout, FurnitureDimmerLayoutProps } from './FurnitureDimmerView';

afterEach(() => cleanup());

const props = (overrides: Partial<FurnitureDimmerLayoutProps> = {}): FurnitureDimmerLayoutProps => ({
    presetIds: [1, 2, 3],
    isOn: true,
    selectedPresetId: 1,
    selectedColor: 21495,
    selectedBrightness: 150,
    selectedEffectId: 2,
    freeColorMode: false,
    onClose: vi.fn(),
    onSelectPreset: vi.fn(),
    onSelectColor: vi.fn(),
    onSelectBrightness: vi.fn(),
    onSelectEffect: vi.fn(),
    onApply: vi.fn(),
    onToggle: vi.fn(),
    ...overrides
});

describe('FurnitureDimmerLayout (AIR dimmer_ui)', () => {
    it('shows the seven colours with the chosen one pressed', () => {
        const onSelectColor = vi.fn();

        render(<FurnitureDimmerLayout {...props({ onSelectColor })} />);

        const colours = screen.getAllByRole('button', { pressed: false }).filter((button) => button.className.includes('octane-dimmer__color'));
        const chosen = screen.getAllByRole('button', { pressed: true });

        expect(colours).toHaveLength(6);
        expect(chosen).toHaveLength(1);

        fireEvent.click(colours[0]);
        expect(onSelectColor).toHaveBeenCalledWith(7665141);
    });

    it('moves the brightness with the keyboard, inside the preset range', () => {
        const onSelectBrightness = vi.fn();

        render(<FurnitureDimmerLayout {...props({ selectedBrightness: 255, onSelectBrightness })} />);

        const slider = screen.getByRole('slider');

        expect(slider).toHaveAttribute('aria-valuemin', '76');
        expect(slider).toHaveAttribute('aria-valuemax', '255');

        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        expect(onSelectBrightness).toHaveBeenLastCalledWith(255);

        fireEvent.keyDown(slider, { key: 'Home' });
        expect(onSelectBrightness).toHaveBeenLastCalledWith(76);
    });

    it('while off shows the off text, disables apply and offers to switch on', () => {
        const onToggle = vi.fn();

        const { baseElement } = render(<FurnitureDimmerLayout {...props({ isOn: false, onToggle })} />);

        expect(baseElement.querySelector('.octane-dimmer__off-text')).toBeInTheDocument();
        expect(screen.queryByRole('slider')).not.toBeInTheDocument();

        const apply = baseElement.querySelector('.octane-dimmer__apply');
        const onOff = baseElement.querySelector('.octane-dimmer__on-off');

        expect(apply).toBeDisabled();

        fireEvent.click(onOff);
        expect(onToggle).toHaveBeenCalled();
    });
});
