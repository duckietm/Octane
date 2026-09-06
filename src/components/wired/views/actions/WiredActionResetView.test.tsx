import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();

vi.mock('../../../../api', () => ({
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger: { intData: [7, 7, 7], stringData: 'stale' }, setIntParams, setStringParam })
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: ({ save }: { save: () => void }) => (
        <button type="button" onClick={save}>
            Save
        </button>
    )
}));

import { WiredActionResetView } from './WiredActionResetView';

describe('WiredActionResetView', () => {
    afterEach(cleanup);

    it('sends an empty int list so params left over from another box do not go out', () => {
        render(<WiredActionResetView />);
        fireEvent.click(screen.getByText('Save'));

        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });
});
