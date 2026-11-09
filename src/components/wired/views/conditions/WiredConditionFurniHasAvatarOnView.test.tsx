import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { intData: number[]; stringData: string; selectedItems?: unknown[]; furniSourceTypes?: number[] } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID: 1 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setSourceTypes })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div />
}));

vi.mock('./WiredConditionBaseView', () => ({
    WiredConditionBaseView: ({ children, save, footer }: PropsWithChildren<{ save: () => void; footer?: ReactNode }>) => (
        <div>
            {children}
            {footer}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredConditionFurniHasAvatarOnView } from './WiredConditionFurniHasAvatarOnView';

const radios = () => screen.getAllByRole('radio');

describe('WiredConditionFurniHasAvatarOnView', () => {
    beforeEach(() => {
        setIntParams.mockClear();
        setSourceTypes.mockClear();
    });

    afterEach(cleanup);

    it('lists 0 (.2) then 1 (.3) for furnis have avatars', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredConditionFurniHasAvatarOnView />);

        expect(screen.getAllByText(/requireall\.[23]/).map((node) => node.textContent)).toEqual(['wiredfurni.params.requireall.2', 'wiredfurni.params.requireall.3']);
        fireEvent.click(radios()[1]);
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([1]);
    });

    it('lists 1 (.2) then 0 (.3) for furnis have no avatars, as AIR FurnisHaveNoAvatars', () => {
        trigger = { intData: [], stringData: '' };
        render(<WiredConditionFurniHasAvatarOnView negative />);

        expect(screen.getAllByText(/requireall\.[23]/).map((node) => node.textContent)).toEqual([
            'wiredfurni.params.not_requireall.2',
            'wiredfurni.params.not_requireall.3'
        ]);
        // A fresh box starts on the first option, id 1.
        expect(radios()[0]).toHaveAttribute('aria-checked', 'true');
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([1]);

        fireEvent.click(radios()[1]);
        fireEvent.click(screen.getByText('Save'));
        expect(setIntParams).toHaveBeenLastCalledWith([0]);
    });

    it('opens a saved 0 on the second option of the negative box', () => {
        trigger = { intData: [0], stringData: '' };
        render(<WiredConditionFurniHasAvatarOnView negative />);

        expect(radios()[0]).toHaveAttribute('aria-checked', 'false');
        expect(radios()[1]).toHaveAttribute('aria-checked', 'true');
    });
});
