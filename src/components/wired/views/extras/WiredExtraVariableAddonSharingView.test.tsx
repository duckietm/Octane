import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
const sent: unknown[] = [];
let trigger: { id: number; intData: number[] } | null = null;
let canModify = true;
let save: () => void = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string) => key,
    SendMessageComposer: (composer: unknown) => sent.push(composer),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));

vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam }),
    useWiredTools: () => ({ roomSettings: { canModify } })
}));

vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>,
    Button: ({ children, disabled, onClick }: PropsWithChildren<{ disabled?: boolean; onClick?: () => void }>) => <button disabled={disabled} onClick={onClick}>{children}</button>
}));

vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

import { WiredExtraVariableAddonImportView, WiredExtraVariableAddonShareView } from './WiredExtraVariableAddonSharingView';

describe('WiredExtraVariableAddonSharingView', () => {
    afterEach(() => {
        cleanup();
        sent.length = 0;
        setIntParams.mockClear();
    });

    it('shows the stored categories and saves them as three 0/1 int params', () => {
        trigger = { id: 77, intData: [1, 0, 1] };
        render(<WiredExtraVariableAddonImportView />);

        expect(screen.getByText('wiredfurni.params.variables.addon_import.usage_info')).toBeTruthy();
        const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
        expect(boxes.map(box => box.getAttribute('aria-checked') === 'true')).toEqual([true, false, true]);
        expect(screen.queryByRole('button')).toBeNull();

        fireEvent.click(boxes[1]);
        fireEvent.click(boxes[2]);
        save();

        expect(setIntParams).toHaveBeenCalledWith([1, 1, 0]);
        expect(setStringParam).toHaveBeenCalledWith('');
    });

    it('sends Synchronize with the box id, and only with write permission', () => {
        trigger = { id: 77, intData: [] };
        canModify = true;
        render(<WiredExtraVariableAddonShareView />);

        fireEvent.click(screen.getByText('wiredfurni.params.variables.addon_share.synchronize'));
        expect(sent).toHaveLength(1);
        expect((sent[0] as { getMessageArray: () => unknown[] }).getMessageArray()).toEqual([77]);

        cleanup();
        canModify = false;
        render(<WiredExtraVariableAddonShareView />);

        expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    });
});
