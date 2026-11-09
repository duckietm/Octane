import { describe, expect, test } from 'vitest';
import {
    filterSoundboardSounds,
    mergeSoundboardPresentation,
    normalizeSoundboardLayout,
    pushRecentSound
} from './soundboardPresentation';

describe('soundboard presentation', () => {
    test('normalizes categories, tones, keywords, and duplicate identifiers', () => {
        const layout = normalizeSoundboardLayout({
            categories: [
                { id: ' reactions ', label: ' Reactions ' },
                { id: 'reactions', label: 'Duplicate' },
                { id: '', label: 'Invalid' }
            ],
            sounds: [
                { id: 1, category: ' reactions ', tone: 'gold', keywords: [' bell ', 'BELL', 4] },
                { id: 2, category: 'missing', tone: 'red', keywords: 'invalid' },
                { id: -1, tone: 'green' }
            ]
        });

        expect(layout.categories).toEqual([{ id: 'reactions', label: 'Reactions' }]);
        expect(layout.sounds).toEqual([
            { id: 1, categoryId: 'reactions', tone: 'gold', keywords: ['bell'] },
            { id: 2, categoryId: null, tone: 'blue', keywords: [] }
        ]);
    });

    test('ignores unknown metadata and preserves authoritative server fields', () => {
        const layout = normalizeSoundboardLayout({
            categories: [{ id: 'fun', label: 'Fun' }],
            sounds: [
                { id: 7, name: 'Client name', url: 'javascript:bad', category: 'fun', tone: 'purple' },
                { id: 999, category: 'fun', tone: 'green' }
            ]
        });
        const sounds = mergeSoundboardPresentation(
            [{ id: 7, name: 'Server name', url: '/sounds/server.mp3' }, { id: 8, name: 'Server only', url: '/sounds/only.mp3' }],
            layout
        );

        expect(sounds).toEqual([
            { id: 7, name: 'Server name', url: '/sounds/server.mp3', classname: '', categoryId: 'fun', tone: 'purple', keywords: [], group: '', gain: 1 },
            { id: 8, name: 'Server only', url: '/sounds/only.mp3', classname: '', categoryId: null, tone: 'blue', keywords: [], group: '', gain: 1 }
        ]);
    });

    test('filters names and keywords without case or accents', () => {
        const sounds = mergeSoundboardPresentation(
            [
                { id: 1, name: 'Campanèlla', url: '/1.mp3' },
                { id: 2, name: 'Applauso', url: '/2.mp3' },
                { id: 3, name: 'Allarme', url: '/3.mp3' }
            ],
            normalizeSoundboardLayout({
                categories: [{ id: 'reactions', label: 'Reactions' }],
                sounds: [
                    { id: 1, category: 'reactions', keywords: ['ding'] },
                    { id: 2, category: 'reactions', keywords: ['clap'] }
                ]
            })
        );

        expect(filterSoundboardSounds(sounds, 'CAMPANELLA', 'all', [])).toHaveLength(1);
        expect(filterSoundboardSounds(sounds, 'cláp', 'reactions', []).map((sound) => sound.id)).toEqual([2]);
        expect(filterSoundboardSounds(sounds, '', 'reactions', []).map((sound) => sound.id)).toEqual([1, 2]);
    });

    test('orders recent sounds, keeps identifiers unique, and caps the history at ten', () => {
        const sounds = mergeSoundboardPresentation(
            Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Sound ${index + 1}`, url: `/${index + 1}.mp3` })),
            normalizeSoundboardLayout({})
        );
        const recent = Array.from({ length: 10 }, (_, index) => index + 1);

        expect(pushRecentSound(recent, 3)).toEqual([3, 1, 2, 4, 5, 6, 7, 8, 9, 10]);
        expect(pushRecentSound(recent, 11)).toEqual([11, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(filterSoundboardSounds(sounds, '', 'recent', [4, 2, 99]).map((sound) => sound.id)).toEqual([4, 2]);
    });
});
