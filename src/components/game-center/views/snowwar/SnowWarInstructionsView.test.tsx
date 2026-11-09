import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnowWarInstructionsView } from './SnowWarInstructionsView';

const mocks = vi.hoisted(() => ({ setInstructionsOpen: vi.fn() }));

vi.mock('../../../../api', async (importOriginal) => ({
    ...(await importOriginal<any>()),
    LocalizeText: (key: string) => key
}));

vi.mock('../../../../hooks', () => ({
    useGameCenter: () => ({ setInstructionsOpen: mocks.setInstructionsOpen })
}));

describe('SnowWarInstructionsView', () =>
{
    afterEach(() => cleanup());

    it('pages through the five AIR pages with wrap-around and closes on Back', () =>
    {
        render(<SnowWarInstructionsView />);

        expect(screen.getByText('Click on empty tiles to move.')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('previous'));
        expect(screen.getByText('You have limited snowballs. Make more with the green button.')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('next'));
        fireEvent.click(screen.getByLabelText('next'));
        expect(screen.getByText('Click an opponent to throw a snowball at them.')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('page 4'));
        expect(screen.getByText('Hold ALT key down to throw over obstacles.')).toBeTruthy();

        fireEvent.click(screen.getByText('Back'));
        expect(mocks.setInstructionsOpen).toHaveBeenCalledWith(false);
    });
});
