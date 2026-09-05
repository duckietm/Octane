import {
    AddLinkEventTracker,
    CustomPrefixPurchaseFailedEvent,
    ILinkEventTracker,
    PurchaseCatalogPrefixComposer,
    PurchaseNickIconComposer,
    PurchasePrefixComposer,
    RemoveLinkEventTracker,
    RequestNickIconsComposer,
    SetActiveNickIconComposer,
    SetActivePrefixComposer,
    SetDisplayOrderComposer,
    UserNickIconsEvent
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import {
    getPrefixEffectStyle,
    getPrefixFontStyle,
    INickIconItem,
    IPrefixItem,
    PRESET_PREFIX_EFFECTS,
    PRESET_PREFIX_FONTS,
    parsePrefixColors,
    SendMessageComposer
} from '../../api';
import { GetNickIconUrl } from '../../assets/images/user_custom/nick_icons';
import {
    Button,
    OctaneCardContentView,
    OctaneCardHeaderView,
    OctaneCardTabsItemView,
    OctaneCardTabsView,
    OctaneCardView,
    Text,
    UserIdentityView
} from '../../common';
import { LazyEmojiPicker } from '../../common/LazyEmojiPicker';
import { LayoutCurrencyIcon } from '../../common/layout/LayoutCurrencyIcon';
import { useMessageEvent } from '../../hooks';

type CustomizeTab = 'icons' | 'prefix' | 'settings';
type PrefixSubTab = 'library' | 'custom';

interface ICatalogPrefixItem extends IPrefixItem {
    points: number;
    pointsType: number;
    owned: boolean;
    ownedPrefixId: number;
}

interface ICombinedPrefixItem extends IPrefixItem {
    points: number;
    pointsType: number;
    owned: boolean;
    ownedPrefixId: number;
}

const ORDER_LABELS: Record<string, string> = {
    'icon-prefix-name': 'Icon / Prefix / Name',
    'prefix-icon-name': 'Prefix / Icon / Name',
    'name-icon-prefix': 'Name / Icon / Prefix',
    'name-prefix-icon': 'Name / Prefix / Icon',
    'icon-name-prefix': 'Icon / Name / Prefix',
    'prefix-name-icon': 'Prefix / Name / Icon'
};

const PRESET_COLORS: string[] = [
    '#D62828',
    '#E85D04',
    '#F77F00',
    '#2A9D8F',
    '#0077B6',
    '#4361EE',
    '#6A4C93',
    '#C1121F',
    '#B5179E',
    '#3A86FF',
    '#3F8E00',
    '#8D5524'
];

export const CustomizeNickIconView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<CustomizeTab>('icons');
    const [activePrefixSubTab, setActivePrefixSubTab] = useState<PrefixSubTab>('library');
    const [iconItems, setIconItems] = useState<INickIconItem[]>([]);
    const [prefixItems, setPrefixItems] = useState<IPrefixItem[]>([]);
    const [catalogPrefixes, setCatalogPrefixes] = useState<ICatalogPrefixItem[]>([]);
    const [displayOrder, setDisplayOrder] = useState('icon-prefix-name');
    const [customPrefixMaxLength, setCustomPrefixMaxLength] = useState(15);
    const [customPrefixPriceCredits, setCustomPrefixPriceCredits] = useState(0);
    const [customPrefixPricePoints, setCustomPrefixPricePoints] = useState(0);
    const [customPrefixPointsType, setCustomPrefixPointsType] = useState(0);
    const [customPrefixFontPriceCredits, setCustomPrefixFontPriceCredits] = useState(0);
    const [customPrefixFontPricePoints, setCustomPrefixFontPricePoints] = useState(0);
    const [customPrefixFontPointsType, setCustomPrefixFontPointsType] = useState(0);
    const [customPrefixText, setCustomPrefixText] = useState('');
    const [customPrefixColor, setCustomPrefixColor] = useState('#FFFFFF');
    const [customPrefixIcon, setCustomPrefixIcon] = useState('');
    const [customPrefixEffect, setCustomPrefixEffect] = useState('');
    const [customPrefixFont, setCustomPrefixFont] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useMessageEvent<CustomPrefixPurchaseFailedEvent>(CustomPrefixPurchaseFailedEvent, () => {
        setIsLoading(false);
        setIsVisible(false);
    });

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
        setPrefixItems(
            parser.ownedPrefixes.map((prefix) => ({
                id: prefix.id,
                displayName: prefix.displayName,
                text: prefix.text,
                color: prefix.color,
                icon: prefix.icon || '',
                effect: prefix.effect || '',
                font: prefix.font || '',
                active: prefix.active,
                isCustom: prefix.isCustom,
                points: prefix.points,
                pointsType: prefix.pointsType,
                catalogPrefixId: prefix.catalogPrefixId
            }))
        );
        setCatalogPrefixes(
            parser.prefixCatalog.map((prefix) => ({
                id: prefix.id,
                displayName: prefix.displayName,
                text: prefix.text,
                color: prefix.color,
                icon: prefix.icon || '',
                effect: prefix.effect || '',
                font: prefix.font || '',
                active: prefix.active,
                points: prefix.points,
                pointsType: prefix.pointsType,
                owned: prefix.owned,
                ownedPrefixId: prefix.ownedPrefixId
            }))
        );
        setDisplayOrder(parser.displayOrder || 'icon-prefix-name');
        setCustomPrefixMaxLength(parser.customPrefixMaxLength || 15);
        setCustomPrefixPriceCredits(parser.customPrefixPriceCredits || 0);
        setCustomPrefixPricePoints(parser.customPrefixPricePoints || 0);
        setCustomPrefixPointsType(parser.customPrefixPointsType || 0);
        setCustomPrefixFontPriceCredits(parser.customPrefixFontPriceCredits || 0);
        setCustomPrefixFontPricePoints(parser.customPrefixFontPricePoints || 0);
        setCustomPrefixFontPointsType(parser.customPrefixFontPointsType || 0);
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
    const activePrefix = useMemo(() => prefixItems.find((item) => item.active) || null, [prefixItems]);
    const combinedPrefixes = useMemo(() => {
        const ownedByCatalogId = new Map<number, IPrefixItem>();

        for (const prefix of prefixItems) {
            if (prefix.catalogPrefixId && prefix.catalogPrefixId > 0) ownedByCatalogId.set(prefix.catalogPrefixId, prefix);
        }

        const catalogEntries: ICombinedPrefixItem[] = catalogPrefixes.map((prefix) => {
            const ownedPrefix = ownedByCatalogId.get(prefix.id);

            return {
                id: ownedPrefix?.id || prefix.id,
                displayName: ownedPrefix?.displayName || prefix.displayName,
                text: ownedPrefix?.text || prefix.text,
                color: ownedPrefix?.color || prefix.color,
                icon: ownedPrefix?.icon || prefix.icon,
                effect: ownedPrefix?.effect || prefix.effect,
                font: ownedPrefix?.font || prefix.font,
                active: ownedPrefix?.active || prefix.active,
                isCustom: false,
                points: prefix.points,
                pointsType: prefix.pointsType,
                catalogPrefixId: prefix.id,
                owned: prefix.owned || !!ownedPrefix,
                ownedPrefixId: prefix.ownedPrefixId || ownedPrefix?.id || 0
            };
        });

        const customEntries: ICombinedPrefixItem[] = prefixItems
            .filter((prefix) => !prefix.catalogPrefixId || prefix.catalogPrefixId <= 0)
            .map((prefix) => ({
                id: prefix.id,
                displayName: prefix.displayName,
                text: prefix.text,
                color: prefix.color,
                icon: prefix.icon,
                effect: prefix.effect,
                font: prefix.font || '',
                active: prefix.active,
                isCustom: true,
                points: prefix.points || customPrefixPricePoints,
                pointsType: prefix.pointsType || customPrefixPointsType,
                catalogPrefixId: 0,
                owned: true,
                ownedPrefixId: prefix.id
            }));

        return [...catalogEntries, ...customEntries];
    }, [catalogPrefixes, customPrefixPointsType, customPrefixPricePoints, prefixItems]);
    const selectedEffectOption = useMemo(
        () => PRESET_PREFIX_EFFECTS.find((effect) => effect.id === customPrefixEffect) || PRESET_PREFIX_EFFECTS[0],
        [customPrefixEffect]
    );
    const selectedFontOption = useMemo(() => PRESET_PREFIX_FONTS.find((font) => font.id === customPrefixFont) || PRESET_PREFIX_FONTS[0], [customPrefixFont]);
    const basicEffects = useMemo(() => PRESET_PREFIX_EFFECTS.filter((effect) => effect.tier === 'basic'), []);
    const premiumEffects = useMemo(() => PRESET_PREFIX_EFFECTS.filter((effect) => effect.tier === 'premium'), []);
    const basicFonts = useMemo(() => PRESET_PREFIX_FONTS.filter((font) => font.tier === 'basic'), []);
    const premiumFonts = useMemo(() => PRESET_PREFIX_FONTS.filter((font) => font.tier === 'premium'), []);
    const prefixPreviewColors = useMemo(
        () => parsePrefixColors(customPrefixText || 'Preview', customPrefixColor || '#FFFFFF'),
        [customPrefixText, customPrefixColor]
    );
    const customPrefixPreviewStyle = useMemo(
        () => getPrefixEffectStyle(customPrefixEffect, prefixPreviewColors[0] || '#FFFFFF'),
        [customPrefixEffect, prefixPreviewColors]
    );
    const customPrefixFontStyle = useMemo(() => getPrefixFontStyle(customPrefixFont), [customPrefixFont]);
    const customPrefixTotalCredits = useMemo(
        () => customPrefixPriceCredits + (customPrefixFont ? customPrefixFontPriceCredits : 0),
        [customPrefixFont, customPrefixFontPriceCredits, customPrefixPriceCredits]
    );
    const customPrefixTotalPoints = useMemo(
        () => customPrefixPricePoints + (customPrefixFont && customPrefixFontPointsType === customPrefixPointsType ? customPrefixFontPricePoints : 0),
        [customPrefixFont, customPrefixFontPointsType, customPrefixFontPricePoints, customPrefixPointsType, customPrefixPricePoints]
    );
    const customPrefixIsValid = useMemo(() => {
        const trimmed = customPrefixText.trim();

        if (!trimmed.length || trimmed.length > customPrefixMaxLength) return false;

        return customPrefixColor.split(',').every((color) => /^#[0-9A-Fa-f]{6}$/.test(color));
    }, [customPrefixColor, customPrefixMaxLength, customPrefixText]);

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

    const handleCombinedPrefixAction = (item: ICombinedPrefixItem) => {
        setIsLoading(true);

        if (item.owned) {
            SendMessageComposer(new SetActivePrefixComposer(item.active ? 0 : item.ownedPrefixId));
            return;
        }

        SendMessageComposer(new PurchaseCatalogPrefixComposer(item.catalogPrefixId || item.id));
    };

    const handleCustomPrefixPurchase = () => {
        if (!customPrefixIsValid) return;

        setIsLoading(true);
        SendMessageComposer(new PurchasePrefixComposer(customPrefixText.trim(), customPrefixColor, customPrefixIcon, customPrefixEffect, customPrefixFont));
    };

    const handleDisplayOrderChange = (nextDisplayOrder: string) => {
        if (nextDisplayOrder === displayOrder) return;

        setDisplayOrder(nextDisplayOrder);
        setIsLoading(true);
        SendMessageComposer(new SetDisplayOrderComposer(nextDisplayOrder));
    };

    if (!isVisible) return null;

    return (
        <OctaneCardView className="customize-nick-icon-window w-[680px] max-w-[95vw]" theme="primary-slim" uniqueKey="customize-nick-icons">
            <OctaneCardHeaderView headerText="Customize Bubble Identity" onCloseClick={() => setIsVisible(false)} />
            <OctaneCardTabsView>
                <OctaneCardTabsItemView isActive={activeTab === 'icons'} onClick={() => setActiveTab('icons')}>
                    <Text>Icons</Text>
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={activeTab === 'prefix'} onClick={() => setActiveTab('prefix')}>
                    <Text>Prefix</Text>
                </OctaneCardTabsItemView>
                <OctaneCardTabsItemView isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
                    <Text>Settings</Text>
                </OctaneCardTabsItemView>
            </OctaneCardTabsView>
            <OctaneCardContentView className="flex max-h-[78vh] flex-col gap-3 overflow-y-auto text-black">
                <div className="rounded border border-black/10 bg-black/5 p-3">
                    <Text bold>Live preview</Text>
                    <div className="mt-2 flex min-h-[54px] items-center justify-center rounded border border-black/10 bg-[#cfe8fb] px-3 py-2 text-[#1f2937]">
                        <UserIdentityView
                            displayOrder={displayOrder}
                            nickIcon={activeIcon?.iconKey || ''}
                            prefixColor={activePrefix?.color || customPrefixColor}
                            prefixEffect={activePrefix?.effect || customPrefixEffect}
                            prefixFont={activePrefix?.font || customPrefixFont}
                            prefixIcon={activePrefix?.icon || customPrefixIcon}
                            prefixText={activePrefix?.text || customPrefixText}
                            username="Username"
                        />
                    </div>
                </div>

                {activeTab === 'icons' && (
                    <>
                        <div className="rounded border border-black/10 bg-black/5 p-2 text-[11px] leading-4">
                            Choose the icon shown in your bubble identity.
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
                    </>
                )}

                {activeTab === 'prefix' && (
                    <div className="flex flex-col gap-3">
                        <div className="rounded border border-black/10 bg-black/5 p-1">
                            <div className="flex items-center gap-2">
                                <button
                                    className={`rounded px-3 py-1.5 text-[11px] font-bold transition-colors ${activePrefixSubTab === 'library' ? 'bg-[#418db0] text-white' : 'bg-white text-black'}`}
                                    type="button"
                                    onClick={() => setActivePrefixSubTab('library')}
                                >
                                    Library
                                </button>
                                <button
                                    className={`rounded px-3 py-1.5 text-[11px] font-bold transition-colors ${activePrefixSubTab === 'custom' ? 'bg-[#418db0] text-white' : 'bg-white text-black'}`}
                                    type="button"
                                    onClick={() => setActivePrefixSubTab('custom')}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {activePrefixSubTab === 'library' && (
                            <>
                                <div className="rounded border border-black/10 bg-black/5 p-2 text-[11px] leading-4">
                                    Choose a preset or custom prefix for your bubble identity.
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {combinedPrefixes.map((item) => (
                                        <div
                                            key={`${item.catalogPrefixId || 'custom'}-${item.ownedPrefixId || item.id}`}
                                            className={`relative flex min-h-[96px] flex-col gap-2 rounded border p-2.5 ${item.active ? 'border-[#418db0] bg-[#dff3fb]' : 'border-black/10 bg-black/5'}`}
                                        >
                                            {item.active && (
                                                <span className="absolute right-1 top-1 rounded bg-[#418db0] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                                                    Active
                                                </span>
                                            )}
                                            <UserIdentityView
                                                displayOrder={displayOrder}
                                                nickIcon={activeIcon?.iconKey || ''}
                                                prefixColor={item.color}
                                                prefixEffect={item.effect}
                                                prefixFont={item.font || ''}
                                                prefixIcon={item.icon}
                                                prefixText={item.text}
                                                username="Username"
                                            />
                                            <div className="flex flex-col gap-1 text-[11px]">
                                                <span>{item.owned ? (item.active ? 'Owned - Active' : 'Owned') : 'Locked'}</span>
                                                <span className="truncate">
                                                    {item.displayName || item.text}
                                                    {item.isCustom ? ' - Custom' : ''}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <LayoutCurrencyIcon type={item.pointsType} />
                                                    {item.points}
                                                </span>
                                            </div>
                                            <Button disabled={isLoading} onClick={() => handleCombinedPrefixAction(item)}>
                                                {!item.owned && 'Buy'}
                                                {item.owned && !item.active && 'Activate'}
                                                {item.owned && item.active && 'Deactivate'}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {activePrefixSubTab === 'custom' && (
                            <div className="rounded border border-black/10 bg-black/5 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <Text bold>Custom prefix</Text>
                                    <Button disabled={isLoading} onClick={refreshCustomizeData}>
                                        Refresh
                                    </Button>
                                </div>
                                <div className="mt-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            className="flex-1 rounded border border-black/10 bg-white px-3 py-2 text-sm"
                                            maxLength={customPrefixMaxLength}
                                            placeholder="Enter your prefix"
                                            type="text"
                                            value={customPrefixText}
                                            onChange={(event) => setCustomPrefixText(event.target.value)}
                                        />
                                        <span className="text-[11px] text-black/60">
                                            {customPrefixText.length}/{customPrefixMaxLength}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            className="rounded border border-black/10 bg-white px-3 py-2 text-sm"
                                            type="button"
                                            onClick={() => setShowEmojiPicker(true)}
                                        >
                                            {customPrefixIcon || 'Emoji'}
                                        </button>
                                        {!!customPrefixIcon && <Button onClick={() => setCustomPrefixIcon('')}>Clear</Button>}
                                    </div>
                                    <div className="rounded border border-black/10 bg-white p-2">
                                        <div className="mb-2 text-[11px] leading-4 text-black/70">
                                            Safe colors only, chosen to stay readable on both light and dark backgrounds.
                                        </div>
                                        <div className="grid grid-cols-6 gap-2">
                                            {PRESET_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    className={`flex h-[28px] items-center justify-center rounded border text-[10px] font-bold uppercase ${customPrefixColor === color ? 'border-[#418db0] ring-1 ring-[#418db0]' : 'border-black/10'}`}
                                                    style={{ backgroundColor: color }}
                                                    type="button"
                                                    onClick={() => setCustomPrefixColor(color)}
                                                >
                                                    {customPrefixColor === color ? 'ON' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded border border-black/10 bg-white p-2">
                                        <div className="mb-2 text-[11px] leading-4 text-black/70">Effect</div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="flex-1 rounded border border-black/10 bg-white px-2 py-2 text-sm"
                                                value={customPrefixEffect}
                                                onChange={(event) => setCustomPrefixEffect(event.target.value)}
                                            >
                                                <optgroup label="Basic">
                                                    {basicEffects.map((effect) => (
                                                        <option key={effect.id || 'none'} value={effect.id}>
                                                            {effect.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Premium">
                                                    {premiumEffects.map((effect) => (
                                                        <option key={effect.id} value={effect.id}>
                                                            {effect.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            <div className="min-w-[130px] rounded border border-black/10 bg-black/5 px-2 py-2 text-center text-[11px] font-bold">
                                                {selectedEffectOption.icon} {selectedEffectOption.label}
                                                <div className="mt-1 text-[9px] uppercase text-black/60">{selectedEffectOption.tier}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded border border-black/10 bg-white p-2">
                                        <div className="mb-2 text-[11px] leading-4 text-black/70">Font</div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="flex-1 rounded border border-black/10 bg-white px-2 py-2 text-sm"
                                                value={customPrefixFont}
                                                onChange={(event) => setCustomPrefixFont(event.target.value)}
                                            >
                                                <optgroup label="Basic">
                                                    {basicFonts.map((font) => (
                                                        <option key={font.id || 'default'} value={font.id}>
                                                            {font.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Premium">
                                                    {premiumFonts.map((font) => (
                                                        <option key={font.id} value={font.id}>
                                                            {font.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            <div className="min-w-[130px] rounded border border-black/10 bg-black/5 px-2 py-2 text-center text-[11px] font-bold">
                                                <span style={customPrefixFontStyle}>{selectedFontOption.label}</span>
                                                <div className="mt-1 text-[9px] uppercase text-black/60">{selectedFontOption.tier}</div>
                                            </div>
                                        </div>
                                        {!!customPrefixFont && (
                                            <div className="mt-2 text-[10px] leading-4 text-black/60">
                                                Premium fonts add an extra price on top of the custom prefix.
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded border border-black/10 bg-[#cfe8fb] px-3 py-2 text-[#1f2937]" style={customPrefixPreviewStyle}>
                                        <UserIdentityView
                                            displayOrder={displayOrder}
                                            nickIcon={activeIcon?.iconKey || ''}
                                            prefixColor={customPrefixColor}
                                            prefixEffect={customPrefixEffect}
                                            prefixFont={customPrefixFont}
                                            prefixIcon={customPrefixIcon}
                                            prefixText={customPrefixText || 'Preview'}
                                            username="Username"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[12px]">
                                            {customPrefixTotalCredits > 0 && <span>{customPrefixTotalCredits} credits</span>}
                                            {customPrefixTotalPoints > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <LayoutCurrencyIcon type={customPrefixPointsType} />
                                                    {customPrefixTotalPoints}
                                                </span>
                                            )}
                                            {!!customPrefixFont && customPrefixFontPointsType !== customPrefixPointsType && customPrefixFontPricePoints > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <LayoutCurrencyIcon type={customPrefixFontPointsType} />
                                                    {customPrefixFontPricePoints}
                                                </span>
                                            )}
                                        </div>
                                        <Button disabled={!customPrefixIsValid || isLoading} onClick={handleCustomPrefixPurchase}>
                                            Buy custom prefix
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="flex flex-col gap-3">
                        <div className="rounded border border-black/10 bg-black/5 p-3">
                            <Text bold>Display order</Text>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {Object.entries(ORDER_LABELS).map(([key, label]) => (
                                    <Button key={key} disabled={isLoading && displayOrder === key} onClick={() => handleDisplayOrderChange(key)}>
                                        {displayOrder === key ? '* ' : ''}
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="rounded border border-black/10 bg-black/5 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <Text bold>Refresh data</Text>
                                <Button disabled={isLoading} onClick={refreshCustomizeData}>
                                    Refresh
                                </Button>
                            </div>
                            <div className="text-[11px] leading-4 text-black/70">
                                Use this tab to control how your icon, prefix and username are ordered in bubbles, profile and infostand.
                            </div>
                        </div>
                    </div>
                )}
            </OctaneCardContentView>
            {showEmojiPicker && (
                <>
                    <div className="fixed inset-0 z-[999]" onClick={() => setShowEmojiPicker(false)} />
                    <div className="fixed left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-2xl">
                        <LazyEmojiPicker
                            locale="en"
                            onEmojiSelect={(emoji: { native: string }) => {
                                setCustomPrefixIcon(emoji.native);
                                setShowEmojiPicker(false);
                            }}
                            previewPosition="none"
                            set="native"
                            theme="dark"
                        />
                    </div>
                </>
            )}
        </OctaneCardView>
    );
};
