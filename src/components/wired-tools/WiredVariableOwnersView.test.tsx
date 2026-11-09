/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectOption } from '../../test-utils/selectOption';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    openProfile: vi.fn(),
    handlers: [] as Array<(event: any) => void>
}));

vi.mock('../../api', () => ({
    localizeWithFallback: (key: string, fallback: string, parameters?: string[], replacements?: string[]) =>
        (parameters ?? []).reduce((text, parameter, index) => text.replace(`%${parameter}%`, replacements?.[index] ?? ''), fallback),
    SendMessageComposer: mocks.send
}));

vi.mock('../../api/user/GetUserProfile', () => ({
    GetUserProfile: mocks.openProfile
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
    }
}));

import { HOLDER_TYPE_FURNI, HOLDER_TYPE_USER, WiredVariableOwnersView } from './WiredVariableOwnersView';

const holder = (entityType: number, entityId: number, entityName: string, value: number) => ({
    entityType,
    entityId,
    entityName,
    storage: { value, creationTime: 1_700_000_000_000, creationTimeStr: '14/11/2023 22:13:20', lastUpdateTime: 1_700_000_500_000, lastUpdateTimeStr: '14/11/2023 22:21:40' }
});

const deliverPage = (page: { variableId?: string; totalEntries: number; currentPage: number; elements: any[]; userTypeFilter?: number; sortTypeFilter?: number }) => {
    const parser = { variableId: 'user:42', userTypeFilter: 0, sortTypeFilter: -1, ...page };

    act(() => {
        for (const handler of mocks.handlers) handler({ getParser: () => parser });
    });
};

const describeHolder = (entityType: number, entityId: number, entityName: string) => ({
    categoryLabel: entityType === HOLDER_TYPE_USER ? 'Habbo' : 'Floor furni',
    entityName: entityName || `#${entityId}`
});

const renderView = (onManage = vi.fn()) => {
    render(
        <WiredVariableOwnersView
            variableId="user:42"
            variableName="Kills"
            variablesType="user"
            hasValue
            describeHolder={describeHolder}
            onManage={onManage}
            onClose={() => undefined}
        />
    );

    return onManage;
};

describe('WiredVariableOwnersView', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.openProfile.mockClear();
        mocks.handlers.length = 0;
        vi.useFakeTimers({ toFake: ['performance'] });
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('asks for the first page of the variable and lists its holders, ignoring pages of other variables', () => {
        renderView();

        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual(['user:42', 1, 50, 0, -1]);

        deliverPage({ variableId: 'user:7', totalEntries: 1, currentPage: 1, elements: [holder(HOLDER_TYPE_USER, 1, 'Stranger', 1)] });
        expect(screen.queryByText('Stranger')).toBeNull();

        deliverPage({ totalEntries: 2, currentPage: 1, elements: [holder(HOLDER_TYPE_USER, 5, 'Camwijs', 12), holder(HOLDER_TYPE_FURNI, 900, '', 3)] });

        expect(screen.getByText('Camwijs')).toBeTruthy();
        expect(screen.getByText('#900')).toBeTruthy();
        expect(screen.getByText('12')).toBeTruthy();
        expect(screen.getByText('2 found. Showing page')).toBeTruthy();
    });

    it('a user name opens the profile and manage hands the holder to the detail panel', () => {
        const onManage = renderView();

        deliverPage({ totalEntries: 1, currentPage: 1, elements: [holder(HOLDER_TYPE_USER, 5, 'Camwijs', 12)] });

        fireEvent.click(screen.getByText('Camwijs'));
        expect(mocks.openProfile).toHaveBeenCalledWith(5);

        fireEvent.click(screen.getByRole('button', { name: 'Manage' }));
        expect(onManage).toHaveBeenCalledWith({
            categoryLabel: 'Habbo',
            entityId: 5,
            entityName: 'Camwijs',
            createdAt: 1_700_000_000,
            updatedAt: 1_700_000_500,
            value: 12,
            manageLabel: 'Manage'
        });
    });

    it('the sort and user type menus ask for page 1 with the new filters', () => {
        renderView();
        deliverPage({ totalEntries: 0, currentPage: 1, elements: [] });
        mocks.send.mockClear();
        vi.advanceTimersByTime(400);

        const [userTypeSelect, sortSelect] = screen.getAllByRole('combobox');

        selectOption(sortSelect, 'Highest value');
        expect(mocks.send.mock.calls[0][0].getMessageArray()).toEqual(['user:42', 1, 50, 0, 1]);

        vi.advanceTimersByTime(400);
        selectOption(userTypeSelect, 'In the room');
        expect(mocks.send.mock.calls[1][0].getMessageArray()).toEqual(['user:42', 1, 50, 1, 1]);

        deliverPage({ totalEntries: 0, currentPage: 1, elements: [], userTypeFilter: 1, sortTypeFilter: 2 });
        expect(userTypeSelect).toHaveTextContent('In the room');
        expect(sortSelect).toHaveTextContent('Name');
    });
});
