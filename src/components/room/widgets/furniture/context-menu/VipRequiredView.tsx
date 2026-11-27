import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback, ShowVipBenefits } from '../../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

/** Which furni sent the user here: AIR's TYPE_VIPHOPPER uses `viphopper.*` texts, the HC gate `gate.*`. */
export type VipRequiredKind = 'viphopper' | 'gate';

const FALLBACKS: Record<string, string> = {
    'viprequired.header': 'HC required',
    'viphopper.viprequired.title': 'Oops!',
    'viphopper.viprequired.bodytext': "Looks like you're not in HC! You need to be an HC member to use this Hopper.",
    'gate.viprequired.title': 'Oops!',
    'gate.viprequired.bodytext': "Looks like you're not an HC member! You need HC to walk through this gate.",
    'viprequired.buy.vip': 'Get HC!',
    'viprequired.vip.benefits': "What's so great about Habbo HC?"
};

const text = (key: string): string => localizeWithFallback(key, FALLBACKS[key] ?? key);

/**
 * AIR viprequired_xml (habbo-room-ui-com, the furniture "VIP required" notification): title and body
 * per kind, "Get HC" opens the HC Center (HabboCatalog.openClubCenter) and the link under it opens the
 * VIP benefits window (showVipBenefits). "Get HC" and the close button close the notification; the
 * benefits link leaves it open, as in AIR's eventProc.
 */
export const VipRequiredView: FC<{ kind: VipRequiredKind; onClose: () => void }> = ({ kind, onClose }) => (
    <NativeTextTree>
        <OctaneCardView classNames={['octane-vip-required']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="vip-required">
            <OctaneCardHeaderView headerText={text('viprequired.header')} onCloseClick={onClose} />
            <OctaneCardContentView classNames={['octane-vip-required-content']} overflow="hidden">
                <span className="octane-vip-required-title">{text(`${kind}.viprequired.title`)}</span>
                <span className="octane-vip-required-body" data-testid="vip-required-body">
                    {text(`${kind}.viprequired.bodytext`)}
                </span>
                <span className="octane-vip-required-separator" aria-hidden="true" />
                <BaseButton
                    className="octane-vip-required-buy"
                    onClick={() => {
                        CreateLinkEvent('habboUI/open/hccenter');
                        onClose();
                    }}
                >
                    {text('viprequired.buy.vip')}
                </BaseButton>
                <BaseButton className="octane-vip-required-benefits" onClick={() => ShowVipBenefits()}>
                    {text('viprequired.vip.benefits')}
                </BaseButton>
            </OctaneCardContentView>
        </OctaneCardView>
    </NativeTextTree>
);
