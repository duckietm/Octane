import { DetailedHTMLProps, HTMLAttributes, MouseEvent, PropsWithChildren, Ref } from 'react';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../common';
import { classNames } from './classNames';
import { OctaneItemCountBadge } from './OctaneItemCountBadge';

type OctaneCardRootProps = PropsWithChildren<
    {
        ref?: Ref<HTMLDivElement>;
    } & DraggableWindowProps
> &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const OctaneCardRoot = ({
    ref,
    uniqueKey = null,
    handleSelector = '.drag-handler',
    windowPosition = DraggableWindowPosition.CENTER,
    disableDrag = false,
    dragStyle = {},
    offsetLeft = 0,
    offsetTop = 0,
    className = null,
    ...rest
}: OctaneCardRootProps) => {
    return (
        <DraggableWindow
            disableDrag={disableDrag}
            dragStyle={dragStyle}
            handleSelector={handleSelector}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
            uniqueKey={uniqueKey}
            windowPosition={windowPosition}
        >
            <div
                ref={ref}
                className={classNames('octane-card-shell flex flex-col overflow-hidden min-w-full min-h-full max-w-full max-h-full', className)}
                {...rest}
            />
        </DraggableWindow>
    );
};

type OctaneCardHeaderProps = {
    headerText: string;
    onCloseClick?: (event: MouseEvent) => void;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const OctaneCardHeader = ({ ref, headerText = '', onCloseClick = null, className = null, ...rest }: OctaneCardHeaderProps) => {
    const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    return (
        <div
            ref={ref}
            className={classNames(
                'octane-card-header-shell relative flex items-center justify-center flex-col drag-handler min-h-card-header max-h-card-header',
                className
            )}
        >
            <div className="flex items-center justify-center w-full ">
                <span className="octane-card-title text-white">{headerText}</span>
                <div
                    className="octane-card-close-button absolute flex items-center justify-center cursor-pointer"
                    onClick={onCloseClick}
                    onMouseDownCapture={onMouseDown}
                />
            </div>
        </div>
    );
};

type OctaneCardContentProps = {
    isLoading?: boolean;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const OctaneCardContent = ({ ref, isLoading = false, className = null, children = null, ...rest }: OctaneCardContentProps) => {
    return (
        <div ref={ref} className={classNames('octane-card-content-shell flex flex-col overflow-auto p-[10px] h-full', className)} {...rest}>
            {isLoading && <div className="absolute top-0 left-0 z-10 opacity-50 size-full bg-muted" />}
            {children}
        </div>
    );
};

type OctaneCardTabsProps = {
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const OctaneCardTabs = ({ ref, className = null, ...rest }: OctaneCardTabsProps) => {
    return (
        <div
            ref={ref}
            className={classNames('octane-card-tabs-shell justify-center gap-1 flex min-h-card-tabs max-h-card-tabs px-2 pt-1', className)}
            {...rest}
        />
    );
};

type OctaneCardTabItemProps = {
    isActive?: boolean;
    count?: number;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const OctaneCardTabItem = ({ ref, isActive = false, count = 0, className = null, children = null, ...rest }: OctaneCardTabItemProps) => {
    return (
        <div
            ref={ref}
            className={classNames(
                'octane-card-tab-item overflow-hidden relative cursor-pointer rounded-t-[8px] flex px-3 py-[6px] z-1',
                isActive && 'octane-card-tab-item-active -mb-px',
                className
            )}
            {...rest}
        >
            <div className="flex items-center justify-center shrink-0">{children}</div>
            {count > 0 && <OctaneItemCountBadge count={count} />}
        </div>
    );
};

export const OctaneCard = Object.assign(OctaneCardRoot, {
    Header: OctaneCardHeader,
    Content: OctaneCardContent,
    Tabs: OctaneCardTabs,
    TabItem: OctaneCardTabItem
});
