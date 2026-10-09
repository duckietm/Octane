import {
    CompetitionEntrySubmitResultEvent,
    CompetitionVotingInfoMessageEvent,
    GetGuestRoomResultEvent,
    GetSessionDataManager,
    RoomCompetitionInitMessageComposer,
    SubmitRoomToCompetitionMessageComposer,
    VoteForRoomMessageComposer
} from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useRoom } from '../../../../hooks';

type CompetitionMode = 'submit' | 'vote';

interface CompetitionState {
    mode: CompetitionMode;
    goalCode: string;
    result: number;
    votesLeft: number;
    canVote: boolean;
    required: { name: string; missing: boolean }[];
}

const HIDE_KEY = 'octane.roomcompetition.hidden';

// Habbo's texts carry <b>/<u> markup; show them as plain text.
const plain = (text: string) => (text ?? '').replace(/<[^>]*>/g, '');

const todayKey = () => new Date().toISOString().slice(0, 10);

const isHiddenToday = (mode: CompetitionMode) => {
    try {
        return window.localStorage.getItem(`${HIDE_KEY}.${mode}`) === todayKey();
    } catch {
        return false;
    }
};

const hideToday = (mode: CompetitionMode) => {
    try {
        window.localStorage.setItem(`${HIDE_KEY}.${mode}`, todayKey());
    } catch {
        // Private mode: it just shows again next time.
    }
};

/** Next submit level for each submit result: rules accepted, ask to submit, confirm. */
const NEXT_SUBMIT_LEVEL: Record<number, number> = { 6: 1, 1: 2, 2: 3 };
const SUBMIT_RESULT_DONE = 0;
const SUBMIT_RESULT_MISSING_FURNI = 3;

export const RoomCompetitionView: FC = () => {
    const [state, setState] = useState<CompetitionState>(null);
    const { roomSession = null } = useRoom();

    useMessageEvent<GetGuestRoomResultEvent>(GetGuestRoomResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser.roomEnter || !roomSession || parser.data.roomId !== roomSession.roomId) return;

        setState(null);
        SendMessageComposer(new RoomCompetitionInitMessageComposer());
    });

    useMessageEvent<CompetitionEntrySubmitResultEvent>(CompetitionEntrySubmitResultEvent, (event) => {
        const parser = event.getParser();

        if (!parser || isHiddenToday('submit')) return;

        setState({
            mode: 'submit',
            goalCode: parser.goalCode,
            result: parser.result,
            votesLeft: 0,
            canVote: false,
            required: (parser.requiredFurnis ?? []).map((name) => ({ name, missing: parser.isMissing(name) }))
        });
    });

    useMessageEvent<CompetitionVotingInfoMessageEvent>(CompetitionVotingInfoMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || isHiddenToday('vote')) return;

        setState({
            mode: 'vote',
            goalCode: parser.goalCode,
            result: parser.resultCode,
            votesLeft: parser.votesRemaining,
            canVote: parser.isVotingAllowedForUser,
            required: []
        });
    });

    if (!state) return null;

    const competitionName = localizeWithFallback(`roomcompetition.${state.goalCode}.name`, state.goalCode);
    const textKey = (part: string) => (state.mode === 'submit' ? `roomcompetition.${part}.submit.${state.result}` : (state.canVote ? `roomcompetition.${part}.vote` : `roomcompetition.${part}.vote.${state.result}`));
    const caption = plain(localizeWithFallback(textKey('caption'), localizeWithFallback(`roomcompetition.caption.${state.mode}`, competitionName), ['competition_name'], [competitionName]));
    const info = plain(localizeWithFallback(textKey('info'), ''));
    const nextLevel = NEXT_SUBMIT_LEVEL[state.result];

    const onAction = () => {
        if (state.mode === 'vote') {
            SendMessageComposer(new VoteForRoomMessageComposer(state.goalCode));
            setState({ ...state, votesLeft: Math.max(0, state.votesLeft - 1) });

            return;
        }

        if (state.result === SUBMIT_RESULT_DONE) {
            setState(null);

            return;
        }

        if (nextLevel !== undefined) SendMessageComposer(new SubmitRoomToCompetitionMessageComposer(state.goalCode, nextLevel));
    };

    const showButton = state.mode === 'vote' ? state.canVote && state.votesLeft > 0 : (nextLevel !== undefined || state.result === SUBMIT_RESULT_DONE);
    const buttonText = state.mode === 'vote'
        ? localizeWithFallback('roomcompetition.button.vote', 'Vote')
        : localizeWithFallback(`roomcompetition.button.submit.${state.result}`, 'OK');

    const close = (forToday: boolean) => {
        if (forToday) hideToday(state.mode);
        setState(null);
    };

    return (
        <div className="octane-room-competition absolute top-[10px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[420px] max-w-[calc(100vw-16px)] rounded-md bg-[rgba(34,34,30,0.92)] text-white px-3 py-2 shadow-lg">
            <div className="flex items-start gap-2">
                <div className="grow min-w-0">
                    <div className="font-bold text-[13px]">{caption}</div>
                    {info && <div className="text-[11px] opacity-80 mt-0.5">{info}</div>}
                    {state.mode === 'submit' && state.result === SUBMIT_RESULT_MISSING_FURNI && state.required.length > 0 && (
                        <div className="mt-1 text-[11px]">
                            <div className="opacity-80">{plain(localizeWithFallback('roomcompetition.buttoninfo.submit.3', 'You still need:'))}</div>
                            <ul className="mt-0.5">
                                {state.required.map((furni) => (
                                    <li key={furni.name} className={furni.missing ? 'text-[#ffb3ad]' : 'text-[#a8e6a1]'}>
                                        {furni.missing ? '✗' : '✓'} {GetSessionDataManager().getFloorItemDataByName(furni.name)?.name ?? GetSessionDataManager().getWallItemDataByName(furni.name)?.name ?? furni.name}
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="mt-1 underline bg-transparent border-0 p-0 text-white cursor-pointer text-[11px]"
                                type="button"
                                onClick={() => SendMessageComposer(new SubmitRoomToCompetitionMessageComposer(state.goalCode, 0))}
                            >
                                {localizeWithFallback('generic.refresh', 'Refresh')}
                            </button>
                        </div>
                    )}
                    {state.mode === 'vote' && state.canVote && (
                        <div className="text-[11px] opacity-80 mt-0.5">
                            {plain(localizeWithFallback('roomcompetition.buttoninfo.vote', `${state.votesLeft} votes left for today`, ['votes'], [state.votesLeft.toString()]))}
                        </div>
                    )}
                </div>
                <button className="bg-transparent border-0 text-white opacity-70 hover:opacity-100 cursor-pointer" type="button" aria-label={localizeWithFallback('generic.close', 'Close')} onClick={() => close(false)}>
                    ✕
                </button>
            </div>
            <div className="flex items-center justify-between mt-2 gap-2">
                <button className="bg-transparent border-0 p-0 text-[11px] underline text-white opacity-70 hover:opacity-100 cursor-pointer" type="button" onClick={() => close(true)}>
                    {localizeWithFallback('roomcompetition.dontshowagain.dontshow', 'Don\'t show me this again today')}
                </button>
                {showButton && (
                    <button className="rounded bg-[#3c8a1e] hover:bg-[#4aa526] px-3 py-1 text-[12px] font-bold text-white border-0 cursor-pointer" type="button" onClick={onAction}>
                        {buttonText}
                    </button>
                )}
            </div>
        </div>
    );
};
