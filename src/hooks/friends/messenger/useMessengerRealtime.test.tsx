import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    dispatch: vi.fn(),
    sendPacket: vi.fn(() => true)
}));

vi.mock('../../../api', () => ({
    SendMessageComposer: mocks.sendPacket
}));

vi.mock('../../events', () => ({
    useMessageEvent: vi.fn()
}));

vi.mock('./useMessengerStore', () => ({
    useMessengerStore: () => ({ state: {}, dispatch: mocks.dispatch })
}));

vi.mock('@octane/renderer', () => ({
    GetSessionDataManager: () => ({ userId: 1 }),
    MessengerConversationsEvent: class {},
    MessengerHistoryEvent: class {},
    MessengerMessageAckEvent: class {},
    MessengerMessageEvent: class {},
    MessengerMessageFailedEvent: class {},
    MessengerReadCursorEvent: class {},
    RequestMessengerConversationsComposer: class {}
}));

import { useMessengerRealtime } from './useMessengerRealtime';

const Harness = () => {
    useMessengerRealtime();

    return null;
};

describe('useMessengerRealtime', () => {
    it('does not expose the packet send result as a React effect cleanup', () => {
        expect(() => {
            const view = render(
                <StrictMode>
                    <Harness />
                </StrictMode>
            );

            view.unmount();
        }).not.toThrow();
    });
});
