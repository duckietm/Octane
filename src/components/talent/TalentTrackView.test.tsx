import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        LocalizeBadgeDescription: () => 'Rate %limit% Helpers.',
        localizeWithFallback: (key: string, fallback: string) =>
            key === 'talent.track.helper.guide.begin.description' ? 'Help others.<br><br>You are on your way.' : fallback
    };
});

vi.mock('../../common', () => ({
    AirModalDialog: ({ children }: PropsWithChildren) => <div>{children}</div>,
    LayoutAvatarImageView: () => <div />,
    LayoutBadgeImageView: () => <div />
}));

vi.mock('../help/habbo-way/HabboWayPagerView', () => ({ LibraryImageView: () => <div /> }));

import { getTalentTaskInstruction, TalentTrackView, talentProgressPosition } from './TalentTrackView';

afterEach(cleanup);

describe('TalentTrackView', () => {
    it('draws the begin text as AIR formatted text, so <br> breaks the line', () => {
        const { container } = render(
            <TalentTrackView track={{ name: 'helper', levels: [] } as any} onClose={vi.fn()} onOpenTrack={vi.fn()} onSelectTask={vi.fn()} />
        );
        const text = container.querySelector('.octane-talent-begin__text');

        expect(text?.querySelectorAll('br')).toHaveLength(2);
        expect(text?.textContent).toBe('Help others.You are on your way.');
    });

    it('places the progress needle inside the inset AIR keeps at both ends of the bar', () => {
        expect(talentProgressPosition(0)).toBe('calc(52px + (100% - 104px) * 0)');
        expect(talentProgressPosition(0.5)).toBe('calc(52px + (100% - 104px) * 0.5)');
        expect(talentProgressPosition(2)).toBe('calc(52px + (100% - 104px) * 1)');
    });

    it('fills the %limit% the badge texts leave open with the task goal', () => {
        expect(getTalentTaskInstruction('ACH_GuideFeedbackGiver1', 5)).toBe('Rate 5 Helpers.');
        expect(getTalentTaskInstruction('ACH_GuideFeedbackGiver1')).toBe('Rate %limit% Helpers.');
    });
});
