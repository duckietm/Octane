import { GetRoomEngine, SpecialRoomEventEvent } from '@octane/renderer';
import { useEffect, useRef } from 'react';
import { GetRoomSession } from '../../api';
import { animateRoomZoom, getCurrentRoomZoomScale, ROOM_ZOOM_CANVAS_ID, stepRoomZoom } from '../../components/room/widgets/room-tools/roomZoom.helpers';
import { useMessageEvent } from '../events';

/** `class_1902.onSpecialRoomEvent` effect ids. */
export const SPECIAL_ROOM_EFFECT_ROTATE = 0;
export const SPECIAL_ROOM_EFFECT_SHAKE = 1;
export const SPECIAL_ROOM_EFFECT_ZOOM = 2;
export const SPECIAL_ROOM_EFFECT_DISCO = 3;

/** `RoomShakingEffect.init(250, 5000)`: a 250ms step for 5 seconds. */
export const SPECIAL_ROOM_EFFECT_STEP_MS = 250;
export const SPECIAL_ROOM_EFFECT_DURATION_MS = 5000;

/** Screen offsets the shake cycles through, in pixels. */
export const SPECIAL_ROOM_SHAKE_OFFSETS: readonly [number, number][] = [
    [-4, 2],
    [0, -3],
    [4, 2],
    [0, 0]
];

/** The official disco cycle: one colour per second. */
export const SPECIAL_ROOM_DISCO_COLOURS = [29371, 16731195, 16764980, 10092288, 29371, 16731195, 16764980, 10092288, 0];
export const SPECIAL_ROOM_DISCO_LIGHT = 176;
export const SPECIAL_ROOM_DISCO_STEP_MS = 1000;

/**
 * AIR 13 `SpecialRoomEvent` (2163): a room-wide effect the server triggers.
 * `class_1902.onSpecialRoomEvent` maps 0 = rotate, 1 = shake, 2 = zoom out and
 * 3 = a disco colour cycle whose closing tick puts the room light back.
 *
 * The shake nudges the room rendering canvas' screen offset the way the official
 * `RoomShakingEffect` moves the room view. Rotate has no counterpart in this
 * engine (the room plane is not rotatable here) and is deliberately a no-op.
 */
export const useRoomSpecialEvents = () => {
    const timeouts = useRef<number[]>([]);

    useEffect(
        () => () => {
            for (const handle of timeouts.current) window.clearTimeout(handle);

            timeouts.current = [];
        },
        []
    );

    useMessageEvent<SpecialRoomEventEvent>(SpecialRoomEventEvent, (event) => {
        const parser = event.getParser();
        const roomId = GetRoomSession()?.roomId ?? 0;

        if (!parser || !roomId) return;

        switch (parser.effectId) {
            case SPECIAL_ROOM_EFFECT_SHAKE: {
                const canvas = GetRoomEngine().getRoomInstanceRenderingCanvas(roomId, ROOM_ZOOM_CANVAS_ID);

                if (!canvas) return;

                const baseX = canvas.screenOffsetX;
                const baseY = canvas.screenOffsetY;
                const steps = Math.floor(SPECIAL_ROOM_EFFECT_DURATION_MS / SPECIAL_ROOM_EFFECT_STEP_MS);

                for (let step = 0; step < steps; step++) {
                    const [offsetX, offsetY] = SPECIAL_ROOM_SHAKE_OFFSETS[step % SPECIAL_ROOM_SHAKE_OFFSETS.length];

                    timeouts.current.push(
                        window.setTimeout(() => {
                            canvas.screenOffsetX = baseX + offsetX;
                            canvas.screenOffsetY = baseY + offsetY;
                        }, step * SPECIAL_ROOM_EFFECT_STEP_MS)
                    );
                }

                timeouts.current.push(
                    window.setTimeout(() => {
                        canvas.screenOffsetX = baseX;
                        canvas.screenOffsetY = baseY;
                    }, SPECIAL_ROOM_EFFECT_DURATION_MS)
                );
                break;
            }
            case SPECIAL_ROOM_EFFECT_ZOOM:
                animateRoomZoom(roomId, stepRoomZoom(getCurrentRoomZoomScale(roomId), -1));
                break;
            case SPECIAL_ROOM_EFFECT_DISCO:
                // The official timer ticks `colours.length + 1` times: every
                // colour with backgroundOnly false, then one closing tick with
                // backgroundOnly true that puts the room light back.
                SPECIAL_ROOM_DISCO_COLOURS.forEach((colour, index) => {
                    timeouts.current.push(
                        window.setTimeout(
                            () => GetRoomEngine().updateObjectRoomColor(roomId, colour, SPECIAL_ROOM_DISCO_LIGHT, false),
                            (index + 1) * SPECIAL_ROOM_DISCO_STEP_MS
                        )
                    );
                });
                timeouts.current.push(
                    window.setTimeout(
                        () => GetRoomEngine().updateObjectRoomColor(roomId, 0, SPECIAL_ROOM_DISCO_LIGHT, true),
                        (SPECIAL_ROOM_DISCO_COLOURS.length + 1) * SPECIAL_ROOM_DISCO_STEP_MS
                    )
                );
                break;
        }
    });
};
