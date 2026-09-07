import { FC, useEffect, useMemo, useState } from 'react';
import { FaTrashAlt } from 'react-icons/fa';
import { getPrefixEffectStyle, getPrefixFontStyle, IPrefixItem, LocalizeText, parsePrefixColors } from '../../../../api';
import { GetNickIconUrl } from '../../../../assets/images/user_custom/nick_icons';
import { Button } from '../../../../common';
import { useInventoryNickIcons, useInventoryPrefixes, useNotification } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';

type InventoryIdentityTab = 'prefixes' | 'icons';

const PrefixPreview: FC<{ text: string; color: string; icon: string; effect?: string; font?: string; className?: string; textSize?: string }> = ({
    text,
    color,
    icon,
    effect = '',
    font = '',
    className = '',
    textSize = 'text-sm'
}) => {
    const colors = parsePrefixColors(text, color);
    const hasMultiColor = colors.length > 1 && new Set(colors).size > 1;
    const fxStyle = getPrefixEffectStyle(effect, colors[0] || '#FFFFFF');
    const fontStyle = getPrefixFontStyle(font);

    return (
        <span className={`font-bold ${textSize} ${className}`} style={{ ...fontStyle, ...fxStyle }}>
            {icon && <span className="mr-0.5">{icon}</span>}
            <span style={hasMultiColor ? { ...fontStyle, ...fxStyle } : { ...fontStyle, ...fxStyle, color: colors[0] || '#FFFFFF' }}>
                {'{'}
                {hasMultiColor
                    ? [...text].map((char, i) => (
                          <span key={i} style={{ ...fontStyle, color: colors[i] || colors[colors.length - 1], ...getPrefixEffectStyle(effect, colors[i]) }}>
                              {char}
                          </span>
                      ))
                    : text}
                {'}'}
            </span>
        </span>
    );
};

const PrefixItemView: FC<{
    prefix: IPrefixItem;
    isSelected: boolean;
    onClick: () => void;
}> = ({ prefix, isSelected, onClick }) => {
    return (
        <div
            className={`flex items-center justify-center rounded-md border-2 cursor-pointer p-2 transition-colors
                ${isSelected ? 'border-card-grid-item-active bg-card-grid-item-active' : 'border-card-grid-item-border bg-card-grid-item'}
                ${prefix.active ? 'ring-2 ring-green-400' : ''}`}
            onClick={onClick}
        >
            <PrefixPreview className="truncate" color={prefix.color} effect={prefix.effect} font={prefix.font} icon={prefix.icon} text={prefix.text} />
        </div>
    );
};

const NickIconItemView: FC<{
    iconKey: string;
    displayName: string;
    isSelected: boolean;
    isActive: boolean;
    onClick: () => void;
}> = ({ iconKey, displayName, isSelected, isActive, onClick }) => {
    return (
        <div
            className={`relative flex cursor-pointer items-center justify-center rounded-md border-2 p-2 transition-colors
                ${isSelected ? 'border-card-grid-item-active bg-card-grid-item-active' : 'border-card-grid-item-border bg-card-grid-item'}
                ${isActive ? 'ring-2 ring-green-400' : ''}`}
            onClick={onClick}
        >
            {isActive && <span className="absolute right-1 top-1 rounded bg-[#15954c] px-1 py-0.5 text-[8px] font-bold uppercase text-white">Active</span>}
            <div className="flex flex-col items-center gap-1">
                <img className="h-auto max-h-[28px] w-auto object-contain" src={GetNickIconUrl(iconKey)} alt={displayName || iconKey} />
                <span className="max-w-[90px] truncate text-center text-[11px] font-bold">{displayName || iconKey}</span>
            </div>
        </div>
    );
};

export const InventoryPrefixView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<InventoryIdentityTab>('prefixes');
    const {
        prefixes = [],
        activePrefix = null,
        selectedPrefix = null,
        setSelectedPrefix = null,
        activatePrefix = null,
        deactivatePrefix = null,
        deletePrefix = null,
        activate = null,
        deactivate = null
    } = useInventoryPrefixes();
    const {
        nickIcons = [],
        activeNickIcon = null,
        selectedNickIcon = null,
        setSelectedNickIcon = null,
        activateNickIcon = null,
        deactivateNickIcon = null,
        activate: activateNickIcons = null,
        deactivate: deactivateNickIcons = null
    } = useInventoryNickIcons();
    const { showConfirm = null } = useNotification();
    const hasPrefixes = prefixes && prefixes.length > 0;
    const hasNickIcons = nickIcons && nickIcons.length > 0;
    const selectedIconUrl = useMemo(() => (selectedNickIcon ? GetNickIconUrl(selectedNickIcon.iconKey) : ''), [selectedNickIcon]);

    const attemptDeletePrefix = () => {
        if (!selectedPrefix) return;

        showConfirm(
            `Are you sure you want to delete the prefix {${selectedPrefix.text}}?`,
            () => deletePrefix(selectedPrefix.id),
            null,
            null,
            null,
            LocalizeText('inventory.delete.confirm_delete.title')
        );
    };

    useEffect(() => {
        if (!isVisible) return;

        const prefixVisibilityId = activate();
        const iconVisibilityId = activateNickIcons();

        return () => {
            deactivate(prefixVisibilityId);
            deactivateNickIcons(iconVisibilityId);
        };
    }, [isVisible, activate, activateNickIcons, deactivate, deactivateNickIcons]);

    useEffect(() => {
        setIsVisible(true);

        return () => setIsVisible(false);
    }, []);

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="shrink-0 rounded border border-black/10 bg-[#C9C9C9] p-1">
                <div className="flex items-center gap-2">
                    <button
                        className={`rounded px-3 py-1.5 text-[11px] font-bold transition-colors ${activeTab === 'prefixes' ? 'bg-[#418db0] text-white' : 'bg-white text-black'}`}
                        type="button"
                        onClick={() => setActiveTab('prefixes')}
                    >
                        Prefixes
                    </button>
                    <button
                        className={`rounded px-3 py-1.5 text-[11px] font-bold transition-colors ${activeTab === 'icons' ? 'bg-[#418db0] text-white' : 'bg-white text-black'}`}
                        type="button"
                        onClick={() => setActiveTab('icons')}
                    >
                        Icons
                    </button>
                </div>
            </div>

            {activeTab === 'prefixes' && (
                <div className="grid h-full grid-cols-12 gap-2">
                    <div className="col-span-7 flex flex-col gap-1 overflow-auto pr-1">
                        <div className="grid grid-cols-3 gap-1">
                            {prefixes.map((prefix) => (
                                <PrefixItemView
                                    key={prefix.id}
                                    isSelected={selectedPrefix?.id === prefix.id}
                                    prefix={prefix}
                                    onClick={() => setSelectedPrefix(prefix)}
                                />
                            ))}
                        </div>
                        {!hasPrefixes && (
                            <div className="flex h-full items-center justify-center text-sm opacity-50">{LocalizeText('inventory.empty.title')}</div>
                        )}
                    </div>
                    <div className="col-span-5 flex flex-col justify-between overflow-auto">
                        {activePrefix && (
                            <div className="flex flex-col gap-1">
                                <span className="min-h-[1.25rem] truncate text-sm leading-5">Active prefix</span>
                                <div className="flex items-center justify-center rounded-md border-2 border-green-400 bg-card-grid-item p-3">
                                    <PrefixPreview
                                        color={activePrefix.color}
                                        effect={activePrefix.effect}
                                        font={activePrefix.font}
                                        icon={activePrefix.icon}
                                        text={activePrefix.text}
                                        textSize="text-lg"
                                    />
                                </div>
                            </div>
                        )}
                        {!activePrefix && (
                            <div className="flex flex-col gap-1">
                                <span className="min-h-[1.25rem] truncate text-sm leading-5">Active prefix</span>
                                <div className="flex items-center justify-center rounded-md border-2 border-dashed border-card-grid-item-border bg-card-grid-item p-3 opacity-50">
                                    <span className="text-sm">No active prefix</span>
                                </div>
                            </div>
                        )}
                        {!!selectedPrefix && (
                            <div className="mt-2 flex flex-col gap-2">
                                <div className="flex items-center justify-center gap-2 rounded bg-card-grid-item p-2">
                                    <PrefixPreview
                                        color={selectedPrefix.color}
                                        effect={selectedPrefix.effect}
                                        font={selectedPrefix.font}
                                        icon={selectedPrefix.icon}
                                        text={selectedPrefix.text}
                                        textSize="text-lg"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <OctaneButton
                                        className="grow"
                                        onClick={() => (selectedPrefix.active ? deactivatePrefix() : activatePrefix(selectedPrefix.id))}
                                    >
                                        {selectedPrefix.active ? 'Deactivate' : 'Activate'}
                                    </OctaneButton>
                                    {!selectedPrefix.active && (
                                        <OctaneButton className="bg-danger! hover:bg-danger/80! p-1" onClick={attemptDeletePrefix}>
                                            <FaTrashAlt className="fa-icon" />
                                        </OctaneButton>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'icons' && (
                <div className="grid h-full grid-cols-12 gap-2">
                    <div className="col-span-7 flex flex-col gap-1 overflow-auto pr-1">
                        <div className="grid grid-cols-3 gap-1">
                            {nickIcons.map((icon) => (
                                <NickIconItemView
                                    key={icon.id}
                                    displayName={icon.displayName}
                                    iconKey={icon.iconKey}
                                    isActive={!!icon.active}
                                    isSelected={selectedNickIcon?.id === icon.id}
                                    onClick={() => setSelectedNickIcon(icon)}
                                />
                            ))}
                        </div>
                        {!hasNickIcons && <div className="flex h-full items-center justify-center text-sm opacity-50">No purchased icons yet</div>}
                    </div>
                    <div className="col-span-5 flex flex-col justify-between overflow-auto">
                        <div className="flex flex-col gap-1">
                            <span className="min-h-[1.25rem] truncate text-sm leading-5">Active icon</span>
                            <div
                                className={`flex min-h-[88px] items-center justify-center rounded-md border-2 bg-card-grid-item p-3 ${activeNickIcon ? 'border-green-400' : 'border-dashed border-card-grid-item-border opacity-50'}`}
                            >
                                {activeNickIcon && (
                                    <img
                                        className="h-auto max-h-[36px] w-auto object-contain"
                                        src={GetNickIconUrl(activeNickIcon.iconKey)}
                                        alt={activeNickIcon.displayName || activeNickIcon.iconKey}
                                    />
                                )}
                                {!activeNickIcon && <span className="text-sm">No active icon</span>}
                            </div>
                        </div>
                        {!!selectedNickIcon && (
                            <div className="mt-2 flex flex-col gap-2">
                                <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded bg-card-grid-item p-3 text-center">
                                    <img
                                        className="h-auto max-h-[40px] w-auto object-contain"
                                        src={selectedIconUrl}
                                        alt={selectedNickIcon.displayName || selectedNickIcon.iconKey}
                                    />
                                    <span className="text-sm font-bold">{selectedNickIcon.displayName || selectedNickIcon.iconKey}</span>
                                </div>
                                <Button
                                    disabled={false}
                                    onClick={() => (selectedNickIcon.active ? deactivateNickIcon() : activateNickIcon(selectedNickIcon.id))}
                                >
                                    {selectedNickIcon.active ? 'Deactivate' : 'Activate'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
