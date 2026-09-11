export interface RoomEmbedInput {
    roomLink: string;
    thumbnailUrl: string;
    roomName: string;
}

const escapeAttribute = (value: string): string =>
    (value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The share dialog of the official client offers, next to the direct
 * link, a snippet to paste on a forum: the room thumbnail linking to the
 * room (RoomToolsToolbarCtrl.as, embed_src_txt). Built here from the
 * pieces the client already knows so no server text is required.
 */
export const buildRoomEmbedCode = (input: RoomEmbedInput): string => {
    if (!input.roomLink) return '';

    const image = input.thumbnailUrl ? `<img src="${escapeAttribute(input.thumbnailUrl)}" alt="${escapeAttribute(input.roomName)}" />` : escapeAttribute(input.roomName);

    return `<a href="${escapeAttribute(input.roomLink)}">${image}</a>`;
};

export interface RoomThumbnailInput {
    roomId: number;
    officialRoomPicRef: string;
    imageLibraryUrl: string;
    thumbnailsUrl: string;
}

/** Same rule as LayoutRoomThumbnailView: official picture first, hotel thumbnail otherwise. */
export const getRoomThumbnailUrl = (input: RoomThumbnailInput): string => {
    if (input.officialRoomPicRef) return `${input.imageLibraryUrl || ''}${input.officialRoomPicRef}`;
    if (!input.thumbnailsUrl || !(input.roomId > 0)) return '';

    return input.thumbnailsUrl.replace('%thumbnail%', input.roomId.toString());
};
