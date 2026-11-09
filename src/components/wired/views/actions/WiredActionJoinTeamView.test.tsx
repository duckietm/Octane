import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { intData: number[] } | null = null;
let baseProps: { save: () => void } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setSourceTypes })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        baseProps = { save: props.save };
        return <div>{props.children}</div>;
    }
}));

import { WiredActionJoinTeamView } from './WiredActionJoinTeamView';

describe('WiredActionJoinTeamView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        baseProps = null;
    });

    it('opens a box on the chosen team and saves [team, type, join mode]', () => {
        trigger = { intData: [3, 0] };
        const { container } = render(<WiredActionJoinTeamView />);

        expect((container.querySelector('#joinMode0') as HTMLInputElement).checked).toBe(true);

        fireEvent.click(container.querySelector('#joinMode1'));
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith([3, 0, 1]);
        expect((container.querySelector('#selectedTeam3') as HTMLInputElement).disabled).toBe(true);
    });

    it('shows a stored random mode and reads an unknown one as chosen', () => {
        trigger = { intData: [2, 1, 2] };
        const { container, unmount } = render(<WiredActionJoinTeamView />);
        expect((container.querySelector('#joinMode2') as HTMLInputElement).checked).toBe(true);
        unmount();

        trigger = { intData: [2, 1, 7] };
        const second = render(<WiredActionJoinTeamView />);
        expect((second.container.querySelector('#joinMode0') as HTMLInputElement).checked).toBe(true);
        expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
    });
});
