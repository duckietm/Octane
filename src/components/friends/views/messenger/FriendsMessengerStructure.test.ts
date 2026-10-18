import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Messenger component structure', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/friends/views/messenger/FriendsMessengerView.css'), 'utf8');

    it('owns the complete fixed-window layout without origin prefixes', () => {
        expect(css).not.toMatch(/\b(?:swf|air)-/);
        expect(css).toMatch(/\.messenger-window\s*\{[^}]*width:\s*282px;[^}]*height:\s*385px;[^}]*min-height:\s*275px;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-avatar-navigation\s*\{[^}]*height:\s*35px;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-thread-header\s*\{[^}]*top:\s*80px;/s);
        expect(css).toMatch(/\.messenger-window \.chat-messages\s*\{[^}]*top:\s*122px;[^}]*bottom:\s*49px;[^}]*overflow-y:\s*auto;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-input-row\s*\{[^}]*height:\s*30px;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-minimize,[\s\S]*?width:\s*20px;[\s\S]*?height:\s*20px;/);
        expect(css).toMatch(/\.messenger-window \.messenger-minimize:hover,[^}]*background-position:\s*-52px 0;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-minimize:active,[^}]*background-position:\s*-26px 0;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-btn\.close-btn\s*\{[^}]*border-image-source:\s*none;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-btn\.danger\s*\{[^}]*flex:\s*1 1 auto;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-avatar-tab\.unread::after\s*\{[^}]*width:\s*13px;[^}]*height:\s*12px;/s);
        expect(css).toContain('chat-indicator.svg');
    });

    it('styles every contextual message and Habbicon surface locally', () => {
        expect(css).toContain('.messenger-window .messenger-notification');
        expect(css).toContain('.messenger-window .messenger-status-notification');
        expect(css).toContain('.messenger-window .messenger-habbicon-picker');
        expect(css).toContain('.messenger-window .messenger-habbicon-grid');
        expect(css).toContain('.messenger-window .messenger-habbicon-message');
    });

    it('uses the Illumina chat-bubble geometry and exact frame assets', () => {
        expect(css).toMatch(/\.messenger-window \.messenger-message-row\s*\{[^}]*width:\s*259px;/s);
        expect(css).toMatch(/\.messenger-window \.message-avatar\s*\{[^}]*width:\s*52px;[^}]*height:\s*56px;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-message-body\s*\{[^}]*flex:\s*0 0 207px;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-message-bubble\s*\{[^}]*chat-bubble-frame\.svg/s);
        expect(css).toMatch(/\.messenger-window \.messenger-message-bubble::after\s*\{[^}]*chat-bubble-arrow\.svg/s);
        expect(existsSync(join(process.cwd(), 'src/assets/images/friends/chat-bubble-frame.svg'))).toBe(true);
        expect(existsSync(join(process.cwd(), 'src/assets/images/friends/chat-bubble-arrow.svg'))).toBe(true);
    });

    it('uses the AIR Ubuntu regular and bold faces instead of the global condensed alias', () => {
        expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*MessengerUbuntu;[^}]*Ubuntu\.ttf[^}]*font-weight:\s*400;/s);
        expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*MessengerUbuntu;[^}]*Ubuntu-b\.ttf[^}]*font-weight:\s*700;/s);
        expect(css).toMatch(/\.messenger-window\s*\{[^}]*font-family:\s*MessengerUbuntu,/s);
        expect(css).not.toMatch(/\.messenger-window\s*\{[^}]*font-family:\s*Ubuntu,/s);
    });

    it('keeps the stable raster border for every button interaction state', () => {
        expect(css).toMatch(/\.messenger-window \.messenger-btn\s*\{[^}]*border-image:[^;]*5 fill stretch;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-btn:hover\s*\{[^}]*border-image:[^;]*5 fill stretch;/s);
        expect(css).toMatch(/\.messenger-window \.messenger-btn:active\s*\{[^}]*border-image:[^;]*5 fill stretch;/s);
    });
});
