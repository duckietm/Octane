import { cleanup, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let save: (() => void) | null = null;
const sliders: Array<{ min: number; max: number; value: number; onChange: (value: number) => void }> = [];

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string, _params?: string[], values?: string[]) => `${key}:${values?.join(',') ?? ''}`,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: (props: { min: number; max: number; value: number; onChange: (value: number) => void }) => {
        sliders.push(props);
        return <i data-testid="slider" />;
    }
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

const { WiredExtraRandomView } = await import('./WiredExtraRandomView');

/** The last props each slider got (picks has min 1, skips min 0); a memoized slider is not drawn again. */
const lastSliders = () => [1, 0].map((min) => sliders.filter((slider) => slider.min === min).at(-1));

describe('WiredExtraRandomView (AIR random add-on)', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        sliders.length = 0;
    });

    it('draws picks then skips, 1..100 and 0..100, with the value only in the titles', () => {
        trigger = { stringData: '', intData: [4, 9] };
        const { container } = render(<WiredExtraRandomView />);

        const [picks, skips] = lastSliders();
        expect([picks.min, picks.max, picks.value]).toEqual([1, 100, 9]);
        expect([skips.min, skips.max, skips.value]).toEqual([0, 100, 4]);
        expect(screen.getAllByTestId('slider')).toHaveLength(2);
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(container.textContent).toBe('wiredfurni.params.pickamount:9wiredfurni.params.skipactions:4');
    });

    it('saves [skips, picks]', () => {
        trigger = { stringData: '', intData: [2, 3] };
        render(<WiredExtraRandomView />);

        save?.();
        expect(setIntParams).toHaveBeenCalledWith([2, 3]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('opens an old box on AIR ranges', () => {
        trigger = { stringData: '', intData: [700, 0] };
        render(<WiredExtraRandomView />);

        const [picks, skips] = lastSliders();
        expect(picks.value).toBe(1);
        expect(skips.value).toBe(100);
    });
});
