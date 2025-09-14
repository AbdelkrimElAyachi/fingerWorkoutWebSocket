const redisService = require('../services/redisService');
const getWords= require('../utils/getWords');

module.exports = (io, socket) => {
    socket.on('userReady', async(_, cb) => {
        const roomId = socket.currentRoom;
        const userId = socket.userId

        await redisService.updateUserProgress(roomId, userId, {isReady: true})

        // Fetch the updated progress of this user only
        const updatedUser = await redisService.getUserProgress(roomId, userId);
        console.log(updatedUser.id)

        // Broadcast only this updated user to everyone in the room
        io.to(roomId).emit('roomUsersUpdate', { roomId, users: [updatedUser] });

        if(cb) cb({success:true});
    })


    // User finished a word
    socket.on('finishWord', async ({word}, cb) => {
        try {
            const roomId = socket.currentRoom;
            const userId = socket.userId;

            // Load phrases
            const words = await redisService.getWords(roomId);
            if (!words){
                console.log(`words not found for game ${roomId}`)
                return cb({ success: false, error: "Not in any room" });
            }

            // Get or init user progress
            let userState = await redisService.getUserProgress(roomId, userId);
            if (!userState) {
                console.log(`user progress not found for user ${userId}`)
                return cb({ success: false, error: "User progress not found" });
            }

            const expectedWord = words[userState.index];
            const isCorrect = word === expectedWord;

            if (isCorrect) {
                userState.correct += 1;
            } else {
                userState.wrong += 1;
            }
            userState.index += 1;

            // Save back safely (only this user is touched)
            await redisService.updateUserProgress(roomId, userId, userState);

            cb({
                success:true,
                isCorrect,
                expected: expectedWord,
                userState,
                wordsLeft: words.length - userState.index
            });
        } catch (err) {
            cb({ success: false, error: err.message });
        }
    });
};
