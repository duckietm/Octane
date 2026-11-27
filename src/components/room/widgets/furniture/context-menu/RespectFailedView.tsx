import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../../api';
import audiencePicture from '../../../../../assets/images/notifications/habbo_talent_show_audience.png';
import stagePicture from '../../../../../assets/images/notifications/habbo_talent_show_stage.png';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

/** Why the talent show refused the respect: the user is not on the stage, or the room has too small an audience. */
export type RespectFailedKind = 'stage' | 'audience';

const FALLBACKS: Record<string, string> = {
    'respect.giving.failed.title': 'Talent show',
    'respect.giving.failed.caption': 'Your respect was not given',
    'respect.giving.failed.no.stage': 'In a talent show you can only give respect to a Habbo who is on the stage.',
    'respect.giving.failed.no.audience': 'A talent show needs an audience of at least %users% Habbos before respect can be given.',
    'respect.giving.failed.button': 'OK'
};

const PICTURES: Record<RespectFailedKind, string> = { stage: stagePicture, audience: audiencePicture };

/** The body text; AIR fills %users% from the client setting respect.talent.show.min.audience when it is set. */
export const respectFailedBody = (kind: RespectFailedKind, minAudience: string | number | null | undefined): string => {
    const key = `respect.giving.failed.no.${kind}`;
    const body = localizeWithFallback(key, FALLBACKS[key]);
    const users = minAudience === null || minAudience === undefined ? '' : String(minAudience).trim();

    return users ? body.replace('%users%', users) : body;
};

/**
 * AIR respect_giving_failed_notification (369 x 220): the caption, the reason, the talent show picture at the right
 * and one button that closes it. AIR loads the pictures from the image library
 * (notifications/habbo_talent_show_<kind>.png); they ship with the client.
 */
export const RespectFailedView: FC<{ kind: RespectFailedKind; onClose: () => void }> = ({ kind, onClose }) => (
    <NativeTextTree>
        <OctaneCardView classNames={['octane-respect-failed']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="respect-failed">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('respect.giving.failed.title', FALLBACKS['respect.giving.failed.title'])}
                onCloseClick={onClose}
            />
            <OctaneCardContentView classNames={['octane-respect-failed-content']} overflow="hidden">
                <div className="octane-respect-failed-caption">
                    {localizeWithFallback('respect.giving.failed.caption', FALLBACKS['respect.giving.failed.caption'])}
                </div>
                <div className="octane-respect-failed-body" data-testid="respect-failed-body">
                    {respectFailedBody(kind, GetConfigurationValue<string>('respect.talent.show.min.audience', ''))}
                </div>
                <img alt="" className="octane-respect-failed-picture" src={PICTURES[kind]} />
                <BaseButton className="octane-respect-failed-close" onClick={onClose}>
                    {localizeWithFallback('respect.giving.failed.button', FALLBACKS['respect.giving.failed.button'])}
                </BaseButton>
            </OctaneCardContentView>
        </OctaneCardView>
    </NativeTextTree>
);
