import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const css = read('src/css/room/RoomWidgetsSweepAir.css');
const widgets = 'src/components/room/widgets/';

describe('room widget sweep A text (AIR)', () => {
    it('is imported by every window it styles', () => {
        for (const view of [
            'doorbell/DoorbellWidgetView',
            'room-queue/RoomQueueWidgetView',
            'room-promotes/views/RoomPromoteEditWidgetView',
            'room-filter-words/RoomFilterWordsWidgetView',
            'choosers/ChooserWidgetView',
            'pet-breeding/PetBreedingView',
            'pet-breeding/MonsterPlantBreedingView',
            'resolution/AchievementResolutionView',
            'wired-label/WiredLabelSettingsView',
            'wired-link/WiredLinkView',
            'wired-link/WiredLinkConnectionsView',
            'BuildHeightWidgetView',
            'avatar-info/infostand/ImagePositionEditorView',
            'furniture/FurnitureRentableSpaceView'
        ]) {
            expect(read(`${widgets}${view}.tsx`)).toMatch(/import '(\.\.\/)+css\/room\/RoomWidgetsSweepAir\.css';/);
        }
    });

    it('sets every window in regular Ubuntu, also over child faces', () => {
        expect(css).toMatch(/\.octane-image-position-editor \{\s*font-family: HabboAirUbuntu, UbuntuRegular, sans-serif;/);
        expect(css).toMatch(/@layer base \{\s*:is\([^)]*\.octane-widget-doorbell[^)]*\)\s*\.octane-card-content-shell\s*:where\(\*\):not\(svg, svg \*\) \{[^}]*HabboAirUbuntu, UbuntuRegular, sans-serif !important/);
    });

    it('no longer gives the event edit and word filter windows the Illumina guide-tool texts', () => {
        expect(read(`${widgets}room-promotes/views/RoomPromoteEditWidgetView.tsx`)).not.toContain('octane-guide-tool');
        expect(read(`${widgets}room-filter-words/RoomFilterWordsWidgetView.tsx`)).not.toContain('octane-guide-tool');
        expect(css).toMatch(/\.octane-room-promote-edit__label \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-room-filter-words \.octane-card-content-shell input \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
    });

    it('draws the doorbell info in red and the queue position u_bold 12', () => {
        expect(css).toMatch(/\.octane-widget-doorbell \.octane-doorbell-info \{[^}]*color: #ff0000/);
        expect(css).toMatch(/\.octane-room-queue-info \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-chooser-bar input\[type='text'\]::placeholder \{[^}]*color: #666666/);
    });

    it('uses the Illumina sizes in the breeding and resolution windows', () => {
        expect(css).toMatch(/\.octane-pet-breeding \.octane-card-content-shell \{[^}]*font-size: 11px/);
        expect(css).toMatch(/\.octane-pet-breeding__pet-name \{[^}]*font-size: 12px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-pet-breeding__heading \{[^}]*font-size: 10px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-resolution__title \{[^}]*color: #333333;[^}]*font-size: 18px/);
        expect(css).toMatch(/\.octane-resolution__disabled \{[^}]*font-size: 10px/);
        expect(css).toMatch(/:is\(\.octane-pet-breeding, \.octane-resolution\) \.habbo-btn-secondary \{[^}]*font-size: 10px !important;[^}]*font-weight: 700 !important/);
    });

    it('gives the monster plant texts font_size 13 and the info lines italics', () => {
        expect(css).toMatch(/\.octane-monsterplant-breeding \.octane-card-content-shell > \.text-sm \{[^}]*font-size: 13px/);
        expect(css).toMatch(/\.octane-monsterplant-breeding__info \{[^}]*font-size: 13px;[^}]*font-style: italic/);
    });

    it('sets the label settings and Wired Link texts', () => {
        expect(css).toMatch(/\.octane-wired-label-settings__heading \{[^}]*font-size: 10px;[^}]*font-weight: 700/);
        expect(css).toMatch(/\.octane-wired-label-settings__always-open \{[^}]*font-size: 11px/);
        expect(css).toMatch(/\.octane-wired-link__selected \{[^}]*color: #285568;[^}]*font-size: 13px/);
        expect(css).toMatch(/\.octane-wired-link__summary :where\(button\) \{[^}]*color: #365f70/);
        expect(css).toMatch(/\.octane-wired-link__button\.btn-primary \{[^}]*border-image-source: var\(--habbo-skin-shiny\);[^}]*color: #000;[^}]*font-weight: 400/);
    });

    it('turns the grey AIR buttons grey: shiny 12 regular, shiny thick 12 bold', () => {
        expect(css).toMatch(/\.octane-room-queue-widget,[^{]*\.octane-widget-rentablespace\s*\)\s*\.habbo-btn-secondary \{[^}]*border-image-source: var\(--habbo-skin-shiny\) !important;[^}]*color: #000 !important;[^}]*font-size: 12px !important;[^}]*font-weight: 400 !important/);
        expect(css).toMatch(/\.octane-image-position-editor\) \.habbo-btn-secondary,[^{]*\{[^}]*border-image-source: var\(--habbo-skin-shiny-thick\) !important;[^}]*font-weight: 700 !important/);
        expect(css).not.toMatch(/border-image:\s*none/);

        for (const [view, count] of [
            ['room-queue/RoomQueueWidgetView', 2],
            ['room-filter-words/RoomFilterWordsWidgetView', 2],
            ['room-promotes/views/RoomPromoteEditWidgetView', 2],
            ['furniture/FurnitureRentableSpaceView', 3]
        ] as const) {
            const source = read(`${widgets}${view}.tsx`);

            expect(source.match(/variant="secondary"/g)?.length ?? 0).toBeGreaterThanOrEqual(count);
            expect(source).not.toMatch(/variant=\{?["'](success|danger)/);
        }
    });

    it('keeps green where AIR has a style 5 button', () => {
        expect(read(`${widgets}wired-label/WiredLabelSettingsView.tsx`)).toContain('variant="success" className="octane-wired-label-settings__ready"');
        expect(read(`${widgets}pet-breeding/MonsterPlantBreedingView.tsx`)).toContain('variant="success"');
        expect(css).not.toMatch(/\.habbo-btn-primary \{[^}]*border-image-source/);
    });
});
