import '@testing-library/jest-dom/vitest';

// Set up a container for React portals (used by OctaneCardView's DraggableWindow)
const draggableWindowsContainer = document.createElement('div');
draggableWindowsContainer.id = 'draggable-windows-container';
document.body.appendChild(draggableWindowsContainer);

// jsdom doesn't ship ResizeObserver, but LayoutRoomPreviewerView (and
// any component that resizes a canvas to its container) constructs
// one at mount. A no-op stub is enough — the tests never assert
// resize-driven behavior, they just need the constructor to exist.
if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
        constructor(_callback: unknown) {
            // no-op
        }
        public observe(): void {
            // no-op
        }
        public unobserve(): void {
            // no-op
        }
        public disconnect(): void {
            // no-op
        }
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

// Node 22.4+ ships an experimental built-in `localStorage` that is only
// usable when the process is started with `--localstorage-file`. Because
// vitest's jsdom environment makes `window` and `globalThis` the same
// object, that built-in getter shadows the perfectly good Storage jsdom
// already created, and every `window.localStorage.*` call throws
// "Cannot read properties of undefined". Restore a real Storage so the
// suite behaves the same on Node 22 (CI) and on newer local runtimes.
for (const key of [ 'localStorage', 'sessionStorage' ] as const) {
    if ((globalThis as unknown as Record<string, unknown>)[key]) continue;

    const entries = new Map<string, string>();
    const storage: Storage = {
        get length() {
            return entries.size;
        },
        clear: () => entries.clear(),
        getItem: (name: string) => (entries.has(String(name)) ? entries.get(String(name)) as string : null),
        key: (index: number) => Array.from(entries.keys())[index] ?? null,
        removeItem: (name: string) => entries.delete(String(name)) as unknown as void,
        setItem: (name: string, value: string) => {
            entries.set(String(name), String(value));
        }
    };

    Object.defineProperty(globalThis, key, { configurable: true, value: storage, writable: true });
}
