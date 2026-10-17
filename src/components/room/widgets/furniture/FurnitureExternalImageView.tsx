import { GetRoomEngine, RoomControllerLevel, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, useState } from 'react';
import { formatCameraPhotoDate, GetAllowedCameraPhotoUrl, GetUserProfile, LocalizeText, ReportType } from '../../../../api';
import { DraggableWindow } from '../../../../common';
import { getPhotoCreator, useFurnitureExternalImageWidget, useHelp, useNotification, useRoom } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';

// Official stories_image_widget: the photo in a 1px black outline on a translucent panel, browse arrows
// either side, date and creator under it, and report / remove / close at the top right.
export const FurnitureExternalImageView: FC<{}> = (props) => {
    const {
        objectId = -1,
        currentPhotoIndex = -1,
        setCurrentPhotoIndex = null,
        currentPhotos = null,
        currentObjectIds = [],
        onClose = null
    } = useFurnitureExternalImageWidget();
    const { report = null } = useHelp();
    const { roomSession = null } = useRoom();
    const { showConfirm = null } = useNotification();
    const [failedUrl, setFailedUrl] = useState('');

    if (objectId === -1 || currentPhotoIndex === -1) return null;

    const photo = currentPhotos?.[currentPhotoIndex] ?? null;

    if (!photo) return null;

    const photoObjectId = currentObjectIds[currentPhotoIndex] ?? objectId;
    const photoObject = roomSession ? GetRoomEngine().getRoomObject(roomSession.roomId, photoObjectId, RoomObjectCategory.WALL) : null;
    const creator = getPhotoCreator(
        photo,
        Number(photoObject?.model.getValue<number>(RoomObjectVariable.FURNITURE_OWNER_ID) ?? 0),
        photoObject?.model.getValue<string>(RoomObjectVariable.FURNITURE_OWNER_NAME) ?? ''
    );
    const photoUrl = GetAllowedCameraPhotoUrl((photo.w ?? '').replace('_small.png', '.png'));
    const creationDate = formatCameraPhotoDate(photo.t);
    const caption = typeof photo.m === 'string' ? photo.m.trim() : '';
    const canBrowse = currentPhotos.length > 1;
    // Official: the remove button needs room owner rights (controller level 4) or more.
    const canRemove = !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.ROOM_OWNER);

    const browse = (step: number) => setCurrentPhotoIndex((currentPhotoIndex + step + currentPhotos.length) % currentPhotos.length);

    // Official openReportImage: the photographer, the photo id and the wall item, not the reporter.
    const onReport = () =>
        report(ReportType.PHOTO, {
            extraData: photo.u !== undefined && photo.u !== null ? String(photo.u) : (photo.w ?? ''),
            roomId: roomSession?.roomId ?? 0,
            reportedUserId: creator.id,
            roomObjectId: photoObjectId
        });

    const onRemove = () => {
        if (!roomSession || !showConfirm) return;

        showConfirm(
            LocalizeText('inventory.remove.external_image_wallitem_body'),
            () => {
                GetRoomEngine().deleteRoomObject(photoObjectId, RoomObjectCategory.WALL);
                onClose();
            },
            null,
            LocalizeText('inventory.remove.external_image_wallitem_delete'),
            null,
            LocalizeText('inventory.remove.external_image_wallitem_header')
        );
    };

    return (
        <DraggableWindow uniqueKey="photo-viewer" handleSelector=".octane-photo-viewer__panel">
            <div className="octane-photo-viewer">
                <div className="octane-photo-viewer__panel" />
                <div className="octane-photo-viewer__photo">
                    {photoUrl && photoUrl !== failedUrl && <img key={photoUrl} alt="" src={photoUrl} draggable={false} onError={() => setFailedUrl(photoUrl)} />}
                </div>
                {canBrowse && (
                    <>
                        <BaseButton type="button" className="octane-photo-viewer__browse octane-photo-viewer__browse--previous" onClick={() => browse(-1)} />
                        <BaseButton type="button" className="octane-photo-viewer__browse octane-photo-viewer__browse--next" onClick={() => browse(1)} />
                    </>
                )}
                {creationDate && <span className="octane-photo-viewer__date">{creationDate}</span>}
                {creator.name && (
                    <BaseButton type="button" className="octane-photo-viewer__creator" onClick={() => creator.id > 0 && GetUserProfile(creator.id)}>
                        {creator.name}
                    </BaseButton>
                )}
                {caption && (
                    <div className="octane-photo-viewer__caption" title={caption}>
                        {caption}
                    </div>
                )}
                <div className="octane-photo-viewer__buttons">
                    <BaseButton
                        type="button"
                        className="octane-photo-viewer__button octane-photo-viewer__button--report"
                        title={LocalizeText('help.report.photo.button')}
                        onClick={onReport}
                    />
                    {canRemove && (
                        <BaseButton
                            type="button"
                            className="octane-photo-viewer__button octane-photo-viewer__button--remove"
                            title={LocalizeText('inventory.remove.external_image_wallitem_delete')}
                            onClick={onRemove}
                        />
                    )}
                    <BaseButton type="button" className="octane-photo-viewer__close" title={LocalizeText('generic.close')} onClick={onClose} />
                </div>
            </div>
        </DraggableWindow>
    );
};
