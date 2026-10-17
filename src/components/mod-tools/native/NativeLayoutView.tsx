import { CSSProperties, FC, ReactNode, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import { NativeTextStyleName } from '../../../common/native-text/NativeTextStyles';
import '../../../css/mod-tools/NativeLayout.css';
import borderSunkAtlas from '../../../assets/mod-tools/skins/border-sunk.png';
import borderSunkXml from '../../../assets/mod-tools/skins/border-sunk.xml?raw';
import { nativeCaption, nativeNumber, NativeNode } from './NativeLayout';
import { parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';
import { BaseButton } from '../../../common/BaseButton';

export interface NativeNodeState {
    visible?: boolean;
    enabled?: boolean;
    caption?: string;
    textColor?: number;
    /** A tooltip on a region (why a tool button is disabled). */
    title?: string;
}

export type NativeNodeStates = Record<string, NativeNodeState>;
export type NativeNodeHandlers = Record<string, { onClick?: () => void }>;

interface NativeLayoutContext {
    /** Name of the parent window: a state can be scoped as `parent/child` when several children share a name. */
    parent: string;
    /** The pointer is over the enclosing region: black text is blended over whatever the region draws instead of being flattened on the frame colour. */
    hover?: boolean;
    states: NativeNodeStates;
    handlers: NativeNodeHandlers;
    images: Record<string, string>;
    background: number;
}

// border style 102 = illumina_light_skin_border_sunk (window-manager habbo_element_description_xml)
const BORDER_SUNK = parseNativeSkin(borderSunkXml);

const stateOf = (context: NativeLayoutContext, name: string): NativeNodeState | undefined => ({ ...context.states[name], ...context.states[`${context.parent}/${name}`] });

const rectStyle = (node: NativeNode): CSSProperties => ({
    left: nativeNumber(node, 'x'),
    top: nativeNumber(node, 'y'),
    width: nativeNumber(node, 'width'),
    height: nativeNumber(node, 'height')
});

const NativeChildren: FC<{ node: NativeNode; context: NativeLayoutContext }> = ({ node, context }) => (
    <>
        {node.children.map((child, index) => (
            <NativeNodeView key={`${child.tag}:${child.attrs.name ?? index}`} node={child} context={context} />
        ))}
    </>
);

const NativeRegion: FC<{ node: NativeNode; context: NativeLayoutContext }> = ({ node, context }) => {
    const name = node.attrs.name ?? '';
    const state = stateOf(context, name);
    const enabled = state.enabled ?? true;
    const [over, setOver] = useState(false);

    return (
        <div
            className="native-region"
            data-native-name={name}
            data-native-enabled={enabled}
            data-native-over={over && enabled}
            style={rectStyle(node)}
            title={state.title}
            onClick={enabled ? context.handlers[name]?.onClick : undefined}
            onPointerEnter={() => setOver(true)}
            onPointerLeave={() => setOver(false)}
        >
            {node.children.map((child, index) => (
                <NativeNodeView key={`${child.tag}:${child.attrs.name ?? index}`} node={child} context={{ ...context, parent: name, hover: over && enabled, states: { ...context.states, [`${name}/mouseover`]: { visible: over && enabled } } }} />
            ))}
        </div>
    );
};

const NativeLabel: FC<{ node: NativeNode; context: NativeLayoutContext }> = ({ node, context }) => {
    const name = node.attrs.name ?? '';
    const state = stateOf(context, name);
    const textStyle = (node.vars.text_style ?? 'u_regular') as NativeTextStyleName;
    const text = state?.caption ?? nativeCaption(node);
    const color = state?.textColor ?? 0;

    return (
        <div className="native-label" data-native-name={name} style={rectStyle(node)}>
            <NativeText background={context.background} overrides={{ color }} text={text} textStyle={textStyle} />
        </div>
    );
};

// static_bitmap with pivot_point center and no stretching: the bitmap is placed at trunc((window - bitmap) / 2) (a 21px bitmap in a 20px window sits at 0, not -1).
const NativeBitmap: FC<{ node: NativeNode; context: NativeLayoutContext }> = ({ node, context }) => {
    const source = context.images[node.vars.asset_uri ?? ''];
    const [natural, setNatural] = useState<{ width: number; height: number }>(null);
    const width = nativeNumber(node, 'width');
    const height = nativeNumber(node, 'height');

    return (
        <div className="native-bitmap" style={rectStyle(node)}>
            {source && (
                <img
                    alt=""
                    draggable={false}
                    src={source}
                    style={natural ? { left: Math.trunc((width - natural.width) / 2), top: Math.trunc((height - natural.height) / 2) } : { visibility: 'hidden' }}
                    onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                />
            )}
        </div>
    );
};

export const NativeNodeView: FC<{ node: NativeNode; context: NativeLayoutContext }> = ({ node, context }) => {
    const name = node.attrs.name ?? '';

    const visible = stateOf(context, name).visible;

    if (visible === false || (node.attrs.visible === 'false' && visible !== true)) return null;

    switch (node.tag) {
        case 'region':
            return <NativeRegion node={node} context={context} />;
        case 'label':
            return <NativeLabel node={node} context={context} />;
        case 'static_bitmap':
            return <NativeBitmap node={node} context={context} />;
        case 'border':
            return (
                <div className="native-border" data-native-name={name} style={rectStyle(node)}>
                    <NativeSkinView atlas={borderSunkAtlas} height={nativeNumber(node, 'height')} layout="illumina_light_border_sunk" skin={BORDER_SUNK} width={nativeNumber(node, 'width')} />
                </div>
            );
        case 'itemlist':
            return (
                <div className="native-itemlist" data-native-name={name} style={rectStyle(node)}>
                    <NativeChildren node={node} context={{ ...context, parent: name }} />
                </div>
            );
        default:
            return null;
    }
};

interface NativeFrameProps {
    node: NativeNode;
    /** The frame's height when it is taller than its layout (room for controls added below the layout's own content). */
    height?: number;
    title?: string;
    states?: NativeNodeStates;
    handlers?: NativeNodeHandlers;
    images?: Record<string, string>;
    onClose: () => void;
    children?: ReactNode;
}

/** A frame (style 100) window: its children sit inside the frame margins. */
export const NativeFrameView: FC<NativeFrameProps> = ({ node, height, title, states = {}, handlers = {}, images = {}, onClose, children }) => {
    const marginLeft = Number(node.vars.margin_left ?? 0);
    const marginTop = Number(node.vars.margin_top ?? 0);
    const context: NativeLayoutContext = { parent: node.attrs.name ?? '', states, handlers, images, background: 0xe2e2e2 };

    return (
        <section aria-label={title ?? nativeCaption(node)} className="native-frame" data-native-name={node.attrs.name} role="dialog" style={{ width: nativeNumber(node, 'width'), height: height ?? nativeNumber(node, 'height') }}>
            <div aria-hidden="true" className="native-frame__chrome" />
            <div className="native-frame__titlebar">
                <h2 className="native-frame__title">
                    <NativeText background={context.background} text={title ?? nativeCaption(node)} textStyle="il_frame_title" />
                </h2>
            </div>
            <BaseButton aria-label="Close" className="native-frame__close" name="header_button_close" onClick={onClose} type="button" />
            <div className="native-frame__client" style={{ left: marginLeft, top: marginTop }}>
                <NativeChildren node={node} context={context} />
                {children}
            </div>
        </section>
    );
};
