// SnowWar leaves the player's room when the game center opens (VisitDesktop ->
// removeSession), and the server's rejoin-previous-room packet carries no room
// id, so the client has to remember which room to return to itself. We capture
// it just before the room is dropped and consume it when SnowWar exits.
let previousRoomId: number | null = null;

export const setSnowWarReturnRoom = (roomId: number | null): void =>
{
    previousRoomId = (typeof roomId === 'number' && roomId > 0) ? roomId : null;
};

export const consumeSnowWarReturnRoom = (): number | null =>
{
    const roomId = previousRoomId;
    previousRoomId = null;
    return roomId;
};
