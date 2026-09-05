import { FC, useMemo } from 'react';
import { Column, ColumnProps } from '..';

export const OctaneCardContentView: FC<ColumnProps> = (props) => {
    const { overflow = 'auto', classNames = [], ...rest } = props;

    const getClassNames = useMemo(() => {
        // Theme Changer
        const newClassNames: string[] = ['container-fluid', 'octane-card-content-shell', 'h-full p-[10px] overflow-auto'];

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [classNames]);

    return <Column classNames={getClassNames} overflow={overflow} {...rest} />;
};
