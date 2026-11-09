export const DEFAULT_BUBBLE_STACK_OVERLAP = 4;

export interface BubbleVisualOffsets {
    top: number;
    bottom: number;
}

const EMPTY_OFFSETS: BubbleVisualOffsets = { top: 0, bottom: 0 };

const parseLengths = (value: string): number[] =>
    (value || '')
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0)
        // A unitless outset is a multiple of `border-width`, which is 0 on every bubble, so it never paints outside the box.
        .map((token) => (token.endsWith('px') ? parseFloat(token) || 0 : 0));

export const getBorderImageOutsetEdges = (value: string): BubbleVisualOffsets => {
    const lengths = parseLengths(value);

    if (!lengths.length) return EMPTY_OFFSETS;

    return { top: lengths[0], bottom: lengths.length >= 3 ? lengths[2] : lengths[0] };
};

export const measureBubbleVisualOffsets = (element: HTMLElement): BubbleVisualOffsets => {
    if (!element) return EMPTY_OFFSETS;

    const bubble = element.querySelector<HTMLElement>('.chat-bubble') || element;
    const view = element.ownerDocument?.defaultView;

    let { top, bottom } = view ? getBorderImageOutsetEdges(view.getComputedStyle(bubble).borderImageOutset) : EMPTY_OFFSETS;

    const pointer = element.querySelector<HTMLElement>('.pointer');

    if (pointer) {
        const elementRect = element.getBoundingClientRect();
        const pointerRect = pointer.getBoundingClientRect();

        top = Math.max(top, elementRect.top - pointerRect.top);
        bottom = Math.max(bottom, pointerRect.bottom - elementRect.bottom);
    }

    return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
};

export const getBubbleStackOverflowBottom = (visualOffsetBottom: number, overlap: number): number => {
    const paintedBelow = Number.isFinite(visualOffsetBottom) ? Math.max(0, visualOffsetBottom) : 0;
    const allowance = Number.isFinite(overlap) ? Math.max(0, overlap) : DEFAULT_BUBBLE_STACK_OVERLAP;

    return Math.max(0, paintedBelow - allowance);
};

interface PointerCandidate {
    id: number;
    senderId: number;
}

export const getPointerChatIds = (chats: readonly PointerCandidate[]): Set<number> => {
    const newestBySender = new Map<number, number>();
    const pointerIds = new Set<number>();

    chats.forEach((chat) => {
        if (chat.senderId < 0) {
            pointerIds.add(chat.id);

            return;
        }

        const newestId = newestBySender.get(chat.senderId);

        if (newestId === undefined || chat.id > newestId) newestBySender.set(chat.senderId, chat.id);
    });

    newestBySender.forEach((id) => pointerIds.add(id));

    return pointerIds;
};
