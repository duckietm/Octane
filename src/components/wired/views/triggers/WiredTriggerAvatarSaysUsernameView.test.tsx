import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { intData: number[]; stringData: string } | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => fallback,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../layout', () => ({
    OctaneInput: (props: { value: string }) => <input data-testid="keyword" readOnly value={props.value} />
}));

vi.mock('./WiredTriggerBaseView', () => ({
    WiredTriggerBaseView: ({ children, save }: PropsWithChildren<{ save: () => void }>) => (
        <div>
            {children}
            <button type="button" onClick={save}>
                Save
            </button>
        </div>
    )
}));

import { WiredTriggerAvatarSaysSomethingView } from './WiredTriggerAvatarSaysSomethingView';

describe('the say-your-username trigger window', () => {
    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
    });

    afterEach(cleanup);

    it('offers only the hide and owner-only switches and sends no keyword', () => {
        trigger = { intData: [2, 1, 0], stringData: 'left over' };
        render(<WiredTriggerAvatarSaysSomethingView usernameOnly={true} />);

        expect(screen.queryByTestId('keyword')).toBeNull();
        expect(screen.queryByText('wiredfurni.params.exactmatch')).toBeNull();
        expect(screen.getByText('wiredfurni.params.chat.hide')).toBeTruthy();
        fireEvent.click(screen.getByText('Save'));

        expect(setStringParam).toHaveBeenCalledWith('');
        expect(setIntParams).toHaveBeenCalledWith([0, 1, 0]);
    });

    it('keeps the keyword window as it was for the ordinary trigger', () => {
        trigger = { intData: [1, 0, 1], stringData: 'hello' };
        render(<WiredTriggerAvatarSaysSomethingView />);

        expect(screen.getByTestId('keyword')).toBeTruthy();
        fireEvent.click(screen.getByText('Save'));

        expect(setStringParam).toHaveBeenCalledWith('hello');
        expect(setIntParams).toHaveBeenCalledWith([1, 0, 1]);
    });
});
