import { CSSProperties, Dispatch, FC, PointerEvent, SetStateAction, useState } from 'react';
import { GroupBadgePart, LocalizeText } from '../../../api';
import badgePartAdd from '../../../assets/images/groups/native/badge_part_add.png';
import badgePartEmpty from '../../../assets/images/groups/native/badge_part_empty.png';
import badgePartPicker from '../../../assets/images/groups/native/badge_part_picker.png';
import colorChooserBg from '../../../assets/images/groups/native/color_chooser_bg.png';
import colorChooserSelected from '../../../assets/images/groups/native/color_chooser_selected.png';
import positionGrid from '../../../assets/images/groups/native/position_grid.png';
import positionPicker from '../../../assets/images/groups/native/position_picker.png';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../common';
import { useGroup } from '../../../hooks';
import { GroupBox, GroupText } from './GroupNativeLayout';
import { BaseButton } from '../../../common/BaseButton';

interface GroupBadgeCreatorViewProps {
    badgeParts: GroupBadgePart[];
    setBadgeParts: Dispatch<SetStateAction<GroupBadgePart[]>>;
}

// badge_editor: part_edit sits at x=128; its rows start at y=29, 49px high with 2px spacing.
const EDIT_X = 128;
const LIST_Y = 29;
const ROW_PITCH = 51;

export const GroupColorChip: FC<{ color: string; selected: boolean; onSelect: () => void }> = ({ color, selected, onSelect }) => (
    <BaseButton className="octane-group-native__color" style={{ '--group-color': '#' + color } as CSSProperties} type="button" onClick={onSelect}>
        <img alt="" draggable={false} src={colorChooserBg} />
        <span className="octane-group-native__color-fill" />
        {selected && <img alt="" draggable={false} src={colorChooserSelected} />}
    </BaseButton>
);

export const GroupBadgeCreatorView: FC<GroupBadgeCreatorViewProps> = (props) => {
    const { badgeParts = [], setBadgeParts = null } = props;
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const { groupCustomize = null } = useGroup();

    const setPartProperty = (partIndex: number, property: string, value: number) => {
        const newBadgeParts = [...badgeParts];

        const part = newBadgeParts[partIndex];
        newBadgeParts[partIndex] = new GroupBadgePart(part.type, part.key, part.color, part.position);
        newBadgeParts[partIndex][property] = value;

        setBadgeParts(newBadgeParts);

        if (property === 'key') setSelectedIndex(-1);
    };

    const selectPosition = (partIndex: number, event: PointerEvent<HTMLDivElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const column = Math.min(2, Math.max(0, Math.floor((event.clientX - bounds.left - 1) / 14)));
        const row = Math.min(2, Math.max(0, Math.floor((event.clientY - bounds.top - 1) / 14)));

        setPartProperty(partIndex, 'position', row * 3 + column);
    };

    // Every symbol slot offers the full symbol list. The picker briefly filtered
    // symbols per slot on their _part1/_part2 name suffixes, but those suffixes are
    // render layers of a single symbol, not categories — the filter just hid most
    // symbols from most slots.
    const getAvailableSymbols = () => groupCustomize?.badgeSymbols || [];

    if (!groupCustomize || !badgeParts || !badgeParts.length) return null;

    // The last symbol layer is listed first and the base last (the part list is stored base first).
    const layerOrder = [...badgeParts.keys()].slice(1).reverse().concat(0);

    const renderLayer = (partIndex: number, y: number) => {
        const part = badgeParts[partIndex];
        const isBase = part.type === GroupBadgePart.BASE;

        return (
            <div key={partIndex} className="octane-group-native__layer" style={{ left: EDIT_X, top: y }}>
                <GroupBox height={49} kind="dark" width={247} x={0} y={0} />
                <BaseButton className="octane-group-native__layer-part" type="button" onClick={() => setSelectedIndex(partIndex)}>
                    {part.previewCode ? (
                        <div className="octane-group-native__badge">
                            <LayoutBadgeImageView badgeCode={part.previewCode} isGroup={true} isPreview={true} />
                        </div>
                    ) : (
                        <img alt="" className="octane-group-native__badge" draggable={false} src={badgePartAdd} />
                    )}
                </BaseButton>
                {!isBase && (
                    <div className="octane-group-native__layer-position" onPointerDown={(event) => selectPosition(partIndex, event)}>
                        <img alt="" draggable={false} src={positionGrid} />
                        <img
                            alt=""
                            draggable={false}
                            src={positionPicker}
                            style={{ left: 1 + (part.position % 3) * 14, top: 1 + Math.floor(part.position / 3) * 14 }}
                        />
                    </div>
                )}
                <div className="octane-group-native__layer-colors">
                    {groupCustomize.badgePartColors.map((item) => (
                        <GroupColorChip key={item.id} color={item.color} selected={part.color === item.id} onSelect={() => setPartProperty(partIndex, 'color', item.id)} />
                    ))}
                </div>
            </div>
        );
    };

    if (selectedIndex >= 0) {
        const selected = badgeParts[selectedIndex];
        const isSymbol = selected.type === GroupBadgePart.SYMBOL;
        const items = isSymbol ? getAvailableSymbols() : groupCustomize.badgeBases;

        return (
            <>
                <GroupText textStyle="u_bold" text={LocalizeText('group.edit.badge.pick.symbol')} width={78} x={EDIT_X} y={8} />
                <GroupBox height={274} kind="dark" width={247} x={EDIT_X} y={LIST_Y}>
                    <GroupBox height={266} kind="slot" width={239} x={4} y={4}>
                        <ClassicScrollAreaView className="octane-group-native__part-scroll" contentClassName="octane-group-native__part-scroll-content" minThumbSize={26} scrollStep={43}>
                            <div className="octane-group-native__part-grid">
                                {isSymbol && (
                                    <BaseButton className="octane-group-native__part-item" type="button" onClick={() => setPartProperty(selectedIndex, 'key', 0)}>
                                        <GroupBox height={41} kind="tan" width={41} x={0} y={0} />
                                        <img alt="" src={badgePartEmpty} style={{ left: 2, top: 2 }} />
                                        {selected.key === 0 && <img alt="" className="octane-group-native__part-selected" src={badgePartPicker} />}
                                    </BaseButton>
                                )}
                                {items.map((item) => (
                                    <BaseButton key={item.id} className="octane-group-native__part-item" type="button" onClick={() => setPartProperty(selectedIndex, 'key', item.id)}>
                                        <GroupBox height={41} kind="tan" width={41} x={0} y={0} />
                                        <div className="octane-group-native__part-clip">
                                            <div className="octane-group-native__badge">
                                                <LayoutBadgeImageView badgeCode={GroupBadgePart.getCode(selected.type, item.id, selected.color, selected.position)} isGroup={true} isPreview={true} />
                                            </div>
                                        </div>
                                        {selected.key === item.id && <img alt="" className="octane-group-native__part-selected" src={badgePartPicker} />}
                                    </BaseButton>
                                ))}
                            </div>
                        </ClassicScrollAreaView>
                    </GroupBox>
                </GroupBox>
            </>
        );
    }

    return (
        <>
            <GroupText textStyle="u_bold" text={LocalizeText('group.edit.badge.symbol')} width={43} x={EDIT_X} y={8} />
            <GroupText textStyle="u_bold" text={LocalizeText('group.edit.badge.position')} width={49} x={EDIT_X + 64} y={8} />
            <GroupText textStyle="u_bold" text={LocalizeText('group.edit.badge.colors')} width={40} x={EDIT_X + 155} y={8} />
            {layerOrder.slice(0, -1).map((partIndex, row) => renderLayer(partIndex, LIST_Y + row * ROW_PITCH))}
            <GroupText textStyle="u_bold" text={LocalizeText('group.edit.badge.base')} width={30} x={EDIT_X} y={LIST_Y + 4 * ROW_PITCH} />
            {renderLayer(0, LIST_Y + 4 * ROW_PITCH + 21)}
        </>
    );
};
