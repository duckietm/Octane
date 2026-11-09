import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GetRewardTrackTaskIconUrl } from '.';

/** The emulator is a sibling checkout whose folder name differs between setups; the first one that holds the migrations is used. */
const MIGRATIONS = ['Gameserver', 'emulatore', 'Polaris-Emulator', 'polaris']
    .map(folder => resolve(process.cwd(), '..', folder, 'Emulator/src/main/resources/db/migration'))
    .find(folder => existsSync(folder));

/** The action types the seeded tracks send, read from their INSERT rows ('track','task','action',...). */
const seededActions = (file: string): string[] => {
    const sql = readFileSync(resolve(MIGRATIONS as string, file), 'utf8');
    const actions = new Set<string>();

    for (const match of sql.matchAll(/INSERT IGNORE INTO `?reward_track_tasks`?[^;]*;/g)) {
        for (const row of match[0].matchAll(/\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([^']*)'/g)) actions.add(row[1]);
    }

    return [...actions];
};

describe('reward track task icons', () => {
    // Without the emulator checkout next to the client (as in this repository's CI) there is nothing to read the seeds from.
    it.skipIf(!MIGRATIONS)('has an icon for every task the Introduction track seeds', () => {
        const actions = seededActions('V20260927120000__reward_track_introduction.sql');

        expect(actions).toHaveLength(30);

        for (const action of actions) expect(GetRewardTrackTaskIconUrl(action), action).toBeTruthy();
    });

    it.skipIf(!MIGRATIONS)('has an icon for every task the demo season seeds', () => {
        for (const action of seededActions('V20260907220000__quests_daily_tasks_reward_tracks.sql')) {
            expect(GetRewardTrackTaskIconUrl(action), action).toBeTruthy();
        }
    });

    it('matches the action name case-insensitively and returns null for unknown actions', () => {
        expect(GetRewardTrackTaskIconUrl('CHAT_WITH_SOMEONE')).toBe(GetRewardTrackTaskIconUrl('chat_with_someone'));
        expect(GetRewardTrackTaskIconUrl('nope')).toBeNull();
        expect(GetRewardTrackTaskIconUrl(null)).toBeNull();
    });
});
