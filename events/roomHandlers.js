module.exports = (io, socket) => {
    // ✅ Create a room
    socket.on('create_room', async (room_id, callback) => {
        const exists = await redis.exists(`room:${room_id}`);
        if (exists) {
            return callback({ success: false, error: "Room already exists" });
        }

        await redis.sAdd("rooms", room_id); // keep a set of all rooms
        console.log(`Room ${room_id} created`);
        callback({ success: true, room_id });
    });

    // join room event
    socket.on('join_room', async (room_id, callback) => {
        const exists = await redis.sIsMember("rooms", room_id);
        if (!exists) {
            return callback({ success: false, error: "Room does not exist" });
        }
        // leave the old room
        if(current_room){
            socket.leave(current_room);
            console.log(`user ${socket.id} left room ${room_id}`);
            // notify the members of the room that a user left
            socket.to(current_room).emit('user_left',{
                user_id : socket.id,
                room_id
            })
        }
        socket.join(room_id);
        current_room = room_id;
        console.log(`User ${socket.id} joined room ${room_id}`);
        // notify the members of the room that a member joined them
        socket.to(room_id).emit('user_joined',{
            user_id: socket.id,
            room_id
        })

        callback({success:true, room_id});
    });

    // leaving room event
    socket.on('leave_room', (callback) => {
        if(!current_room){
            return callback({success:false, error : "Not in any room"});
        }

        socket.leave(current_room);
        console.log(`User ${socket.id} left the room ${current_room}`);
        socket.to(current_room).emit('user_left',{
            user_id:socket.id,
            current_room
        })

        callback({success:true, room_id:current_room});
    })
};
