import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('../../api', () => ({ SendMessageComposer: mocks.send }));

vi.mock('../events', () => ({
    useMessageEvent: (event: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.set(event, handler);
    }
}));

vi.mock('@octane/renderer', () => ({
    IsBadgeRequestFulfilledEvent: class {},
    GetIsBadgeRequestFulfilledComposer: class GetIsBadgeRequestFulfilledComposer {
        constructor(public requestCode: string) {}
    },
    RequestABadgeComposer: class RequestABadgeComposer {
        constructor(public requestCode: string) {}
    }
}));

import { GetIsBadgeRequestFulfilledComposer, IsBadgeRequestFulfilledEvent, RequestABadgeComposer } from '@octane/renderer';
import { useBadgeRequest } from './useBadgeRequest';

let hook: ReturnType<typeof useBadgeRequest> = null;

const Harness = () => {
    hook = useBadgeRequest();

    return null;
};

describe('useBadgeRequest', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.handlers.clear();
    });

    it('asks and claims with the request code', () => {
        render(<Harness />);

        act(() => hook.ask('summer_2026'));
        act(() => hook.claim('summer_2026'));

        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(GetIsBadgeRequestFulfilledComposer);
        expect(mocks.send.mock.calls[1][0]).toBeInstanceOf(RequestABadgeComposer);
        expect((mocks.send.mock.calls[1][0] as { requestCode: string }).requestCode).toBe('summer_2026');
    });

    it('sends nothing without a code', () => {
        render(<Harness />);

        act(() => {
            hook.ask('');
            hook.claim('');
        });

        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('remembers what the hotel answered, per code', () => {
        render(<Harness />);

        act(() =>
            mocks.handlers.get(IsBadgeRequestFulfilledEvent)({
                getParser: () => ({ requestCode: 'summer_2026', fulfilled: true })
            })
        );
        act(() =>
            mocks.handlers.get(IsBadgeRequestFulfilledEvent)({
                getParser: () => ({ requestCode: 'winter_2026', fulfilled: false })
            })
        );

        expect(hook.claimed).toEqual({ summer_2026: true, winter_2026: false });
    });
});
