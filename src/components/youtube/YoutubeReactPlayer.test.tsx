/* @vitest-environment jsdom */

import { cleanup, render, waitFor } from '@testing-library/react';
import { createRef, forwardRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import YoutubeReactPlayer from './YoutubeReactPlayer';

const elements: HTMLVideoElement[] = [];

// The real element talks to the YouTube iframe API, which jsdom cannot run: a stand-in with the media API.
vi.mock('youtube-video-element/react', () => ({
    default: forwardRef<HTMLVideoElement, Record<string, unknown>>((props, ref) => {
        const { config, controls, loop, muted, src, style, onLoadStart, onPlay, onPause } = props as Record<string, never>;

        return (
            <video
                ref={(node) => {
                    if (node && !elements.includes(node)) {
                        let paused = true;

                        Object.defineProperty(node, 'paused', { get: () => paused, configurable: true });
                        node.play = vi.fn(() => {
                            paused = false;

                            return Promise.resolve();
                        });
                        node.pause = vi.fn(() => {
                            paused = true;
                        });
                        elements.push(node);
                    }

                    if (typeof ref === 'function') ref(node);
                    else if (ref) ref.current = node;
                }}
                data-config={JSON.stringify(config ?? null)}
                loop={loop}
                muted={muted}
                src={src}
                style={style}
                onLoadStart={onLoadStart}
                onPause={onPause}
                onPlay={onPlay}
            />
        );
    })
}));

describe('YoutubeReactPlayer', () => {
    afterEach(() => {
        cleanup();
        elements.length = 0;
    });

    it('starts the element when playing is true and stops it when playing becomes false', async () => {
        const { rerender } = render(<YoutubeReactPlayer playing src="https://www.youtube.com/watch?v=abc" />);

        await waitFor(() => expect(elements).toHaveLength(1));
        expect(elements[0].play).toHaveBeenCalledTimes(1);

        rerender(<YoutubeReactPlayer playing={false} src="https://www.youtube.com/watch?v=abc" />);

        expect(elements[0].pause).toHaveBeenCalledTimes(1);
    });

    it('leaves the element alone while playing is not set', async () => {
        render(<YoutubeReactPlayer src="https://www.youtube.com/watch?v=abc" />);

        await waitFor(() => expect(elements).toHaveLength(1));
        expect(elements[0].play).not.toHaveBeenCalled();
        expect(elements[0].pause).not.toHaveBeenCalled();
    });

    it('applies the volume and passes the youtube options, source and sizes through', async () => {
        const { container } = render(
            <YoutubeReactPlayer config={{ youtube: { start: 5 } }} height={375} src="https://www.youtube.com/watch?v=abc" volume={0.4} width={500} />
        );

        await waitFor(() => expect(elements).toHaveLength(1));
        expect(elements[0].volume).toBeCloseTo(0.4);

        const element = container.querySelector('video') as HTMLVideoElement;

        expect(element.getAttribute('data-config')).toBe('{"start":5}');
        expect(element.getAttribute('src')).toBe('https://www.youtube.com/watch?v=abc');
        expect(element.style.width).toBe('500px');
        expect(element.style.height).toBe('375px');
    });

    it('reports the start of loading as ready and forwards play and pause', async () => {
        const onReady = vi.fn();
        const onPlay = vi.fn();
        const onPause = vi.fn();

        render(<YoutubeReactPlayer src="https://www.youtube.com/watch?v=abc" onPause={onPause} onPlay={onPlay} onReady={onReady} />);
        await waitFor(() => expect(elements).toHaveLength(1));

        elements[0].dispatchEvent(new Event('loadstart'));
        elements[0].dispatchEvent(new Event('play'));
        elements[0].dispatchEvent(new Event('pause'));

        expect(onReady).toHaveBeenCalledTimes(1);
        expect(onPlay).toHaveBeenCalledTimes(1);
        expect(onPause).toHaveBeenCalledTimes(1);
    });

    it('hands the element to a ref', async () => {
        const ref = createRef<HTMLVideoElement>();

        render(<YoutubeReactPlayer ref={ref} src="https://www.youtube.com/watch?v=abc" />);

        await waitFor(() => expect(ref.current).toBe(elements[0]));
    });
});
