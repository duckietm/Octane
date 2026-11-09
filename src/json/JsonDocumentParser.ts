import stripJsonComments from 'strip-json-comments';

export type UiJsonMode = 'legacy' | 'jsonc' | 'auto';

const sourceSuffix = (sourceUrl: string): string => sourceUrl ? ` in "${ sourceUrl }"` : '';

const errorMessage = (error: unknown): string => (error as Error)?.message || String(error);

const parseStrict = <T>(text: string, sourceUrl: string): T =>
{
    try
    {
        return JSON.parse(text) as T;
    }
    catch(error)
    {
        throw new Error(`Failed to parse strict JSON${ sourceSuffix(sourceUrl) } — ${ errorMessage(error) }`, { cause: error });
    }
};

const parseJsonc = <T>(text: string, sourceUrl: string): T =>
{
    try
    {
        return JSON.parse(stripJsonComments(text, { trailingCommas: true })) as T;
    }
    catch(error)
    {
        throw new Error(`Failed to parse JSONC${ sourceSuffix(sourceUrl) } — ${ errorMessage(error) }`, { cause: error });
    }
};

export const parseJsonDocument = <T>(text: string, mode: UiJsonMode, sourceUrl: string = ''): T =>
{
    if(mode === 'legacy') return parseStrict<T>(text, sourceUrl);
    if(mode === 'jsonc') return parseJsonc<T>(text, sourceUrl);

    try
    {
        return JSON.parse(text) as T;
    }
    catch(strictError)
    {
        try
        {
            return JSON.parse(stripJsonComments(text, { trailingCommas: true })) as T;
        }
        catch(jsoncError)
        {
            throw new Error(
                `Failed to parse JSON/JSONC${ sourceSuffix(sourceUrl) } — JSONC: ${ errorMessage(jsoncError) } (strict JSON: ${ errorMessage(strictError) })`,
                { cause: jsoncError }
            );
        }
    }
};
