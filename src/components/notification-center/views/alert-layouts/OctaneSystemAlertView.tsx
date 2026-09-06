import { FC } from 'react';
import { GetConfigurationValue, GetRendererVersion, GetUIVersion, NotificationAlertItem } from '../../../../api';
import { Button, Column, Grid, LayoutNotificationAlertView, LayoutNotificationAlertViewProps, Text } from '../../../../common';

interface NotificationDefaultAlertViewProps extends LayoutNotificationAlertViewProps {
    item: NotificationAlertItem;
}

export const OctaneSystemAlertView: FC<NotificationDefaultAlertViewProps> = (props) => {
    const { title = 'Octane', onClose = null, classNames = [], ...rest } = props;
    const adsEnabled = GetConfigurationValue<boolean>('show.google.ads', false);

    return (
        <LayoutNotificationAlertView title={title} onClose={onClose} classNames={['octane-alert-system', ...classNames]} {...rest}>
            <Grid>
                <Column size={12}>
                    <Column alignItems="center" gap={0}>
                        <Text bold fontSize={4}>
                            Octane React
                        </Text>
                        <Text>v{GetUIVersion()}</Text>
                    </Column>
                    <Column alignItems="center">
                        <Text>
                            <b>Renderer:</b> v{GetRendererVersion()}
                        </Text>
                        <Column fullWidth gap={1}>
                            <Button fullWidth variant="success" onClick={(event) => window.open('https://discord.gg/CuYZsbEwc')}>
                                Discord
                            </Button>
                            {adsEnabled && (
                                <Button fullWidth onClick={() => window.dispatchEvent(new CustomEvent('ads:toggle'))}>
                                    Show Ad
                                </Button>
                            )}
                        </Column>
                    </Column>
                    <div className="alertView_octane-coolui-logo"></div>
                    <Column size={12}>
                        <Column alignItems="center" gap={0}>
                            <Text center bold fontSize={5}>
                                Octane V3
                            </Text>
                            <Text>DuckieTM, simoleo89, Medievalshell, Lorenzo (the wired master), Remco</Text>
                            <Text center bold small>
                                v3.6.0
                            </Text>
                            <Button fullWidth onClick={(event) => window.open('https://github.com/duckietm/Octane')}>
                                Cool UI Git
                            </Button>
                        </Column>
                    </Column>
                </Column>
            </Grid>
        </LayoutNotificationAlertView>
    );
};
