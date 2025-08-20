const { createClient } = require('redis');
const client = createClient();
client.connect();

module.exports = {
    // Store competition words
    async setWords(roomId, words) {
        await client.set(`game:${roomId}:words`, JSON.stringify(words));
    },

    async getWords(roomId) {
        const data = await client.get(`game:${roomId}:words`);
        return data ? JSON.parse(data) : null;
    },

    // Track users in the room
    async addUserToRoom(roomId, userId) {
        await client.sAdd(`game:${roomId}:users`, userId);
    },

    async removeUserFromRoom(roomId, userId) {
        await client.sRem(`game:${roomId}:users`, userId);
    },

    async getRoomUsers(roomId) {
        return await client.sMembers(`game:${roomId}:users`);
    },

    // Per-user progress
    async initUserProgress(roomId, userId) {
        await client.hSet(`game:${roomId}:user:${userId}`, {
            index: 0,
            correct: 0,
            wrong: 0
        });
    },

    async getUserProgress(roomId, userId) {
        const data = await client.hGetAll(`game:${roomId}:user:${userId}`);
        return {
            index: parseInt(data.index || 0),
            correct: parseInt(data.correct || 0),
            wrong: parseInt(data.wrong || 0)
        };
    },

    async updateUserProgress(roomId, userId, progress) {
        await client.hSet(`game:${roomId}:user:${userId}`, progress);
    }
};

