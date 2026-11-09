import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('avatar on a profile stand', () => {
    // The stand pictures put the centre of their platform at row ~105 of 135; 8 px puts the feet on it, 14 px left them floating.
    it('lifts the avatar 8 px in the infostand and in the background picker', () => {
        for (const path of ['src/css/room/InfoStand.css', 'src/css/backgrounds/BackgroundsView.css']) {
            expect(read(path)).toMatch(/\.stand-21\) ~ \.avatar-image \{\s*transform: translateY\(-8px\);/);
        }
    });
});
