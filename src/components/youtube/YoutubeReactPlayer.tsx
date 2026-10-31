import { CSSProperties, forwardRef, lazy, Suspense, SyntheticEvent, useCallback, useEffect, useRef } from 'react';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

const YoutubeElement = lazy(() => import('youtube-video-element/react'));

export interface YoutubeReactPlayerProps {
    src: string;
    width?: number | string;
    height?: number | string;
    playing?: boolean;
    controls?: boolean;
    muted?: boolean;
    loop?: boolean;
    /** 0 to 1. */
    volume?: number;
    /** Options of the YouTube player, under the `youtube` key. */
    config?: { youtube?: Record<string, unknown> };
    /** Fired when the video starts loading. */
    onReady?: () => void;
    onPlay?: (event: SyntheticEvent) => void;
    onPause?: (event: SyntheticEvent) => void;
}

/**
 * The YouTube player of the client: the `youtube-video-element` custom element with the same props the
 * widgets used to pass to react-player, which was only a thin layer over it. `playing` is applied to the
 * element after every render and when it mounts, so a paused element starts and a playing one stops when the
 * prop says so.
 */
const YoutubeReactPlayer = forwardRef<HTMLVideoElement, YoutubeReactPlayerProps>((props, ref) => {
    const { src, width = '320px', height = '180px', playing, controls, muted, loop, volume = 1, config, onReady, onPlay, onPause } = props;
    const elementRef = useRef<HTMLVideoElement | null>(null);

    const apply = useCallback(
        (element: HTMLVideoElement) => {
            if (element.paused && playing === true) element.play()?.catch(() => undefined);
            if (!element.paused && playing === false) element.pause();

            element.playbackRate = 1;
            element.volume = volume;
        },
        [playing, volume]
    );

    // After every render, like the layer this replaces: a prop that changed reaches the element.
    useEffect(() => {
        if (elementRef.current) apply(elementRef.current);
    });

    // The element mounts after the lazy chunk loads, which is later than this component's first render.
    const setElement = useCallback(
        (node: HTMLVideoElement | null) => {
            elementRef.current = node;

            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;

            if (node) apply(node);
        },
        [ref, apply]
    );

    const style: CSSProperties = { display: 'block', width, height };

    return (
        <NativeTextTree>
            <Suspense fallback={null}>
                <YoutubeElement
                    ref={setElement as never}
                    config={config?.youtube}
                    controls={controls}
                    loop={loop}
                    muted={muted}
                    src={src}
                    style={style}
                    onLoadStart={() => onReady?.()}
                    onPause={onPause}
                    onPlay={onPlay}
                />
            </Suspense>
        </NativeTextTree>
    );
});

YoutubeReactPlayer.displayName = 'YoutubeReactPlayer';

export default YoutubeReactPlayer;
