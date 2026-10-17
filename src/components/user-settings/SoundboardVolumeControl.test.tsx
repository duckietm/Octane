/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundboardVolumeControl } from './SoundboardVolumeControl';

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string) => (key === 'widget.memenu.settings.volume.soundboard' ? 'Soundboard' : fallback)
}));

describe('SoundboardVolumeControl', () => {
    afterEach(cleanup);

    it('uses the standard volume range and commits changes', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(<SoundboardVolumeControl value={80} onChange={onChange} onCommit={onCommit} />);

        const range = screen.getByRole('slider', { name: 'Soundboard' });
        expect(range).toHaveAttribute('min', '0');
        expect(range).toHaveAttribute('max', '100');
        expect(range).toHaveAttribute('step', '1');
        expect(range).toHaveValue('80');

        fireEvent.change(range, { target: { value: '25' } });

        expect(onChange).toHaveBeenCalledWith(25);
    });

    it('commits keyboard volume changes without requiring a pointer event', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(<SoundboardVolumeControl value={80} onChange={onChange} onCommit={onCommit} />);

        const range = screen.getByRole('slider', { name: 'Soundboard' });
        fireEvent.keyDown(range, { key: 'ArrowLeft' });

        expect(onChange).toHaveBeenCalledWith(79);
        expect(onCommit).toHaveBeenCalledWith(79);
    });

    it('commits the pending value when the slider loses focus', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        const { rerender } = render(<SoundboardVolumeControl value={80} onChange={onChange} onCommit={onCommit} />);

        const range = screen.getByRole('slider', { name: 'Soundboard' });
        fireEvent.change(range, { target: { value: '25' } });
        rerender(<SoundboardVolumeControl value={25} onChange={onChange} onCommit={onCommit} />);
        fireEvent.blur(range);

        expect(onCommit).toHaveBeenCalledWith(25);
    });

    it('sets the exact value from the speaker buttons', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(<SoundboardVolumeControl value={80} onChange={onChange} onCommit={onCommit} />);

        fireEvent.click(screen.getByRole('button', { name: 'Soundboard: Mute' }));

        expect(onChange).toHaveBeenCalledWith(0);
        expect(onCommit).toHaveBeenCalledWith(0);
    });
});
