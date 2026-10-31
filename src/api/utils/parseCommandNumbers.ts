/** Sign ids the client offers and the server accepts (0 to 17). */
export const MAX_SIGN_ID = 17;

/** A sign id typed after `:sign`, or null for text that is not one: `:sign foo` used to send NaN. */
export const parseSignId = (raw: string): number | null => {
    const value = Number.parseInt(raw ?? '', 10);

    return Number.isInteger(value) && value >= 0 && value <= MAX_SIGN_ID ? value : null;
};

/** A positive whole id from a link or a command, or null: `groups/manage/abc` used to send NaN. */
export const parsePositiveId = (raw: string): number | null => {
    if (!/^\d+$/.test(raw ?? '')) return null;

    const value = Number(raw);

    return Number.isSafeInteger(value) && value > 0 ? value : null;
};
