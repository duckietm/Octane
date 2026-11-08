/* @vitest-environment jsdom */
import { GetLocalizationManager } from '@octane/renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SanitizeHtml } from '../../api';
import { chestNotificationText } from './useNotification';

describe('chest notification text', () => {
    // The real manager replaces each %parameter% with its value, as the hotel texts do.
    beforeEach(() => {
        vi.mocked(GetLocalizationManager).mockReturnValue({
            getValueWithParameters: (key: string, parameters: string[] = [], replacements: string[] = []) =>
                (parameters ?? []).reduce(
                    (text, parameter, index) => text.replace(`%${parameter}%`, replacements[index]),
                    key === 'chest.text' ? '%name% filled %chest% with %amount%' : key
                )
        } as never);
    });

    it('keeps the chest and actor names as text in the HTML bubble', () => {
        const text = chestNotificationText('chest.text', '<a href="https://evil.example">Win</a>', '<img src=x>', 3);
        const container = document.createElement('div');

        container.innerHTML = SanitizeHtml(text);

        expect(container.querySelector('a, img')).toBeNull();
        expect(container.textContent).toBe('<img src=x> filled <a href="https://evil.example">Win</a> with 3');
    });

    it('names an unnamed chest with the fallback text', () => {
        expect(chestNotificationText('chest.text', '', 'someone', 1)).toBe('someone filled wiredchests.notification.unnamed with 1');
    });
});
