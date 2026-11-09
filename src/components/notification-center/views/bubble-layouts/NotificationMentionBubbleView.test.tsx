import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('../../../../api');

    return { ...actual, LocalizeText: (key: string) => key };
});
vi.mock('../../../../hooks/session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ userName: 'Bob' }) }));
vi.mock('../../../../common', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('../../../../common');

    return { ...actual, LayoutAvatarImageView: () => <span data-testid="head" /> };
});

const { NotificationMentionBubbleView } = await import('./NotificationMentionBubbleView');

describe('NotificationMentionBubbleView', () => {
    afterEach(() => cleanup());

    it('is laid out like the club gift notification', () => {
        const item = {
            mention: { mentionId: 1, senderId: 7, senderUsername: 'Alice', senderFigure: 'hd-180-1', roomId: 9, roomName: 'Lobby', message: 'hi @Bob', mentionType: 0, timestamp: 1, read: false }
        };
        const { container } = render(<NotificationMentionBubbleView item={item as never} onClose={() => undefined} />);
        const bubble = container.querySelector('.octane-swf-notification-bubble') as HTMLElement;

        expect(bubble.className).toContain('octane-mention-notification');
        expect(bubble.className).toContain('octane-swf-notification-bubble');
        expect(container.querySelector('.octane-mention-notification__border')).not.toBeNull();
        expect(container.querySelector('.octane-mention-notification__text')?.textContent).toContain('Alice mentioned you');
    });
});
