import {
    AddLinkEventTracker,
    ClubGiftInfoEvent,
    CreateLinkEvent,
    GetClubGiftInfo,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    ScrGetKickbackInfoMessageComposer,
    ScrKickbackData,
    ScrSendKickbackInfoMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { ClubStatus, FriendlyTime, GetClubBadge, GetConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import benefitsBg from '../../assets/images/hc-center/benefits.png';
import clockIcon from '../../assets/images/hc-center/clock.png';
import hcLogo from '../../assets/images/hc-center/hc_logo.gif';
import paydayBg from '../../assets/images/hc-center/payday.png';
import {
    Button,
    Column,
    Flex,
    LayoutAvatarImageView,
    LayoutBadgeImageView,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardView,
    Text
} from '../../common';
import { useInventoryBadges, useMessageEvent, usePurse, useSessionInfo } from '../../hooks';

export const HcCenterView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [kickbackData, setKickbackData] = useState<ScrKickbackData>(null);
    const [unclaimedGifts, setUnclaimedGifts] = useState(0);
    const [badgeCode, setBadgeCode] = useState(null);
    const { userFigure = null } = useSessionInfo();
    const { purse = null, clubStatus = null } = usePurse();
    const { badgeCodes = [], activate = null, deactivate = null } = useInventoryBadges();

    const getClubText = () => {
        if (purse.clubDays <= 0) return LocalizeText('purse.clubdays.zero.amount.text');

        if (purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < 60 * 24) {
            return FriendlyTime.shortFormat(purse.minutesUntilExpiration * 60);
        }

        return FriendlyTime.shortFormat((purse.clubPeriods * 31 + purse.clubDays) * 86400);
    };

    const getInfoText = () => {
        switch (clubStatus) {
            case ClubStatus.ACTIVE:
                return LocalizeText(
                    `hccenter.status.${clubStatus}.info`,
                    ['timeleft', 'joindate', 'streakduration'],
                    [getClubText(), kickbackData?.firstSubscriptionDate, FriendlyTime.shortFormat(kickbackData?.currentHcStreak * 86400)]
                );
            case ClubStatus.EXPIRED:
                return LocalizeText(`hccenter.status.${clubStatus}.info`, ['joindate'], [kickbackData?.firstSubscriptionDate]);
            default:
                return LocalizeText(`hccenter.status.${clubStatus}.info`);
        }
    };

    const getHcPaydayTime = () =>
        !kickbackData || kickbackData.timeUntilPayday < 60
            ? LocalizeText('hccenter.special.time.soon')
            : FriendlyTime.shortFormat(kickbackData.timeUntilPayday * 60);
    const getHcPaydayAmount = () =>
        LocalizeText('hccenter.special.sum', ['credits'], [(kickbackData?.creditRewardForStreakBonus + kickbackData?.creditRewardForMonthlySpent).toString()]);

    useMessageEvent<ClubGiftInfoEvent>(ClubGiftInfoEvent, (event) => {
        const parser = event.getParser();

        setUnclaimedGifts(parser.giftsAvailable);
    });

    useMessageEvent<ScrSendKickbackInfoMessageEvent>(ScrSendKickbackInfoMessageEvent, (event) => {
        const parser = event.getParser();

        setKickbackData(parser.data);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'open':
                        if (parts.length > 2) {
                            switch (parts[2]) {
                                case 'hccenter':
                                    setIsVisible(true);
                                    break;
                            }
                        }
                        return;
                }
            },
            eventUrlPrefix: 'habboUI/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        setBadgeCode(GetClubBadge(badgeCodes));
    }, [badgeCodes]);

    useEffect(() => {
        if (!isVisible) return;

        const id = activate();

        return () => deactivate(id);
    }, [isVisible, activate, deactivate]);

    useEffect(() => {
        SendMessageComposer(new GetClubGiftInfo());
        SendMessageComposer(new ScrGetKickbackInfoMessageComposer());
    }, []);

    if (!isVisible) return null;

    const popover = (
        <>
            <h5>{LocalizeText('hccenter.breakdown.title')}</h5>
            <div>{LocalizeText('hccenter.breakdown.creditsspent', ['credits'], [kickbackData?.totalCreditsSpent.toString()])}</div>
            <div>{LocalizeText('hccenter.breakdown.paydayfactor.percent', ['percent'], [(kickbackData?.kickbackPercentage * 100).toString()])}</div>
            <div>{LocalizeText('hccenter.breakdown.streakbonus', ['credits'], [kickbackData?.creditRewardForStreakBonus.toString()])}</div>
            <hr className="w-full text-black my-1" />
            <div>
                {LocalizeText(
                    'hccenter.breakdown.total',
                    ['credits', 'actual'],
                    [
                        getHcPaydayAmount(),
                        (
                            ((kickbackData?.kickbackPercentage * kickbackData?.totalCreditsSpent + kickbackData?.creditRewardForStreakBonus) * 100) /
                            100
                        ).toString()
                    ]
                )}
            </div>
            <div
                className="btn btn-link text-primary p-0"
                onClick={() => CreateLinkEvent('habbopages/' + GetConfigurationValue('hc.center')['payday.habbopage'])}
            >
                {LocalizeText('hccenter.special.infolink')}
            </div>
        </>
    );

    return (
        <OctaneCardView className="min-w-0 w-[min(430px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)] resize-none" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('generic.hccenter')} onCloseClick={() => setIsVisible(false)} />
            <Flex className="bg-muted/50 p-3" position="relative">
                <Column gap={2}>
                    <div className="w-[213px] h-[37px] bg-contain bg-no-repeat" style={{ backgroundImage: `url(${hcLogo})` }} />
                    <Button variant="success" onClick={(event) => CreateLinkEvent('catalog/open/' + GetConfigurationValue('catalog.links')['hc.buy_hc'])}>
                        {LocalizeText(clubStatus === ClubStatus.ACTIVE ? 'hccenter.btn.extend' : 'hccenter.btn.buy')}
                    </Button>
                </Column>
                <div className="absolute right-0 top-0 p-2 z-[4]">
                    <LayoutAvatarImageView direction={4} figure={userFigure} scale={2} />
                </div>
            </Flex>
            <OctaneCardContentView>
                <Flex gap={2} alignItems="center" className="p-2 rounded bg-card-grid-item/30">
                    <LayoutBadgeImageView badgeCode={badgeCode} className="shrink-0" />
                    <Column gap={0} className="min-h-[48px] leading-4">
                        <Text bold>{LocalizeText('hccenter.status.' + clubStatus)}</Text>
                        <Text small className="text-gray-700" dangerouslySetInnerHTML={{ __html: getInfoText() }} />
                    </Column>
                </Flex>
                {GetConfigurationValue('hc.center')['payday.info'] && (
                    <Flex className="rounded overflow-hidden border border-card-grid-item-border">
                        <Column className="bg-primary p-3 flex-1 text-white" gap={1}>
                            <Text bold className="text-white">
                                {LocalizeText('hccenter.special.title')}
                            </Text>
                            <Text small className="text-white/80">
                                {LocalizeText('hccenter.special.info')}
                            </Text>
                            <div className="mt-auto">
                                <span
                                    className="text-white/90 text-sm cursor-pointer hover:underline"
                                    onClick={() => CreateLinkEvent('habbopages/' + GetConfigurationValue('hc.center')['payday.habbopage'])}
                                >
                                    {LocalizeText('hccenter.special.infolink')}
                                </span>
                            </div>
                        </Column>
                        <Column
                            className="w-[200px] shrink-0 p-3 bg-contain bg-no-repeat bg-center text-[#6b3502]"
                            gap={1}
                            style={{ backgroundImage: `url(${paydayBg})` }}
                        >
                            <Text bold small>
                                {LocalizeText('hccenter.special.time.title')}
                            </Text>
                            <Flex gap={1} alignItems="center">
                                <div className="w-5 h-5 shrink-0 bg-contain bg-no-repeat bg-center" style={{ backgroundImage: `url(${clockIcon})` }} />
                                <Text bold>{getHcPaydayTime()}</Text>
                            </Flex>
                            {clubStatus === ClubStatus.ACTIVE && (
                                <Column gap={0} className="mt-1">
                                    <Text bold small>
                                        {LocalizeText('hccenter.special.amount.title')}
                                    </Text>
                                    <Text bold className="text-center">
                                        {getHcPaydayAmount()}
                                    </Text>
                                    <span
                                        className="text-primary text-sm cursor-pointer hover:underline self-end"
                                        onClick={() => CreateLinkEvent('habbopages/' + GetConfigurationValue('hc.center')['payday.habbopage'])}
                                    >
                                        {LocalizeText('hccenter.breakdown.infolink')}
                                    </span>
                                </Column>
                            )}
                        </Column>
                    </Flex>
                )}
                {GetConfigurationValue('hc.center')['gift.info'] && (
                    <Flex className="rounded bg-success/90 p-3" alignItems="center" gap={2}>
                        <Column gap={0} className="flex-1">
                            <Text bold className="text-white">
                                {LocalizeText('hccenter.gift.title')}
                            </Text>
                            <Text
                                small
                                className="text-white/80"
                                dangerouslySetInnerHTML={{
                                    __html:
                                        unclaimedGifts > 0
                                            ? LocalizeText('hccenter.unclaimedgifts', ['unclaimedgifts'], [unclaimedGifts.toString()])
                                            : LocalizeText('hccenter.gift.info')
                                }}
                            />
                        </Column>
                        <Button
                            variant="primary"
                            className="shrink-0"
                            onClick={() => CreateLinkEvent('catalog/open/' + GetConfigurationValue('catalog.links')['hc.hc_gifts'])}
                        >
                            {LocalizeText(clubStatus === ClubStatus.ACTIVE ? 'hccenter.btn.gifts.redeem' : 'hccenter.btn.gifts.view')}
                        </Button>
                    </Flex>
                )}
                {GetConfigurationValue('hc.center')['benefits.info'] && (
                    <Column
                        className="rounded p-3 bg-no-repeat bg-right-top border border-card-grid-item-border"
                        gap={1}
                        style={{ backgroundImage: `url(${benefitsBg})` }}
                    >
                        <Text bold variant="primary">
                            {LocalizeText('hccenter.general.title')}
                        </Text>
                        <Text small className="text-gray-700" dangerouslySetInnerHTML={{ __html: LocalizeText('hccenter.general.info') }} />
                        <span
                            className="text-primary text-sm cursor-pointer hover:underline mt-1"
                            onClick={() => CreateLinkEvent('habbopages/' + GetConfigurationValue('hc.center')['benefits.habbopage'])}
                        >
                            {LocalizeText('hccenter.general.infolink')}
                        </span>
                    </Column>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
