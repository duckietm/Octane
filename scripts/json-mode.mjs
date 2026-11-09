export const VALID_JSON_MODES = [ 'legacy', 'jsonc', 'auto' ];
export const DEFAULT_JSON_MODE = 'jsonc';

export const isValidJsonMode = value => VALID_JSON_MODES.includes(value);

export const normalizeJsonModeAnswer = raw =>
{
    const value = (raw || '').trim().toLowerCase();

    if(!value || value === '1' || value === 'jsonc' || value === 'y' || value === 'yes') return 'jsonc';
    if(value === '2' || value === 'json' || value === 'legacy' || value === 'n' || value === 'no') return 'legacy';
    if(value === 'auto') return 'auto';

    return null;
};
