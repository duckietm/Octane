import { GetRoomEngine, HighScoreDataType, ObjectDataFactory, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@nitrots/nitro-renderer';
import { useState } from 'react';
import { useNitroEvent } from '../../../events';
import { useRoom } from '../../useRoom';

// The order is the client contract, not ours: the server sends an index into this list.
// Two of the five are times rather than points, which changes both the column header and
// how the value is written.
const SCORE_TYPES = ['perteam', 'mostwins', 'classic', 'fastesttime', 'longesttime'];
const CLEAR_TYPES = ['alltime', 'daily', 'weekly', 'monthly'];

// Seconds as H:MM:SS past the hour, MM:SS below it. Anything else stays a plain number.
export const scoreToTime = (score: number, parts: number) => {
    const divisors = [60, 60, 24];

    if (parts < 1 || parts > divisors.length) return `${ score }`;

    let remaining = score;
    let out = '';

    for (let i = 0; i < parts; i++) {
        let piece: string;

        if (i === parts - 1) {
            piece = `${ remaining }`;
        } else {
            piece = `${ remaining % divisors[i] }`;
            remaining = Math.floor(remaining / divisors[i]);
        }

        if (piece.length < 2 && i < 2) piece = `0${ piece }`;

        out = `${ piece }:${ out }`;
    }

    return out.slice(0, -1);
};

export const getScoreType = (type: number) => SCORE_TYPES[type];
export const getClearType = (type: number) => CLEAR_TYPES[type];

// A board whose type never arrived reads as -1, which would index the list with -1.
export const isConfigured = (scoreType: number, clearType: number) =>
    scoreType >= 0 && scoreType < SCORE_TYPES.length && clearType >= 0 && clearType < CLEAR_TYPES.length;

// The official client decides this from the type's own name, not from a separate list.
export const isTimeScore = (scoreType: number) => (SCORE_TYPES[scoreType] ?? '').includes('time');

export const formatScore = (score: number, scoreType: number) => {
    if (!isTimeScore(scoreType)) return `${ score }`;

    return scoreToTime(score, score >= 3600 ? 3 : 2);
};

const useFurnitureHighScoreWidgetState = () => {
    const [stuffDatas, setStuffDatas] = useState<Map<number, HighScoreDataType>>(new Map());
    const { roomSession = null } = useRoom();

    useNitroEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_HIGH_SCORE_DISPLAY, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const formatKey = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_DATA_FORMAT);
        const stuffData = ObjectDataFactory.getData(formatKey) as HighScoreDataType;

        stuffData.initializeFromRoomObjectModel(roomObject.model);

        setStuffDatas((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.set(roomObject.id, stuffData);

            return newValue;
        });
    });

    useNitroEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_HIDE_HIGH_SCORE_DISPLAY, (event) => {
        if (event.roomId !== roomSession.roomId) return;

        setStuffDatas((prevValue) => {
            const newValue = new Map(prevValue);

            newValue.delete(event.objectId);

            return newValue;
        });
    });

    return { stuffDatas, getScoreType, getClearType, isConfigured, isTimeScore, formatScore };
};

export const useFurnitureHighScoreWidget = useFurnitureHighScoreWidgetState;
