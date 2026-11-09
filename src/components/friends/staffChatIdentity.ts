export const STAFF_CHAT_FIGURE = 'ha-3409-1413-70.lg-285-89.ch-3032-1334-109.sh-3016-110.hd-185-1359.ca-3225-110-62.wa-3264-62-62.fa-1206-90.hr-3322-1403';

export const isStaffChatIdentity = (entry: { id?: number; name?: string }) =>
    entry.id === -1 || (entry.name || '').trim().toLocaleLowerCase() === 'staff chat';
