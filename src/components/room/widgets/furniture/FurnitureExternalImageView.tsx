import { GetSessionDataManager } from '@octane/renderer';
import { FC } from 'react';
import { GetConfigurationValue, isSafeExternalUrl, LocalizeText, ReportType } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFurnitureExternalImageWidget, useHelp } from '../../../../hooks';
import { CameraWidgetShowPhotoView } from '../../../camera/views/CameraWidgetShowPhotoView';

export const FurnitureExternalImageView: FC<{}> = (props) => {
    const { objectId = -1, currentPhotoIndex = -1, currentPhotos = null, onClose = null } = useFurnitureExternalImageWidget();
    const { report = null } = useHelp();

    if (objectId === -1 || currentPhotoIndex === -1) return null;

    const handleOpenFullPhoto = () => {
        const photoUrl = currentPhotos[currentPhotoIndex].w.replace('_small.png', '.png');
        if (photoUrl && isSafeExternalUrl(photoUrl)) {
            window.open(photoUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <OctaneCardView
            isResizable={false}
            className="octane-external-image-widget min-w-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            uniqueKey="photo-viewer"
            theme="primary-slim"
        >
            <OctaneCardHeaderView
                headerText={LocalizeText('camera.interface.title')}
                isGalleryPhoto={true}
                onCloseClick={onClose}
                onReportPhoto={() =>
                    report(ReportType.PHOTO, {
                        extraData: currentPhotos[currentPhotoIndex].w,
                        roomId: currentPhotos[currentPhotoIndex].s,
                        reportedUserId: GetSessionDataManager().userId,
                        roomObjectId: Number(currentPhotos[currentPhotoIndex].u)
                    })
                }
            />
            <OctaneCardContentView>
                <CameraWidgetShowPhotoView currentIndex={currentPhotoIndex} currentPhotos={currentPhotos} onClick={handleOpenFullPhoto} />
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
