import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let save: () => void = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

import { ACHIEVEMENT_ENABLER_MAX_LENGTH, WiredExtraAchievementEnablerView } from './WiredExtraAchievementEnablerView';

describe('WiredExtraAchievementEnablerView', () => {
    afterEach(cleanup);

    it('shows the stored names and saves the text with no int params', () => {
        trigger = { stringData: 'ACH_Game\nACH_Race', intData: [] };
        render(<WiredExtraAchievementEnablerView />);

        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe('ACH_Game\nACH_Race');
        expect(textarea.maxLength).toBe(ACHIEVEMENT_ENABLER_MAX_LENGTH);

        fireEvent.change(textarea, { target: { value: 'ACH_Tag, ACH_Hide' } });
        save();

        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setStringParam).toHaveBeenCalledWith('ACH_Tag, ACH_Hide');
    });
});
