import { Menu } from '@base-ui/react/menu';
import {
    ApplySnapshotMessageComposer,
    ConditionDefinition,
    GetRoomEngine,
    GetSessionDataManager,
    Triggerable,
    TriggerDefinition,
    WiredActionDefinition,
    WiredAddonDefinition,
    WiredSelectorDefinition,
    WiredVariableDefinition
} from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import {
    CreateLinkEvent,
    GetConfigurationValue,
    LocalizeText,
    localizeWithFallback,
    NotificationBubbleType,
    OpenUrl,
    resolveWiredHeaderButton,
    SendMessageComposer,
    splitWiredName,
    WIRED_HEADER_BUTTON_KEYS,
    WiredFurniType,
    WiredHeaderButtonMode,
    WiredHolderKind,
    WiredSelectionVisualizer,
    wiredStyleClassName
} from '../../../api';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useNotification, useWired, useWiredTools } from '../../../hooks';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';
import { finalizeWiredVariablePickers } from './WiredVariablePickerHistory';

export interface WiredBaseViewProps {
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves its section out, for views that show it elsewhere. */
    showSelection?: boolean;
    /** Official: some elements open wider (frame width x modifier). */
    widthModifier?: number;
    /** Official: the action delay comes after the furni picks. */
    delaySection?: ReactNode;
    /** A save that must be confirmed first (a box that would lose stored data): the confirmation's texts, or null. */
    confirmSave?: () => { title: string; body: string } | null;
}

/** The official frame width (Illumina and Volter templates). */
export const WIRED_FRAME_WIDTH = 240;

const holderKind = (trigger: Triggerable): WiredHolderKind | null => {
    if (trigger instanceof WiredVariableDefinition) return 'variable';
    if (trigger instanceof WiredAddonDefinition) return 'addon';
    if (trigger instanceof WiredSelectorDefinition) return 'selector';
    if (trigger instanceof WiredActionDefinition) return 'action';
    if (trigger instanceof ConditionDefinition) return 'condition';
    if (trigger instanceof TriggerDefinition) return 'trigger';
    return null;
};

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const {
        wiredType = '',
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        children = null,
        hasSpecialInput = false,
        cardStyle = undefined,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        showSelection = true,
        widthModifier = 1,
        delaySection = null,
        confirmSave = null
    } = props;
    const WIRED_CARD_WIDTH = Math.round(WIRED_FRAME_WIDTH * (widthModifier > 0 ? widthModifier : 1));
    const [wiredName, setWiredName] = useState<string>(null);
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [keepOpenOnSave, setKeepOpenOnSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuElement, setMenuElement] = useState<HTMLElement | null>(null);
    const {
        trigger = null,
        setTrigger = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        furniIds = [],
        setAllowsFurni = null,
        saveWired = null,
        saveWiredAndKeepOpen = null,
        clipboardEntry = null,
        copyWiredToClipboard = null,
        pasteWiredFromClipboard = null,
        resetWiredToDefault = null,
        clearWiredPicks = null,
        pasteIntoMode = false,
        setPasteIntoMode = null,
        getSelectorOptions = null
    } = useWired();
    const { roomSettings, accountPreferences } = useWiredTools();
    const { showSingleBubble = null, showConfirm = null } = useNotification();
    const notify = (key: string, fallback: string) => showSingleBubble?.(localizeWithFallback(key, fallback), NotificationBubbleType.INFO);
    const headerButton: WiredHeaderButtonMode | null = (() => {
        const holder = trigger ? holderKind(trigger) : null;

        return holder ? resolveWiredHeaderButton(holder, trigger.code) : null;
    })();
    const onHeaderButton = () => {
        if (!trigger) return;

        switch (headerButton) {
            case 'apply_snapshot':
                SendMessageComposer(new ApplySnapshotMessageComposer(trigger.id));
                return;
            case 'view_in_menu':
                CreateLinkEvent('wired-tools/tab/variables');
                return;
            case 'view_logs':
                CreateLinkEvent('wired-tools/logs');
                return;
            case 'web_api_docs': {
                const link = GetConfigurationValue<string>('wired.api.docs.link', '');

                if (link) OpenUrl(link);
                return;
            }
        }
    };

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const onClose = () => {
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const onSave = (keepOpen: boolean = false) => {
        if (!roomSettings.canModify) return;

        if (validate && !validate()) return;

        if (save) save();

        const proceed = () => {
            // A saved selection enters the variable picker's recent tab.
            finalizeWiredVariablePickers();
            setKeepOpenOnSave(keepOpen);
            setNeedsSave(true);
        };
        const confirmation = confirmSave ? confirmSave() : null;

        if (confirmation && showConfirm) {
            showConfirm(confirmation.body, proceed, null, null, null, confirmation.title);
            return;
        }

        const options = wiredType === 'selector' ? getSelectorOptions?.() : null;

        // Official: inverting without filtering selects everything that does NOT match, which can be
        // the whole room; it asks first.
        if (options?.invert && !options.filter && showConfirm) {
            showConfirm(
                localizeWithFallback(
                    'wiredfurni.danger.1.change.confirm.body',
                    'You selected "Invert" without filtering. This selects all furni/users that do NOT meet the requirements, which may be the whole room. Are you sure? (DANGEROUS!)'
                ),
                proceed,
                null,
                null,
                null,
                localizeWithFallback('wiredfurni.danger.1.change.confirm.title', 'Are you sure?')
            );
            return;
        }

        proceed();
    };

    useEffect(() => {
        if (!needsSave) return;

        if (keepOpenOnSave && saveWiredAndKeepOpen) {
            saveWiredAndKeepOpen();
            notify('notification.wired.saved', 'Saved');
        } else saveWired();

        setNeedsSave(false);
        setKeepOpenOnSave(false);
    }, [needsSave, keepOpenOnSave, saveWired, saveWiredAndKeepOpen]);

    // The quick menu. Copy pushes the view's current settings into the hook first (the same
    // step "ready" takes), so the clipboard holds what is on screen and not what was last saved.
    const canEdit = !!roomSettings.canModify;
    const onCopy = () => {
        if (validate && !validate()) return;

        if (save) save();

        copyWiredToClipboard?.();
        notify('notification.wired.copied', 'Copied');
    };
    // Official paste into: while on, opening another box of the same element saves this
    // configuration into it. Switching it on pushes the view's settings into the hook first.
    const onTogglePasteInto = () => {
        if (!pasteIntoMode) {
            if (validate && !validate()) return;
            if (save) save();
        }

        setPasteIntoMode?.(!pasteIntoMode);
    };
    const copyPasteTooltip = localizeWithFallback('wiredfurni.params.menu.copy_paste.tooltip', 'Copy and paste a configuration between wired boxes of the same type');
    const menuItems: Array<{ id: string; label: string; disabled: boolean; onClick: () => void; checked?: boolean; tooltip?: string } | null> = [
        { id: 'copy', label: localizeWithFallback('wiredfurni.params.menu.copy', 'Copy'), disabled: !canEdit, onClick: onCopy, tooltip: copyPasteTooltip },
        {
            id: 'paste',
            label: localizeWithFallback('wiredfurni.params.menu.paste', 'Paste'),
            disabled: !canEdit || !clipboardEntry,
            onClick: () => pasteWiredFromClipboard?.(false),
            tooltip: copyPasteTooltip
        },
        {
            id: 'paste-into',
            label: localizeWithFallback('wiredfurni.params.menu.paste_into', 'Paste into other wired'),
            disabled: !canEdit,
            checked: pasteIntoMode,
            onClick: onTogglePasteInto,
            tooltip: localizeWithFallback(
                'wiredfurni.params.menu.paste_into.tooltip',
                'While this is on and the window is open, open other wired boxes of the same type to copy this configuration into them.'
            )
        },
        null,
        {
            id: 'clear-picks',
            label: localizeWithFallback('wiredfurni.params.menu.clear_picks', 'Clear furni picks'),
            disabled: !canEdit || !furniIds?.length,
            onClick: () => clearWiredPicks?.()
        },
        { id: 'reset', label: localizeWithFallback('wiredfurni.params.menu.reset', 'Reset to default'), disabled: !canEdit, onClick: () => resetWiredToDefault?.() },
        null,
        {
            id: 'open-menu',
            label: localizeWithFallback('wiredfurni.params.menu.open_menu', 'Open the Wired Creator Tools'),
            disabled: false,
            onClick: () => CreateLinkEvent('wired-tools/show')
        },
        null,
        {
            id: 'save-open',
            label: localizeWithFallback('wiredfurni.params.menu.save', 'Save'),
            disabled: !canEdit,
            onClick: () => onSave(true),
            tooltip: localizeWithFallback('wiredfurni.params.menu.save.tooltip', 'Save the current configuration without closing the window')
        },
        { id: 'close', label: localizeWithFallback('wiredfurni.params.menu.close', 'Close'), disabled: false, onClick: onClose }
    ];

    useEffect(() => {
        if (!trigger) return;

        setShowFooter(false);
        setIsMenuOpen(false);

        WiredSelectionVisualizer.clearAllSelectionShaders();

        const spriteId = trigger.spriteId || -1;
        const furniData = GetSessionDataManager().getFloorItemData(spriteId);

        if (!furniData) {
            setWiredName('NAME: ' + spriteId);
        } else {
            setWiredName(furniData.name);
        }

        if (hasSpecialInput) {
            setIntParams(trigger.intData);
            setStringParam(trigger.stringData);
        }
    }, [trigger, hasSpecialInput, setIntParams, setStringParam]);

    useEffect(() => {
        if (!trigger) return;

        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) return [];

            if (trigger.selectedItems && trigger.selectedItems.length) {
                WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                return trigger.selectedItems;
            }

            return [];
        });
    }, [trigger, requiresFurni, setFurniIds]);

    useEffect(() => {
        return () => clearRoomAreaSelection();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        setAllowsFurni(requiresFurni);
    }, [trigger, requiresFurni, setAllowsFurni]);

    const resolvedCardStyle: CSSProperties = { ...cardStyle };

    resolvedCardStyle.width = WIRED_CARD_WIDTH;
    resolvedCardStyle.minWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.maxWidth = WIRED_CARD_WIDTH;
    resolvedCardStyle.resize = 'none';

    return (
        <OctaneCardView
            className={`octane-wired ${wiredStyleClassName(accountPreferences?.wiredStyle)} max-h-[calc(100vh-16px)]`}
            theme="primary-slim"
            uniqueKey="octane-wired"
            isResizable={false}
            style={resolvedCardStyle}
        >
            <OctaneCardHeaderView classNames={['octane-wired__header']} headerText={LocalizeText('wiredfurni.title')} onCloseClick={onClose}>
                <div ref={setMenuElement} className="octane-wired__menu">
                    {/* The header is the drag handle; it ignores presses on buttons, so the trigger and the items are buttons. */}
                    <Menu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                        <Menu.Trigger
                            aria-label={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                            className="octane-wired__menu-toggle"
                            title={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                        >
                            &#8801;
                        </Menu.Trigger>
                        {/* Rendered inside the menu wrapper, not the body, so the window's scoped css still applies. */}
                        <Menu.Portal container={menuElement}>
                            <Menu.Positioner align="end" className="octane-wired__menu-positioner" side="bottom" sideOffset={2}>
                                <Menu.Popup className="octane-wired__menu-list">
                                    {menuItems.map((item, index) =>
                                        item ? (
                                            item.checked === undefined ? (
                                                <Menu.Item
                                                    key={item.id}
                                                    className="octane-wired__menu-item"
                                                    disabled={item.disabled}
                                                    nativeButton
                                                    render={<BaseButton type="button" />}
                                                    title={item.tooltip}
                                                    onClick={() => item.onClick()}
                                                >
                                                    <span>{item.label}</span>
                                                </Menu.Item>
                                            ) : (
                                                <Menu.CheckboxItem
                                                    key={item.id}
                                                    checked={item.checked}
                                                    className="octane-wired__menu-item"
                                                    closeOnClick={false}
                                                    disabled={item.disabled}
                                                    nativeButton
                                                    render={<BaseButton type="button" />}
                                                    title={item.tooltip}
                                                    onCheckedChange={() => item.onClick()}
                                                >
                                                    <span className="octane-wired__menu-check">{item.checked ? '\u2611' : '\u2610'}</span>
                                                    <span>{item.label}</span>
                                                </Menu.CheckboxItem>
                                            )
                                        ) : (
                                            <div key={`spacer-${index}`} className="octane-wired__menu-spacer" />
                                        )
                                    )}
                                </Menu.Popup>
                            </Menu.Positioner>
                        </Menu.Portal>
                    </Menu.Root>
                </div>
            </OctaneCardHeaderView>
            <OctaneCardContentView classNames={['octane-wired__content']} gap={0}>
                <div className="octane-wired__section octane-wired__summary">
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--left" src={wiredBgLeft} alt="" />
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--right" src={wiredBgRight} alt="" />
                    <div className="octane-wired__summary-copy">
                        {!!splitWiredName(wiredName).kind && <span className="octane-wired__summary-kind">{splitWiredName(wiredName).kind}</span>}
                        <Text bold className="octane-wired__summary-title">
                            {splitWiredName(wiredName).title}
                        </Text>
                        {headerButton && (
                            <BaseButton className="octane-wired__header-button" type="button" onClick={onHeaderButton}>
                                {localizeWithFallback(WIRED_HEADER_BUTTON_KEYS[headerButton].key, WIRED_HEADER_BUTTON_KEYS[headerButton].fallback)}
                            </BaseButton>
                        )}
                    </div>
                </div>
                <div className="octane-wired__body">
                    {!!children && <div className="octane-wired__divider" />}
                    {!!children && <div className="octane-wired__section octane-wired__section--body">{children}</div>}
                    {showSelection && requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                        </>
                    )}
                    {delaySection && (
                        <>
                            <div className="octane-wired__divider" />
                            {delaySection}
                        </>
                    )}
                    {footer && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--footer">
                                {footerCollapsible ? (
                                    <>
                                        <BaseButton className="octane-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
                                            {LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                                        </BaseButton>
                                        {showFooter && <div className="octane-wired__advanced-body">{footer}</div>}
                                    </>
                                ) : (
                                    footer
                                )}
                            </div>
                        </>
                    )}
                    <div className="octane-wired__divider" />
                    <div className="flex items-center gap-3 octane-wired__actions">
                        <Button
                            disabled={!roomSettings.canModify}
                            fullWidth
                            variant="secondary"
                            classNames={['octane-wired__button', 'octane-wired__button--primary']}
                            onClick={() => onSave(false)}
                        >
                            {LocalizeText('wiredfurni.ready')}
                        </Button>
                        <Button fullWidth variant="secondary" classNames={['octane-wired__button', 'octane-wired__button--secondary']} onClick={onClose}>
                            {LocalizeText('cancel')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
