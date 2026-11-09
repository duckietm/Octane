/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    simpleAlert: vi.fn(),
    handlers: [] as Array<(event: any) => void>,
    furniture: [] as any[]
}));

vi.mock('@octane/renderer', () => ({
    FurnitureType: { FLOOR: 'floor', WALL: 'wall' },
    GetSessionDataManager: () => ({ getAllFurnitureData: () => mocks.furniture }),
    SelfDonationMessageComposer: class {
        private _data: unknown[];
        constructor(...args: unknown[]) {
            this._data = args;
        }
        getMessageArray() {
            return this._data;
        }
    },
    SelfDonationResultMessageEvent: class {}
}));

vi.mock('../../api', () => ({
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    localizeWithFallback: (key: string, fallback: string, parameters?: string[], replacements?: string[]) =>
        (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements?.[index] ?? ''), fallback),
    NotificationAlertType: { DEFAULT: 'default' },
    SendMessageComposer: mocks.send
}));

vi.mock('../../common', () => ({
    Button: ({ children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
        <button type="button" {...props}>
            {children}
        </button>
    ),
    DraggableWindowPosition: { TOP_LEFT: 'top-left' },
    OctaneCardView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <div>{headerText}</div>,
    OctaneCardContentView: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Text: ({ children }: PropsWithChildren) => <span>{children}</span>
}));

vi.mock('../../hooks', () => ({
    useMessageEvent: (_eventType: unknown, handler: (event: any) => void) => {
        mocks.handlers.push(handler);
    },
    useNotification: () => ({ simpleAlert: mocks.simpleAlert })
}));

import { searchFurnitureTypes, WiredSelfDonationView } from './WiredSelfDonationView';

const furni = (id: number, className: string, name: string, type: 'floor' | 'wall' = 'floor') => ({ id, className, name, type });

describe('WiredSelfDonationView', () => {
    beforeEach(() => {
        mocks.send.mockReset();
        mocks.simpleAlert.mockReset();
        mocks.handlers.length = 0;
        mocks.furniture = [furni(10, 'throne', 'Throne'), furni(11, 'club_sofa', 'Club Sofa'), furni(4000, 'poster', 'Poster', 'wall')];
    });

    afterEach(cleanup);

    it('searches by name or classname across floor and wall furni', () => {
        expect(searchFurnitureTypes(mocks.furniture as any, 'sofa').map((row) => row.className)).toEqual(['club_sofa']);
        expect(searchFurnitureTypes(mocks.furniture as any, 'post').map((row) => row.isWallItem)).toEqual([true]);
        expect(searchFurnitureTypes(mocks.furniture as any, '', 2)).toHaveLength(2);
    });

    it('donates the picked furni with the clamped amount', () => {
        render(<WiredSelfDonationView onClose={() => undefined} />);

        const donate = screen.getByRole('button', { name: 'Donate' });
        expect(donate).toBeDisabled();

        fireEvent.change(screen.getByLabelText('Search furni'), { target: { value: 'poster' } });
        fireEvent.click(screen.getByText('Poster'));
        fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '9999' } });
        fireEvent.click(donate);

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual([true, 4000, '', 500]);
    });

    it('tells the result of the donation', () => {
        render(<WiredSelfDonationView onClose={() => undefined} />);

        act(() => {
            for (const handler of mocks.handlers) handler({ getParser: () => ({ resultCode: 1 }) });
        });

        expect(mocks.simpleAlert).toHaveBeenCalledWith('You are not allowed to use the sandbox donation tool.', 'default');
    });
});
