import { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, Ref } from 'react';
import { classNames } from '../../layout';

type ToolbarItemViewProps = PropsWithChildren<{
    icon: string;
    ref?: Ref<HTMLDivElement>;
}> &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export const ToolbarItemView = ({ ref, icon = null, className = null, ...rest }: ToolbarItemViewProps) => {
    return <div ref={ref} className={classNames('cursor-pointer relative', `octane-icon icon-${icon}`, className)} {...rest} />;
};
