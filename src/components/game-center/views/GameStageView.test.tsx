/* @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStageView } from './GameStageView';

const state = vi.hoisted(() => ({ gameURL: '' as string | null }));

vi.mock('../../../hooks', () => ({ useGameCenter: () => ({ gameURL: state.gameURL, setGameURL: vi.fn() }) }));
vi.mock('../../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../api')>()),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    SendMessageComposer: vi.fn()
}));

describe('GameStageView', () => {
    beforeEach(() => {
        state.gameURL = null;
    });

    it('never frames a javascript: URL from the server', () => {
        state.gameURL = 'javascript:alert(1)';
        const { container } = render(<GameStageView />);

        expect(container.querySelector('iframe')).toBeNull();
    });

    it('frames a web game sandboxed and without a referrer', () => {
        state.gameURL = 'https://games.example/play';
        const { container } = render(<GameStageView />);
        const frame = container.querySelector('iframe');

        expect(frame?.getAttribute('src')).toBe('https://games.example/play');
        expect(frame?.getAttribute('sandbox')).toContain('allow-scripts');
        expect(frame?.referrerPolicy).toBe('no-referrer');
    });
});
