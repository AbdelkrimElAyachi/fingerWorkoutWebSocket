const redisService = require('./redisService');
const getWords = require('../utils/getWords');

module.exports = {
    async processWord(userId, roomId, word) {
        // Load phrases
        const words = await redisService.getWords(roomId);
        if (!wors) console.log("Game not found");

        // Get or init user progress
        let userState = await redisService.getUserProgress(roomId, userId);
        if (!userState) {
            await redisService.initUserProgress(roomId, userId);
            userState = { index: 0, correct: 0, wrong: 0 };
        }

        const expectedWord = words[userState.index];
        const isCorrect = word === expectedWord;

        if (isCorrect) {
            userState.correct += 1;
            userState.index += 1;
        } else {
            userState.wrong += 1;
        }

        // Save back safely (only this user is touched)
        await redisService.updateUserProgress(roomId, userId, userState);

        return {
            isCorrect,
            expected: expectedWord,
            userState,
            phrasesLeft: phrases.length - userState.index
        };
    }
};
