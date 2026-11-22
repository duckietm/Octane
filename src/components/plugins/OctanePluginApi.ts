import { FurnitureStackHeightComposer, GetRoomEngine, TextureUtils } from '@octane/renderer';
import { CreateLinkEvent, GetRoomSession, PluginChannelListener, SendMessageComposer, VisitDesktop, sendPluginChannel, subscribePluginChannel } from '../../api';

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
    /**
     * Create a draggable floating window with the client's own card markup and return its content element. Plugins
     * style what they put inside with the client's classes: `habbo-btn-primary` / `-secondary` / `-danger` buttons,
     * `octane-card-tabs-shell` with `octane-card-tab-item` (+ `-active`) and `octane-card-tab-item-label` tabs.
     */
    createWindow: (id: string, title: string, width: number) => HTMLDivElement | null;
    /** Destroy a floating window by id */
    destroyWindow: (id: string) => void;
    /**
     * Listen on a channel of the generic plugin channel: what a server plugin sends there, as a JSON object (null when
     * it is not one) and as text. Gets the last message at once if one came before. Returns the function that stops.
     */
    onChannel: (channel: string, listener: PluginChannelListener) => () => void;
    /** Answer the server plugin on a channel; false, sending nothing, for a bad channel name or a payload too long. */
    sendChannel: (channel: string, data: unknown) => boolean;
}

// Internal plugin storage
const _plugins: IOctanePlugin[] = [];
const _listeners: Array<() => void> = [];
const _windowCleanup = new Map<string, () => void>();
// The windows each plugin opened through the API it received in onInit, closed when the plugin is removed.
const _pluginWindows = new Map<string, Set<string>>();
// The channel listeners each plugin added through that API, removed with it.
const _pluginChannels = new Map<string, Set<() => void>>();

// The API a plugin gets in onInit: the shared one, with the windows and channel listeners it opens recorded under its name.
function scopedApi(pluginName: string): IOctanePluginApi {
    return {
        ...pluginApi,
        createWindow(id: string, title: string, width: number) {
            const content = pluginApi.createWindow(id, title, width);
            if (content) {
                const windows = _pluginWindows.get(pluginName) ?? new Set<string>();
                windows.add(id);
                _pluginWindows.set(pluginName, windows);
            }
            return content;
        },
        onChannel(channel: string, listener: PluginChannelListener) {
            const stop = pluginApi.onChannel(channel, listener);
            const stops = _pluginChannels.get(pluginName) ?? new Set<() => void>();
            stops.add(stop);
            _pluginChannels.set(pluginName, stops);
            return () => {
                stop();
                stops.delete(stop);
            };
        }
    };
}

function destroyPluginWindows(pluginName: string) {
    const windows = _pluginWindows.get(pluginName);
    _pluginWindows.delete(pluginName);
    windows?.forEach((id) => pluginApi.destroyWindow(id));

    const channels = _pluginChannels.get(pluginName);
    _pluginChannels.delete(pluginName);
    channels?.forEach((stop) => stop());
}

// One listener that throws must not stop the others from hearing the change.
function notifyListeners() {
    _listeners.forEach((fn) => {
        try {
            fn();
        } catch (error) {
            console.error('[plugins] a listener failed', error);
        }
    });
}

const pluginApi: IOctanePluginApi = {
    register(plugin: IOctanePlugin) {
        if (_plugins.some((p) => p.name === plugin.name)) return;
        // A plugin is listed once its onInit went through: one that failed used to stay registered half set up.
        try {
            plugin.onInit?.(scopedApi(plugin.name));
        } catch (error) {
            console.error(`[plugins] ${plugin.name} failed to start`, error);
            destroyPluginWindows(plugin.name);
            return;
        }
        _plugins.push(plugin);
        notifyListeners();
    },

    unregister(name: string) {
        const index = _plugins.findIndex((p) => p.name === name);
        if (index >= 0) {
            const plugin = _plugins[index];
            try {
                plugin.onClose?.();
            } catch (error) {
                console.error(`[plugins] ${plugin.name} failed to close`, error);
            } finally {
                // A plugin whose onClose threw used to stay registered, and its windows, with their document
                // listeners, stayed open after it was gone.
                _plugins.splice(_plugins.indexOf(plugin), 1);
                destroyPluginWindows(plugin.name);
                notifyListeners();
            }
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

            let imageUrl: string = null;
            try {
                imageUrl = await TextureUtils.generateImageUrl(texture);
            } finally {
                // A whole-room texture: freed even when the image could not be made.
                texture.destroy(true);
            }
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

    onChannel(channel: string, listener: PluginChannelListener) {
        return subscribePluginChannel(channel, listener);
    },

    sendChannel(channel: string, data: unknown) {
        return sendPluginChannel(channel, data);
    },

    createWindow(id: string, title: string, width: number): HTMLDivElement | null {
        // Remove existing window with same id
        pluginApi.destroyWindow(id);

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = `octane-plugin-window-${id}`;
        overlay.style.cssText = 'position:fixed;z-index:500;top:50%;left:50%;transform:translate(-50%,-50%)';

        // The same markup as OctaneCardView, so a plugin window looks and themes like the client's own windows.
        const card = document.createElement('div');
        card.className = 'octane-card octane-card-shell theme-primary has-classic-scrollbar resize-none flex flex-col relative overflow-hidden';
        card.style.width = `${width}px`;

        // Header (draggable)
        const header = document.createElement('div');
        header.className =
            'octane-card-header-shell drag-handler relative flex flex-col items-center justify-center min-h-card-header max-h-card-header cursor-move select-none';

        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-center justify-center w-full';

        const titleEl = document.createElement('span');
        titleEl.className = 'octane-card-title text-white';
        titleEl.textContent = title;

        const closeBtn = document.createElement('div');
        closeBtn.className = 'absolute flex items-center justify-center cursor-pointer right-2 octane-card-close-button';
        closeBtn.setAttribute('role', 'button');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('mousedown', (event) => event.stopPropagation());
        closeBtn.addEventListener('click', () => pluginApi.destroyWindow(id));

        titleRow.appendChild(titleEl);
        titleRow.appendChild(closeBtn);

        header.appendChild(titleRow);

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

        // Content area, as OctaneCardContentView draws it.
        const content = document.createElement('div');
        content.className = 'container-fluid octane-card-content-shell flex flex-col h-full p-[10px] overflow-auto';

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
        _pluginWindows.forEach((windows) => windows.delete(id));

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
