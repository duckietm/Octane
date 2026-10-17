import { FC, useEffect, useMemo, useState } from 'react';
import { getPrefixEffectStyle, getPrefixFontStyle, IPrefixItem, localizeWithFallback, LocalizeText, parsePrefixColors } from '../../../../api';
import { GetNickIconUrl } from '../../../../assets/images/user_custom/nick_icons';
import { ClassicScrollAreaView } from '../../../../common/scroll-area/ClassicScrollAreaView';
import { useInventoryNickIcons, useInventoryPrefixes, useNotification } from '../../../../hooks';
import { OctaneButton } from '../../../../layout';
import { InventoryCategoryEmptyView } from '../InventoryCategoryEmptyView';
import { TabBar, TabBarTab } from '../../../../common/TabBar';

type InventoryIdentityTab = 'prefixes' | 'icons';

const PrefixPreview: FC<{ text: string; color: string; icon: string; effect?: string; font?: string; className?: string }> = ({
    text,
    color,
    icon,
    effect = '',
    font = '',
    className = ''
}) => {
    const colors = parsePrefixColors(text, color);
    const hasMultiColor = colors.length > 1 && new Set(colors).size > 1;
    const fxStyle = getPrefixEffectStyle(effect, colors[0] || '#FFFFFF');
    const fontStyle = getPrefixFontStyle(font);

    return (
        <span className={`octane-inventory-prefix-text ${className}`} style={{ ...fontStyle, ...fxStyle }}>
            {icon && <span className="octane-inventory-prefix-icon">{icon}</span>}
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

const cellClass = (isSelected: boolean, isActive: boolean) =>
    `octane-inventory-identity-cell${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`;

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
    const selectedIconUrl = useMemo(() => (selectedNickIcon ? GetNickIconUrl(selectedNickIcon.iconKey) : ''), [selectedNickIcon]);

    const attemptDeletePrefix = () => {
        if (!selectedPrefix) return;

        showConfirm(
            localizeWithFallback('inventory.prefixes.delete.confirm', 'Are you sure you want to delete the prefix ${prefix}?', ['prefix'], [`{${selectedPrefix.text}}`]),
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

    const tabs: { id: InventoryIdentityTab; label: string }[] = [
        { id: 'prefixes', label: localizeWithFallback('inventory.prefixes.tab.prefixes', 'Prefixes') },
        { id: 'icons', label: localizeWithFallback('inventory.prefixes.tab.icons', 'Icons') }
    ];

    const activeLabel = localizeWithFallback('inventory.prefixes.active', 'Active');
    const activateLabel = localizeWithFallback('inventory.prefixes.activate', 'Activate');
    const deactivateLabel = localizeWithFallback('inventory.prefixes.deactivate', 'Deactivate');
    const deleteLabel = localizeWithFallback('inventory.prefixes.delete', 'Delete');

    return (
        <div className="octane-inventory-identity">
            <TabBar className="octane-inventory-identity-tabs" value={activeTab}>
                {tabs.map((tab) => (
                    <TabBarTab
                        key={tab.id}
                        className={`octane-inventory-identity-tab${activeTab === tab.id ? ' is-active' : ''}`}
                        value={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </TabBarTab>
                ))}
            </TabBar>

            {activeTab === 'prefixes' &&
                (prefixes.length === 0 ? (
                    <InventoryCategoryEmptyView
                        desc={localizeWithFallback('inventory.empty.prefixes.desc', 'Prefixes you buy show up here.')}
                        title={localizeWithFallback('inventory.empty.prefixes.title', 'You have no prefixes')}
                    />
                ) : (
                    <div className="octane-inventory-animals is-prefixes">
                        <div className="octane-inventory-animal-grid">
                            <ClassicScrollAreaView className="size-full">
                                <div className="octane-inventory-animal-cells">
                                    {prefixes.map((prefix: IPrefixItem) => (
                                        <button
                                            key={prefix.id}
                                            className={cellClass(selectedPrefix?.id === prefix.id, !!prefix.active)}
                                            type="button"
                                            onClick={() => setSelectedPrefix(prefix)}
                                        >
                                            <PrefixPreview color={prefix.color} effect={prefix.effect} font={prefix.font} icon={prefix.icon} text={prefix.text} />
                                        </button>
                                    ))}
                                </div>
                            </ClassicScrollAreaView>
                        </div>
                        <div className="octane-inventory-animal-preview">
                            <div className="octane-inventory-animal-name">{selectedPrefix?.active ? activeLabel : ''}</div>
                            <div className="octane-inventory-animal-image">
                                {selectedPrefix && (
                                    <PrefixPreview
                                        className="is-large"
                                        color={selectedPrefix.color}
                                        effect={selectedPrefix.effect}
                                        font={selectedPrefix.font}
                                        icon={selectedPrefix.icon}
                                        text={selectedPrefix.text}
                                    />
                                )}
                            </div>
                            <div className="octane-inventory-animal-description">
                                {!selectedPrefix && activePrefix && (
                                    <>
                                        {activeLabel}: <PrefixPreview color={activePrefix.color} effect={activePrefix.effect} font={activePrefix.font} icon={activePrefix.icon} text={activePrefix.text} />
                                    </>
                                )}
                            </div>
                            <div className="octane-inventory-animal-actions">
                                <OctaneButton
                                    className="octane-inventory-animal-place"
                                    disabled={!selectedPrefix}
                                    onClick={() => (selectedPrefix.active ? deactivatePrefix() : activatePrefix(selectedPrefix.id))}
                                >
                                    {selectedPrefix?.active ? deactivateLabel : activateLabel}
                                </OctaneButton>
                                <OctaneButton className="octane-inventory-animal-place" disabled={!selectedPrefix || selectedPrefix.active} onClick={attemptDeletePrefix}>
                                    {deleteLabel}
                                </OctaneButton>
                            </div>
                        </div>
                    </div>
                ))}

            {activeTab === 'icons' &&
                (nickIcons.length === 0 ? (
                    <InventoryCategoryEmptyView
                        desc={localizeWithFallback('inventory.empty.nickicons.desc', 'Icons you buy show up here.')}
                        title={localizeWithFallback('inventory.empty.nickicons.title', 'You have no icons')}
                    />
                ) : (
                    <div className="octane-inventory-animals is-prefixes">
                        <div className="octane-inventory-animal-grid">
                            <ClassicScrollAreaView className="size-full">
                                <div className="octane-inventory-animal-cells">
                                    {nickIcons.map((icon) => (
                                        <button
                                            key={icon.id}
                                            className={cellClass(selectedNickIcon?.id === icon.id, !!icon.active)}
                                            type="button"
                                            onClick={() => setSelectedNickIcon(icon)}
                                        >
                                            <img alt={icon.displayName || icon.iconKey} className="octane-inventory-identity-icon" src={GetNickIconUrl(icon.iconKey)} />
                                        </button>
                                    ))}
                                </div>
                            </ClassicScrollAreaView>
                        </div>
                        <div className="octane-inventory-animal-preview">
                            <div className="octane-inventory-animal-name">{selectedNickIcon ? selectedNickIcon.displayName || selectedNickIcon.iconKey : ''}</div>
                            <div className="octane-inventory-animal-image">
                                {selectedNickIcon && (
                                    <img alt={selectedNickIcon.displayName || selectedNickIcon.iconKey} className="octane-inventory-identity-icon is-large" src={selectedIconUrl} />
                                )}
                            </div>
                            <div className="octane-inventory-animal-description">
                                {!selectedNickIcon && activeNickIcon && `${activeLabel}: ${activeNickIcon.displayName || activeNickIcon.iconKey}`}
                            </div>
                            <div className="octane-inventory-animal-actions">
                                <OctaneButton
                                    className="octane-inventory-animal-place"
                                    disabled={!selectedNickIcon}
                                    onClick={() => (selectedNickIcon.active ? deactivateNickIcon() : activateNickIcon(selectedNickIcon.id))}
                                >
                                    {selectedNickIcon?.active ? deactivateLabel : activateLabel}
                                </OctaneButton>
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};
