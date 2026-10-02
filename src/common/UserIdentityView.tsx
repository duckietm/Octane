import { FC, Fragment, ReactNode } from 'react';
import { parseFontSegments } from '../api';
import { GetNickIconUrl } from '../assets/images/user_custom/nick_icons';

const renderInlineFontMarkup = (text: string): ReactNode => {
    if (!text) return text;
    if (text.indexOf('<font') === -1) return text;

    const segments = parseFontSegments(text);

    if (!segments.length) return text;

    return segments.map((segment, index) => {
        if (segment.color)
            return (
                <span key={index} style={{ color: segment.color }}>
                    {segment.text}
                </span>
            );

        return <Fragment key={index}>{segment.text}</Fragment>;
    });
};

interface UserIdentityViewProps {
    username: string;
    nickIcon?: string;
    showColon?: boolean;
    className?: string;
    iconClassName?: string;
    nameClassName?: string;
}

export const UserIdentityView: FC<UserIdentityViewProps> = ({
    username = '',
    nickIcon = '',
    showColon = false,
    className = '',
    iconClassName = 'inline-block w-auto h-auto align-[-1px]',
    nameClassName = 'username font-bold'
}) => {
    const nickIconUrl = GetNickIconUrl(nickIcon);

    return (
        <span className={`inline-flex items-center whitespace-nowrap align-middle ${className}`}>
            {nickIconUrl && <img className={`${iconClassName} mr-1`} src={nickIconUrl} alt="" />}
            <span className={`${nameClassName} whitespace-nowrap`}>
                {renderInlineFontMarkup(username)}
                {showColon ? ': ' : ''}
            </span>
        </span>
    );
};
