import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    send: vi.fn(),
    link: vi.fn(),
    roomSession: { roomId: 1 } as { roomId: number } | null,
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('../../../api', () => ({
    SendMessageComposer: mocks.send,
    CreateLinkEvent: mocks.link
}));

vi.mock('../../events', () => ({
    useMessageEvent: (event: unknown, handler: (event: unknown) => void) => {
        mocks.handlers.set(event, handler);
    }
}));

vi.mock('../useRoom', () => ({
    useRoom: () => ({ roomSession: mocks.roomSession })
}));

vi.mock('@octane/renderer', () => ({
    CompetitionEntrySubmitResultEvent: class {},
    CompetitionVotingInfoMessageEvent: class {},
    NoOwnedRoomsAlertMessageEvent: class {},
    ForwardToASubmittableRoomMessageComposer: class {},
    CompetitionRoomsSearchMessageComposer: class CompetitionRoomsSearchMessageComposer {
        constructor(
            public goalId: number,
            public pageIndex: number
        ) {}
    },
    RoomCompetitionInitMessageComposer: class RoomCompetitionInitMessageComposer {},
    SubmitRoomToCompetitionMessageComposer: class SubmitRoomToCompetitionMessageComposer {
        constructor(
            public goalCode: string,
            public level: number
        ) {}
    },
    VoteForRoomMessageComposer: class VoteForRoomMessageComposer {
        constructor(public goalCode: string) {}
    }
}));

import {
    CompetitionEntrySubmitResultEvent,
    CompetitionRoomsSearchMessageComposer,
    RoomCompetitionInitMessageComposer,
    SubmitRoomToCompetitionMessageComposer
} from '@octane/renderer';
import { COMPETITION_LEVEL_CONFIRM, useRoomCompetition } from './useRoomCompetition';

let hook: ReturnType<typeof useRoomCompetition> = null;

const Harness = () => {
    hook = useRoomCompetition();

    return null;
};

const submitResult = (result: number, requiredFurnis: string[] = [], missing: string[] = []) => ({
    getParser: () => ({
        goalId: 7,
        goalCode: 'spring',
        result,
        requiredFurnis,
        isMissing: (name: string) => missing.indexOf(name) !== -1
    })
});

describe('useRoomCompetition', () => {
    beforeEach(() => {
        mocks.send.mockClear();
        mocks.handlers.clear();
        mocks.roomSession = { roomId: 1 };
        window.localStorage.clear();
    });

    it('asks the hotel on room entry', () => {
        render(<Harness />);

        expect(mocks.send).toHaveBeenCalledTimes(1);
        expect(mocks.send.mock.calls[0][0]).toBeInstanceOf(RoomCompetitionInitMessageComposer);
    });

    it('stops asking for the day once the visitor said so', () => {
        render(<Harness />);
        mocks.send.mockClear();

        act(() => hook.hideForToday());
        render(<Harness />);

        expect(mocks.send).not.toHaveBeenCalled();
    });

    it('keeps the furniture the room still lacks apart from the whole list', () => {
        render(<Harness />);

        act(() => mocks.handlers.get(CompetitionEntrySubmitResultEvent)(submitResult(3, ['chair', 'table'], ['table'])));

        expect(hook.competition.mode).toBe('submit');
        expect(hook.competition.requiredFurnis).toEqual(['chair', 'table']);
        expect(hook.competition.missingFurnis).toEqual(['table']);
    });

    it('confirms with the level the official window uses', () => {
        render(<Harness />);

        act(() => mocks.handlers.get(CompetitionEntrySubmitResultEvent)(submitResult(2)));
        mocks.send.mockClear();
        hook.confirmSubmit();

        const composer = mocks.send.mock.calls[0][0] as SubmitRoomToCompetitionMessageComposer & { goalCode: string; level: number };

        expect(composer).toBeInstanceOf(SubmitRoomToCompetitionMessageComposer);
        expect(composer.goalCode).toBe('spring');
        expect(composer.level).toBe(COMPETITION_LEVEL_CONFIRM);
    });

    it('sends nothing without a competition', () => {
        render(<Harness />);
        mocks.send.mockClear();

        hook.confirmSubmit();
        hook.vote();

        expect(mocks.send).not.toHaveBeenCalled();
    });
    it('asks for the participants of the competition the window is about, from the first page', () => {
        render(<Harness />);
        act(() => mocks.handlers.get(CompetitionEntrySubmitResultEvent)(submitResult(1)));
        mocks.send.mockClear();
        mocks.link.mockClear();

        act(() => hook.showParticipants());

        const composer = mocks.send.mock.calls[0][0] as { goalId: number; pageIndex: number };

        expect(composer).toBeInstanceOf(CompetitionRoomsSearchMessageComposer);
        expect(composer.goalId).toBe(7);
        expect(composer.pageIndex).toBe(0);
        expect(mocks.link).toHaveBeenCalledWith('navigator/show');
    });
});
