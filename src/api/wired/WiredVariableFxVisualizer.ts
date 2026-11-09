import { VariableFxStatusData, VariableFxVisualizer } from '@octane/renderer';
import type { IRoomObjectVariableFxFrame, IRoomObjectVariableFxVisualizer } from '@octane/renderer';
import { IWiredVariableFxConfigLike, IWiredVariableFxStatusLike } from './WiredVariableFx';

/** What paints one value: the room renderer's port of AIR's painters (VariableFxVisualizer). */
export interface IWiredVariableFxPainter extends IRoomObjectVariableFxVisualizer {
    updateData(status: VariableFxStatusData, now: number): void;
}

export type WiredVariableFxPainterFactory = (config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike, initialize: boolean, now: number) => IWiredVariableFxPainter | null;

const createRendererPainter: WiredVariableFxPainterFactory = (config, status, initialize, now) => {
    // A renderer bundle from before AIR's painters has none; nothing is drawn then.
    if (typeof VariableFxVisualizer?.fromWire !== 'function') return null;

    return VariableFxVisualizer.fromWire(config, status, now, initialize);
};

/**
 * One drawn fx value for the room renderer, as AIR's VariableFxStackAddition keeps it: AIR's
 * painter for the config's renderer draws it from the room's fx assets. A new config makes a new
 * painter; a new value for the same config goes to the painter, which animates to it unless it is
 * an "initialize" value or the fx is hidden (AIR draws those at once).
 */
export class WiredVariableFxVisualizer implements IRoomObjectVariableFxVisualizer {
    private _config: IWiredVariableFxConfigLike = null;
    private _status: IWiredVariableFxStatusLike = null;
    private _painter: IWiredVariableFxPainter = null;

    constructor(private readonly _createPainter: WiredVariableFxPainterFactory = createRendererPainter) {}

    /** Takes the config and value to draw; `invisible` (the fx is hidden) skips the animation like an initialize. */
    public setData(config: IWiredVariableFxConfigLike, status: IWiredVariableFxStatusLike & { initialize?: boolean }, invisible: boolean, now: number): void {
        const initialize = !!status.initialize || invisible;

        if (!this._painter || config !== this._config) {
            this._painter = this._createPainter(config, status, initialize, now);
        } else if (status !== this._status) {
            this._painter.updateData(VariableFxStatusData.fromWire(status, initialize), now);
        }

        this._config = config;
        this._status = status;
    }

    public get painter(): IWiredVariableFxPainter {
        return this._painter;
    }

    public get frame(): IRoomObjectVariableFxFrame {
        return this._painter?.frame ?? null;
    }

    public needsUpdate(now: number): boolean {
        return !!this._painter && this._painter.needsUpdate(now);
    }

    public update(now: number): boolean {
        return !!this._painter && this._painter.update(now);
    }
}
