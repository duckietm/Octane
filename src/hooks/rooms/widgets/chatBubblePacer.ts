/** New bubbles shown per animation frame while a crowd speaks at once; the rest follow in the next frames. */
export const CHAT_BUBBLES_PER_FRAME = 6;
/** The most the pace may grow to on a machine that builds bubbles quickly. */
export const CHAT_BUBBLES_PER_FRAME_MAX = 12;
/** A frame that took longer than this after a batch was too much work: the next batches are smaller. */
const SLOW_FRAME_MS = 34;
/** A frame this short had room to spare: the next batches may grow again. */
const QUICK_FRAME_MS = 20;
/** Lines never wait longer than about this many frames: a backlog raises the batch whatever the pace. */
const BACKLOG_FRAMES = 45;

export interface ChatBubblePacerDeps<T> {
    /** Shows these lines, in order. */
    show: (lines: T[]) => void;
    requestFrame: (callback: () => void) => number;
    cancelFrame: (handle: number) => void;
    /** True while the page gets no animation frames (a hidden tab): nothing is held back then. */
    isHidden: () => boolean;
    /** The clock the pace is measured with; without one the pace stays fixed. */
    now?: () => number;
    perFrame?: number;
    maxPerFrame?: number;
}

export interface ChatBubblePacer<T> {
    push: (line: T) => void;
    /** A line that is still waiting to be shown, so a late change (a translation, a face) can be made on it. */
    find: (matches: (line: T) => boolean) => T | undefined;
    /** Drops what is still waiting, e.g. on leaving the room. */
    clear: () => void;
    readonly waiting: number;
    /** How many bubbles a frame builds at the moment. */
    readonly pace: number;
}

/**
 * Paces the creation of chat bubbles. A line is shown at once while the frame has shown fewer than `perFrame`;
 * a burst beyond that (a crowd, or a stack of bots, speaking in the same server tick) is spread over the following
 * frames in arrival order, so no single frame has to build dozens of bubbles and stall the room.
 *
 * The pace follows the machine: when the frame after a batch ran long the batches shrink (down to one bubble a
 * frame), when it was quick they grow again. A backlog still clears in under a second, at the cost of longer frames.
 */
export const createChatBubblePacer = <T>(deps: ChatBubblePacerDeps<T>): ChatBubblePacer<T> => {
    const maxPerFrame = Math.max(1, deps.maxPerFrame ?? CHAT_BUBBLES_PER_FRAME_MAX);
    let perFrame = Math.min(maxPerFrame, Math.max(1, deps.perFrame ?? CHAT_BUBBLES_PER_FRAME));
    const queue: T[] = [];
    let shownThisFrame = 0;
    let frame = 0;
    // When the last frame that showed bubbles began; zero when the last frame showed none.
    let batchFrameAt = 0;

    const adjustPace = (now: number) => {
        if (!batchFrameAt) return;

        const took = now - batchFrameAt;

        if (took > SLOW_FRAME_MS) perFrame = Math.max(1, Math.floor(perFrame / 2));
        else if (took < QUICK_FRAME_MS) perFrame = Math.min(maxPerFrame, perFrame + 1);
    };

    const onFrame = () => {
        const now = deps.now ? deps.now() : 0;

        frame = 0;

        if (deps.now && shownThisFrame) adjustPace(now);

        shownThisFrame = 0;
        batchFrameAt = 0;

        if (!queue.length) return;

        const size = deps.isHidden() ? queue.length : Math.max(perFrame, Math.ceil(queue.length / BACKLOG_FRAMES));
        const batch = queue.splice(0, size);

        shownThisFrame = batch.length;
        batchFrameAt = now;
        deps.show(batch);
        schedule();
    };

    const schedule = () => {
        if (!frame) frame = deps.requestFrame(onFrame);
    };

    return {
        push: (line) => {
            if (deps.isHidden()) {
                // No frames to wait for: everything goes in now, in order.
                const batch = [...queue.splice(0, queue.length), line];

                deps.show(batch);
                return;
            }

            if (!queue.length && shownThisFrame < perFrame) {
                shownThisFrame++;
                deps.show([line]);
            } else {
                queue.push(line);
            }

            // Also needed after a line shown at once: the frame ends the count.
            schedule();
        },
        find: (matches) => queue.find(matches),
        clear: () => {
            queue.length = 0;
            shownThisFrame = 0;

            if (frame) deps.cancelFrame(frame);

            frame = 0;
        },
        get waiting() {
            return queue.length;
        },
        get pace() {
            return perFrame;
        }
    };
};
