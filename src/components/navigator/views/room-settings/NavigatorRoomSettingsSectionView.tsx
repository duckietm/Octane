import { FC, ReactNode } from 'react';
import { Column, Text } from '../../../../common';

interface NavigatorRoomSettingsSectionViewProps {
    title?: string;
    gap?: 1 | 2 | 3;
    className?: string;
    children: ReactNode;
}

export const NavigatorRoomSettingsSectionView: FC<NavigatorRoomSettingsSectionViewProps> = (props) => {
    const { title = null, gap = 2, className = '', children = null } = props;

    return (
        <Column gap={gap} className={`octane-room-settings-section ${className}`.trim()}>
            {title && (
                <Text bold small>
                    {title}
                </Text>
            )}
            {children}
        </Column>
    );
};
