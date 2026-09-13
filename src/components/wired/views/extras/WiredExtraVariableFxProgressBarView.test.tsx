import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setVariableIds = vi.fn();

/**
 * Matches VariableFxSettingsCodec.write's field order exactly (see the codec, the authority for
 * this vector). Indices this window does not expose (0, 1, 18, 19, 20) carry distinctive marker
 * values so the test fails if save() ever stops passing them through unchanged. Index 16/17 use a
 * value the view never emits (OVERRIDE_TARGET_GLOBAL is 2), so the test also fails if the "write
 * the global constant" behaviour regresses.
 *
 * defaultMinValue (10-11) is encoded as high=0/low=1234 - a value that fits entirely in the low
 * word. defaultMaxValue (12-13) is encoded as high=1/low=0, i.e. 2^32 - a value that only round
 * trips correctly if the high word is actually consulted. Together they cover both 64-bit split
 * directions save() has to reproduce unchanged when nothing edits the range.
 */
const trigger = {
    intData: [
        /* 0  sourceType (unexposed) */ 7,
        /* 1  visibility (unexposed) */ 9,
        /* 2  showMode */ 1,
        /* 3  showTriggerMask (rose|fell) */ 6,
        /* 4  showOnMouseHover */ 1,
        /* 5  showDuration */ 30,
        /* 6  styleId */ 2,
        /* 7  colorId */ 3,
        /* 8  widthId */ 1,
        /* 9  rendererId */ 0,
        /* 10 defaultMinValue high */ 0,
        /* 11 defaultMinValue low */ 1234,
        /* 12 defaultMaxValue high */ 1,
        /* 13 defaultMaxValue low */ 0,
        /* 14 overrideMinEnabled */ 1,
        /* 15 overrideMaxEnabled */ 0,
        /* 16 overrideMinTarget (unexposed input) */ 5,
        /* 17 overrideMaxTarget (unexposed input) */ 5,
        /* 18 audienceVariableValue high (unexposed) */ 11,
        /* 19 audienceVariableValue low (unexposed) */ 22,
        /* 20 segments (unexposed) */ 4
    ],
    stringData: 'vfx-icon'
};

// The override-min checkbox comes back checked (raw[14] === 1) with a saved variable id - the
// exact reopen scenario the Critical fix restores. The override-max checkbox is unchecked, so its
// slot is '' regardless of what the server sends.
const variableIds = ['minVar', '', ''];

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, variableIds, setVariableIds }),
    useWiredTools: () => ({ roomVariableDefinitions: [] })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../../../layout', () => ({
    OctaneInput: (props: { value: number }) => <input readOnly value={props.value} />
}));

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: () => <div data-testid="variable-picker" />
}));

let capturedSave: (() => void) | null = null;
let capturedValidate: (() => boolean) | null = null;

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: ({ children, save, validate }: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        capturedSave = save;
        capturedValidate = validate ?? null;

        return <div>{children}</div>;
    }
}));

import { WiredExtraVariableFxProgressBarView } from './WiredExtraVariableFxProgressBarView';

describe('WiredExtraVariableFxProgressBarView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        capturedSave = null;
        capturedValidate = null;
    });

    it('restores a previously saved override token instead of blanking it, so the box is savable again', () => {
        render(<WiredExtraVariableFxProgressBarView />);

        // This is the Critical this test guards: before the fix, the min-override token was reset
        // to '' on every reopen even though the checkbox came back checked, and validate() locked
        // the box out of saving forever. With the round trip restored, both must be true again.
        expect(capturedValidate?.()).toBe(true);
    });

    it("pins save()'s 21-element vector against a fixed intData input, unedited", () => {
        render(<WiredExtraVariableFxProgressBarView />);

        capturedSave?.();

        expect(setIntParams).toHaveBeenCalledTimes(1);
        expect(setIntParams).toHaveBeenCalledWith([
            7, 9, 1, 6, 1, 30, 2, 3, 1, 0, 0, 1234, 1, 0, 1, 0, 2, 2, 11, 22, 4
        ]);
    });

    it('round trips the 64-bit range bounds through the same high/low split VariableFxSettingsCodec uses', () => {
        render(<WiredExtraVariableFxProgressBarView />);

        capturedSave?.();

        const [params] = setIntParams.mock.calls[0] as [number[]];
        const combine = (high: number, low: number) => Number((BigInt(high) << 32n) | (BigInt(low) & 0xffffffffn));

        expect(combine(params[10], params[11])).toBe(1234);
        expect(combine(params[12], params[13])).toBe(4294967296);
    });

    it('sends the override/audience variable ids in codec order, restored token included', () => {
        render(<WiredExtraVariableFxProgressBarView />);

        capturedSave?.();

        expect(setVariableIds).toHaveBeenCalledWith(['minVar', '', '']);
    });
});
