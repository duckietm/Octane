import { FC, useLayoutEffect, useRef, useState } from 'react';
import { DraggableWindow } from '../../../common/draggable-window';
import { NativeText } from '../../../common/native-text/NativeText';
import { useModAlertStore } from '../../../hooks';
import { Native3Frame, Native3ThickButton } from '../native/NativeWindow3';

const BODY_COLOR = 0xe9e9e1;

// habbo_window_alert (frame style 3, 278 wide, content at the margins (6, 25)): the summary text field is 210 wide at (27, 14) and at least 57 high, the button row
// (215 wide at x 26, only Ok shown, so centred) sits 10px under it, and the window is centred on the desktop.
export const NativeWindowAlert: FC<{ title: string; message: string; onClose: () => void }> = ({ title, message, onClose }) => {
    const summaryRef = useRef<HTMLDivElement>(null);
    const [summaryHeight, setSummaryHeight] = useState(57);

    useLayoutEffect(() => {
        const element = summaryRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const measure = () => setSummaryHeight(Math.max(57, element.offsetHeight));

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [message]);

    const width = 278;
    const height = 141 + (summaryHeight - 57);

    return (
        <DraggableWindow handleSelector=".native3-title" initialPosition={{ x: Math.round((window.innerWidth - width) / 2), y: Math.round((window.innerHeight - height) / 2) }}>
            <Native3Frame height={height} title={title} width={width} onClose={onClose}>
                <div ref={summaryRef} style={{ position: 'absolute', left: 27, top: 14, width: 210 }}>
                    <NativeText background={BODY_COLOR} maxWidth={210} text={message} textStyle="u_regular" />
                </div>
                <Native3ThickButton height={24} label="Ok" width={50} x={26 + Math.floor((215 - 50) / 2)} y={81 + (summaryHeight - 57)} onClick={onClose} />
            </Native3Frame>
        </DraggableWindow>
    );
};

export const NativeAlertView: FC<{}> = () => {
    const alerts = useModAlertStore((state) => state.alerts);
    const close = useModAlertStore((state) => state.close);

    return (
        <>
            {alerts.map((alert) => (
                <NativeWindowAlert key={alert.id} message={alert.message} title={alert.title} onClose={() => close(alert.id)} />
            ))}
        </>
    );
};
