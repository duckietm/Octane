import { localizeWithFallback } from '../utils/localizeWithFallback';

/** English text for refusal keys the external texts may not carry. */
const WIRED_ERROR_FALLBACKS: Record<string, string> = {
    'wiredfurni.error.invalid_api_keys': 'Invalid Web API keys',
    'wiredfurni.error.variable_leaderboard.invalid_configuration': 'Invalid leaderboard configuration.',
    'wiredfurni.error.variable_leaderboard.missing_context': 'Leaderboard information is unavailable. Close and reopen this Wired box.',
    'wiredfurni.error.variable_leaderboard.title_required': 'Enter a leaderboard title.',
    'wiredfurni.error.variable_leaderboard.column_name_length': 'Column names must contain at least two characters.',
    'wiredfurni.error.variable_leaderboard.filter_required': 'Select a filtering variable.',
    'wiredfurni.error.variable_leaderboard.global_operand_required': 'Select a global comparison variable.'
};

/** A placeholder of a server refusal key with the value the server sent for it. */
export interface WiredErrorParameter {
    key: string;
    value: string;
}

/**
 * The text for a server refusal key, with the placeholders the server sent filled in
 * (the WiredValidationError packet carries `(key, value)` pairs after the key).
 */
export const localizeWiredError = (key: string, parameters: readonly WiredErrorParameter[] = []): string => {
    const keys = parameters.length ? parameters.map((parameter) => parameter.key) : null;
    const values = parameters.length ? parameters.map((parameter) => parameter.value) : null;

    return localizeWithFallback(key, WIRED_ERROR_FALLBACKS[key] ?? key, keys, values);
};
