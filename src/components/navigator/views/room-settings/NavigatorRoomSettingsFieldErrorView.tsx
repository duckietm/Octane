import { FC } from 'react';
import { localizeWithFallback, RoomSettingsFieldError } from '../../../../api';
import { Text } from '../../../../common';

/** The text AIR's TextFieldManager.displayError puts under a room settings field after a refused save. */
export const NavigatorRoomSettingsFieldErrorView: FC<{ error?: RoomSettingsFieldError }> = ({ error }) => {
    if (!error) return null;

    return (
        <Text bold small variant="danger" role="alert">
            {error.key ? localizeWithFallback(error.key, error.fallback) : error.fallback}
        </Text>
    );
};
