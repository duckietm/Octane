import { CSSProperties, FC, useMemo } from 'react';
import { Slider } from '../../../common/Slider';
import { HEIGHT_BRUSH_MAX, HEIGHT_BRUSH_MIN } from '../state/constants';
import { tileFill } from '../state/selectors';
import { localizeWithFallback } from '../../../api';

type Props = {
    selectedH: number;
    onSelect: (h: number) => void;
};

export const FloorplanHeightPicker: FC<Props> = ({ selectedH, onSelect }) => {
    const count = HEIGHT_BRUSH_MAX - HEIGHT_BRUSH_MIN + 1;

    const gradient = useMemo(() => {
        const stops: string[] = [];
        for (let i = 0; i < count; i++) {
            const h = HEIGHT_BRUSH_MIN + i;
            const fill = tileFill({ h, blocked: false });
            const startPct = (i / count) * 100;
            const endPct = ((i + 1) / count) * 100;

            stops.push(`${fill} ${startPct.toFixed(2)}%`);
            stops.push(`${fill} ${endPct.toFixed(2)}%`);
        }

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [count]);

    const thumbColor = tileFill({ h: selectedH, blocked: false });

    return (
        // AIR tile_height_colormap: a horizontal colour bar, lowest height on the left, with the pointer under it.
        <Slider
            bare
            className="fp-hslider is-colormap"
            style={{ '--fp-count': count } as CSSProperties}
            min={HEIGHT_BRUSH_MIN}
            max={HEIGHT_BRUSH_MAX}
            step={1}
            value={selectedH}
            thumbAriaLabel={localizeWithFallback('octane.floorplan_editor.brush_height', 'Brush height')}
            title={localizeWithFallback('octane.floorplan_editor.brush_height_selected_h', 'Brush height %selected_h%', ['selected_h'], [String(selectedH)])}
            trackClassName="fp-hslider-track"
            thumbClassName="fp-hslider-thumb"
            trackStyle={{ background: gradient }}
            trackTestId="height-track"
            renderThumbContent={() => <span data-testid="height-thumb" data-value={selectedH} data-thumb-color={thumbColor} hidden />}
            onChange={(next: number) => onSelect(next)}
        />
    );
};
