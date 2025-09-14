const redisService = require('../services/redisService')

module.exports = (io, socket) => {

    // 🔹 check room existence
    socket.on('checkRoom', async (roomId, callback) => {
        const roomExists = await redisService.isRoomExists(roomId);
        const expireAt = await redisService.getRoomTTL(roomId);
        return callback({ success: true, exists: roomExists, ttl:expireAt });
    });

    socket.on('getRoomUsers', async (roomId, callback) => {
        // Fetch all users from Redis and broadcast to everyone in the room
        const users = await redisService.getRoomUsers(roomId);
        return callback({roomId, users})
    })

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
    socket.on('joinRoom', async (payload, callback) => {
        const {roomId, avatar} = payload;
        const roomExists = await redisService.isRoomExists(roomId);
        if (!roomExists) {
            return callback({ success: false, error: "Room does not exist" });
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        const userIsAdded = await redisService.addUserToRoom(roomId, socket.userId, avatar);
        if(!userIsAdded){
            return callback({ success: false, error: "Unable to find room" });
        }
        // notify the members of the room that a member joined them
        socket.to(roomId).emit('userJoined',{
            userId: socket.userId,
            avatar: avatar
        })

        // Fetch all users from Redis and broadcast to everyone in the room
        const users = await redisService.getRoomUsers(roomId);

        // retrive time before romm gets deleted
        const expireAt = await redisService.getRoomTTL(roomId);

        io.to(roomId).emit('roomUsersUpdate', { roomId, users });


        callback({success:true, roomId, ttl:expireAt});
    });

    // leaving room event
    socket.on('leaveRoom', async (data, callback) => {
        const roomId = socket.currentRoom;
        // check if the user is in a room if not return error
        if (!roomId) {
            return callback({ success: false, error: "Not in any room" });
        }

        socket.leave(roomId);
        await redisService.removeUserFromRoom(roomId, socket.userId)

        socket.to(roomId).emit('userLeft',{
            userId:socket.userId,
        })

        socket.currentRoom = null;

        // Fetch all users from Redis and broadcast to everyone in the room
        const userIds = await redisService.getRoomUsers(roomId);
        const users = userIds.map(id => ({
            id,
            avatar: `/assets/avatar.webp` // adjust if you store avatars elsewhere
        }));

        io.to(roomId).emit('roomUsersUpdate', { roomId, users });

        callback({success:true, roomId});
    })
};
