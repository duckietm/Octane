import { FurnitureStackHeightComposer, GetRoomEngine, TextureUtils } from '@octane/renderer';
import { CreateLinkEvent, GetRoomSession, SendMessageComposer, VisitDesktop } from '../../api';

/**
 * Plugin descriptor registered by external plugin scripts.
 */
export interface IOctanePlugin {
    /** Unique plugin name */
    name: string;
    /** Label shown on the button in room tools */
    label: string;
    /** CSS class for the icon (octane-icon class) */
    icon?: string;
    /** Called when the plugin button is clicked */
    onOpen: () => void;
    /** Called to close/destroy the plugin UI */
    onClose?: () => void;
    /** Called when the plugin is first loaded, receives the Octane API */
    onInit?: (api: IOctanePluginApi) => void;
}

/**
 * API exposed to external plugins via window.OctanePlugins
 */
export interface IOctanePluginApi {
    /** Register a plugin */
    register: (plugin: IOctanePlugin) => void;
    /** Unregister a plugin by name */
    unregister: (name: string) => void;
    /** Get all registered plugins */
    getPlugins: () => IOctanePlugin[];
    /** Fire a Octane link event (e.g., 'navigator/toggle-room-info') */
    createLinkEvent: (link: string) => void;
    /** Get the room engine instance */
    getRoomEngine: () => ReturnType<typeof GetRoomEngine>;
    /** Get the current room session */
    getRoomSession: () => ReturnType<typeof GetRoomSession>;
    /** Send a message composer to the server */
    sendMessage: typeof SendMessageComposer;
    /** Send a chat message to the server (processed as command if starts with ':') */
    sendChat: (text: string, styleId?: number) => void;
    /** Send stack height update for a furniture item (objectId, heightInCentimeters) */
    sendStackHeight: (objectId: number, height: number) => void;
    /** Take a screenshot of the room and download it as PNG */
    takeScreenshot: () => Promise<void>;
    /** Leave the room and go to hotel view */
    visitDesktop: () => void;
    /** Create a draggable floating window and return its container element */
    createWindow: (id: string, title: string, width: number) => HTMLDivElement | null;
    /** Destroy a floating window by id */
    destroyWindow: (id: string) => void;
}

// Internal plugin storage
const _plugins: IOctanePlugin[] = [];
const _listeners: Array<() => void> = [];
const _windowCleanup = new Map<string, () => void>();

function notifyListeners() {
    _listeners.forEach((fn) => fn());
}

const pluginApi: IOctanePluginApi = {
    register(plugin: IOctanePlugin) {
        if (_plugins.some((p) => p.name === plugin.name)) return;
        _plugins.push(plugin);
        plugin.onInit?.(pluginApi);
        notifyListeners();
    },

    unregister(name: string) {
        const index = _plugins.findIndex((p) => p.name === name);
        if (index >= 0) {
            _plugins[index].onClose?.();
            _plugins.splice(index, 1);
            notifyListeners();
        }
    },

    getPlugins() {
        return [..._plugins];
    },

    createLinkEvent(link: string) {
        CreateLinkEvent(link);
    },

    getRoomEngine() {
        return GetRoomEngine();
    },

    getRoomSession() {
        return GetRoomSession();
    },

    sendMessage: SendMessageComposer,

    sendChat(text: string, styleId: number = 0) {
        const session = GetRoomSession();
        if (!session) return;
        session.sendChatMessage(text, styleId, '');
    },

    sendStackHeight(objectId: number, height: number) {
        SendMessageComposer(new FurnitureStackHeightComposer(objectId, height));
    },

    async takeScreenshot() {
        try {
            const session = GetRoomSession();
            if (!session) return;

            const texture = GetRoomEngine().createTextureFromRoom(session.roomId, 1);
            if (!texture) return;

            const imageUrl = await TextureUtils.generateImageUrl(texture);
            if (!imageUrl) return;

            // Download the image
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `room_${session.roomId}_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.warn('[OctanePlugins] Screenshot failed:', e);
        }
    },

    visitDesktop() {
        VisitDesktop();
    },

    createWindow(id: string, title: string, width: number): HTMLDivElement | null {
        // Remove existing window with same id
        pluginApi.destroyWindow(id);

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = `octane-plugin-window-${id}`;
        overlay.style.cssText = 'position:fixed;z-index:500;top:50%;left:50%;transform:translate(-50%,-50%)';

        // Card wrapper
        const card = document.createElement('div');
        card.style.cssText = `width:${width}px;background:#2c3e50;border:1px solid #283F5D;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:hidden;font-family:Ubuntu,sans-serif`;

        // Header (draggable)
        const header = document.createElement('div');
        header.style.cssText =
            'display:flex;align-items:center;justify-content:center;position:relative;min-height:33px;background:linear-gradient(180deg,#3c6a8e 0%,#2a4f6e 100%);cursor:move;user-select:none';

        const titleEl = document.createElement('span');
        titleEl.textContent = title;
        titleEl.style.cssText = 'color:#fff;font-size:16px;text-shadow:0 1px 2px rgba(0,0,0,0.5)';

        const closeBtn = document.createElement('div');
        closeBtn.style.cssText =
            'position:absolute;right:8px;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;border-radius:50%;background:rgba(255,255,255,0.1)';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', () => pluginApi.destroyWindow(id));

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        // Make draggable
        let isDragging = false;
        let offsetX = 0,
            offsetY = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            const rect = overlay.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            overlay.style.transform = 'none';
            overlay.style.left = rect.left + 'px';
            overlay.style.top = rect.top + 'px';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            overlay.style.left = e.clientX - offsetX + 'px';
            overlay.style.top = e.clientY - offsetY + 'px';
        };

        const onMouseUp = () => {
            isDragging = false;
        };

        header.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Content area
        const content = document.createElement('div');
        content.style.cssText = 'padding:16px';

        card.appendChild(header);
        card.appendChild(content);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        _windowCleanup.set(id, () => {
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        });

        return content;
    },

    destroyWindow(id: string) {
        const cleanup = _windowCleanup.get(id);

        cleanup?.();
        _windowCleanup.delete(id);

        const existing = document.getElementById(`octane-plugin-window-${id}`);
        if (existing) existing.remove();
    }
};

/**
 * Subscribe to plugin list changes. Returns unsubscribe function.
 */
export function subscribePlugins(listener: () => void): () => void {
    _listeners.push(listener);
    return () => {
        const idx = _listeners.indexOf(listener);
        if (idx >= 0) _listeners.splice(idx, 1);
    };
}

export function getRegisteredPlugins(): IOctanePlugin[] {
    return [..._plugins];
}

// Expose globally so external scripts can use it
(window as any).OctanePlugins = pluginApi;
// Legacy alias for plugins written against the old Nitro global
(window as any).NitroPlugins = pluginApi;

export { pluginApi };
