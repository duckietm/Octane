import { CSSProperties, FC, ReactNode } from 'react';
import { LocalizeText } from '../../api/utils/LocalizeText';
import { BaseButton } from '../BaseButton';
import { TabBar, TabBarTab } from '../TabBar';
import { NativeTextTree } from '../native-text/NativeTextTree';

export interface HandheldSheetTab {
    id: string;
    label: string;
    /** Unseen things behind the tab; shown as a small count on it. */
    count?: number;
    /** A picture shown instead of the label (the avatar editor's categories); the label then names the tab. */
    image?: string;
}

export interface HandheldSheetFrameProps {
    /** Class of the module (for its own rules inside the frame). */
    className?: string;
    /** Custom properties of the module on the frame (the accent colour of a profile). */
    style?: CSSProperties;
    /** The toolbar icon of the module, e.g. "icon-catalog". */
    icon: string;
    title: string;
    onClose: () => void;
    /** Something small beside the title (the purse in the shop). */
    headerExtra?: ReactNode;
    tabs?: HandheldSheetTab[];
    /** The tab on screen, or null when none of them is. */
    activeTab?: string | null;
    onTab?: (id: string) => void;
    tabsLabel?: string;
    children?: ReactNode;
}

/**
 * The frame of a phone screen in the Octane handheld look (HandheldSheet.css): the deep-blue header with the module's
 * icon, its title and the round close button, a row of pill tabs that scrolls sideways when there are many, and the
 * cream sheet with rounded shoulders that holds the module's content. The shop and the inventory share it.
 */
export const HandheldSheetFrame: FC<HandheldSheetFrameProps> = (props) => {
    const { className = '', style, icon, title, onClose, headerExtra = null, tabs = null, activeTab = null, onTab, tabsLabel, children = null } = props;

    return (
        <NativeTextTree>
            <div className={`octane-handheld-sheet octane-scrollbar-native ${className}`.trim()} style={style}>
                <header className="octane-handheld-sheet__caption">
                    <span aria-hidden="true" className={`octane-handheld-sheet__mark octane-icon ${icon}`} />
                    <span className="octane-handheld-sheet__title">{title}</span>
                    {headerExtra}
                    <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-sheet__caption-button is-close" onClick={onClose}>
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                            <path d="M4 4 L12 12 M12 4 L4 12" />
                        </svg>
                    </BaseButton>
                </header>
                {!!tabs?.length && (
                    <TabBar aria-label={tabsLabel} className="octane-handheld-sheet__tabs" value={activeTab}>
                        {tabs.map((tab) => (
                            <TabBarTab
                                key={tab.id}
                                aria-label={tab.image ? tab.label : undefined}
                                className={`octane-handheld-sheet__tab${tab.id === activeTab ? ' is-active' : ''}${tab.image ? ' has-image' : ''}`}
                                value={tab.id}
                                onClick={() => onTab?.(tab.id)}
                            >
                                {tab.image ? (
                                    <img alt="" className="octane-handheld-sheet__tab-image" draggable={false} src={tab.image} />
                                ) : (
                                    <span className="octane-handheld-sheet__tab-label">{tab.label}</span>
                                )}
                                {!!tab.count && <span className="octane-handheld-sheet__tab-count">{tab.count}</span>}
                            </TabBarTab>
                        ))}
                    </TabBar>
                )}
                <main className="octane-handheld-sheet__body">{children}</main>
            </div>
        </NativeTextTree>
    );
};
