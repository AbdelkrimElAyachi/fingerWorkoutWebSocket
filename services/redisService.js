const { createClient } = require('redis');
const redisClient = createClient();
redisClient.connect()
.then(()=> console.log("connect succefully to Redis"))
.catch((error) => console.log("Error while connecting to redis ",error));


// redis structure
// rooms -> where the rooms are stored
// game:roomId:words -> where the words of the game are stored
// game:roomId:users -> where the users are stored
// game:roomId:users:userId -> where the user progress is stored
// user:userId:room -> where the userid connect room is saved at
module.exports = {

    async isRoomExists(roomId) {
        // modern method: sIsMember
        return await redisClient.sIsMember('rooms', roomId);
    },

    async addRoom(roomId){
        await redisClient.sAdd("rooms", roomId);
    },

    async removeRoom(roomId) {
        // Get all users before deleting the set
        const users = await redisClient.sMembers(`game:${roomId}:users`);

        // Delete per-user progress and mappings
        for (const userId of users) {
            await redisClient.del(`game:${roomId}:users:${userId}`);
            await redisClient.del(`user:${userId}:room`);
        }

        // Now delete the users set and words
        await redisClient.del(`game:${roomId}:users`);
        await redisClient.del(`game:${roomId}:words`);

        // Finally remove room from the main set
        await redisClient.sRem('rooms', roomId);
    },

    // Store competition words
    async setWords(roomId, words) {
        await redisClient.set(`game:${roomId}:words`, JSON.stringify(words));
    },

    async getWords(roomId) {
        const data = await redisClient.get(`game:${roomId}:words`);
        return data ? JSON.parse(data) : null;
    },

    // Track users in the room
    async addUserToRoom(roomId, userId) {
        await redisClient.sAdd(`game:${roomId}:users`, userId);
        await redisClient.set(`user:${userId}:room`, roomId); // add this line
    },

    async removeUserFromRoom(roomId, userId) {
        await redisClient.sRem(`game:${roomId}:users`, userId);
        await redisClient.del(`user:${userId}:room`); // add this line
    },

    async getRoomUsers(roomId) {
        return await redisClient.sMembers(`game:${roomId}:users`);
    },

    // Per-user progress
    async initUserProgress(roomId, userId) {
        await redisClient.hSet(`game:${roomId}:users:${userId}`, {
            index: 0,
            correct: 0,
            wrong: 0
        });
    },

    // get the room of a user
    async getUserRoom(userId) {
        return await redisClient.get(`user:${userId}:room`); // returns roomId or null
    },

    async getUserProgress(roomId, userId) {
        const data = await redisClient.hGetAll(`game:${roomId}:users:${userId}`);
        return {
            index: parseInt(data.index || 0),
            correct: parseInt(data.correct || 0),
            wrong: parseInt(data.wrong || 0)
        };
    },

    async updateUserProgress(roomId, userId, progress) {
        await redisClient.hSet(`game:${roomId}:users:${userId}`, progress);
    }
};
