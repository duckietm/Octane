import { StartCampaignMessageComposer } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn(), config: new Map<string, unknown>() }));

vi.mock('../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => mocks.config.get(key) ?? fallback,
    GetOptionalConfigurationValue: (key: string, fallback: unknown) => mocks.config.get(key) ?? fallback,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: mocks.send
}));

vi.mock('../../../hooks/events', () => ({ useMessageEvent: vi.fn() }));

vi.mock('../../talent/TalentImageView', () => ({ TalentImageView: () => null }));

import { isVipQuestsPromoEnabled, VipQuestsPromoView } from './VipQuestsPromoView';

describe('VipQuestsPromoView', () => {
    afterEach(cleanup);

    beforeEach(() => {
        mocks.send.mockClear();
        mocks.config.clear();
    });

    it('is off unless the hotel switches it on', () => {
        expect(isVipQuestsPromoEnabled()).toBe(false);

        mocks.config.set('citizenship.vip.quest.promotion.enabled', true);

        expect(isVipQuestsPromoEnabled()).toBe(true);
    });

    it('starts the configured campaign and closes', () => {
        mocks.config.set('citizenship.vip.tutorial.quest.campaign.name', 'hc_tutorial');

        const onClose = vi.fn();

        render(<VipQuestsPromoView onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start!' }));

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(StartCampaignMessageComposer);
        expect(mocks.send.mock.calls[0][0].campaignName).toBe('hc_tutorial');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes without a packet when no campaign is configured', () => {
        const onClose = vi.fn();

        render(<VipQuestsPromoView onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'Start!' }));

        expect(mocks.send).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('folds to its title bar', () => {
        render(<VipQuestsPromoView onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Minimize' }));

        expect(screen.queryByRole('button', { name: 'Start!' })).toBeNull();
        expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });
});
