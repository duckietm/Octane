import { FC, Fragment, ReactNode } from 'react';
import {
    FaArrowsAlt,
    FaBoxOpen,
    FaCartPlus,
    FaClock,
    FaCrosshairs,
    FaEraser,
    FaHandPointer,
    FaInfinity,
    FaPalette,
    FaPen,
    FaPlus,
    FaSave,
    FaSearch,
    FaShoppingCart,
    FaSlidersH,
    FaSyncAlt,
    FaTag,
    FaTools
} from 'react-icons/fa';
import { AvatarInfoFurni, localizeWithFallback } from '../../../../../api';
import { LayoutRoomObjectImageView } from '../../../../../common';
import { HandheldDrawerAction, HandheldDrawerSection, HandheldDrawerTone, HandheldInfoDrawer } from '../../../../../common/handheld/HandheldInfoDrawer';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

export type HandheldFurniDrawerSection = 'item' | 'shop' | 'wired' | 'staff';

export interface HandheldFurniDrawerAction {
    id: string;
    section: HandheldFurniDrawerSection;
    label: string;
    tone?: HandheldDrawerTone;
    /** The action hands the room (or another window) to the player: the drawer closes after it. */
    closes?: boolean;
    /** The action shows something in the drawer's details: the peek opens for it, and the details scroll to this selector. */
    opens?: string;
    /** A two-state button (build tools on / off). */
    pressed?: boolean;
    run: () => void;
}

interface HandheldFurniDrawerViewProps {
    avatarInfo: AvatarInfoFurni;
    roomId: number;
    ownerText: string;
    /** The infostand panel: description, rarity, stats, staff fields. */
    details: ReactNode;
    /** Every action the desktop infostand offers for this furni, most used first. */
    actions: HandheldFurniDrawerAction[];
    expanded: boolean;
    onExpandedChange: (expanded: boolean) => void;
    onClose: () => void;
}

/** How many actions the peek's one row holds. */
export const HANDHELD_DRAWER_PEEK_ACTIONS = 4;

const SECTIONS: HandheldFurniDrawerSection[] = ['item', 'shop', 'wired', 'staff'];

const SECTION_LABELS: Record<HandheldFurniDrawerSection, [key: string, fallback: string]> = {
    item: ['octane.handheld.drawer.section.item', 'Item'],
    shop: ['octane.handheld.drawer.section.shop', 'Shop'],
    wired: ['octane.handheld.drawer.section.wired', 'Wired'],
    staff: ['octane.handheld.drawer.section.staff', 'Staff']
};

const ICONS: Record<string, ReactNode> = {
    use: <FaHandPointer />,
    move: <FaArrowsAlt />,
    rotate: <FaSyncAlt />,
    pickup: <FaBoxOpen />,
    buy: <FaShoppingCart />,
    rent: <FaClock />,
    extend: <FaPlus />,
    buyout: <FaInfinity />,
    place_more: <FaCartPlus />,
    recolor: <FaPalette />,
    remove_background: <FaEraser />,
    position_editor: <FaCrosshairs />,
    inspect: <FaSearch />,
    label_settings: <FaTag />,
    edit_furni: <FaPen />,
    buildtools: <FaTools />,
    save_branding: <FaSave />,
    save_variables: <FaSlidersH />
};

/**
 * The phone drawer of a selected furni or wall item: its picture, name and owner in the head, the first four
 * actions in the peek's row, and, opened, the infostand panel over every action grouped by what it is for.
 * The actions are handed in by InfoStandWidgetFurniView, which keeps deciding and handling them as on the desktop.
 */
export const HandheldFurniDrawerView: FC<HandheldFurniDrawerViewProps> = ({ avatarInfo, roomId, ownerText, details, actions, expanded, onExpandedChange, onClose }) => {
    const run = (action: HandheldFurniDrawerAction) => {
        action.run();

        if (action.closes) onClose();
        else if (action.opens) {
            if (!expanded) onExpandedChange(true);

            // What the action brought up may lie below the fold of the details.
            if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => document.querySelector(`.octane-handheld-drawer__details ${action.opens}`)?.scrollIntoView?.({ block: 'center' }));
        }
    };

    const button = (action: HandheldFurniDrawerAction) => (
        <HandheldDrawerAction key={action.id} aria-pressed={action.pressed} data-action={action.id} icon={ICONS[action.id]} tone={action.tone} onClick={() => run(action)}>
            {action.label}
        </HandheldDrawerAction>
    );

    return (
        <NativeTextTree>
            <HandheldInfoDrawer
                actions={(open) =>
                    open
                        ? SECTIONS.map((section) => {
                              const group = actions.filter((action) => action.section === section);

                              if (!group.length) return null;

                              return (
                                  <Fragment key={section}>
                                      <HandheldDrawerSection>{localizeWithFallback(...SECTION_LABELS[section])}</HandheldDrawerSection>
                                      {group.map(button)}
                                  </Fragment>
                              );
                          })
                        : actions.slice(0, HANDHELD_DRAWER_PEEK_ACTIONS).map(button)
                }
                details={details}
                expanded={expanded}
                kind={avatarInfo.isBuildersClub ? 'builders-club' : avatarInfo.isTemporary ? 'temporary' : undefined}
                label={localizeWithFallback('octane.handheld.drawer.title', 'Selected in the room')}
                picture={<LayoutRoomObjectImageView category={avatarInfo.category} objectId={avatarInfo.id} roomId={roomId} />}
                subtitle={ownerText}
                title={avatarInfo.name}
                onClose={onClose}
                onExpandedChange={onExpandedChange}
            />
        </NativeTextTree>
    );
};
