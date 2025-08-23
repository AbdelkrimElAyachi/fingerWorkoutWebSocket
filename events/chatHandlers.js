module.exports = (io, socket) => {

    socket.on('sendMessage', (data, callback) => {
      const roomId = socket.currentRoom;

      if (!roomId) {
        if (callback) callback({ success: false, error: "Not in any room" });
        return;
      }

      socket.to(roomId).emit('receiveMessage', {
        userId: data.userId,
        avatar: data.avatar,
        message: data.message,
        timestamp: new Date()
      });

      if (callback) callback({ success: true, roomId });
    });
};

