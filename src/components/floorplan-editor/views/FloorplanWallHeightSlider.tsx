import { CSSProperties, FC } from 'react';
import { Slider } from '../../../common/Slider';
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from '../state/constants';

type Props = {
    value: number;
    onChange: (next: number) => void;
};

export const FloorplanWallHeightSlider: FC<Props> = ({ value, onChange }) => {
    const count = MAX_WALL_HEIGHT - MIN_WALL_HEIGHT + 1;
    const clamped = Math.max(MIN_WALL_HEIGHT, Math.min(MAX_WALL_HEIGHT, value));

    return (
        <Slider
            orientation="vertical"
            className="fp-slider"
            style={{ '--fp-count': count } as CSSProperties}
            min={MIN_WALL_HEIGHT}
            max={MAX_WALL_HEIGHT}
            step={1}
            value={clamped}
            thumbAriaLabel="Wall height"
            title={`Wall height ${clamped}`}
            trackClassName="fp-slider-track is-ladder"
            thumbClassName="fp-slider-thumb"
            trackStyle={{ '--fp-rung': `${(100 / count).toFixed(4)}%` } as CSSProperties}
            trackTestId="wall-height-track"
            renderThumbContent={() => <span data-testid="wall-height-thumb" data-value={clamped} hidden />}
            onChange={(next: number) => onChange(next)}
        />
    );
};
