import { FigureUpdateEvent, GetSessionDataManager, UserInfoEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { LayoutAvatarImageView } from '../../../common';
import { useMessageEvent } from '../../../hooks';

/**
 * `AvatarImageWidget.as` + the landing `avatar_image` layout (a 90x130 avatar
 * image widget): the user's own figure, refreshed on the user object and on
 * every figure update.
 */
export const HotelViewAvatarImageWidget: FC = () => {
    const [figure, setFigure] = useState(() => GetSessionDataManager().figure);
    const [gender, setGender] = useState(() => GetSessionDataManager().gender);

    useMessageEvent<UserInfoEvent>(UserInfoEvent, (event) => {
        const userInfo = event.getParser()?.userInfo;

        if (!userInfo) return;

        setFigure(userInfo.figure);
        setGender(userInfo.gender);
    });

    useMessageEvent<FigureUpdateEvent>(FigureUpdateEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setFigure(parser.figure);
        setGender(parser.gender);
    });

    return (
        <div className="hotelview-avatar-image">
            <LayoutAvatarImageView classNames={['hotelview-avatar-image__figure']} figure={figure} gender={gender} direction={2} />
        </div>
    );
};
