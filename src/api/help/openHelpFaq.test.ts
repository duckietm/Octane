import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    createLink: vi.fn(),
    config: vi.fn()
}));

vi.mock('../octane/CreateLinkEvent', () => ({ CreateLinkEvent: mocks.createLink }));
vi.mock('../octane/GetConfigurationValue', () => ({ GetConfigurationValue: mocks.config }));

import { FAQ_HABBOPAGE_LINK, openHelpFaq } from './openHelpFaq';

describe('openHelpFaq', () => {
    beforeEach(() => {
        mocks.createLink.mockClear();
        mocks.config.mockReset();
        vi.spyOn(window, 'open').mockImplementation(() => null);
    });

    it('opens the hotel external FAQ when one is configured', () => {
        mocks.config.mockReturnValue('https://example.test/faq');

        openHelpFaq();

        expect(window.open).toHaveBeenCalledWith('https://example.test/faq', '_blank', 'noopener,noreferrer');
        expect(mocks.createLink).not.toHaveBeenCalled();
    });

    it('falls back to the habbopage when nothing is configured', () => {
        mocks.config.mockReturnValue('');

        openHelpFaq();

        expect(mocks.createLink).toHaveBeenCalledWith(FAQ_HABBOPAGE_LINK);
        expect(window.open).not.toHaveBeenCalled();
    });

    it('refuses anything that is not a web address', () => {
        for (const value of ['javascript:alert(1)', 'not a url', 'file:///etc/passwd']) {
            mocks.config.mockReturnValue(value);
            mocks.createLink.mockClear();

            openHelpFaq();

            expect(mocks.createLink).toHaveBeenCalledWith(FAQ_HABBOPAGE_LINK);
        }

        expect(window.open).not.toHaveBeenCalled();
    });
});
