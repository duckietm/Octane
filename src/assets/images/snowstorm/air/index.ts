// AIR HabboGamesCom bitmaps for the SnowWar hub (games_main: how-to-play
// strips, pagination balls, "get more games" buttons, HC icon), bundled from
// Original Code/habbo-classic-win/03_asset_hab/generated/habbo-games-com, so
// the hub works on hotels that do not host them. Keyed by AIR asset name.
const rawSnowWarAirAssets = import.meta.glob('./*.png', { eager: true, import: 'default' });

export const SNOWWAR_AIR_ASSETS: Record<string, string> = Object.entries(rawSnowWarAirAssets).reduce(
    (accumulator, [path, url]) =>
    {
        const stem = (path.split('/').pop() || '').replace(/\.png$/i, '');

        if (stem) accumulator[stem] = url as string;

        return accumulator;
    },
    {} as Record<string, string>
);
