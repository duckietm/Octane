import { FC, KeyboardEvent, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useFurnitureVimeoWidget } from '../../../../hooks';
import { sanitizeVimeoVideoIdInput, vimeoPlayerUrl } from '../../../../hooks/rooms/widgets/furniture/useFurnitureVimeoWidget.helpers';

/**
 * The official Vimeo viewer (`vimeo_viewer_xml`, 451x356, caption "Vimeo Display"):
 * a black 431x302 video area playing the furni's video, the "Video id:" strip on
 * top of it, and "no videos" when the furni has no id yet.
 */
export const FurnitureVimeoDisplayView: FC = () => {
    const { objectId = -1, videoId = 0, canEdit = false, onClose = null, saveVideoId = null } = useFurnitureVimeoWidget();

    if (objectId === -1) return null;

    return <VimeoViewer key={`${objectId}:${videoId}`} canEdit={canEdit} videoId={videoId} onClose={onClose} onSave={saveVideoId} />;
};

interface VimeoViewerProps {
    videoId: number;
    canEdit: boolean;
    onClose: () => void;
    onSave: (value: string) => void;
}

const VimeoViewer: FC<VimeoViewerProps> = ({ videoId, canEdit, onClose, onSave }) => {
    const [draft, setDraft] = useState(videoId > 0 ? String(videoId) : '');
    const playerUrl = vimeoPlayerUrl(videoId);

    const commit = () => {
        if ((sanitizeVimeoVideoIdInput(draft) || '0') !== String(videoId)) onSave(draft);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') commit();
    };

    return (
        <NativeTextTree>
            <OctaneCardView classNames={['octane-vimeo-viewer']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="vimeo-viewer">
                <OctaneCardHeaderView headerText={localizeWithFallback('widget.furni.vimeo_viewer.title', 'Vimeo Display')} onCloseClick={onClose} />
                <div className="octane-vimeo-viewer-content">
                    <div className="octane-vimeo-viewer-background" data-testid="vimeo-video-background">
                        {playerUrl ? (
                            <iframe
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                className="octane-vimeo-viewer-player"
                                // The player keeps what it needs to play; it may not navigate the client away.
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                                referrerPolicy="strict-origin"
                                src={playerUrl}
                                title="Vimeo"
                            />
                        ) : (
                            <span className="octane-vimeo-viewer-empty">
                                {localizeWithFallback('widget.furni.video_viewer.no_videos', 'No videos available.')}
                            </span>
                        )}
                    </div>
                    <div className="octane-vimeo-viewer-id">
                        <span className="octane-vimeo-viewer-id-label">Video id:</span>
                        <input
                            aria-label="Video id"
                            className="octane-vimeo-viewer-id-input"
                            disabled={!canEdit}
                            inputMode="numeric"
                            placeholder={videoId > 0 ? '' : 'No configured video id'}
                            type="text"
                            value={draft}
                            onBlur={commit}
                            onChange={(event) => setDraft(sanitizeVimeoVideoIdInput(event.target.value))}
                            onKeyDown={onKeyDown}
                        />
                    </div>
                </div>
            </OctaneCardView>
        </NativeTextTree>
    );
};
