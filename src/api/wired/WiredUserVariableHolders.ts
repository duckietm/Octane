/**
 * Who holds a user variable, as the server keys it: a Habbo by its user id, a pet as -2 * petId and a
 * bot as -(2 * botId + 1), so the three id ranges never collide in the variables packet.
 * The room sends a bot's webID as -botId; both signs are accepted for bots.
 */
export type UserVariableHolderKind = 'user' | 'pet' | 'bot';

export interface UserVariableHolder {
    kind: UserVariableHolderKind;
    id: number;
}

const MAX_UNIT_ID = Math.floor((2 ** 31 - 2) / 2);

export const userVariableHolderKey = (kind: UserVariableHolderKind | 'rentable_bot', webId: number): number => {
    const id = kind === 'user' || kind === 'pet' ? webId : Math.abs(webId);

    if (!Number.isInteger(id) || id <= 0) return 0;
    if (kind === 'user') return id;
    if (id > MAX_UNIT_ID) return 0;

    return kind === 'pet' ? -2 * id : -(2 * id + 1);
};

export const decodeUserVariableHolder = (key: number): UserVariableHolder | null => {
    if (!Number.isInteger(key) || key === 0 || key <= -(2 ** 31)) return null;
    if (key > 0) return { kind: 'user', id: key };

    const positive = -key;

    return { kind: positive % 2 === 0 ? 'pet' : 'bot', id: Math.floor(positive / 2) };
};

interface HolderUserDataSource<T> {
    getUserData(id: number): T | null;
    getPetData(id: number): T | null;
    getBotData(id: number): T | null;
    getRentableBotData(id: number): T | null;
}

/** The room's data for the holder behind a key, looked up with the getter of its kind. */
export const findUserVariableHolderData = <T>(source: HolderUserDataSource<T> | null | undefined, key: number): T | null => {
    const holder = decodeUserVariableHolder(key);

    if (!source || !holder) return null;
    if (holder.kind === 'user') return source.getUserData(holder.id) ?? null;
    if (holder.kind === 'pet') return source.getPetData(holder.id) ?? null;

    return (
        source.getBotData(-holder.id) ??
        source.getRentableBotData(-holder.id) ??
        source.getBotData(holder.id) ??
        source.getRentableBotData(holder.id) ??
        null
    );
};
