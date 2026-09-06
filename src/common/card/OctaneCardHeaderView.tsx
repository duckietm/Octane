import { FC, MouseEvent } from 'react';
import { FaFlag } from 'react-icons/fa';
import { Base, Column, ColumnProps, Flex } from '..';

interface OctaneCardHeaderViewProps extends ColumnProps {
    headerText: string;
    isGalleryPhoto?: boolean;
    noCloseButton?: boolean;
    isInfoToHabboPages?: boolean;
    onReportPhoto?: (event: MouseEvent) => void;
    onClickInfoHabboPages?: (event: MouseEvent) => void;
    onCloseClick: (event: MouseEvent) => void;
}

export const OctaneCardHeaderView: FC<OctaneCardHeaderViewProps> = (props) => {
    const {
        headerText = null,
        isGalleryPhoto = false,
        noCloseButton = false,
        isInfoToHabboPages = false,
        onReportPhoto = null,
        onClickInfoHabboPages = null,
        onCloseClick = null,
        justifyContent = 'center',
        alignItems = 'center',
        classNames = [],
        className = '',
        children = null,
        ...rest
    } = props;

    const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    return (
        <Column
            center
            classNames={[
                'octane-card-header-shell',
                'relative',
                'flex',
                'items-center',
                'justify-center',
                'flex-col',
                'drag-handler',
                'min-h-card-header',
                'max-h-card-header',
                ...classNames
            ]}
            className={className}
            {...rest}
        >
            <Flex center fullWidth>
                <span className="octane-card-title text-white">{headerText}</span>
                {isGalleryPhoto && (
                    <Base className="inset-e-4 octane-card-header-report-camera" position="absolute" onClick={onReportPhoto}>
                        <FaFlag className="fa-icon" />
                    </Base>
                )}
                {isInfoToHabboPages && (
                    <Base className="absolute right-8 octane-card-header-info-habbopages cursor-pointer" position="absolute" onClick={onClickInfoHabboPages} />
                )}
                <div
                    className="absolute flex items-center justify-center cursor-pointer right-2 octane-card-close-button"
                    onClick={onCloseClick}
                    onMouseDownCapture={onMouseDown}
                ></div>
            </Flex>
        </Column>
    );
};
