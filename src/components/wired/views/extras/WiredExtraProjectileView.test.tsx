import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../../../test-utils/selectOption';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { intData: number[]; stringData?: string } | null = null;
let baseProps: { save: () => void; showSelection?: boolean; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useWiredTools: () => ({
        userVariableDefinitions: [{ itemId: 300, name: 'reload', availability: 0, hasValue: true }],
        furniVariableDefinitions: [],
        roomVariableDefinitions: [{ itemId: 500, name: 'range', availability: 0, hasValue: true }],
        contextVariableDefinitions: []
    })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Slider: (props: { value: number; min: number; max: number; onChange: (value: number) => void }) => (
        <input max={props.max} min={props.min} type="range" value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} />
    )
}));

vi.mock('../WiredFurniSelectorView', () => ({
    WiredFurniSelectorView: () => <div>picked furni</div>
}));

vi.mock('../WiredSourcesSelector', async (importOriginal) => {
    const original = await importOriginal<typeof import('../WiredSourcesSelector')>();

    return { ...original, useAvailableUserSources: (_trigger: unknown, sources: unknown) => sources };
});

vi.mock('../WiredVariablePicker', () => ({
    WiredVariablePicker: (props: { entries: { token: string; children?: { token: string }[] }[]; selectedToken: string; onSelect: (entry: { token: string }) => void }) => (
        <div data-selected={props.selectedToken} data-testid="picker">
            {props.entries.flatMap((entry) => (entry.children?.length ? entry.children : [entry])).map((entry) => (
                <button key={entry.token} type="button" onClick={() => props.onSelect(entry)}>
                    {entry.token}
                </button>
            ))}
        </div>
    )
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void; showSelection?: boolean; validate?: () => boolean }>) => {
        baseProps = { save: props.save, showSelection: props.showSelection, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { WiredExtraProjectileView } from './WiredExtraProjectileView';

describe('WiredExtraProjectileView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        baseProps = null;
        trigger = { intData: [], stringData: '' };
    });

    it('opens on the sections Habbo opens on and keeps the picked furni under advanced options', () => {
        render(<WiredExtraProjectileView />);

        expect(screen.getByRole('button', { name: /Usage info/ }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: /Projectile direction/ }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: /Animation trajectory/ }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('button', { name: /Animation time/ }).getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('button', { name: /Shift the rotation by 0/ }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByRole('button', { name: /internal variables/ }).getAttribute('aria-expanded')).toBe('false');
        expect(baseProps.showSelection).toBe(false);
    });

    it('writes every edit back in the server order', () => {
        trigger = { intData: [1, 0, 0, 0, 500, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0], stringData: '' };

        render(<WiredExtraProjectileView />);

        selectOption(screen.getByRole('combobox', { name: 'System:' }), '8 directions, diffuse');
        fireEvent.click(screen.getByRole('checkbox', { name: "Visually change the shooter's direction" }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Do a little hop when shooting sideways' }));
        // The source labels are localization keys that resolve to '' in tests, so the option is picked by position.
        fireEvent.click(screen.getByRole('combobox', { name: 'Shooter:' }));
        const shooterOption = screen.getAllByRole('option')[1];
        fireEvent.pointerDown(shooterOption);
        fireEvent.click(shooterOption);

        fireEvent.click(screen.getByRole('button', { name: /Animation trajectory/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'Fly past the target' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Tiles:' }), { target: { value: '-99' } });

        fireEvent.click(screen.getByRole('button', { name: /internal variables/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: '@projectile.animation.position.y' }));
        fireEvent.click(screen.getByRole('checkbox', { name: '@projectile.animation.user_collisions' }));

        baseProps.save();

        // Distance tiles clamp to the server's -64; the mask is bits 1 and 6.
        expect(setIntParams).toHaveBeenCalledWith([1, 1, 0, 0, 500, 0, 0, 0, 0, 0, 2, 66, 1, 1, 1, 0, -64, 0, 0, 0, 0, 0, 0, 200]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('reads the time per tile from a variable when asked to', () => {
        const { container } = render(<WiredExtraProjectileView />);

        fireEvent.click(screen.getByRole('button', { name: /Animation time/ }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Scale the animation time with the distance' }));
        fireEvent.change(screen.getByRole('spinbutton', { name: 'Time per tile (ms):' }), { target: { value: '0' } });
        fireEvent.click(container.querySelectorAll('input[name="projectileTimeValue"]')[1]);

        expect(baseProps.validate()).toBe(false);

        selectOption(screen.getByRole('combobox', { name: 'Time per tile (ms): variable type' }), 'Global');
        fireEvent.click(screen.getByRole('button', { name: 'custom:500' }));

        expect(baseProps.validate()).toBe(true);
        baseProps.save();

        const saved = setIntParams.mock.calls[0][0] as number[];
        expect(saved[2]).toBe(1);
        expect(saved[3]).toBe(1);
        // The input stops at the server's 1 ms.
        expect(saved[4]).toBe(1);
        expect(saved[5]).toBe(3);
        expect(setStringParam).toHaveBeenCalledWith('custom:500\t');
    });

    it('carries the params and tokens it was handed through untouched', () => {
        const stored = [1, 3, 1, 1, 250, 3, 1, 1, 1, 75, 6, 5, 1, 1, 2, 1, -12, 3, 400, 0, 101, 0, 200, 0];
        trigger = { intData: stored, stringData: 'custom:500\tcustom:500' };

        render(<WiredExtraProjectileView />);
        baseProps.save();

        expect(setIntParams).toHaveBeenCalledWith(stored);
        expect(setStringParam).toHaveBeenCalledWith('custom:500\tcustom:500');
        expect(screen.getByRole('button', { name: /Shift the rotation by 6/ })).toBeTruthy();
    });

    it('opens a box saved before the time was applied at the default time per tile', () => {
        trigger = { intData: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };

        render(<WiredExtraProjectileView />);
        baseProps.save();

        expect((setIntParams.mock.calls[0][0] as number[])[4]).toBe(500);
    });
});
