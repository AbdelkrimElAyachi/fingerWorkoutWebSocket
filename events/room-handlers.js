const redisService = require('../services/redisService')

module.exports = (io, socket) => {

    socket.on('createRoom', async (roomId, callback) => {
        // check if room already exists before creating new one
        const roomExists = await redisService.isRoomExists(roomId);
        if (roomExists) {
            return callback({ success: false, error: "Room already exists" });
        }
        await redisService.addRoom(roomId)
        console.log(`room created succefully : ${roomId}`);
        callback({ success: true, roomId });
    });

    // join room event
    socket.on('joinRoom', async (roomId, callback) => {
        const roomExists = await redisService.isRoomExists(roomId);
        if (!roomExists) {
            return callback({ success: false, error: "Room does not exist" });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        redisService.addUserToRoom(roomId, socket.userId)
        // notify the members of the room that a member joined them
        socket.to(roomId).emit('userJoined',{
            userId: socket.userId,
        })
        callback({success:true, roomId});
    });

    // leaving room event
    socket.on('leaveRoom', (callback) => {
        const roomId = socket.currentRoom;
        // check if the user is in a room if not return error
        if (!roomId) {
            return callback({ success: false, error: "Not in any room" });
        }

        socket.leave(roomId);
        socket.to(roomId).emit('userLeft',{
            userId:socket.userId,
        })

        socket.currentRoom = null;

        callback({success:true, roomId});
    })
};
