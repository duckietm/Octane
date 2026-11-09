import { CSSProperties, FC, useState } from 'react';
import { ListSelect } from '../../../common/ListSelect';
import { NativeText } from '../../../common/native-text/NativeText';
import illuminaAtlas from '../../../assets/mod-tools/skins/habbo-illumina-light-skin.png';
import dropmenuXml from '../../../assets/mod-tools/skins/skin-illumina-dropmenu.xml?raw';
import { NativeSkin, parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';

const SKIN = parseNativeSkin(dropmenuXml);
// the open list is the dropmenu frame without its arrow
const LIST_SKIN: NativeSkin = {
    ...SKIN,
    layouts: { ...SKIN.layouts, illumina_light_dropmenu_frame: { ...SKIN.layouts.illumina_light_dropmenu_frame, entities: SKIN.layouts.illumina_light_dropmenu_frame.entities.filter((entity) => entity.name !== 'arrow') } }
};

const ITEM_HEIGHT = 19;
const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

interface Native100DropmenuProps {
    x: number;
    y: number;
    width: number;
    height: number;
    caption: string;
    items: string[];
    /** The item the menu shows as chosen: drawn in the selected state while the list is open. */
    selectedIndex?: number;
    disabled?: boolean;
    onSelect: (index: number) => void;
}

/** dropmenu style 100 (Illumina light): a white rounded face with the caption at (10, 3) and a grey arrow; the open list covers it with the items 19px apart. Opening, closing, keyboard and outside press are Base UI Select; the frames and texts stay the native skin. */
export const Native100Dropmenu: FC<Native100DropmenuProps> = ({ x, y, width, height, caption, items, selectedIndex = -1, disabled = false, onSelect }) => {
    const [over, setOver] = useState(false);
    const listHeight = items.length * ITEM_HEIGHT + 7;

    return (
        <div className="native100-dropmenu" style={rect(x, y, width, height)} onPointerEnter={() => setOver(true)} onPointerLeave={() => setOver(false)}>
            <ListSelect
                aria-label={caption}
                disabled={disabled}
                itemClassName="native100-dropmenu__item"
                options={items.map((item, index) => ({
                    value: String(index),
                    label: (
                        <span className="native100-dropmenu__face" style={{ left: 0, width: width - 12, height: ITEM_HEIGHT }}>
                            <span className="native100-dropmenu__state" data-state="base">
                                <NativeSkinView atlas={illuminaAtlas} height={ITEM_HEIGHT} layout="illumina_light_dropmenu_item" skin={SKIN} state={selectedIndex === index ? 'selected' : 'default'} width={width - 12} />
                                <span className="native100-dropmenu__text" style={{ left: 4, top: 1, width: width - 20, height: ITEM_HEIGHT - 1 }}>
                                    <NativeText background={selectedIndex === index ? 0xdddddd : 0xffffff} text={item} textStyle="il_regular" />
                                </span>
                            </span>
                            <span className="native100-dropmenu__state" data-state="hover">
                                <NativeSkinView atlas={illuminaAtlas} height={ITEM_HEIGHT} layout="illumina_light_dropmenu_item" skin={SKIN} state="hovering" width={width - 12} />
                                <span className="native100-dropmenu__text" style={{ left: 4, top: 1, width: width - 20, height: ITEM_HEIGHT - 1 }}>
                                    <NativeText background={0xebebeb} text={item} textStyle="il_regular" />
                                </span>
                            </span>
                        </span>
                    )
                }))}
                popupClassName="native100-dropmenu__list"
                popupDecoration={<NativeSkinView atlas={illuminaAtlas} height={listHeight} layout="illumina_light_dropmenu_frame" skin={LIST_SKIN} width={width} />}
                popupStyle={{ width, height: listHeight }}
                positionerClassName="native100-dropmenu__positioner"
                renderTrigger={() => (
                    <>
                        <NativeSkinView atlas={illuminaAtlas} height={height} layout="illumina_light_dropmenu_frame" skin={SKIN} state={over ? 'hovering' : 'default'} width={width} />
                        <span className="native100-dropmenu__caption" style={{ left: 10, top: 3, width: width - 40, height: 14 }}>
                            <NativeText background={0xffffff} text={caption} textStyle="il_regular" />
                        </span>
                    </>
                )}
                scaleWithTrigger
                sideOffset={({ anchor }) => -anchor.height}
                triggerClassName="native100-dropmenu__region"
                value={String(selectedIndex)}
                onValueChange={(next) => onSelect(Number(next))}
            />
        </div>
    );
};
