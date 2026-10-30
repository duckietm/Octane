/** How many translations a session keeps: a busy room otherwise grew the cache with every new line for hours. */
export const TRANSLATION_CACHE_MAX = 500;

/** A Map that keeps the most recently used entries and forgets the oldest past `max`. */
export class TranslationCache<V>
{
    private readonly _entries = new Map<string, V>();

    constructor(private readonly _max = TRANSLATION_CACHE_MAX)
    {}

    public get(key: string): V | undefined
    {
        const value = this._entries.get(key);

        if(value === undefined) return undefined;

        // Read again: move it to the newest end.
        this._entries.delete(key);
        this._entries.set(key, value);

        return value;
    }

    public set(key: string, value: V): void
    {
        this._entries.delete(key);
        this._entries.set(key, value);

        while(this._entries.size > this._max) this._entries.delete(this._entries.keys().next().value);
    }

    public get size(): number
    {
        return this._entries.size;
    }
}
