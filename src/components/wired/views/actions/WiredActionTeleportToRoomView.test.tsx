import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const setAllowedFurniCheck = vi.fn();
const setSourceTypes = vi.fn();
const setAllowedInteractionErrorKey = vi.fn();
let trigger: { stringData: string; intData: number[] } | null = null;
let furniIds: number[] = [];
let baseProps: { save: () => void; validate?: () => boolean } | null = null;

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, furniIds, setIntParams, setStringParam, setSourceTypes, setAllowedFurniCheck, setAllowedInteractionErrorKey })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../WiredSourcesSelector', () => ({
    WiredSourcesSelector: () => <div>sources</div>
}));

vi.mock('./WiredActionBaseView', () => ({
    WiredActionBaseView: (props: PropsWithChildren<{ save: () => void; validate?: () => boolean }>) => {
        baseProps = { save: props.save, validate: props.validate };
        return <div>{props.children}</div>;
    }
}));

import { WiredActionTeleportToRoomView } from './WiredActionTeleportToRoomView';

describe('WiredActionTeleportToRoomView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        setIntParams.mockClear();
        setStringParam.mockClear();
        setAllowedFurniCheck.mockClear();
        baseProps = null;
        furniIds = [];
    });

    it('opens a box saved with only a room id and saves it with the picked furni source', () => {
        trigger = { stringData: '77', intData: [11] };
        render(<WiredActionTeleportToRoomView />);

        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('77');
        expect(baseProps.validate()).toBe(true);

        baseProps.save();

        expect(setStringParam).toHaveBeenCalledWith('77');
        expect(setIntParams).toHaveBeenCalledWith([]);
        expect(setSourceTypes).toHaveBeenCalledWith({ furni: [100], users: [11] });
    });

    it('needs a room id or a picked furni, and keeps the id to digits', () => {
        trigger = { stringData: '', intData: [0, 100] };
        const { rerender } = render(<WiredActionTeleportToRoomView />);

        expect(baseProps.validate()).toBe(false);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '4a2' } });
        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('42');
        expect(baseProps.validate()).toBe(true);

        fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
        furniIds = [9];
        rerender(<WiredActionTeleportToRoomView />);
        expect(baseProps.validate()).toBe(true);
    });

    it('leaves the room-linker check to the server, as the official editor does', () => {
        trigger = { stringData: '', intData: [] };
        render(<WiredActionTeleportToRoomView />);

        expect(setAllowedFurniCheck.mock.calls.some((call) => typeof call[0] === 'function')).toBe(false);
    });
});
