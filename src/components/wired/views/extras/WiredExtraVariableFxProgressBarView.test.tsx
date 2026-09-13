import { cleanup, fireEvent, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();

// useWired holds variableIds in useLiveState, which sets React state as well as the ref: saving
// therefore hands the window a NEW array identity. Mirrored here so a test can re-render the way
// the real hook makes the window re-render after a save.
let liveVariableIds = ['minVar', '', ''];
const setVariableIds = vi.fn((next: string[]) => {
    liveVariableIds = [...next];
});

/**
 * Matches VariableFxSettingsCodec.write's field order exactly (see the codec, the authority for
 * this vector). Indices this window does not expose (1, 18, 19) carry distinctive marker values so
 * the test fails if save() ever stops passing them through unchanged. Index 20, the segment count,
 * used to be one of them and is a real control now. Index 16/17 use a
 * value the view never emits (OVERRIDE_TARGET_GLOBAL is 2), so the test also fails if the "write
 * the global constant" behaviour regresses.
 *
 * defaultMinValue (10-11) is encoded as high=0/low=1234 - a value that fits entirely in the low
 * word. defaultMaxValue (12-13) is encoded as high=1/low=0, i.e. 2^32 - a value that only round
 * trips correctly if the high word is actually consulted. Together they cover both 64-bit split
 * directions save() has to reproduce unchanged when nothing edits the range.
 */
const makeTrigger = () => ({
    intData: [
        /* 0  sourceType (furni) */ 1,
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
    stringData: 'vfx-icon',
    // The override-min checkbox comes back checked (raw[14] === 1) with a saved variable id - the
    // exact reopen scenario the Critical fix restores. The override-max checkbox is unchecked, so
    // its slot is '' regardless of what the server sends. WiredActionDefinition carries these
    // alongside intData, which is what the window seeds from.
    variableIds: ['minVar', '', '']
});

let trigger = makeTrigger();

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam, variableIds: liveVariableIds, setVariableIds }),
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

/**
 * Visibility and the advanced range are folded away by default, the way the official editor keeps
 * them, so a test that drives a control inside one has to open it first.
 */
const expandVisibilitySettings = (container: HTMLElement) => {
    const [visibilityToggle] = container.querySelectorAll<HTMLButtonElement>('button.octane-wired__advanced-toggle');

    fireEvent.click(visibilityToggle);
};

describe('WiredExtraVariableFxProgressBarView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setVariableIds.mockClear();
        liveVariableIds = ['minVar', '', ''];
        trigger = makeTrigger();
        capturedSave = null;
        capturedValidate = null;
    });

    /**
     * sourceType is what the emulator's binding filters the box's tile by, and it is the only
     * thing that decides which variables the configuration covers. While it was unexposed a fresh
     * box kept the zero it was serialised with - SOURCE_USER - whose statuses are drawn on the
     * avatar, a side this slice leaves unbound, so no configuration this window could produce ever
     * drew a bar.
     */
    it('seeds the source type from the saved vector and writes the builder choice back', () => {
        const { container } = render(<WiredExtraVariableFxProgressBarView />);

        const sourceRadios = container.querySelectorAll<HTMLInputElement>('input[name="wiredVariableFxSourceType"]');

        expect(sourceRadios).toHaveLength(3);
        expect(sourceRadios[1].checked).toBe(true); // intData[0] is 1, the furni source

        fireEvent.click(sourceRadios[2]); // room / global
        capturedSave?.();

        expect((setIntParams.mock.calls[0][0] as number[])[0]).toBe(2);
    });

    /** The emulator covers nothing for a source outside the three, so the window repairs it. */
    it('repairs a saved source type the editor cannot produce', () => {
        trigger.intData[0] = 7;

        const { container } = render(<WiredExtraVariableFxProgressBarView />);

        const sourceRadios = container.querySelectorAll<HTMLInputElement>('input[name="wiredVariableFxSourceType"]');

        expect(sourceRadios[0].checked).toBe(true);

        capturedSave?.();

        expect((setIntParams.mock.calls[0][0] as number[])[0]).toBe(0);
    });

    /**
     * `widthId` 0 is "molto piccolo", a real band, not an empty slot. When `trigger.intData` is
     * missing or too short to be real saved data, `rawIntParams` falls back to a synthetic vector -
     * this pins that the synthetic vector no longer defaults that slot to 0, so this defensive path
     * cannot recreate the silent-shrink-to-smallest bug the emulator's own default was fixed for.
     */
    it('falls back to the neutral width band, not "molto piccolo", when intData is missing', () => {
        trigger.intData = undefined as unknown as number[];

        const { container } = render(<WiredExtraVariableFxProgressBarView />);

        const widthSelect = container.querySelectorAll<HTMLSelectElement>('select')[2];

        expect(widthSelect.value).toBe('2');
    });

    /**
     * Saving does not close the window, and the server never refreshes `trigger`. So a seeding
     * effect that re-runs after a save re-reads the OLD intData over the builder's edit: the
     * controls snap back, and the next save writes the stale configuration over the new one - the
     * edit lost without a word. The re-run used to be caused by save() itself, through the
     * variableIds identity useLiveState hands back.
     */
    it('keeps an edit after a save instead of re-seeding the controls from the stale trigger', () => {
        const { container, rerender } = render(<WiredExtraVariableFxProgressBarView />);

        expandVisibilitySettings(container);

        const showModeRadios = container.querySelectorAll<HTMLInputElement>('input[name="wiredVariableFxShowMode"]');

        // trigger.intData[2] is 1 ("when the variable changes"); the builder picks "always" (2).
        fireEvent.click(showModeRadios[2]);
        expect(showModeRadios[2].checked).toBe(true);

        capturedSave?.();

        // The save replaced variableIds, so the window re-renders. Nothing about the box changed.
        rerender(<WiredExtraVariableFxProgressBarView />);

        const radiosAfterSave = container.querySelectorAll<HTMLInputElement>('input[name="wiredVariableFxShowMode"]');
        expect(radiosAfterSave[2].checked).toBe(true);

        capturedSave?.();

        const secondSave = setIntParams.mock.calls[1][0] as number[];
        expect(secondSave[2]).toBe(2);
    });

    it('restores a previously saved override token instead of blanking it, so the box is savable again', () => {
        render(<WiredExtraVariableFxProgressBarView />);

        // This is the Critical this test guards: before the fix, the min-override token was reset
        // to '' on every reopen even though the checkbox came back checked, and validate() locked
        // the box out of saving forever. With the round trip restored, both must be true again.
        expect(capturedValidate?.()).toBe(true);
    });

    // Slot 20 is the segment count, and the fixture's renderer (slot 9) is 0, the classic progress
    // bar, which is not one of the three the official rendererSupportsSegments names. The official
    // editor stores 0 for segments whenever the chosen renderer cannot draw them, so a stale count
    // does not survive a renderer change; this pin follows it rather than passing the old value on.
    it("pins save()'s 21-element vector against a fixed intData input, unedited", () => {
        render(<WiredExtraVariableFxProgressBarView />);

        capturedSave?.();

        expect(setIntParams).toHaveBeenCalledTimes(1);
        expect(setIntParams).toHaveBeenCalledWith([
            1, 9, 1, 6, 1, 30, 2, 3, 1, 0, 0, 1234, 1, 0, 1, 0, 2, 2, 11, 22, 0
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
