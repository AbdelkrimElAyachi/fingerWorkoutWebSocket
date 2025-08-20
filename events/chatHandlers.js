module.exports = (io, socket) => {

    socket.on('send_message', (message, callback) => {
        // if user not in a room return error
        if(!current_room){
            return callback({success:false, error : "Not in any room"});
        }
        // broadcas message to all members in the room
        socket.to(current_room).emit('room_message',{
            user_id: socket.id,
            message,
            timestamp : new Date()
        });
        callback({success:true, current_room})
    });

}