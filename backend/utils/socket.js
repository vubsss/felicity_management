let ioInstance = null;

const setIo = (io) => {
    ioInstance = io;
};

const getIo = () => ioInstance;

const forumRoom = (eventId) => `forum:${String(eventId)}`;

const emitForumEvent = (eventId, type, payload) => {
    if (!ioInstance) return;
    ioInstance.to(forumRoom(eventId)).emit('forum:event', {
        type,
        payload
    });
};

module.exports = {
    setIo,
    getIo,
    forumRoom,
    emitForumEvent
};
