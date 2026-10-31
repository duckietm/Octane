import { FC } from 'react';
import { getNavigatorUserCountColor } from '../../../../api';
import userCountIcon from '../../../../assets/images/navigator/air/icon-usercount.png';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NavigatorUserCountViewProps {
    userCount: number;
    maxUserCount: number;
}

export const NavigatorUserCountView: FC<NavigatorUserCountViewProps> = (props) => {
    const { userCount, maxUserCount } = props;

    return (
        <NativeTextTree>
            <span className="octane-navigator-air__usercount" style={{ backgroundColor: getNavigatorUserCountColor(userCount, maxUserCount) }}>
                <img src={userCountIcon} alt="" />
                <span>{userCount}</span>
            </span>
        </NativeTextTree>
    );
};
