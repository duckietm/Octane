/**
 * The talent pictures AIR loads from the image library (`${image.library.url}talent/<name>.png`): the level
 * illustrations, the level-up decorations, the citizenship welcome and the official reward products. Hotels rarely
 * host them, so they ship with the client and stand in when the library has none.
 */
const rawTalentLibrary = import.meta.glob('./*.png', { eager: true, import: 'default' }) as Record<string, string>;

export const TALENT_LIBRARY_IMAGES: Readonly<Record<string, string>> = Object.freeze(
    Object.fromEntries(Object.entries(rawTalentLibrary).map(([path, url]) => [path.replace(/^\.\//, '').replace(/\.png$/, ''), url]))
);
