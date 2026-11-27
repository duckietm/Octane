import { cleanup, fireEvent, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        LocalizeBadgeDescription: () => 'Read the Habbo Way.',
        LocalizeBadgeName: (badgeCode: string) => badgeCode,
        localizeWithFallback: (key: string, fallback: string) => {
            if (key.endsWith('.description')) return 'Open the Habbo Way from the help.';

            if (key.endsWith('.link')) return 'Show me';

            return fallback;
        }
    };
});

vi.mock('../../common', () => ({
    AirModalDialog: ({ children, className, frameStyle }: PropsWithChildren<{ className: string; frameStyle?: number }>) => (
        <div className={className} data-frame={frameStyle}>
            {children}
        </div>
    ),
    LayoutAvatarImageView: () => <div />,
    LayoutBadgeImageView: () => <div />
}));

import { TALENT_STATE_IN_PROGRESS } from '../../api';
import { TalentTaskDialogView } from './TalentTaskDialogView';

afterEach(cleanup);

const task = (badgeCode: string, currentScore: number, totalScore: number) => ({ id: 7, requiredLevel: 0, badgeCode, state: TALENT_STATE_IN_PROGRESS, currentScore, totalScore });

describe('TalentTaskDialogView', () => {
    it('shows the task in the AIR frame with the hint box, the task bar and the score', () => {
        const { container } = render(<TalentTaskDialogView task={task('ACH_GuideFeedbackGiver1', 2, 5)} trackName="helper" onAction={vi.fn()} onClose={vi.fn()} />);

        expect(container.querySelector('.octane-talent-dialog')).toHaveAttribute('data-frame', '3');
        expect(container.querySelector('.octane-talent-dialog__hint-text')?.textContent).toBe('Open the Habbo Way from the help.');
        expect(container.querySelector('.octane-talent-dialog__progress .octane-reward-track-mini-bar')).toBeTruthy();
        expect(container.querySelector('.octane-talent-dialog__score')?.textContent).toBe('Your progress: 2/5');
    });

    it('runs the task action from its button, a one-off task has no score', () => {
        const onAction = vi.fn();
        const habboWay = task('ACH_HabboWayGraduate1', 0, 1);
        const { container, getByRole } = render(<TalentTaskDialogView task={habboWay} trackName="citizenship" onAction={onAction} onClose={vi.fn()} />);

        expect(container.querySelector('.octane-talent-dialog__progress')).toBeNull();

        fireEvent.click(getByRole('button', { name: 'Show me' }));

        expect(onAction).toHaveBeenCalledWith(habboWay);
    });
});
