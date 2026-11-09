// Parser for the classic v75 window layout XML (habbo-moderation-com.hab, extracted from the release bundle sha256 c3ff6b32867622bbe4b03693066274ed1ce0a84abf6c396da687171dda42d031).
export interface NativeNode {
    tag: string;
    attrs: Record<string, string>;
    vars: Record<string, string>;
    children: NativeNode[];
}

const toNode = (element: Element): NativeNode => {
    const attrs: Record<string, string> = {};

    for (const attribute of Array.from(element.attributes)) attrs[attribute.name] = attribute.value;

    const vars: Record<string, string> = {};
    const children: NativeNode[] = [];

    for (const child of Array.from(element.children)) {
        if (child.tagName === 'variables') {
            for (const variable of Array.from(child.children)) vars[variable.getAttribute('key') ?? ''] = variable.getAttribute('value') ?? '';
        } else if (child.tagName === 'children') {
            for (const grandChild of Array.from(child.children)) children.push(toNode(grandChild));
        }
    }

    return { tag: element.tagName, attrs, vars, children };
};

/** The first window element of a layout file (frame, container, ...), with every `children` wrapper flattened. */
export const parseNativeLayout = (xml: string): NativeNode => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const windowElement = document.querySelector('layout > window');

    return toNode(windowElement.firstElementChild);
};

export const nativeNumber = (node: NativeNode, name: string, fallback = 0): number => {
    const value = Number(node.attrs[name]);

    return Number.isFinite(value) ? value : fallback;
};

export const nativeCaption = (node: NativeNode): string => {
    const caption = node.attrs.caption ?? '';

    try {
        return decodeURIComponent(caption);
    } catch {
        return caption;
    }
};

export const findNativeNode = (node: NativeNode, name: string): NativeNode | null => {
    if (node.attrs.name === name) return node;

    for (const child of node.children) {
        const found = findNativeNode(child, name);

        if (found) return found;
    }

    return null;
};

// How a child follows a change of its parent's size: the window's scale bits (AIR WindowController.updateScaleRelativeToParent, WindowController.as:1832-1905): 0xC0 for the width, 0x0C00
// for the height; 128 / 2048 stretch the child (its size grows by the parent's change), 64 / 1024 move it (its position does) and anything else leaves it where it is.
export type NativeFollow = 'fixed' | 'move' | 'stretch';

export const nativeFollow = (node: NativeNode, axis: 'x' | 'y'): NativeFollow => {
    const bits = Number(node.attrs.params ?? 0) & (axis === 'x' ? 0xc0 : 0x0c00);

    if (bits === (axis === 'x' ? 128 : 2048)) return 'stretch';
    if (bits === (axis === 'x' ? 64 : 1024)) return 'move';

    return 'fixed';
};

/** The node's rectangle after its parent grew by (deltaWidth, deltaHeight). */
export const nativeScaledRect = (node: NativeNode, deltaWidth: number, deltaHeight: number) => {
    const fx = nativeFollow(node, 'x');
    const fy = nativeFollow(node, 'y');

    return {
        x: nativeNumber(node, 'x') + (fx === 'move' ? deltaWidth : 0),
        y: nativeNumber(node, 'y') + (fy === 'move' ? deltaHeight : 0),
        width: nativeNumber(node, 'width') + (fx === 'stretch' ? deltaWidth : 0),
        height: nativeNumber(node, 'height') + (fy === 'stretch' ? deltaHeight : 0)
    };
};
