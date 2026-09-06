import { GetGuestRoomMessageComposer, GetRoomEngine, OctaneRenderTexture, ThumbnailStatusMessageEvent } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText, RefreshRoomThumbnail, SendMessageComposer } from '../../../../api';
import { LayoutMiniCameraView } from '../../../../common';
import { RoomWidgetThumbnailEvent } from '../../../../events';
import { useMessageEvent, useNotification, useRoom, useUiEvent } from '../../../../hooks';

const THUMBNAIL_UPLOAD_TIMEOUT_MS = 10_000;

export const RoomThumbnailWidgetView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
    const { roomSession = null } = useRoom();
    const { simpleAlert = null } = useNotification();

    const clearUploadTimeout = useCallback(() => {
        if (!uploadTimeoutRef.current) return;

        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
    }, []);

    useEffect(() => clearUploadTimeout, [clearUploadTimeout]);

    useUiEvent([RoomWidgetThumbnailEvent.SHOW_THUMBNAIL, RoomWidgetThumbnailEvent.HIDE_THUMBNAIL, RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL], (event) => {
        switch (event.type) {
            case RoomWidgetThumbnailEvent.SHOW_THUMBNAIL:
                clearUploadTimeout();
                setIsSaving(false);
                setIsVisible(true);
                return;
            case RoomWidgetThumbnailEvent.HIDE_THUMBNAIL:
                if (isSaving) return;
                setIsVisible(false);
                return;
            case RoomWidgetThumbnailEvent.TOGGLE_THUMBNAIL:
                if (isSaving) return;
                setIsVisible((value) => !value);
                return;
        }
    });

    const receiveTexture = async (texture: OctaneRenderTexture) => {
        if (isSaving) return;

        setIsSaving(true);
        clearUploadTimeout();
        uploadTimeoutRef.current = setTimeout(() => {
            uploadTimeoutRef.current = null;
            setIsSaving(false);
            simpleAlert(LocalizeText('camera.error.creation'));
        }, THUMBNAIL_UPLOAD_TIMEOUT_MS);

        try {
            await GetRoomEngine().saveTextureAsScreenshot(texture, true);
        } catch {
            clearUploadTimeout();
            setIsSaving(false);
            simpleAlert(LocalizeText('camera.error.creation'));
        }
    };

    useMessageEvent<ThumbnailStatusMessageEvent>(ThumbnailStatusMessageEvent, (event) => {
        if (!isSaving) return;

        clearUploadTimeout();
        const parser = event.getParser();

        if (!parser.ok) {
            setIsSaving(false);
            simpleAlert(LocalizeText(parser.isRenderLimitHit ? 'camera.render.count.info' : 'camera.error.creation'));
            return;
        }

        const roomId = roomSession?.roomId ?? -1;

        setIsSaving(false);
        setIsVisible(false);

        if (roomId > 0) {
            RefreshRoomThumbnail(roomId);
            SendMessageComposer(new GetGuestRoomMessageComposer(roomId, false, false));
        }

        simpleAlert(LocalizeText('navigator.thumbnail.camera.success'));
    });

    if (!isVisible) return null;

    return (
        <LayoutMiniCameraView
            roomId={roomSession.roomId}
            textureReceiver={receiveTexture}
            isSaving={isSaving}
            onClose={() => !isSaving && setIsVisible(false)}
        />
    );
};
