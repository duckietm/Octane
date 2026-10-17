import { FC, useMemo } from 'react';
import { BaseButton } from './BaseButton';
import { Flex, FlexProps } from './Flex';
import { ButtonSizeType, ColorVariantType } from './types';

export interface ButtonProps extends FlexProps {
    variant?: ColorVariantType;
    size?: ButtonSizeType;
    active?: boolean;
    disabled?: boolean;
}

export const Button: FC<ButtonProps> = (props) => {
    const { variant = 'primary', size = 'sm', active = false, disabled = false, classNames = [], ...rest } = props;

    const getClassNames = useMemo(() => {
        // fucked up method i know (i dont have a clue what im doing because im a ninja)

        const newClassNames: string[] = [
            'pointer-events-auto font-bold leading-tight text-center no-underline cursor-pointer select-none px-[.75rem] py-[.375rem] text-[.9rem] rounded-none'
        ];

        if (variant) {
            if (variant == 'primary' || variant == 'success') newClassNames.push('habbo-btn-primary');

            if (variant == 'danger') newClassNames.push('habbo-btn-danger');

            if (variant == 'warning' || variant == 'secondary' || variant == 'gray') newClassNames.push('habbo-btn-secondary');

            if (variant == 'black')
                newClassNames.push(
                    'text-white  bg-[#000] border-[#000] [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white  hover:bg-[#000] hover:border-[#000]'
                );

            if (variant == 'dark')
                newClassNames.push(
                    'text-white bg-dark [box-shadow:inset_0_2px_#ffffff26,inset_0_-2px_#0000001a,0_1px_#0000001a] hover:text-white hover:bg-[#18181bfb] hover:border-[#161619fb]'
                );
        }

        if (size) {
            if (size == 'sm') {
                newClassNames.push('px-[.5rem]! py-[.25rem]! text-[.7875rem]! rounded-none! min-h-[24px]!');
            }
        }

        if (active) newClassNames.push('active');

        if (disabled) newClassNames.push('pointer-events-none opacity-[.65] [box-shadow:none]');

        if (classNames.length) newClassNames.push(...classNames);

        return newClassNames;
    }, [variant, size, active, disabled, classNames]);

    return <Flex center component={BaseButton} disabled={disabled} display="inline-flex" classNames={getClassNames} {...rest} />;
};
