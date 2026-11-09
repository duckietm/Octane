import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/friends/FriendsView.css'), 'utf8');

describe('Messenger and Friend List visual CSS', () =>
{
    it('crops Friend List heads at the native renderer resolution', () =>
    {
        expect(css).toMatch(/\.octane-friends\s+\.friends-list-avatar\s*\{[^}]*width:\s*23px;[^}]*height:\s*23px;/s);
        expect(css).toMatch(/\.octane-friends\s+\.friends-list-avatar\s+\.avatar-image\s*\{[^}]*background-size:\s*23px 23px !important;[^}]*background-position:\s*center !important;[^}]*image-rendering:\s*auto !important;/s);
        expect(css).toMatch(/&\s+\.messenger-avatar-tab\s*\{[\s\S]*?width:\s*36px;[\s\S]*?&\s+\.avatar-image\s*\{[^}]*width:\s*36px !important;[^}]*height:\s*36px !important;[^}]*background-size:\s*36px 36px !important;/s);
    });

    it('places compact Telegram-style delivery ticks beside the timestamp', () =>
    {
        expect(css).toMatch(/\.messenger-message-meta\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;/s);
        expect(css).toMatch(/\.messenger-message-status\.read\s*\{[^}]*color:\s*#34b7f1;/s);
        expect(css).toMatch(/\.messenger-status-check\s*\{[^}]*position:\s*absolute;/s);
    });

    it('anchors conversation avatars inside their own compact viewport', () =>
    {
        expect(css).toMatch(/&\s+\.message-avatar\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;[\s\S]*?&\s+\.avatar-image\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*background-size:\s*30px 30px !important;/s);
    });

    it('anchors the friend category menu to the clicked folder', () =>
    {
        expect(css).toMatch(/\.friends-list-group-assign\s*\{[^}]*position:\s*relative;/s);
    });
});
