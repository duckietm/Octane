import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setSourceTypes = vi.fn();
let trigger: { stringData: string; intData: number[]; furniSourceTypes?: number[] } | null = null;
let baseProps: { save: () => void } | null = null;
let sliderMax: number | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT: 3 }
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, setSourceTypes })
}));
vi.mock('../../../../common', () => ({
    Slider: ({ max }: { max: number }) => {
        sliderMax = max;
        return <div>slider</div>;
    },
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));
vi.mock('../../../../common/Radio', () => ({ Radio: () => <input type="radio" /> }));
vi.mock('../WiredSourcesSelector', () => ({ WiredSourcesSelector: () => <div>sources</div> }));
vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        baseProps = { save: props.save };
        return <div>{props.children}</div>;
    }
}));

import { clampAltitude, MAX_ALTITUDE, WiredActionSetAltitudeView } from './WiredActionSetAltitudeView';

describe('set furni altitude', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        baseProps = null;
        sliderMax = null;
    });

    it('runs to 80.00 as AIR', () => {
        expect(MAX_ALTITUDE).toBe(80);
        expect(clampAltitude(95)).toBe(80);
        expect(clampAltitude(65.25)).toBe(65.25);
    });

    it('reads and saves an altitude above the old 40 ceiling', () => {
        trigger = { stringData: '', intData: [8000, 2] };
        render(<WiredActionSetAltitudeView />);

        expect(sliderMax).toBe(80);
        expect(screen.getByRole('textbox')).toHaveValue('80');
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '75.5' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([7550, 2]);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '95' } });
        baseProps.save();
        expect(setIntParams).toHaveBeenLastCalledWith([8000, 2]);
    });
});
