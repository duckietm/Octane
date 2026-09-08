import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PollOfferView } from './PollOfferView';
import { PollQuestionView } from './PollQuestionView';
import { POLL_QUESTION_TYPE_CHECKBOX, POLL_QUESTION_TYPE_RADIO, POLL_QUESTION_TYPE_TEXT_LINE } from './pollQuestionFlow';

vi.mock('../../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button disabled={disabled} type="button" onClick={onClick}>
            {children}
        </button>
    ),
    OctaneCardView: ({ children }: any) => <div>{children}</div>,
    OctaneCardHeaderView: ({ headerText, onCloseClick }: any) => (
        <div>
            <span>{headerText}</span>
            <button aria-label="close" type="button" onClick={onCloseClick} />
        </div>
    ),
    OctaneCardContentView: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../../../../hooks', () => ({}));

afterEach(cleanup);

const question = (questionId: number, questionType: number, choices: string[] = [], extra: Record<string, unknown> = {}) => ({
    questionId,
    questionType,
    sortOrder: questionId,
    questionText: `question ${questionId}`,
    questionCategory: 0,
    questionAnswerType: 0,
    questionAnswerCount: 0,
    children: [],
    questionChoices: choices.map((value, index) => ({ value, choiceText: `choice ${value}`, choiceType: index + 1 })),
    ...extra
});

const contentSession = (questions: any[], npsPoll = false) => ({
    id: 7,
    stage: 'content' as const,
    offerState: 'ok' as const,
    headline: 'Headline',
    summary: 'Summary',
    startMessage: 'Tell us',
    endMessage: 'Bye',
    questions,
    npsPoll
});

describe('PollQuestionView', () => {
    it('walks radio, checkbox and text questions, sending each answer and finishing after the last one', () => {
        const onAnswer = vi.fn();
        const onFinished = vi.fn();
        const session = contentSession([
            question(1, POLL_QUESTION_TYPE_RADIO, ['a', 'b']),
            question(2, POLL_QUESTION_TYPE_CHECKBOX, ['x', 'y', 'z']),
            question(3, POLL_QUESTION_TYPE_TEXT_LINE)
        ]);

        render(<PollQuestionView session={session as any} onAnswer={onAnswer} onCancel={() => null} onFinished={onFinished} />);

        expect(screen.getByTestId('poll-question-headline').textContent).toBe('Tell us');
        expect(screen.getByTestId('poll-question-text').textContent).toBe('question 1');
        expect(screen.getByTestId('poll-question-number').textContent).toBe('Question 1/3');

        fireEvent.click(screen.getByLabelText('choice b'));
        fireEvent.click(screen.getByText('OK'));

        expect(onAnswer).toHaveBeenLastCalledWith(7, 1, ['b']);
        expect(screen.getByTestId('poll-question-text').textContent).toBe('question 2');
        expect(screen.getByTestId('poll-question-number').textContent).toBe('Question 2/3');

        fireEvent.click(screen.getByLabelText('choice z'));
        fireEvent.click(screen.getByLabelText('choice x'));
        fireEvent.click(screen.getByText('OK'));

        expect(onAnswer).toHaveBeenLastCalledWith(7, 2, ['x', 'z']);
        expect(screen.getByTestId('poll-question-text').textContent).toBe('question 3');

        fireEvent.change(screen.getByLabelText('question 3'), { target: { value: 'free text' } });
        fireEvent.click(screen.getByText('OK'));

        expect(onAnswer).toHaveBeenLastCalledWith(7, 3, ['free text']);
        expect(onFinished).toHaveBeenCalledWith(7);
    });

    it('shows the NPS follow-up that matches the chosen answer and counts it', () => {
        const onAnswer = vi.fn();
        const followUp = question(10, POLL_QUESTION_TYPE_TEXT_LINE, [], { questionCategory: 2, questionText: 'why?' });
        const session = contentSession(
            [question(1, POLL_QUESTION_TYPE_RADIO, ['a', 'b'], { children: [followUp] }), question(2, POLL_QUESTION_TYPE_RADIO, ['c'])],
            true
        );

        render(<PollQuestionView session={session as any} onAnswer={onAnswer} onCancel={() => null} onFinished={() => null} />);

        expect(screen.getByTestId('poll-question-number').textContent).toBe('Question 1/3');

        // choice "b" carries choiceType 2, the follow-up's category
        fireEvent.click(screen.getByLabelText('choice b'));
        fireEvent.click(screen.getByText('OK'));

        expect(screen.getByTestId('poll-question-text').textContent).toBe('why?');
        expect(screen.getByTestId('poll-question-number').textContent).toBe('Question 2/3');

        fireEvent.click(screen.getByText('OK'));

        expect(onAnswer).toHaveBeenLastCalledWith(7, 10, ['']);
        expect(screen.getByTestId('poll-question-text').textContent).toBe('question 2');
    });

    it('asks before cancelling and only cancels on OK', () => {
        const onCancel = vi.fn();
        const session = contentSession([question(1, POLL_QUESTION_TYPE_RADIO, ['a'])]);

        render(<PollQuestionView session={session as any} onAnswer={() => null} onCancel={onCancel} onFinished={() => null} />);

        fireEvent.click(screen.getByText('Cancel'));

        expect(screen.getByText('Stop answering?')).toBeTruthy();

        // the confirm's own Cancel keeps the poll
        fireEvent.click(screen.getAllByText('Cancel')[1]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.queryByText('Stop answering?')).toBeNull();

        fireEvent.click(screen.getByLabelText('close'));
        fireEvent.click(screen.getAllByText('OK')[1]);

        expect(onCancel).toHaveBeenCalledWith(7);
    });
});

describe('PollOfferView', () => {
    const offerSession = (offerState: 'unknown' | 'ok' | 'cancel' = 'unknown') => ({
        id: 3,
        stage: 'offer' as const,
        offerState,
        headline: 'A question for you',
        summary: 'Two minutes',
        startMessage: '',
        endMessage: '',
        questions: [],
        npsPoll: false
    });

    it('accepts, rejects (also from the close button) or postpones', () => {
        const onAccept = vi.fn();
        const onReject = vi.fn();
        const onLater = vi.fn();

        render(<PollOfferView session={offerSession() as any} onAccept={onAccept} onLater={onLater} onReject={onReject} />);

        expect(screen.getByTestId('poll-offer-headline').textContent).toBe('A question for you');
        expect(screen.getByTestId('poll-offer-summary').textContent).toBe('Two minutes');

        fireEvent.click(screen.getByText('Later...'));
        expect(onLater).toHaveBeenCalledWith(3);

        fireEvent.click(screen.getByText('Cancel...'));
        expect(onReject).toHaveBeenCalledWith(3);

        fireEvent.click(screen.getByLabelText('close'));
        expect(onReject).toHaveBeenCalledTimes(2);

        fireEvent.click(screen.getByText('OK'));
        expect(onAccept).toHaveBeenCalledWith(3);
    });

    it('ignores every button once the offer was answered', () => {
        const onAccept = vi.fn();
        const onReject = vi.fn();

        render(<PollOfferView session={offerSession('ok') as any} onAccept={onAccept} onLater={() => null} onReject={onReject} />);

        fireEvent.click(screen.getByText('OK'));
        fireEvent.click(screen.getByLabelText('close'));

        expect(onAccept).not.toHaveBeenCalled();
        expect(onReject).not.toHaveBeenCalled();
    });
});
