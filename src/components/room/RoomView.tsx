import { CreateLinkEvent, GetEventDispatcher, GetRenderer, GetRoomEngine, RoomObjectMouseEvent, RoomObjectTileMouseEvent, RoomSession } from '@octane/renderer';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, useEffect, useRef } from 'react';
import { DispatchMouseEvent, DispatchTouchEvent } from '../../api';
import { useRoom, useRoomKeyboardMovement } from '../../hooks';
import { classNames } from '../../layout';
import { RoomSpectatorView } from './spectator/RoomSpectatorView';
import { RoomWidgetsView } from './widgets/RoomWidgetsView';
import { WiredVariableFxOverlayView } from './widgets/wired-fx/WiredVariableFxOverlayView';

/** One wheel step per this many ms: a trackpad sends dozens of wheel events per swipe. */
const ROOM_WHEEL_STEP_MS = 120;

export const RoomView: FC<{}> = (props) => {
    const { roomSession = null } = useRoom();
    const elementRef = useRef<HTMLDivElement>(null);

    useRoomKeyboardMovement();

    useEffect(() => {
        if (!roomSession) return;

        const canvas = GetRenderer().canvas;

        if (!canvas) return;

        canvas.onclick = (event) => DispatchMouseEvent(event);
        canvas.onmousemove = (event) => DispatchMouseEvent(event);
        canvas.onmousedown = (event) => DispatchMouseEvent(event);
        canvas.onmouseup = (event) => DispatchMouseEvent(event);

        canvas.ontouchstart = (event) => DispatchTouchEvent(event);
        canvas.ontouchmove = (event) => DispatchTouchEvent(event);
        canvas.ontouchend = (event) => DispatchTouchEvent(event);
        canvas.ontouchcancel = (event) => DispatchTouchEvent(event);

        let touchStartX = 0;
        let touchStartY = 0;
        let touchMoved = false;
        let lastTileTap: { x: number; y: number; time: number } = null;

        const isMobileTouch = () => window.matchMedia('(pointer: coarse), (hover: none)').matches;

        const onTouchStart = (event: TouchEvent) => {
            const touch = event.touches[0];

            if (!touch || !isMobileTouch()) return;

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
        };

        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];

            if (!touch || !isMobileTouch()) return;

            if (Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) touchMoved = true;
        };

        const onTouchEnd = (event: TouchEvent) => {
            const touch = event.changedTouches[0];

            if (!touch || touchMoved || !isMobileTouch()) return;

            lastTileTap = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        };

        const showTouchFeedback = () => {
            if (!lastTileTap || Date.now() - lastTileTap.time > 250) return;

            const feedback = document.createElement('div');

            feedback.className = 'octane-room-touch-feedback';
            feedback.style.left = `${lastTileTap.x}px`;
            feedback.style.top = `${lastTileTap.y}px`;

            document.body.appendChild(feedback);
            window.setTimeout(() => feedback.remove(), 420);

            lastTileTap = null;
        };

        const onTileClick = (event: RoomObjectMouseEvent) => {
            if (event instanceof RoomObjectTileMouseEvent) window.setTimeout(showTouchFeedback, 0);
        };

        let lastWheelStep = 0;

        // As in the official client: the wheel turns furni being moved or placed, Ctrl + wheel zooms.
        const onWheel = (event: WheelEvent) => {
            if (!event.deltaY) return;

            const zoom = event.ctrlKey || event.metaKey;

            // Ctrl + wheel would otherwise zoom the whole page.
            if (zoom) event.preventDefault();

            const now = performance.now();

            if (now - lastWheelStep < ROOM_WHEEL_STEP_MS) return;

            if (zoom) {
                lastWheelStep = now;
                CreateLinkEvent(event.deltaY < 0 ? 'room-tools/zoom_in' : 'room-tools/zoom_out');
                return;
            }

            if (GetRoomEngine().rotateActiveObjectPreview(event.deltaY > 0)) {
                lastWheelStep = now;
                event.preventDefault();
            }
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchmove', onTouchMove, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd, { passive: true });
        GetEventDispatcher().addEventListener(RoomObjectMouseEvent.CLICK, onTileClick);

        const element = elementRef.current;

        if (!element) return;

        canvas.classList.add('bg-black');

        element.appendChild(canvas);

        return () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('touchend', onTouchEnd);
            GetEventDispatcher().removeEventListener(RoomObjectMouseEvent.CLICK, onTileClick);
        };
    }, [roomSession]);

    return (
        <AnimatePresence>
            {
                <motion.div className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div ref={elementRef} className="w-full h-full">
                        <WiredVariableFxOverlayView />
                        {roomSession instanceof RoomSession && (
                            <>
                                <RoomWidgetsView />
                                {roomSession.isSpectator && <RoomSpectatorView />}
                            </>
                        )}
                    </div>
                </motion.div>
            }
        </AnimatePresence>
    );
};
