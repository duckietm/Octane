/**
 * The report of the official error window (ErrorPopupCtrl): what went wrong and where, as one base64 block a player
 * can copy to the hotel's staff.
 */
export interface ErrorReportInput {
    message: string;
    stack?: string;
    userId?: number;
    hotel?: string;
    time?: Date;
}

export interface ErrorReport {
    message: string;
    /** The readable report, before encoding. */
    details: string;
    /** The block shown and copied. */
    encoded: string;
}

const toBase64 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';

    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary);
};

export const buildErrorReport = ({ message, stack = '', userId = 0, hotel = '', time = new Date() }: ErrorReportInput, includeStack: boolean): ErrorReport => {
    const text = (message || 'Unknown error').trim();
    const lines = [`time: ${time.toISOString()}`, `user: ${userId}`, `hotel: ${hotel}`, `error: ${text}`];

    if (includeStack && stack) lines.push('stack:', stack.trim());

    const details = lines.join('\n');

    return { message: text, details, encoded: toBase64(details) };
};
