import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, GetRoomThumbnailRevision, SubscribeRoomThumbnail } from '../../api';
import { Base, BaseProps } from '../Base';

export interface LayoutRoomThumbnailViewProps extends BaseProps<HTMLDivElement> {
    roomId?: number;
    customUrl?: string;
}

export const LayoutRoomThumbnailView: FC<LayoutRoomThumbnailViewProps> = (props) => {
    const { roomId = -1, customUrl = null, shrink = true, overflow = 'hidden', classNames = [], children = null, ...rest } = props;
    const [hasImage, setHasImage] = useState(true);
    const [revision, setRevision] = useState(() => GetRoomThumbnailRevision(roomId));

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [
            'relative w-[110px] h-[110px] bg-[url("@/assets/images/navigator/air/default-room.png")] bg-no-repeat bg-center',
            'border! border-[solid]! border-[#111]!'
        ];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    const getImageUrl = useMemo(() => {
        let imageUrl: string;

        if (!revision && customUrl && customUrl.length) imageUrl = GetConfigurationValue<string>('image.library.url') + customUrl;
        else imageUrl = GetConfigurationValue<string>('thumbnails.url').replace('%thumbnail%', roomId.toString());

        if (revision) imageUrl += `${imageUrl.includes('?') ? '&' : '?'}v=${revision}`;

        return imageUrl;
    }, [customUrl, revision, roomId]);

    useEffect(() => {
        setRevision(GetRoomThumbnailRevision(roomId));

        return SubscribeRoomThumbnail(roomId, setRevision);
    }, [roomId]);

    useEffect(() => setHasImage(true), [getImageUrl]);

    return (
        <Base classNames={getClassNames} overflow={overflow} shrink={shrink} {...rest}>
            {hasImage && getImageUrl && <img alt="" className="block h-full w-full object-cover" src={getImageUrl} onError={() => setHasImage(false)} />}
            {children}
        </Base>
    );
};
