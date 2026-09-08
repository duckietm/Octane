import type { IHotelViewLandingSlot } from '@octane/renderer';
import {
    ConcurrentUsersGoalProgressMessageEvent,
    GetConcurrentUsersGoalProgressMessageComposer,
    GetConcurrentUsersRewardMessageComposer,
    HabboWebTools
} from '@octane/renderer';
import { CSSProperties, FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, NotificationAlertType, SendMessageComposer } from '../../../api';
import { useMessageEvent, useNotification } from '../../../hooks';
import {
    CONCURRENT_USERS_UPDATE_INTERVAL_MS,
    ConcurrentUsersState,
    GenericWidgetElement,
    getConcurrentUsersBadgeUrl,
    getConcurrentUsersTextKeys,
    getRewardBadgeUrl,
    isGenericWidgetWideSlot,
    parseGenericWidgetConf,
    parseGenericWidgetLayout
} from '../hotelViewWidgets';

export interface HotelViewGenericWidgetProps {
    slot: IHotelViewLandingSlot;
    /** The dynamic slot number (1-6) the widget occupies; `isWideSlot` picks the pane width. */
    slotNumber: number;
    resolveImageUrl: (url: string) => string;
    onLinkClick: (link: string) => void;
}

interface ConcurrentUsersProgress {
    state: number;
    userCount: number;
    userCountGoal: number;
}

const CONCURRENT_USERS_PARAMETERS = ['userCount', 'userGoal', 'domain'];

const readSlotConfigString = (configJson: string, key: string): string => {
    try {
        const parsed = JSON.parse(configJson);
        const value = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[key] : undefined;

        return typeof value === 'string' ? value : '';
    } catch {
        return '';
    }
};

/**
 * `GenericWidget.as`: a column of elements declared by the official conf string
 * (`landing.view.<code>.conf`, `<element>,<arg>,...;...`) with an optional
 * bitmap placed by the layout string (`landing.view.<code>.layout`). The conf
 * and layout come from the slot configuration (`conf` / `layout`) or, like the
 * official client, from the `landing.view.dynamic.slot.<n>.*` properties.
 */
export const HotelViewGenericWidget: FC<HotelViewGenericWidgetProps> = (props) => {
    const { slot, slotNumber, resolveImageUrl, onLinkClick } = props;
    const { simpleAlert = null } = useNotification();
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const conf = readSlotConfigString(slot.configJson, 'conf') || GetConfigurationValue<string>(`landing.view.dynamic.slot.${slotNumber}.conf`, '');
    const layoutString = readSlotConfigString(slot.configJson, 'layout') || GetConfigurationValue<string>(`landing.view.dynamic.slot.${slotNumber}.layout`, '');
    const elements = parseGenericWidgetConf(conf);
    const layout = parseGenericWidgetLayout(layoutString);
    const concurrentUsersElement = elements.find((element) => element.type === 'concurrentusersinfo') ?? null;
    const [concurrentUsers, setConcurrentUsers] = useState<ConcurrentUsersProgress | null>(null);
    const [redeeming, setRedeeming] = useState(false);

    // ConcurrentUsersInfoElementHandler: request on initialize, then every 5 s
    // while the goal is still running (the timer stops once it is reached).
    useEffect(() => {
        if (!concurrentUsersElement) return;

        const request = () => SendMessageComposer(new GetConcurrentUsersGoalProgressMessageComposer());

        request();

        if (concurrentUsers && concurrentUsers.state >= ConcurrentUsersState.REDEEM) return;

        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;

            request();
        }, CONCURRENT_USERS_UPDATE_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [!!concurrentUsersElement, concurrentUsers?.state]);

    useMessageEvent<ConcurrentUsersGoalProgressMessageEvent>(ConcurrentUsersGoalProgressMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setConcurrentUsers({ state: parser.state, userCount: parser.userCount, userCountGoal: parser.userCountGoal });
        setRedeeming(false);
    });

    const concurrentUsersReplacements = concurrentUsers
        ? [String(concurrentUsers.userCount), String(concurrentUsers.userCountGoal), localizeWithFallback('landing.view.hotel.domain', 'Habbo')]
        : null;
    const textKeyOverrides = concurrentUsersElement && concurrentUsers ? getConcurrentUsersTextKeys(concurrentUsers.state) : null;

    const localizeElement = (key: string) =>
        concurrentUsersReplacements ? LocalizeText(key, CONCURRENT_USERS_PARAMETERS, concurrentUsersReplacements) : LocalizeText(key);

    const openExternalLink = (url: string) => {
        // class_4277: the external-link alert, then the page.
        simpleAlert?.(
            LocalizeText('catalog.alert.external.link.desc'),
            NotificationAlertType.DEFAULT,
            null,
            null,
            LocalizeText('catalog.alert.external.link.title')
        );
        HabboWebTools.openWebPage(url);
    };

    const redeemConcurrentUsersReward = () => {
        // ConcurrentUsersInfoElementHandler.onClick: claim, refresh, disable the button.
        setRedeeming(true);
        SendMessageComposer(new GetConcurrentUsersRewardMessageComposer());
        SendMessageComposer(new GetConcurrentUsersGoalProgressMessageComposer());
    };

    const renderConcurrentUsers = (element: GenericWidgetElement) => {
        if (!concurrentUsers) return null;

        const badgeCode = element.args[2] || undefined;
        const achieved = concurrentUsers.state === ConcurrentUsersState.REDEEM || concurrentUsers.state === ConcurrentUsersState.REWARDED;

        if (!achieved) {
            return (
                <p key="concurrentusersinfo" className="hotelview-generic__concurrent-users">
                    {localizeElement(element.args[1] || 'landing.view.concurrentusers.info')}
                </p>
            );
        }

        return (
            <div key="concurrentusersinfo" className="hotelview-generic__concurrent-users-achieved">
                <div className="hotelview-generic__reward-badge">
                    <img src={getConcurrentUsersBadgeUrl(imageLibraryUrl, badgeCode)} alt="" />
                    <span>{localizeElement('landing.view.concurrentusers.reward')}</span>
                </div>
                {concurrentUsers.state === ConcurrentUsersState.REDEEM && (
                    <button type="button" className="hotelview-widget-button" disabled={redeeming} onClick={redeemConcurrentUsersReward}>
                        {LocalizeText('landing.view.concurrentusers.redeem')}
                    </button>
                )}
            </div>
        );
    };

    const renderElement = (element: GenericWidgetElement, index: number) => {
        const key = `${element.type}-${index}`;
        const [, textKey = '', extra = ''] = element.args;

        switch (element.type) {
            case 'title':
                return (
                    <div key={key} className="hotelview-widget-header">
                        <i className="hotelview-widget-header__bar" aria-hidden="true" />
                        <span className="hotelview-widget-header__text">{LocalizeText(textKey)}</span>
                        <i className="hotelview-widget-header__line" aria-hidden="true" />
                    </div>
                );
            case 'caption': {
                const width = Number.parseInt(extra, 10);
                const style: CSSProperties | undefined = Number.isFinite(width) ? { width: `${width}px` } : undefined;

                return (
                    <h2 key={key} className="hotelview-generic__caption" style={style}>
                        {localizeElement(textKeyOverrides?.caption ?? textKey)}
                    </h2>
                );
            }
            case 'subcaption':
                return (
                    <h3 key={key} className="hotelview-generic__subcaption">
                        {localizeElement(textKey)}
                    </h3>
                );
            case 'bodytext':
                return (
                    <p key={key} className="hotelview-generic__bodytext">
                        {localizeElement(textKeyOverrides?.bodytext ?? textKey)}
                    </p>
                );
            case 'spacing':
                return <div key={key} className="hotelview-generic__spacing" style={{ height: `${Number.parseInt(textKey, 10) || 0}px` }} />;
            case 'catalogbutton':
                return (
                    <button
                        key={key}
                        type="button"
                        className="hotelview-widget-button"
                        onClick={() => onLinkClick(extra ? `catalog/open/${extra}` : 'catalog/open')}
                    >
                        {LocalizeText(textKey)}
                    </button>
                );
            case 'gotoroombutton':
                return (
                    <button key={key} type="button" className="hotelview-widget-button" onClick={() => onLinkClick(`navigator/goto/${extra}`)}>
                        {LocalizeText(textKey)}
                    </button>
                );
            case 'gotohomeroombutton':
                return (
                    <button key={key} type="button" className="hotelview-widget-button" onClick={() => onLinkClick('navigator/goto/home')}>
                        {LocalizeText(textKey)}
                    </button>
                );
            case 'internallinkbutton':
                return (
                    <button key={key} type="button" className="hotelview-widget-button" onClick={() => onLinkClick(extra)}>
                        {LocalizeText(textKey)}
                    </button>
                );
            case 'link':
                return (
                    <button key={key} type="button" className="hotelview-generic__link" onClick={() => openExternalLink(extra)}>
                        {LocalizeText(textKey)}
                    </button>
                );
            case 'rewardbadge':
                return (
                    <div key={key} className="hotelview-generic__reward-badge">
                        <img src={getRewardBadgeUrl(imageLibraryUrl, textKey)} alt="" />
                        <span />
                    </div>
                );
            case 'image':
                return (
                    <img
                        key={key}
                        className="hotelview-generic__image"
                        src={`${imageLibraryUrl}${textKey}`}
                        alt=""
                        style={{ marginLeft: `${Number.parseInt(extra, 10) || 0}px` }}
                    />
                );
            case 'concurrentusersinfo':
                return renderConcurrentUsers(element);
            default:
                return null;
        }
    };

    const rootStyle: CSSProperties = {
        width: isGenericWidgetWideSlot(slotNumber) ? undefined : '250px',
        minHeight: layout.containerHeight ? `${layout.containerHeight}px` : undefined
    };
    const contentStyle: CSSProperties = {
        left: `${layout.contentX ?? (isGenericWidgetWideSlot(slotNumber) ? 230 : 0)}px`,
        top: `${layout.contentY ?? 0}px`,
        width: layout.contentWidth ? `${layout.contentWidth}px` : undefined
    };
    const bitmapUri = layout.bitmapUri || slot.imageUrl;
    const bitmapStyle: CSSProperties = {
        left: `${layout.bitmapX ?? 10}px`,
        top: `${layout.bitmapY ?? 10}px`,
        width: layout.bitmapWidth ? `${layout.bitmapWidth}px` : undefined,
        height: layout.bitmapHeight ? `${layout.bitmapHeight}px` : undefined
    };

    return (
        <div className="hotelview-generic" style={rootStyle}>
            {bitmapUri && <img className="hotelview-generic__bitmap" src={resolveImageUrl(bitmapUri)} alt="" style={bitmapStyle} />}
            <div className="hotelview-generic__content" style={contentStyle}>
                {elements.map(renderElement)}
            </div>
        </div>
    );
};
