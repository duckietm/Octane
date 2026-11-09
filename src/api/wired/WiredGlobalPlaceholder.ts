export const GLOBAL_PLACEHOLDER_FROM_VALUE = 0;
export const GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM = 1;
export const GLOBAL_PLACEHOLDER_NAME_MAX_LENGTH = 32;
export const GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH = 100;

export interface IGlobalPlaceholderRoom {
    roomId: number;
    roomName: string;
    placeholders: string[];
}

export interface IGlobalPlaceholderForm {
    name: string;
    mode: number;
    value: string;
    roomId: number;
    placeholderName: string;
    rooms: IGlobalPlaceholderRoom[];
}

const WRAPPED_PLACEHOLDER = /^\$\((.*)\)$/;

export const normalizeGlobalPlaceholderName = (value: string): string => {
    let normalized = (value ?? '').trim().replace(/[\t\r\n]/g, '');

    if (WRAPPED_PLACEHOLDER.test(normalized)) normalized = normalized.substring(2, normalized.length - 1).trim();

    return normalized.slice(0, GLOBAL_PLACEHOLDER_NAME_MAX_LENGTH);
};

export const normalizeGlobalPlaceholderValue = (value: string): string => (value ?? '').replace(/[\t\r\n]/g, '').slice(0, GLOBAL_PLACEHOLDER_VALUE_MAX_LENGTH);

const parseRooms = (json: string): IGlobalPlaceholderRoom[] => {
    if (!json?.trim().startsWith('{')) return [];

    try {
        const parsed = JSON.parse(json) as { rooms?: unknown };

        if (!Array.isArray(parsed?.rooms)) return [];

        return parsed.rooms
            .filter((room): room is IGlobalPlaceholderRoom => !!room && typeof room === 'object' && Number.isFinite((room as IGlobalPlaceholderRoom).roomId))
            .map((room) => ({
                roomId: room.roomId,
                roomName: typeof room.roomName === 'string' ? room.roomName : `#${room.roomId}`,
                placeholders: Array.isArray(room.placeholders) ? room.placeholders.filter((name): name is string => typeof name === 'string') : []
            }));
    } catch {
        return [];
    }
};

/** The editor data the server sends: int params `[mode, 0, roomId]`, string `name\tvalueOrSourceName\tsharedJson`. */
export const parseGlobalPlaceholder = (intData: number[] | null | undefined, stringData: string | null | undefined): IGlobalPlaceholderForm => {
    const [name = '', second = '', ...rest] = (stringData ?? '').split('\t');
    const mode = intData?.[0] === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM ? GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM : GLOBAL_PLACEHOLDER_FROM_VALUE;
    const roomId = mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM ? Math.max(0, Math.trunc(intData?.[2] ?? 0)) : 0;
    const rooms = parseRooms(rest.join('\t'));

    if (mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM && roomId > 0) {
        const placeholderName = normalizeGlobalPlaceholderName(second);
        const known = rooms.find((room) => room.roomId === roomId);

        if (!known) rooms.push({ roomId, roomName: `#${roomId}`, placeholders: placeholderName ? [placeholderName] : [] });
        else if (placeholderName && !known.placeholders.includes(placeholderName)) known.placeholders.push(placeholderName);

        return { name: normalizeGlobalPlaceholderName(name), mode, value: '', roomId, placeholderName, rooms };
    }

    return { name: normalizeGlobalPlaceholderName(name), mode, value: normalizeGlobalPlaceholderValue(second), roomId: 0, placeholderName: '', rooms };
};

/** What the editor saves, in the upstream contract. */
export const serializeGlobalPlaceholder = (form: IGlobalPlaceholderForm): { intParams: number[]; stringParam: string } => {
    const name = normalizeGlobalPlaceholderName(form.name);

    if (form.mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM) {
        return { intParams: [GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM, 0, Math.max(0, form.roomId)], stringParam: `${name}\t${normalizeGlobalPlaceholderName(form.placeholderName)}` };
    }

    return { intParams: [GLOBAL_PLACEHOLDER_FROM_VALUE, 0, 0], stringParam: `${name}\t${normalizeGlobalPlaceholderValue(form.value)}` };
};

/** Picking a shared placeholder names this one after it while the name is empty or still the previous pick's. */
export const selectGlobalPlaceholderSource = (form: IGlobalPlaceholderForm, placeholderName: string): IGlobalPlaceholderForm => {
    const renames = !form.name.length || (!!form.placeholderName && form.placeholderName === form.name);

    return { ...form, placeholderName, name: renames ? normalizeGlobalPlaceholderName(placeholderName) : form.name };
};

export const isGlobalPlaceholderValid = (form: IGlobalPlaceholderForm): boolean => {
    if (form.mode === GLOBAL_PLACEHOLDER_FROM_ANOTHER_ROOM) return form.roomId > 0 && !!normalizeGlobalPlaceholderName(form.placeholderName).length;

    return !!normalizeGlobalPlaceholderName(form.name).length;
};
