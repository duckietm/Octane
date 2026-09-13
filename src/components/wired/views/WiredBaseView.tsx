import { GetRoomEngine, GetSessionDataManager } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType, WiredSelectionVisualizer, wiredStyleClassName } from '../../../api';
import wiredBgLeft from '../../../assets/images/wired/wired_bg_left.png';
import wiredBgRight from '../../../assets/images/wired/wired_bg_right.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { useWiredCreatorToolsUiStore } from '../../wired-tools/wiredCreatorToolsUiStore';
import { copyWiredConfig, hasWiredConfig, readWiredConfig } from '../wiredClipboard';
import { WiredFurniSelectorView } from './WiredFurniSelectorView';
import { WiredMenuItem, WiredTitleBarMenu } from './WiredTitleBarMenu';

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
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const WIRED_CARD_WIDTH = 244;
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
        selectionPreview = null
    } = props;
    const [wiredName, setWiredName] = useState<string>(null);
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const [pendingCopy, setPendingCopy] = useState(false);
    const {
        trigger = null,
        setTrigger = null,
        intParams = null,
        stringParam = null,
        furniIds = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        setAllowsFurni = null,
        saveWired = null,
        applyWiredConfig = null,
        resetWiredConfig = null
    } = useWired();
    const { roomSettings, accountPreferences } = useWiredTools();

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const onClose = () => {
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const onSave = () => {
        if (!roomSettings.canModify) return;

        if (validate && !validate()) return;

        if (save) save();

        setNeedsSave(true);
    };

    // The form values live in each dialog's own state and only reach the store through its
    // `save` prop, so a copy has to run that first and read the result on the next render.
    useEffect(() => {
        if (!pendingCopy) return;

        copyWiredConfig(trigger, { intParams, stringParam, furniIds });
        setPendingCopy(false);
    }, [pendingCopy, trigger, intParams, stringParam, furniIds]);

    useEffect(() => {
        if (!needsSave) return;

        saveWired();

        setNeedsSave(false);
    }, [needsSave, saveWired]);

    useEffect(() => {
        if (!trigger) return;

        setShowFooter(false);

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

    const canModify = !!roomSettings?.canModify;

    const clearPicks = () => {
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setFurniIds([]);
    };

    const menuItems: WiredMenuItem[] = [
        {
            key: 'copy',
            label: LocalizeText('wiredfurni.params.menu.copy'),
            tooltip: LocalizeText('wiredfurni.params.menu.copy_paste.tooltip'),
            disabled: !canModify,
            onClick: () => {
                if (save) save();
                setPendingCopy(true);
            }
        },
        {
            key: 'paste',
            label: LocalizeText('wiredfurni.params.menu.paste'),
            tooltip: LocalizeText('wiredfurni.params.menu.copy_paste.tooltip'),
            disabled: !canModify || !hasWiredConfig(trigger),
            onClick: () => applyWiredConfig(readWiredConfig(trigger))
        },
        {
            // Pasting into another box means intercepting the next box the user opens, which is
            // the one row that reaches outside this window. Shown disabled until that exists.
            key: 'paste_into',
            label: LocalizeText('wiredfurni.params.menu.paste_into'),
            tooltip: LocalizeText('wiredfurni.params.menu.paste_into.tooltip'),
            disabled: true
        },
        {
            key: 'clear_picks',
            label: LocalizeText('wiredfurni.params.menu.clear_picks'),
            separatorBefore: true,
            disabled: !canModify || !furniIds || !furniIds.length,
            onClick: clearPicks
        },
        {
            key: 'reset',
            label: LocalizeText('wiredfurni.params.menu.reset'),
            disabled: !canModify,
            onClick: () => {
                WiredSelectionVisualizer.clearAllSelectionShaders();
                resetWiredConfig();
            }
        },
        {
            key: 'open_menu',
            label: LocalizeText('wiredfurni.params.menu.open_menu'),
            separatorBefore: true,
            onClick: () => useWiredCreatorToolsUiStore.getState().setIsVisible(true)
        },
        {
            key: 'save',
            label: LocalizeText('wiredfurni.params.menu.save'),
            tooltip: LocalizeText('wiredfurni.params.menu.save.tooltip'),
            separatorBefore: true,
            disabled: !canModify,
            onClick: onSave
        },
        {
            key: 'close',
            label: LocalizeText('wiredfurni.params.menu.close'),
            onClick: onClose
        }
    ];

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
            <OctaneCardHeaderView
                classNames={['octane-wired__header']}
                headerText={LocalizeText('wiredfurni.title')}
                headerStart={<WiredTitleBarMenu items={menuItems} />}
                onCloseClick={onClose}
            />
            <OctaneCardContentView classNames={['octane-wired__content']} gap={0}>
                <div className="octane-wired__section octane-wired__summary">
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--left" src={wiredBgLeft} alt="" />
                    <img className="octane-wired__summary-bg octane-wired__summary-bg--right" src={wiredBgRight} alt="" />
                    <div className="octane-wired__summary-copy">
                        <Text bold className="octane-wired__summary-title">
                            {wiredName}
                        </Text>
                    </div>
                </div>
                <div className="octane-wired__body">
                    {!!children && <div className="octane-wired__divider" />}
                    {!!children && <div className="octane-wired__section octane-wired__section--body">{children}</div>}
                    {requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                        </>
                    )}
                    {footer && (
                        <>
                            <div className="octane-wired__divider" />
                            <div className="octane-wired__section octane-wired__section--footer">
                                {footerCollapsible ? (
                                    <>
                                        <button className="octane-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
                                            {LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                                        </button>
                                        {showFooter && <div className="octane-wired__advanced-body">{footer}</div>}
                                    </>
                                ) : (
                                    footer
                                )}
                            </div>
                        </>
                    )}
                    <div className="octane-wired__divider" />
                    <div className="flex items-center gap-1 octane-wired__actions">
                        <Button
                            disabled={!roomSettings.canModify}
                            fullWidth
                            variant="success"
                            classNames={['octane-wired__button', 'octane-wired__button--primary']}
                            onClick={onSave}
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
