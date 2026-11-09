import { describe, expect, it } from 'vitest';
import { resolveGameFrame } from './resolveGameFrame';

const CLIENT = 'https://hotel.example';

describe('resolveGameFrame', () => {
    it('refuses a URL that would run in the client origin', () => {
        expect(resolveGameFrame('javascript:alert(document.cookie)', [], CLIENT)).toBeNull();
        expect(resolveGameFrame('data:text/html,<script>1</script>', [], CLIENT)).toBeNull();
        expect(resolveGameFrame('', [], CLIENT)).toBeNull();
    });

    it('keeps to the hosts the hotel lists, when it lists any', () => {
        expect(resolveGameFrame('https://games.example/play', ['games.example'], CLIENT)?.src).toBe('https://games.example/play');
        expect(resolveGameFrame('https://elsewhere.example/play', ['games.example'], CLIENT)).toBeNull();
        expect(resolveGameFrame('https://elsewhere.example/play', [], CLIENT)?.src).toBe('https://elsewhere.example/play');
    });

    it('sandboxes the frame and keeps the client storage away from a same-origin game', () => {
        expect(resolveGameFrame('https://games.example/play', [], CLIENT)?.sandbox).toBe(
            'allow-scripts allow-forms allow-pointer-lock allow-popups allow-same-origin'
        );
        expect(resolveGameFrame('https://hotel.example/games/play', [], CLIENT)?.sandbox).toBe('allow-scripts allow-forms allow-pointer-lock allow-popups');
    });
});
