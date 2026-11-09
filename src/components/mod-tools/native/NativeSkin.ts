// Window-manager skin (classic v75 habbo-window-manager-com): a bitmap atlas cut by templates (one per state) and positioned by layouts with fixed / move /
// strech / tiled / center rules. The drawing follows the classic BitmapSkinRenderer: move shifts by the size difference, strech and tiled grow by it, center
// centres in the window, a 1x1 source is scaled by a matrix, a bigger source is nearest-neighbour scaled (draw with smoothing off) or tiled with copyPixels.
export type NativeSkinScale = 'fixed' | 'move' | 'strech' | 'tiled' | 'center';

export interface NativeSkinRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface NativeSkinEntity {
    name: string;
    colorize: boolean;
    region: NativeSkinRect;
    scaleH: NativeSkinScale;
    scaleV: NativeSkinScale;
}

export interface NativeSkinLayout {
    name: string;
    width: number;
    height: number;
    transparent: boolean;
    entities: NativeSkinEntity[];
}

export interface NativeSkinTemplate {
    asset: string;
    entities: Record<string, NativeSkinRect>;
}

export interface NativeSkin {
    states: { name: string; layout: string; template: string }[];
    templates: Record<string, NativeSkinTemplate>;
    layouts: Record<string, NativeSkinLayout>;
}

const scale = (value: string | null): NativeSkinScale => (value === 'move' || value === 'strech' || value === 'tiled' || value === 'center' ? value : 'fixed');
// Rectangle attributes may name a skin variable ("$width"); the variable table of the skin gives its value.
const rectOf = (element: Element, variables: Record<string, string>): NativeSkinRect => {
    const rectangle = element.querySelector('region > Rectangle');
    const value = (name: string) => {
        const raw = rectangle.getAttribute(name);

        return Number(raw.startsWith('$') ? variables[raw.slice(1)] : raw);
    };

    return { x: value('x'), y: value('y'), width: value('width'), height: value('height') };
};

export const parseNativeSkin = (xml: string): NativeSkin => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const variables: Record<string, string> = {};

    for (const variable of Array.from(document.querySelectorAll('skin > variables > variable'))) variables[variable.getAttribute('key')] = variable.getAttribute('value');

    const states = Array.from(document.querySelectorAll('skin > states > state')).map((state) => ({ name: state.getAttribute('name'), layout: state.getAttribute('layout'), template: state.getAttribute('template') }));
    const templates: Record<string, NativeSkinTemplate> = {};

    for (const template of Array.from(document.querySelectorAll('skin > templates > template'))) {
        const asset = template.getAttribute('asset') ?? '$asset';
        const entities: Record<string, NativeSkinRect> = {};

        for (const entity of Array.from(template.querySelectorAll('entity'))) entities[entity.getAttribute('name')] = rectOf(entity, variables);

        templates[template.getAttribute('name')] = { asset: asset.startsWith('$') ? variables[asset.slice(1)] : asset, entities };
    }

    const layouts: Record<string, NativeSkinLayout> = {};

    for (const layout of Array.from(document.querySelectorAll('skin > layouts > layout'))) {
        const entities: NativeSkinEntity[] = Array.from(layout.querySelectorAll('entity')).map((entity) => {
            const scaleElement = entity.querySelector('scale');

            return {
                name: entity.getAttribute('name'),
                colorize: entity.getAttribute('colorize') !== 'false',
                region: rectOf(entity, variables),
                scaleH: scale(scaleElement?.getAttribute('horizontal') ?? null),
                scaleV: scale(scaleElement?.getAttribute('vertical') ?? null)
            };
        });

        layouts[layout.getAttribute('name')] = {
            name: layout.getAttribute('name'),
            width: Math.max(...entities.map((entity) => entity.region.x + entity.region.width)),
            height: Math.max(...entities.map((entity) => entity.region.y + entity.region.height)),
            transparent: layout.getAttribute('transparent') === 'true',
            entities
        };
    }

    return { states, templates, layouts };
};

export interface NativeSkinDraw {
    source: NativeSkinRect;
    destination: NativeSkinRect;
    colorize: boolean;
    mode: 'copy' | 'tile' | 'scale';
}

/** The pieces BitmapSkinRenderer.draw puts down for a window of `width` x `height` in the given state. */
export const planNativeSkin = (skin: NativeSkin, layoutName: string, stateName: string, width: number, height: number): { asset: string; draws: NativeSkinDraw[] } => {
    const layout = skin.layouts[layoutName];
    const state = skin.states.find((candidate) => candidate.layout === layoutName && candidate.name === stateName) ?? skin.states.find((candidate) => candidate.layout === layoutName && candidate.name === 'default');
    const template = skin.templates[state.template];
    const draws: NativeSkinDraw[] = [];
    const extraX = width - layout.width;
    const extraY = height - layout.height;

    for (const entity of layout.entities) {
        const source = template.entities[entity.name];

        if (!source) continue;

        const destination = { ...entity.region };
        let growX = false;
        let growY = false;

        if (entity.scaleH === 'move') destination.x += extraX;
        else if (entity.scaleH === 'strech' || entity.scaleH === 'tiled') {
            destination.width += extraX;
            growX = true;
        } else if (entity.scaleH === 'center') destination.x = width / 2 - destination.width / 2;

        if (entity.scaleV === 'move') destination.y += extraY;
        else if (entity.scaleV === 'strech' || entity.scaleV === 'tiled') {
            destination.height += extraY;
            growY = true;
        } else if (entity.scaleV === 'center') destination.y = height / 2 - destination.height / 2;

        if (destination.width < 1 || destination.height < 1) continue;

        const tiled = entity.scaleH === 'tiled' || entity.scaleV === 'tiled';

        draws.push({ source, destination, colorize: entity.colorize, mode: !growX && !growY ? 'copy' : tiled ? 'tile' : 'scale' });
    }

    return { asset: template.asset, draws };
};
