import { FC, useMemo } from 'react';
import { GetRendererVersion, GetUIVersion, NotificationAlertItem, NotificationAlertType } from '../../../../api';
import { LayoutNotificationAlertViewProps } from '../../../../common';
import { NotificationDefaultAlertView } from './NotificationDefaultAlertView';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

const getOctaneAboutText = () => [
    'Octane is the web client for Polaris Emulator.',
    `Client v${ GetUIVersion() } · Renderer v${ GetRendererVersion() }`,
    '',
    '<b>About</b>',
    'Octane is a fork of Nitro. We have fixed a lot ourselves, made sure the UI matches the Habbo AIR UI and kept the hotel\'s own features inside the official layouts.',
    '',
    '<b>Team</b>',
    'DuckieTM, simoleo89, Medievalshell, Lorenzo, Remco',
    '',
    '<b>Credits</b>',
    'Thanks to Billsonnn and the Nitro team for the Nitro React and Nitro Renderer work that Octane is built on.',
    '',
    '<a href="https://discord.gg/eG6bKFwdgV" target="_blank" rel="noopener noreferrer">Discord</a> · <a href="https://github.com/duckietm/Octane" target="_blank" rel="noopener noreferrer">GitHub</a>'
].join('\n');

export const OctaneSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Octane', ...rest } = props;
    const aboutItem = useMemo(() => new NotificationAlertItem([getOctaneAboutText()], NotificationAlertType.DEFAULT, null, null, title), [title]);

    return <NotificationDefaultAlertView {...rest} item={aboutItem} title={title} />;
};
