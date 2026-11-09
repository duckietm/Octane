import { describe, expect, it } from 'vitest';
import { decodeWiredMenuPreferences } from './WiredMenuPreferences';

describe('decodeWiredMenuPreferences', () => {
    it('reads what the server stored', () => {
        expect(decodeWiredMenuPreferences('1,0,0,1,volter')).toEqual({
            showToolbarButton: true,
            showInspectButton: false,
            playTestMode: false,
            showSystemNotifications: true,
            wiredStyle: 'volter'
        });
    });

    it('has nothing before the user saved once, and keeps unknown styles to the default', () => {
        expect(decodeWiredMenuPreferences('')).toBeNull();
        expect(decodeWiredMenuPreferences('1,1,0,0,neon')?.wiredStyle).toBe('');
        // The official default is stored as an empty style.
        expect(decodeWiredMenuPreferences('1,1,0,0,')?.wiredStyle).toBe('');
    });
});
