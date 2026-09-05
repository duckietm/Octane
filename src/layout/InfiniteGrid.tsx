import { useVirtualizer } from '@tanstack/react-virtual';
import { DetailedHTMLProps, Fragment, HTMLAttributes, ReactElement, Ref, RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ClassicScrollAreaView } from '../common/scroll-area/ClassicScrollAreaView';
import { classNames } from './classNames';
import { OctaneLimitedEditionStyledNumberView } from './limited-edition';
import { styleNames } from './styleNames';

type Props<T> = {
    items: T[];
    columnCount: number;
    overscan?: number;
    estimateSize?: number;
    squareItems?: boolean;
    itemMinWidth?: number;
    rowGap?: number;
    columnGap?: number;
    classicScrollbar?: boolean;
    airColumnAdmission?: boolean;
    onColumnCountChange?: (columnCount: number) => void;
    itemRender?: (item: T, index?: number) => ReactElement;
    // Optional stable React key per item. Defaults to the grid position (index), which is fine
    // for static lists but lets a cell's local state bleed to a different item when the list
    // reorders - pass this for lists whose items are added/removed/reordered.
    itemKey?: (item: T, index: number) => string | number;
};

const GRID_GAP_PX = 4;

const useColumnMeasure = (
    itemMinWidth: number | null,
    columnCountProp: number,
    columnGap: number = GRID_GAP_PX,
    airColumnAdmission: boolean = false,
    onColumnCountChange?: (columnCount: number) => void
): { parentRef: RefObject<HTMLDivElement | null>; columnCount: number } => {
    const parentRef = useRef<HTMLDivElement>(null);
    const [measuredColumnCount, setMeasuredColumnCount] = useState<number>(columnCountProp);

    useLayoutEffect(() => {
        if (!itemMinWidth || itemMinWidth <= 0) return;

        const element = parentRef.current;
        if (!element) return;

        const recompute = () => {
            const computedStyle = window.getComputedStyle(element);
            const parsedLeft = Number.parseFloat(computedStyle.paddingLeft);
            const parsedRight = Number.parseFloat(computedStyle.paddingRight);
            const horizontalPadding = (Number.isFinite(parsedLeft) ? parsedLeft : 0) + (Number.isFinite(parsedRight) ? parsedRight : 0);
            const width = element.clientWidth - horizontalPadding;
            const admissionAllowance = airColumnAdmission ? columnGap * 2 : columnGap;
            const cols = Math.max(1, Math.floor((width + admissionAllowance) / (itemMinWidth + columnGap)));
            setMeasuredColumnCount((prev) => (prev === cols ? prev : cols));
        };

        recompute();

        const observer = new ResizeObserver(recompute);
        observer.observe(element);

        return () => observer.disconnect();
    }, [airColumnAdmission, columnGap, itemMinWidth]);

    const columnCount = itemMinWidth && itemMinWidth > 0 ? measuredColumnCount : columnCountProp;

    useLayoutEffect(() => onColumnCountChange?.(columnCount), [columnCount, onColumnCountChange]);

    return { parentRef, columnCount };
};

const InfiniteGridSquare = <T,>(props: Props<T>) => {
    const {
        items = [],
        columnCount: columnCountProp = 4,
        itemMinWidth = null,
        columnGap = GRID_GAP_PX,
        airColumnAdmission = false,
        onColumnCountChange,
        itemRender = null,
        itemKey = null,
        classicScrollbar = false
    } = props;
    const { parentRef } = useColumnMeasure(itemMinWidth, columnCountProp, columnGap, airColumnAdmission, onColumnCountChange);

    const autoFillStyle =
        itemMinWidth && itemMinWidth > 0 ? { columnGap, gridTemplateColumns: `repeat(auto-fill, minmax(${itemMinWidth}px, 1fr))` } : { columnGap };
    const fixedColsClass = itemMinWidth && itemMinWidth > 0 ? '' : `grid-cols-${columnCountProp}`;

    const content = (
        <div className={`grid ${fixedColsClass} gap-1 w-full`} style={autoFillStyle ?? undefined}>
            {items.map((item, index) => {
                if (!item) return <Fragment key={`${index}-empty`} />;

                return <Fragment key={itemKey ? itemKey(item, index) : `${index}-item`}>{itemRender(item, index)}</Fragment>;
            })}
        </div>
    );

    if (classicScrollbar) {
        return (
            <ClassicScrollAreaView className="size-full" viewportRef={parentRef}>
                {content}
            </ClassicScrollAreaView>
        );
    }

    return (
        <div ref={parentRef} className="overflow-y-auto size-full">
            {content}
        </div>
    );
};

const InfiniteGridVirtualized = <T,>(props: Props<T>) => {
    const {
        items = [],
        columnCount: columnCountProp = 4,
        overscan = 5,
        estimateSize = 45,
        itemMinWidth = null,
        rowGap = null,
        columnGap = GRID_GAP_PX,
        airColumnAdmission = false,
        onColumnCountChange,
        itemRender = null,
        itemKey = null,
        classicScrollbar = false
    } = props;
    const { parentRef, columnCount } = useColumnMeasure(itemMinWidth, columnCountProp, columnGap, airColumnAdmission, onColumnCountChange);

    const rowsContainerClassName = rowGap !== null ? 'flex flex-col w-full relative' : 'flex flex-col w-full *:pb-1 relative';

    const autoFillStyle = itemMinWidth && itemMinWidth > 0 ? { gridTemplateColumns: `repeat(auto-fill, minmax(${itemMinWidth}px, 1fr))` } : null;
    const fixedColsClass = itemMinWidth && itemMinWidth > 0 ? '' : `grid-cols-${columnCountProp}`;

    const virtualizer = useVirtualizer({
        count: Math.ceil(items.length / columnCount),
        overscan,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize
    });

    useEffect(() => {
        const element = parentRef.current;

        if (!element || !items) return;

        if (classicScrollbar) {
            element.style.removeProperty('padding-right');
            return;
        }

        const checkAndApplyPadding = () => {
            if (!element) return;

            element.style.paddingRight = element.scrollHeight > element.clientHeight ? '0.25rem' : '0';
        };

        checkAndApplyPadding();

        window.addEventListener('resize', checkAndApplyPadding);

        return () => {
            window.removeEventListener('resize', checkAndApplyPadding);
        };
    }, [items, parentRef, classicScrollbar]);

    useEffect(() => {
        if (!items || !items.length) return;

        if (parentRef.current) parentRef.current.scrollLeft = 0;
        virtualizer.scrollToIndex(0);
    }, [items, virtualizer]);

    const virtualItems = virtualizer.getVirtualItems();

    const content = virtualItems.map((virtualRow) => (
        <div
            key={virtualRow.key + 'a'}
            ref={virtualizer.measureElement}
            className={`grid ${fixedColsClass} gap-1 absolute top-0 left-0 last:pb-0 w-full`}
            data-index={virtualRow.index}
            style={{
                ...(rowGap === null && { height: virtualRow.size }),
                ...(autoFillStyle ?? {}),
                ...(rowGap !== null && { paddingBottom: `${rowGap}px` }),
                columnGap,
                transform: `translateY(${virtualRow.start}px)`
            }}
        >
            {Array.from(Array(columnCount)).map((e, i) => {
                const index = i + virtualRow.index * columnCount;
                const item = items[index];

                if (!item) return <Fragment key={virtualRow.index + i + 'b'} />;

                return <Fragment key={itemKey ? itemKey(item, index) : i}>{itemRender(item, index)}</Fragment>;
            })}
        </div>
    ));

    if (classicScrollbar) {
        return (
            <ClassicScrollAreaView
                className="size-full"
                contentClassName={rowsContainerClassName}
                contentStyle={{ height: virtualizer.getTotalSize() }}
                viewportRef={parentRef}
            >
                {content}
            </ClassicScrollAreaView>
        );
    }

    return (
        <div ref={parentRef} className="overflow-y-auto size-full">
            <div
                className={rowsContainerClassName}
                style={{
                    height: virtualizer.getTotalSize()
                }}
            >
                {content}
            </div>
        </div>
    );
};

const InfiniteGridRoot = <T,>(props: Props<T>) => {
    return props.squareItems ? <InfiniteGridSquare<T> {...props} /> : <InfiniteGridVirtualized<T> {...props} />;
};

type InfiniteGridItemProps = {
    itemImage?: string;
    itemColor?: string;
    itemActive?: boolean;
    itemCount?: number;
    itemCountMinimum?: number;
    itemUniqueSoldout?: boolean;
    itemUniqueNumber?: number;
    itemUnseen?: boolean;
    itemHighlight?: boolean;
    disabled?: boolean;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const InfiniteGridItem = ({
    ref,
    itemImage = undefined,
    itemColor = undefined,
    itemActive = false,
    itemCount = 1,
    itemCountMinimum = 1,
    itemUniqueSoldout = false,
    itemUniqueNumber = -2,
    itemUnseen = false,
    itemHighlight = false,
    disabled = false,
    className = null,
    style = {},
    children = null,
    ...rest
}: InfiniteGridItemProps) => {
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(null);
    const disposed = useRef<boolean>(false);

    useEffect(() => {
        if (!itemImage || !itemImage.length) {
            setBackgroundImageUrl(null);

            return;
        }

        const image = new Image();

        image.onload = () => {
            if (disposed.current) return;

            setBackgroundImageUrl(image.src);
        };

        image.src = itemImage;
    }, [itemImage]);

    useEffect(() => {
        disposed.current = false;

        return () => {
            disposed.current = true;
        };
    }, []);

    return (
        <div
            ref={ref}
            className={classNames(
                'flex flex-col items-center justify-center cursor-pointer overflow-hidden relative bg-center bg-no-repeat w-full rounded-md border-2',
                itemImage && (!backgroundImageUrl || !backgroundImageUrl.length) && 'octane-icon icon-loading',
                itemActive
                    ? itemColor
                        ? 'border-card-grid-item-active'
                        : 'border-card-grid-item-active bg-card-grid-item-active'
                    : itemColor
                      ? 'border-card-grid-item-border'
                      : 'border-card-grid-item-border bg-card-grid-item',
                (itemUniqueSoldout || itemUniqueNumber > 0) && 'unique-item',
                itemUniqueSoldout && 'sold-out',
                itemUnseen && ' animate-pulse-glow-gold border-yellow-400/60',
                className
            )}
            style={styleNames(
                backgroundImageUrl &&
                    backgroundImageUrl.length &&
                    !(itemUniqueSoldout || itemUniqueNumber > 0) && {
                        backgroundImage: `url(${backgroundImageUrl})`
                    },
                itemColor && {
                    backgroundColor: itemColor
                },
                style
            )}
            {...rest}
        >
            {itemCount > itemCountMinimum && (
                <div className="absolute align-middle rounded bg-red-700 bg-opacity-80 text-white border-black border top-[2px] right-[2px] text-[9.5px] p-[2px] z-1 leading-[8px]">
                    {itemCount}
                </div>
            )}
            {itemUniqueNumber > 0 && (
                <>
                    <div
                        className="size-full unique-bg-override"
                        style={{
                            backgroundImage: `url(${backgroundImageUrl})`
                        }}
                    />
                    <div className="absolute bottom-0 unique-item-counter">
                        <OctaneLimitedEditionStyledNumberView value={itemUniqueNumber} />
                    </div>
                </>
            )}
            {children}
        </div>
    );
};

export const InfiniteGrid = Object.assign(InfiniteGridRoot, {
    Item: InfiniteGridItem
});
