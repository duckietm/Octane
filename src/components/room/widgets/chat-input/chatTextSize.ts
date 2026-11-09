export type ChatTextSize = 's' | 'm' | 'l' | 'xl' | 'xxl';

export const CHAT_TEXT_SIZE_STORAGE_KEY = 'nitro.chat.text_size';
export const CHAT_TEXT_SIZE_EVENT = 'octane-chat-text-size-change';
export const CHAT_TEXT_SIZES: ChatTextSize[] = ['s', 'm', 'l', 'xl', 'xxl'];

const CHAT_TEXT_SIZE_LABELS: Record<ChatTextSize, string> = {
    s: 'S',
    m: 'M',
    l: 'L',
    xl: 'XL',
    xxl: 'XXL'
};

export const CHAT_TEXT_SIZE_PIXELS: Record<ChatTextSize, number> = {
    s: 11,
    m: 14,
    l: 18,
    xl: 22,
    xxl: 25
};

export const isChatTextSize = (value: string): value is ChatTextSize => CHAT_TEXT_SIZES.includes(value as ChatTextSize);

export const getChatTextSizeLabel = (size: ChatTextSize): string => CHAT_TEXT_SIZE_LABELS[size];

export const getStoredChatTextSize = (): ChatTextSize => {
    if (typeof window === 'undefined') return 'm';

    const stored = window.localStorage.getItem(CHAT_TEXT_SIZE_STORAGE_KEY);

    return stored && isChatTextSize(stored) ? stored : 'm';
};

export const setStoredChatTextSize = (size: ChatTextSize) => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(CHAT_TEXT_SIZE_STORAGE_KEY, size);
    window.dispatchEvent(new CustomEvent<ChatTextSize>(CHAT_TEXT_SIZE_EVENT, { detail: size }));
};
