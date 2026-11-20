export const isStaffChatIdentity = (entry: { id?: number; name?: string }) =>
    entry.id === -1 || (entry.name || '').trim().toLocaleLowerCase() === 'staff chat';
