import { CSSProperties, DetailedHTMLProps, ElementType, FC, HTMLAttributes, MutableRefObject, ReactNode, useMemo } from 'react';
import { ColorVariantType, DisplayType, FloatType, OverflowType, PositionType } from './types';

export interface BaseProps<T = HTMLElement> extends DetailedHTMLProps<HTMLAttributes<T>, T> {
    innerRef?: MutableRefObject<T>;
    /** The element or component to render: a `div` unless told otherwise (`Button` renders a Base UI button). */
    component?: ElementType;
    /** Only meaningful when `component` is a button. */
    disabled?: boolean;
    /** Only meaningful when `component` is a button. */
    type?: string | number;
    display?: DisplayType;
    fit?: boolean;
    fitV?: boolean;
    grow?: boolean;
    shrink?: boolean;
    fullWidth?: boolean;
    fullHeight?: boolean;
    overflow?: OverflowType;
    position?: PositionType;
    float?: FloatType;
    pointer?: boolean;
    visible?: boolean;
    textColor?: ColorVariantType;
    classNames?: string[];
    children?: ReactNode;
}

export const Base: FC<BaseProps<HTMLDivElement>> = (props) => {
    const {
        ref = null,
        innerRef = null,
        component: Component = 'div',
        display = null,
        fit = false,
        fitV = false,
        grow = false,
        shrink = false,
        fullWidth = false,
        fullHeight = false,
        overflow = null,
        position = null,
        float = null,
        pointer = false,
        visible = null,
        textColor = null,
        classNames = [],
        className = '',
        style = {},
        children = null,
        ...rest
    } = props;
    const safeClassNames = Array.isArray(classNames) ? classNames : [];
    const safeClassName = typeof className === 'string' ? className : '';

    const getClassNames = useMemo(() => {
        const newClassNames: string[] = [];

        if (display && display.length) newClassNames.push(display);

        if (fit || fullWidth) newClassNames.push('w-full');

        if (fit || fullHeight) newClassNames.push('h-full');

        if (fitV) newClassNames.push('vw-full', 'vh-full');

        if (grow) newClassNames.push('grow!');

        if (shrink) newClassNames.push('shrink-0!');

        if (overflow) newClassNames.push('overflow-' + overflow);

        if (position) newClassNames.push(position);

        if (float) newClassNames.push('float-' + float);

        if (pointer) newClassNames.push('cursor-pointer');

        if (visible !== null) newClassNames.push(visible ? 'visible' : 'invisible');

        if (textColor) newClassNames.push('text-' + textColor);

        if (safeClassNames.length) newClassNames.push(...safeClassNames);

        return newClassNames;
    }, [display, fit, fitV, grow, shrink, fullWidth, fullHeight, overflow, position, float, pointer, visible, textColor, safeClassNames]);

    const getClassName = useMemo(() => {
        let newClassName = getClassNames.join(' ');

        if (safeClassName.length) newClassName += ' ' + safeClassName;

        return newClassName.trim();
    }, [getClassNames, safeClassName]);

    const getStyle = useMemo(() => {
        let newStyle: CSSProperties = {};

        if (Object.keys(style).length) newStyle = { ...newStyle, ...style };

        return newStyle;
    }, [style]);

    return (
        <Component ref={innerRef} className={getClassName} style={getStyle} {...rest}>
            {children}
        </Component>
    );
};
