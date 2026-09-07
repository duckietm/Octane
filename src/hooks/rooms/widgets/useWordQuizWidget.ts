import { AvatarAction, GetRoomEngine, IQuestion, RoomSessionWordQuizEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { VoteValue } from '../../../api';
import { useOctaneEvent } from '../../events';
import { useRoom } from '../useRoom';
import { usePollActions } from './usePollActions';

const DEFAULT_DISPLAY_DELAY = 4000;
const SIGN_FADE_DELAY = 3;

const useWordQuizWidgetState = () => {
    const [pollId, setPollId] = useState(-1);
    const [question, setQuestion] = useState<IQuestion>(null);
    const [answerSent, setAnswerSent] = useState(false);
    const [answerCounts, setAnswerCounts] = useState<Map<string, number>>(new Map());
    const [userAnswers, setUserAnswers] = useState<Map<number, VoteValue>>(new Map());
    // The question-clear timeout is a side-channel handle, not display
    // state — storing it in a ref avoids a re-render every time we
    // (re)schedule it and lets the cleanup effect read the *latest*
    // handle on unmount instead of the closed-over one.
    const questionClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { answerPoll } = usePollActions();
    const { roomSession = null } = useRoom();

    const clearQuestion = () => {
        setPollId(-1);
        setQuestion(null);
    };

    const scheduleQuestionClear = (delay: number) => {
        if (questionClearTimeoutRef.current) clearTimeout(questionClearTimeoutRef.current);

        questionClearTimeoutRef.current = setTimeout(() => {
            questionClearTimeoutRef.current = null;
            clearQuestion();
        }, delay);
    };

    const vote = (vote: string) => {
        if (answerSent || !question) return;

        answerPoll(pollId, question.id, [vote]);

        setAnswerSent(true);
    };

    useOctaneEvent<RoomSessionWordQuizEvent>(RoomSessionWordQuizEvent.ANSWERED, (event) => {
        const userData = roomSession.userDataManager.getUserData(event.userId);

        if (!userData) return;

        setAnswerCounts(event.answerCounts);

        setUserAnswers((prevValue) => {
            // Bug fix: previously this read the closure-captured `userAnswers`
            // (which was stale by one render) instead of `prevValue`, so
            // rapid successive ANSWERED events for different users could
            // overwrite each other. Use prevValue.
            if (prevValue.has(userData.roomIndex)) return prevValue;

            const next = new Map(prevValue);
            next.set(userData.roomIndex, { value: event.value, secondsLeft: SIGN_FADE_DELAY });
            return next;
        });

        GetRoomEngine().updateRoomObjectUserGesture(
            roomSession.roomId,
            userData.roomIndex,
            AvatarAction.getGestureId(event.value === '0' ? AvatarAction.GESTURE_SAD : AvatarAction.GESTURE_SMILE)
        );
    });

    useOctaneEvent<RoomSessionWordQuizEvent>(RoomSessionWordQuizEvent.FINISHED, (event) => {
        if (question && question.id === event.questionId) {
            setAnswerCounts(event.answerCounts);
            setAnswerSent(true);

            scheduleQuestionClear(DEFAULT_DISPLAY_DELAY);
        }

        setUserAnswers(new Map());
    });

    useOctaneEvent<RoomSessionWordQuizEvent>(RoomSessionWordQuizEvent.QUESTION, (event) => {
        setPollId(event.id);
        setQuestion(event.question);
        setAnswerSent(false);
        setAnswerCounts(new Map());
        setUserAnswers(new Map());

        if (event.duration > 0) {
            const delay = event.duration < 1000 ? DEFAULT_DISPLAY_DELAY : event.duration;
            scheduleQuestionClear(delay);
        } else if (questionClearTimeoutRef.current) {
            clearTimeout(questionClearTimeoutRef.current);
            questionClearTimeoutRef.current = null;
        }
    });

    useEffect(() => {
        const tick = () => {
            setUserAnswers((prevValue) => {
                if (prevValue.size === 0) return prevValue;

                // Build new value objects + a new Map — don't decrement
                // secondsLeft on the objects still referenced by prevValue
                // (in-place mutation breaks memoization / StrictMode replay).
                const next = new Map(prevValue);

                next.forEach((value, key) => {
                    const secondsLeft = value.secondsLeft - 1;

                    if (secondsLeft <= 0) next.delete(key);
                    else next.set(key, { ...value, secondsLeft });
                });

                return next;
            });
        };

        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(
        () => () => {
            if (questionClearTimeoutRef.current) {
                clearTimeout(questionClearTimeoutRef.current);
                questionClearTimeoutRef.current = null;
            }
        },
        []
    );

    return { question, answerSent, answerCounts, userAnswers, vote };
};

export const useWordQuizWidget = useWordQuizWidgetState;
