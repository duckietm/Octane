import { CSSProperties, FC, useMemo } from 'react';
import { Slider } from '../../../common/Slider';
import { HEIGHT_BRUSH_MAX, HEIGHT_BRUSH_MIN } from '../state/constants';
import { tileFill } from '../state/selectors';

type Props = {
    selectedH: number;
    onSelect: (h: number) => void;
};

export const FloorplanHeightPicker: FC<Props> = ({ selectedH, onSelect }) => {
    const count = HEIGHT_BRUSH_MAX - HEIGHT_BRUSH_MIN + 1;

    const gradient = useMemo(() => {
        const stops: string[] = [];
        for (let i = 0; i < count; i++) {
            const h = HEIGHT_BRUSH_MAX - i;
            const fill = tileFill({ h, blocked: false });
            const startPct = (i / count) * 100;
            const endPct = ((i + 1) / count) * 100;

            stops.push(`${fill} ${startPct.toFixed(2)}%`);
            stops.push(`${fill} ${endPct.toFixed(2)}%`);
        }

        return `linear-gradient(to bottom, ${stops.join(', ')})`;
    }, [count]);

    const thumbColor = tileFill({ h: selectedH, blocked: false });

    return (
        <Slider
            orientation="vertical"
            className="fp-slider"
            style={{ '--fp-count': count } as CSSProperties}
            min={HEIGHT_BRUSH_MIN}
            max={HEIGHT_BRUSH_MAX}
            step={1}
            value={selectedH}
            thumbAriaLabel="Brush height"
            title={`Brush height ${selectedH}`}
            trackClassName="fp-slider-track"
            thumbClassName="fp-slider-thumb"
            trackStyle={{ background: gradient }}
            trackTestId="height-track"
            renderThumbContent={() => <span data-testid="height-thumb" data-value={selectedH} data-thumb-color={thumbColor} hidden />}
            onChange={(next: number) => onSelect(next)}
        />
    );
};
