import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; userSourceTypes?: number[]; furniSourceTypes?: number[] } | null = null;
let save: (() => void) | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0, STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../common/Radio', () => ({
    Radio: (props: { checked: boolean; onCheckedChange: () => void }) => (
        <input type="radio" aria-checked={props.checked} checked={props.checked} onChange={() => props.onCheckedChange()} />
    )
}));
vi.mock('../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input {...props} />
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));
vi.mock('../WiredSourcesSelector', () => ({
    CLICKED_USER_SOURCE_VALUE: 202,
    REACHED_USER_SOURCE_VALUE: 203,
    WiredSourcesSelector: () => null
}));
vi.mock('./WiredPlaceholderPreview', () => ({ WiredPlaceholderPreview: () => null }));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraTextOutputUsernameView } = await import('./WiredExtraTextOutputUsernameView');
const { WiredExtraTextOutputFurniNameView } = await import('./WiredExtraTextOutputFurniNameView');

const views = [
    ['username', WiredExtraTextOutputUsernameView],
    ['furni name', WiredExtraTextOutputFurniNameView]
] as const;

describe.each(views)('the %s placeholder delimiter (AIR)', (_name, View) => {
    afterEach(cleanup);

    beforeEach(() => {
        setStringParam.mockClear();
        setIntParams.mockClear();
    });

    it('starts empty, takes at most 5 characters and is saved with the name', () => {
        trigger = { stringData: 'all', intData: [0] };
        render(<View />);

        fireEvent.click(screen.getAllByRole('radio')[1]);
        const delimiter = screen.getAllByRole('textbox')[1];
        expect(delimiter).toHaveValue('');
        expect(delimiter).toHaveAttribute('maxLength', '5');

        fireEvent.change(delimiter, { target: { value: ' / and more' } });
        save?.();
        expect(setIntParams).toHaveBeenCalledWith([1]);
        expect(setStringParam).toHaveBeenCalledWith('all\t / an');
    });

    it('saves the name alone for one name', () => {
        trigger = { stringData: 'who\t, ', intData: [0] };
        render(<View />);

        save?.();
        expect(setIntParams).toHaveBeenCalledWith([0]);
        expect(setStringParam).toHaveBeenCalledWith('who');
    });

    it('cuts the long delimiter of an old box when it is saved again', () => {
        trigger = { stringData: 'all\t and also ', intData: [1] };
        render(<View />);

        save?.();
        expect(setStringParam).toHaveBeenCalledWith('all\t and ');
    });
});
