import { CSSProperties, FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { DraggableWindow } from '../../../../common/draggable-window';
import { NativeText } from '../../../../common/native-text/NativeText';
import { getAreaHideControlState, useFurnitureAreaHideWidget } from '../../../../hooks';
import '../../../../css/room/FurniWindowsCAir.css';
import { Native0Button, Native0Checkbox } from '../../../mod-tools/native/NativeWindow0';
import { Native3Frame } from '../../../mod-tools/native/NativeWindow3';

// AIR layout area_hide_ui: a 292x334 frame style 3 in 0x67a3bf with its content at the frame margins (6, 25).
const WIDTH = 292;
const HEIGHT = 334;
const PANEL_COLOR = 0xffffff;
const INFO_COLOR = 0x999999;

const rect = (x: number, y: number, width?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width });

/** Centred like AIR's window center(): whole pixels, rounded down. */
const centred = () => ({ x: Math.floor((window.innerWidth - WIDTH) / 2), y: Math.floor((window.innerHeight - HEIGHT) / 2) });

interface AreaHideTextProps {
    x: number;
    y: number;
    text: string;
    width?: number;
    bold?: boolean;
    color?: number;
    dimmed: boolean;
}

// A u_small text window; while the hider is on, the widget sets every text to blend 0.5.
const AreaHideText: FC<AreaHideTextProps> = ({ x, y, text, width, bold = false, color = 0, dimmed }) => (
    <div style={{ ...rect(x, y, width), opacity: dimmed ? 0.5 : 1 }}>
        <NativeText background={PANEL_COLOR} maxWidth={width} overrides={{ bold, color }} text={text} textStyle="u_small" />
    </div>
);

interface AreaHideOptionProps {
    y: number;
    name: string;
    label: string;
    info?: string;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}

const AreaHideOption: FC<AreaHideOptionProps> = ({ y, name, label, info, checked, disabled, onToggle }) => (
    <>
        <div style={{ opacity: disabled ? 0.5 : 1 }}>
            <Native0Checkbox checked={checked} enabled={!disabled} name={name} x={7} y={y} onToggle={onToggle} />
        </div>
        <AreaHideText dimmed={disabled} text={label} width={240} x={26} y={y} />
        {info && <AreaHideText color={INFO_COLOR} dimmed={disabled} text={info} width={242} x={26} y={y + 16} />}
    </>
);

/** The area hider furni window, laid out like AIR's area_hide_ui. */
export const FurnitureAreaHideView: FC<{}> = () => {
    const {
        objectId = -1,
        isOn,
        wallItems,
        setWallItems,
        inverted,
        setInverted,
        invisibility,
        setInvisibility,
        selecting,
        selectionActive,
        startSelecting,
        clearSelection,
        toggleOnOff,
        onClose = null
    } = useFurnitureAreaHideWidget();
    const [selectWidth, setSelectWidth] = useState(0);

    if (objectId === -1) return null;

    const { optionsDisabled, selectDisabled, clearDisabled } = getAreaHideControlState(isOn, selecting, selectionActive);

    return (
        <DraggableWindow handleSelector=".native3-title" initialPosition={centred()} uniqueKey="area-hide">
            <Native3Frame color={0x67a3bf} height={HEIGHT} title={LocalizeText('widget.areahide.title')} width={WIDTH} onClose={onClose}>
                <div className="furniture-area-hide__panel" data-testid="area-hide-panel">
                    <AreaHideText bold dimmed={isOn} text={LocalizeText('widget.areahide.area_selection')} x={6} y={7} />
                    <AreaHideText dimmed={isOn} text={LocalizeText('widget.areahide.area_selection.info')} width={262} x={6} y={27} />
                    <Native0Button
                        enabled={!selectDisabled}
                        fit="left"
                        height={24}
                        label={LocalizeText('widget.areahide.area_selection.select')}
                        name="select_button"
                        width={211}
                        x={6}
                        y={73}
                        onClick={startSelecting}
                        onFit={setSelectWidth}
                    />
                    {/* button_container is an itemlist_horizontal with 12px spacing. */}
                    <Native0Button
                        enabled={!clearDisabled}
                        fit="left"
                        height={24}
                        label={LocalizeText('widget.areahide.area_selection.clear')}
                        name="clear_button"
                        width={205}
                        x={6 + selectWidth + 12}
                        y={73}
                        onClick={clearSelection}
                    />
                    <AreaHideText bold dimmed={isOn} text={LocalizeText('widget.areahide.options')} x={6} y={105} />
                    <AreaHideOption
                        checked={wallItems}
                        disabled={optionsDisabled}
                        label={LocalizeText('widget.areahide.options.wallitems')}
                        name="wallitems_checkbox"
                        y={125}
                        onToggle={() => setWallItems(!wallItems)}
                    />
                    <AreaHideOption
                        checked={inverted}
                        disabled={optionsDisabled}
                        info={LocalizeText('widget.areahide.options.invert.info')}
                        label={LocalizeText('widget.areahide.options.invert')}
                        name="invert_checkbox"
                        y={145}
                        onToggle={() => setInverted(!inverted)}
                    />
                    <AreaHideOption
                        checked={invisibility}
                        disabled={optionsDisabled}
                        info={LocalizeText('widget.areahide.options.invisibility.info')}
                        label={LocalizeText('widget.areahide.options.invisibility')}
                        name="invisiblity_checkbox"
                        y={193}
                        onToggle={() => setInvisibility(!invisibility)}
                    />
                </div>
                <Native0Button
                    fit="right"
                    height={24}
                    label={LocalizeText(isOn ? 'widget.areahide.button.off' : 'widget.areahide.button.on')}
                    name="on_off_button"
                    width={151}
                    x={126}
                    y={272}
                    onClick={toggleOnOff}
                />
            </Native3Frame>
        </DraggableWindow>
    );
};
