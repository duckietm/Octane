export interface AreaHideSettings {
    rootX: number;
    rootY: number;
    width: number;
    length: number;
    invisibility: boolean;
    wallItems: boolean;
    inverted: boolean;
}

/**
 * The custom values the server keeps for an area hider (`InteractionAreaHideControl`). The state
 * is sent unchanged: as in AIR, saving the area or an option never switches the furni on or off,
 * only the on/off button does.
 */
export const buildAreaHideValues = (isOn: boolean, settings: AreaHideSettings): Map<string, string> => {
    const data = new Map<string, string>();

    data.set('state', isOn ? '1' : '0');
    data.set('rootX', Math.max(0, Math.trunc(settings.rootX)).toString());
    data.set('rootY', Math.max(0, Math.trunc(settings.rootY)).toString());
    data.set('width', Math.max(0, Math.trunc(settings.width)).toString());
    data.set('length', Math.max(0, Math.trunc(settings.length)).toString());
    data.set('invisibility', settings.invisibility ? '1' : '0');
    data.set('wallItems', settings.wallItems ? '1' : '0');
    data.set('invert', settings.inverted ? '1' : '0');

    return data;
};

/**
 * AIR `AreaHideFurniWidget.refreshUI`: while the area is hidden every setting is locked (only the
 * on/off button works); while it is shown, "select" waits for a running selection and "clear"
 * needs an active selection.
 */
export const getAreaHideControlState = (isOn: boolean, selecting: boolean, selectionActive: boolean) => ({
    optionsDisabled: isOn,
    selectDisabled: isOn || selecting || !selectionActive,
    clearDisabled: isOn || !selectionActive
});

/**
 * AIR `AreaHideFurniWidgetHandler`: the window opens for the room owner, a rights holder
 * (controller level 1 and up) and staff who control any room. Owning the furni is not enough,
 * since the server saves the area only for rights holders.
 */
export const canOpenAreaHide = (isRoomOwner: boolean, controllerLevel: number, anyRoomController: boolean): boolean =>
    isRoomOwner || controllerLevel >= 1 || anyRoomController;
