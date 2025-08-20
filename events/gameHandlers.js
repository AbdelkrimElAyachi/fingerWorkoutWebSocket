const gameService = require('../services/gameService');

module.exports = (io, socket) => {
    // User finished a word
    socket.on('word_finished', async ({ roomId, word }, cb) => {
        try {
            const result = await gameService.processWord(socket.id, roomId, word);

            // Notify everyone else in the room
            socket.to(roomId).emit('game_update', {
                userId: socket.id,
                ...result
            });

            // Send result back to sender (so he knows if correct/incorrect)
            cb({ success: true, ...result });
        } catch (err) {
            cb({ success: false, error: err.message });
        }
    });
};
