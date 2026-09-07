import { FC } from 'react';

export const OctaneLimitedEditionStyledNumberView: FC<{
    value: number;
}> = (props) => {
    const { value = 0 } = props;

    return (
        <>
            {value
                .toString()
                .split('')
                .map((number, index) => (
                    <i key={index} className={'limited-edition-number n-' + number} />
                ))}
        </>
    );
};
