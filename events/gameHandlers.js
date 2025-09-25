const redisService = require('../services/redisService');
const getWords= require('../utils/getWords');

module.exports = (io, socket) => {
    const roomCountsDown = {};

    async function startGame(roomId){
        let words = await getWords(10, 'dog');
        words = words.join('|')

        await redisService.setWords(roomId, words);
        await redisService.updateGameState(roomId, "started");

        // reset players progress
        const users = await redisService.getRoomUsers(roomId);
        for (const user of users) {
            await redisService.updateUserProgress(roomId, user.id, { index: 0, correct: 0, wrong: 0 });
        }

        io.to(roomId).emit('gameStarted', {roomId, words});

        // Automatically finish the game after X minutes
        const gameDurationMs = 90 * 1000; // 1.5 minutes in milliseconds
        setTimeout(async () => {
            await finishGame(roomId); // call your finish function
        }, gameDurationMs);
    }


    async function finishGame(roomId) {
        try {
            // 1. Set game state to finished
            await redisService.updateGameState(roomId, "finished");

            // 2. Get all users in the room
            const users = await redisService.getRoomUsers(roomId);

            // 3. Update each user's isReady to false
            for (const user of users) {
                await redisService.updateUserProgress(roomId, user.id, { isReady: false });
            }

            // 4. Notify clients that game finished
            io.to(roomId).emit('gameFinished', { roomId });

            // 5. Optionally, send updated users to clients
            const updatedUsers = await redisService.getRoomUsers(roomId);
            io.to(roomId).emit('roomUsersUpdate', { roomId, users: updatedUsers });

            console.log(`Game finished for room ${roomId}`);
        } catch (err) {
            console.error(`Error finishing game for room ${roomId}:`, err);
        }
    }



    // return the state of the game (if it started return the words also)
    socket.on("checkGameState", async (roomId, cb) => {
      try {
        const roomId = socket.currentRoom;
        const state = await redisService.getGameState(roomId);

        // also fetch words if game started
        let words = null;
        if (state === "started") {
          words = await redisService.getWords(roomId);
        }

        cb({
          success: true,
          state,   // "idle" | "started" | "finished"
          words
        });
      } catch (err) {
        cb({ success: false, error: err.message });
      }
    });

    socket.on('userReady', async(_, cb) => {
        const roomId = socket.currentRoom;
        const userId = socket.userId

        await redisService.updateUserProgress(roomId, userId, {isReady: true})

        // Fetch the updated progress of this user only
        const updatedUser = await redisService.getUserProgress(roomId, userId);

        // Broadcast only this updated user to everyone in the room
        io.to(roomId).emit('roomUsersUpdate', { roomId, users: [updatedUser] });

        const isRoomReady = await redisService.areAllUsersReady(roomId);

        if(isRoomReady && !roomCountsDown[roomId]){
            roomCountsDown[roomId] = true;
            startGame(roomId);
            delete roomCountsDown[roomId];
        }

        if(cb) cb({success:true});
    })


    socket.on('finishWord', async ({ isCorrect }, cb) => {
      try {
        const roomId = socket.currentRoom;
        const userId = socket.userId;

        await redisService.incrementerUserProgress(roomId, userId, isCorrect)

        const updatedUser = await redisService.getUserProgress(roomId, userId);

        // Notify others
        io.to(roomId).emit("roomUsersUpdate", { roomId, users: [updatedUser] });

        cb({ success: true, userState: updatedUser });
      } catch (err) {
        cb({ success: false, error: err.message });
      }
    });

};
