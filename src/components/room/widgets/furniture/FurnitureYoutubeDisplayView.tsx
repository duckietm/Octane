import { FC, useRef } from 'react';
import { LocalizeText, YoutubeVideoPlaybackStateEnum } from '../../../../api';
import { AutoGrid, AutoGridProps, LayoutGridItem, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurnitureYoutubeWidget } from '../../../../hooks';
import ReactPlayer from '../../../youtube/YoutubeReactPlayer';

interface FurnitureYoutubeDisplayViewProps extends AutoGridProps {}

export const FurnitureYoutubeDisplayView: FC<{}> = (FurnitureYoutubeDisplayViewProps) => {
    const {
        objectId = -1,
        videoId = null,
        videoStart = 0,
        videoEnd = 0,
        currentVideoState = null,
        selectedVideo = null,
        playlists = [],
        onClose = null,
        previous = null,
        next = null,
        pause = null,
        play = null,
        selectVideo = null
    } = useFurnitureYoutubeWidget();
    const playerRef = useRef<HTMLVideoElement>(null);

    const handlePlay = () => {
        if (objectId === -1) return;
        if (currentVideoState !== YoutubeVideoPlaybackStateEnum.PLAYING) play();
    };

    const handlePause = () => {
        if (objectId === -1) return;
        if (currentVideoState !== YoutubeVideoPlaybackStateEnum.PAUSED) pause();
    };

    if (objectId === -1) return null;

    const playing = currentVideoState === null ? true : currentVideoState === YoutubeVideoPlaybackStateEnum.PLAYING;

    return (
        <OctaneCardView className="youtube-tv-widget">
            <OctaneCardHeaderView headerText={LocalizeText('catalog.page.youtube_tvs')} onCloseClick={onClose} />
            <OctaneCardContentView>
                <div className="row size-full">
                    <div className="youtube-video-container col-span-9 overflow-hidden">
                        {videoId && videoId.length > 0 && (
                            <ReactPlayer
                                ref={playerRef}
                                src={`https://www.youtube.com/watch?v=${videoId}`}
                                width={500}
                                height={375}
                                playing={playing}
                                controls={false}
                                onPlay={handlePlay}
                                onPause={handlePause}
                                config={{
                                    youtube: {
                                        disablekb: 1,
                                        origin: window.origin,
                                        start: videoStart,
                                        end: videoEnd
                                    }
                                }}
                            />
                        )}
                        {(!videoId || videoId.length === 0) && (
                            <div className="empty-video size-full justify-center items-center flex">{LocalizeText('widget.furni.video_viewer.no_videos')}</div>
                        )}
                    </div>
                    <div className="playlist-container col-span-3 flex flex-col">
                        <span className="playlist-controls justify-center flex">
                            <i className="icon icon-youtube-prev cursor-pointer" onClick={previous} />
                            <i className="icon icon-youtube-next cursor-pointer" onClick={next} />
                        </span>
                        <div className="mb-1">{LocalizeText('widget.furni.video_viewer.playlists')}</div>
                        <AutoGrid className="mb-1" columnCount={1} columnMinHeight={100} columnMinWidth={80} overflow="auto">
                            {playlists &&
                                playlists.map((entry, index) => {
                                    return (
                                        <LayoutGridItem key={index} itemActive={entry.video === selectedVideo} onClick={(event) => selectVideo(entry.video)}>
                                            <b>{entry.title}</b>
                                        </LayoutGridItem>
                                    );
                                })}
                        </AutoGrid>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
