import { cloneElement, FC, Fragment, isValidElement, ReactElement, ReactNode } from 'react';
import { NativeLabel } from './NativeLabel';
import { isNativeTextEnabled } from './nativeTextEnabled';

// Elements whose text is a value, code or a script, not a label, and SVG (a component may return a bare `<g>` / `<text>`).
const SKIP = new Set([
    'input',
    'textarea',
    'select',
    'option',
    'optgroup',
    'script',
    'style',
    'canvas',
    'iframe',
    'pre',
    'code',
    'kbd',
    'svg',
    'g',
    'text',
    'tspan',
    'textPath',
    'foreignObject',
    'defs',
    'symbol',
    'title',
    'desc'
]);

interface ElementProps {
    children?: ReactNode;
    className?: unknown;
    disabled?: unknown;
    dangerouslySetInnerHTML?: unknown;
    'aria-pressed'?: unknown;
    'aria-selected'?: unknown;
}

const isEmpty = (part: unknown) => part === null || part === undefined || part === false || part === true;

const textOf = (children: ReactNode): string | null => {
    const parts = Array.isArray(children) ? children : [children];

    if (!parts.every((part) => isEmpty(part) || typeof part === 'string' || typeof part === 'number')) return null;

    const text = parts.filter((part) => !isEmpty(part)).join('');

    return text.trim() ? text : null;
};

// A rebuilt child list keys its elements by position, the key React gives static children anyway, so nothing remounts and React
// never warns about a list without keys (it does for children it did not create as a static list, e.g. after the React Compiler).
const keyedByPosition = (children: ReactNode[]) =>
    children.map((child, index) => (isValidElement(child) && child.key === null ? cloneElement(child, { key: `ntt${index}` }) : child));

const withChildren = (element: ReactElement<ElementProps>, children: ReactNode) =>
    cloneElement(element, undefined, Array.isArray(children) ? keyedByPosition(children) : children);

const sameChildren = (before: ReactNode, after: ReactNode) =>
    before === after ||
    (Array.isArray(before) && Array.isArray(after) && before.length === after.length && before.every((child, index) => child === after[index]));

// Elements are immutable, so an element seen before converts to the same result. Returning that same object (and the untouched
// element itself where nothing in it is text) keeps what React and the React Compiler rely on to skip unchanged subtrees: a window
// re-rendering while it is dragged then does not re-render every label in it.
const converted = new WeakMap<object, ReactNode>();

const convert = (node: ReactNode): ReactNode => {
    if (Array.isArray(node)) return node.map(convert);
    if (!isValidElement<ElementProps>(node)) return node;
    if (converted.has(node)) return converted.get(node);

    const result = convertElement(node);

    converted.set(node, result);

    return result;
};

const convertElement = (node: ReactElement<ElementProps>): ReactNode => {
    const { children, className, disabled, dangerouslySetInnerHTML } = node.props;

    if (children === undefined || children === null || dangerouslySetInnerHTML) return node;
    if (typeof node.type === 'string' && SKIP.has(node.type)) return node;

    const host = typeof node.type === 'string';
    const text = textOf(children);

    if (text !== null) {
        // A component may use its text in other ways (a title, a measurement): Text and BaseButton draw theirs already.
        if (!host) return node;

        const stateKey = `${typeof className === 'string' ? className : ''}|${disabled ?? ''}|${node.props['aria-pressed'] ?? ''}|${node.props['aria-selected'] ?? ''}`;

        return withChildren(node, <NativeLabel stateKey={stateKey} text={text} />);
    }

    if (!host && node.type !== Fragment && typeof children !== 'object') return node;

    // Running text with inline markup (`Hallo <b>naam</b>`) stays browser text as a whole, so one line never mixes two renderers.
    if (Array.isArray(children) && children.some((part) => typeof part === 'string' && part.trim())) return node;

    const next = Array.isArray(children) ? children.map(convert) : convert(children);

    return sameChildren(children, next) ? node : withChildren(node, next);
};

/**
 * Draws the labels of a JSX tree with AIR's text renderer: every element in it whose children are only text (a span, label, link,
 * button, heading...) gets a NativeLabel, the children of components included. Text inside components' own markup is theirs to
 * convert. Off where native text is off (jsdom, `ui.native.text.enabled`), when the tree is returned as it is.
 */
export const NativeTextTree: FC<{ children: ReactNode }> = ({ children }) => <>{isNativeTextEnabled() ? convert(children) : children}</>;
