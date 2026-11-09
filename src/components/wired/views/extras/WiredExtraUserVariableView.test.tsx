import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let save: (() => void) | null = null;
const radios: Array<{ checked: boolean }> = [];
const checkboxes: Array<{ checked: boolean }> = [];

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../common/Checkbox', () => ({
    Checkbox: (props: { checked: boolean }) => {
        checkboxes.push(props);
        return null;
    }
}));
vi.mock('../../../../common/Radio', () => ({
    Radio: (props: { checked: boolean }) => {
        radios.push(props);
        return null;
    }
}));
vi.mock('../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input {...props} />
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraUserVariableView } = await import('./WiredExtraUserVariableView');
const { WiredExtraFurniVariableView } = await import('./WiredExtraFurniVariableView');

describe('variable definition int order (AIR)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        radios.length = 0;
        checkboxes.length = 0;
    });

    it('reads and saves a user variable as [availability, hasValue]', () => {
        trigger = { stringData: 'points', intData: [11, 1] };
        render(<WiredExtraUserVariableView />);

        expect(checkboxes.at(-1).checked).toBe(true);
        // Radios: room, permanent, shared.
        expect(radios.slice(-3).map((radio) => radio.checked)).toEqual([false, false, true]);

        save?.();
        expect(setIntParams).toHaveBeenCalledWith([11, 1]);
    });

    it('keeps a furni variable as [hasValue, availability]', () => {
        trigger = { stringData: 'level', intData: [1, 10] };
        render(<WiredExtraFurniVariableView />);

        save?.();
        expect(setIntParams).toHaveBeenCalledWith([1, 10]);
    });
});
