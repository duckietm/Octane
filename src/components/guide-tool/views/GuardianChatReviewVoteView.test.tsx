/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_REVIEW_VOTE_BAD, CHAT_REVIEW_VOTE_OK, CHAT_REVIEW_VOTE_VERY_BAD, parseChatReviewRecord } from '../../../api/guide-tool/ChatReviewUtilities';

vi.mock('../../../api', () => ({
    CHAT_REVIEW_VOTE_OK,
    CHAT_REVIEW_VOTE_BAD,
    CHAT_REVIEW_VOTE_VERY_BAD,
    FriendlyTime: { format: (seconds: number) => `${Math.round(seconds)} seconds ago` },
    localizeWithFallback: (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) => {
        let text = fallback;

        (parameters ?? []).forEach((parameter, index) => (text = text.replace(`%${parameter}%`, replacements[index])));

        return text;
    },
    parseChatReviewRecord
}));

import { GuardianChatReviewVoteView } from './GuardianChatReviewVoteView';

const RECORD = '2026 09 08 12 00 00;\runused;0;you are stupid\runused;0;go away\runused;2;stop it\r';

describe('GuardianChatReviewVoteView', () => {
    afterEach(cleanup);

    it('shows the anonymised chat log grouped by user and sends the chosen vote', () => {
        const onVote = vi.fn();
        const onClose = vi.fn();

        render(<GuardianChatReviewVoteView chatRecord={RECORD} votingTimeout={120} waitingForVoters={false} onClose={onClose} onVote={onVote} />);

        expect(screen.getByText('SUSPECT:')).toBeInTheDocument();
        expect(screen.getByText('USER 2:')).toBeInTheDocument();
        expect(screen.getByText('you are stupid')).toBeInTheDocument();
        expect(screen.getByText('go away')).toBeInTheDocument();
        expect(screen.getByText('stop it')).toBeInTheDocument();
        expect(screen.getByTitle('countdown')).toHaveTextContent('120');

        fireEvent.click(screen.getByRole('button', { name: 'BULLYING' }));
        expect(onVote).toHaveBeenCalledWith(CHAT_REVIEW_VOTE_BAD);

        fireEvent.click(screen.getByRole('button', { name: 'SEVERE' }));
        expect(onVote).toHaveBeenLastCalledWith(CHAT_REVIEW_VOTE_VERY_BAD);

        fireEvent.click(screen.getByText("I can't decide based on this chat log"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the votes disabled while the other guardians are still joining', () => {
        const onVote = vi.fn();

        render(<GuardianChatReviewVoteView chatRecord="" votingTimeout={0} waitingForVoters onClose={vi.fn()} onVote={onVote} />);

        expect(screen.getByText('Waiting for other Guardians to join the case...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'OK' }));
        expect(onVote).not.toHaveBeenCalled();
    });
});
