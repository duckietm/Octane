import {
    AddLinkEventTracker,
    ILinkEventTracker,
    PurchaseNickIconComposer,
    RemoveLinkEventTracker,
    RequestNickIconsComposer,
    SetActiveNickIconComposer,
    UserNickIconsEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { INickIconItem, SendMessageComposer } from '../../api';
import { GetNickIconUrl } from '../../assets/images/user_custom/nick_icons';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text, UserIdentityView } from '../../common';
import { LayoutCurrencyIcon } from '../../common/layout/LayoutCurrencyIcon';
import { useMessageEvent } from '../../hooks';

export const CustomizeNickIconView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [iconItems, setIconItems] = useState<INickIconItem[]>([]);

    useMessageEvent<UserNickIconsEvent>(UserNickIconsEvent, (event) => {
        const parser = event.getParser();

        setIconItems(
            parser.nickIcons.map((icon) => ({
                id: icon.id,
                iconKey: icon.iconKey,
                displayName: icon.displayName,
                points: icon.points,
                pointsType: icon.pointsType,
                owned: icon.owned,
                active: icon.active
            }))
        );
        setIsLoading(false);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((previousValue) => !previousValue);
                        return;
                }
            },
            eventUrlPrefix: 'customize/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        setIsLoading(true);
        SendMessageComposer(new RequestNickIconsComposer());
    }, [isVisible]);

    const activeIcon = useMemo(() => iconItems.find((item) => item.active) || null, [iconItems]);

    const refreshCustomizeData = () => {
        setIsLoading(true);
        SendMessageComposer(new RequestNickIconsComposer());
    };

    const handleIconAction = (item: INickIconItem) => {
        setIsLoading(true);

        if (!item.owned) {
            SendMessageComposer(new PurchaseNickIconComposer(item.iconKey));
            return;
        }

        SendMessageComposer(new SetActiveNickIconComposer(item.active ? 0 : item.id));
    };

    if (!isVisible) return null;

    return (
        <OctaneCardView className="customize-nick-icon-window w-[680px] max-w-[95vw]" theme="primary-slim" uniqueKey="customize-nick-icons">
            <OctaneCardHeaderView headerText="Customize Nick Icon" onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView className="flex max-h-[78vh] flex-col gap-3 overflow-y-auto text-black">
                <div className="rounded border border-black/10 bg-black/5 p-3">
                    <div className="flex items-center justify-between">
                        <Text bold>Live preview</Text>
                        <Button disabled={isLoading} onClick={refreshCustomizeData}>
                            Refresh
                        </Button>
                    </div>
                    <div className="mt-2 flex min-h-[54px] items-center justify-center rounded border border-black/10 bg-[#cfe8fb] px-3 py-2 text-[#1f2937]">
                        <UserIdentityView nickIcon={activeIcon?.iconKey || ''} username="Username" />
                    </div>
                </div>
                <div className="rounded border border-black/10 bg-black/5 p-2 text-[11px] leading-4">
                    Choose the icon shown beside your username.
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {iconItems.map((item) => {
                        const iconUrl = GetNickIconUrl(item.iconKey);

                        return (
                            <div
                                key={item.iconKey}
                                className={`relative flex min-h-[126px] flex-col items-center justify-between gap-2 rounded border p-3 transition-colors ${item.active ? 'border-[#418db0] bg-[#dff3fb]' : 'border-black/10 bg-black/5'}`}
                            >
                                {item.active && (
                                    <span className="absolute right-1 top-1 rounded bg-[#418db0] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                        Active
                                    </span>
                                )}
                                <img className="h-auto max-h-[28px] w-auto object-contain" src={iconUrl} alt={item.iconKey} />
                                <div className="flex flex-col items-center gap-1 text-center text-[11px]">
                                    <span>{item.owned ? (item.active ? 'Owned - Active' : 'Owned') : 'Locked'}</span>
                                    <span className="max-w-[140px] truncate">{item.displayName || `Icon #${item.iconKey}`}</span>
                                    <span className="inline-flex items-center gap-1">
                                        <LayoutCurrencyIcon type={item.pointsType} />
                                        {item.points}
                                    </span>
                                </div>
                                <Button disabled={isLoading} onClick={() => handleIconAction(item)}>
                                    {!item.owned && 'Buy'}
                                    {item.owned && !item.active && 'Activate'}
                                    {item.owned && item.active && 'Deactivate'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
