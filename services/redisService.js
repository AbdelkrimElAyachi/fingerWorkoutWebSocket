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
        const ttl = 10 * 60; // 30 minutes

        // store expiry in Redis (optional)
        await redisClient.set(`room:expires:${roomId}`, ttl, { EX: ttl}); // set the expiration saver to expire after the room by 2 minutes
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
        await redisClient.del(`game:${roomId}:state`);
        await redisClient.del(`room:expires:${roomId}`)

        // Finally remove room from the main set
        await redisClient.sRem('rooms', roomId);
    },

    // Store competition words
    async setWords(roomId, words) {
        await redisClient.set(`game:${roomId}:words`, words);
    },

    async getWords(roomId) {
        const data = await redisClient.get(`game:${roomId}:words`);
        return data;
    },

    // Track users in the room
    async addUserToRoom(roomId, userId, avatarUrl) {
        // get the room expiration timestamp
        const expireAt = await redisClient.get(`room:expires:${roomId}`);
        if (!expireAt) return false;

        // add users to the room set
        await redisClient.sAdd(`game:${roomId}:users`, userId);

        // set user mapping
        await redisClient.set(`user:${userId}:room`, roomId);

        // initialize user progress
        await redisClient.hSet(`game:${roomId}:users:${userId}`, {
            index: 0,
            correct: 0,
            wrong: 0,
            isReady: "false",
            avatar: avatarUrl || "/assets/avatar.webp"
        });

        return true;
    },

    async removeUserFromRoom(roomId, userId) {
        await redisClient.sRem(`game:${roomId}:users`, userId); // remove the user from game:roomId:users set
        await redisClient.del(`user:${userId}:room`); // delete user to room mapping
        await redisClient.del(`game:${roomId}:users:${userId}`); // delete per-user progress

        // Check if the room still has users
        const remaining = await redisClient.sCard(`game:${roomId}:users`);
        if (remaining === 0) {
            console.log(`Room ${roomId} is now empty. Removing...`);
            await this.removeRoom(roomId);
        }
    },

    async areAllUsersReady(roomId) {
        const userIds = await redisClient.sMembers(`game:${roomId}:users`);

        for (const id of userIds) {
            const data = await redisClient.hGetAll(`game:${roomId}:users:${id}`);
            if(data.isReady !== 'true'){
                return false;
            }
        }
        return true;
    },

    async updateGameState(roomId, state){
        await redisClient.set(`game:${roomId}:state`, state);
    },

    async getGameState(roomId) {
      const state = await redisClient.get(`game:${roomId}:state`);
      return state || "idle"; // default to "idle" if not set
    },

    async getRoomUsers(roomId) {
        const userIds = await redisClient.sMembers(`game:${roomId}:users`);

        const users = [];
        for (const id of userIds) {
            const data = await redisClient.hGetAll(`game:${roomId}:users:${id}`);
            users.push({
                id,
                index: parseInt(data.index || 0),
                correct: parseInt(data.correct || 0),
                wrong: parseInt(data.wrong || 0),
                isReady: data.isReady === 'true',       // Redis stores as string
                avatar: data.avatar || null
            });
        }
        return users;
    },

    // get the room of a user
    async getUserRoom(userId) {
        return await redisClient.get(`user:${userId}:room`); // returns roomId or null
    },

    async getUserProgress(roomId, userId) {
      const data = await redisClient.hGetAll(`game:${roomId}:users:${userId}`);
      
      return {
        id:userId,
        index: parseInt(data.index || 0),
        correct: parseInt(data.correct || 0),
        wrong: parseInt(data.wrong || 0),
        isReady: data.isReady === 'true',       // Redis stores as string
        avatar: data.avatar || '/assets/avatar.webp'
      };
    },

    async updateUserProgress(roomId, userId, progress) {
      const update = { ...progress };

      // Ensure boolean is stored as string
      if (typeof update.isReady === 'boolean') {
        update.isReady = update.isReady.toString();
      }

      await redisClient.hSet(`game:${roomId}:users:${userId}`, update);
    },

    async getRoomTTL(roomId) {
      const ttl = await redisClient.ttl(`room:expires:${roomId}`);
      // Redis returns:
      // -1 if the key exists but has no expiration
      // -2 if the key does not exist
      return ttl;
    },

    async incrementerUserProgress(roomId, userId, isWordCorrect){
        // Increment correct or wrong directly
        await redisClient.hIncrBy(`game:${roomId}:users:${userId}`, isWordCorrect ? "correct" : "wrong", 1);
        await redisClient.hIncrBy(`game:${roomId}:users:${userId}`, "index", 1);
    }
};


const service = module.exports;

async function cleanRooms(){
  const rooms = await redisClient.sMembers("rooms");
  for (const roomId of rooms) {
    const ttl = await service.getRoomTTL(roomId);

    if (ttl === -2) {
      // Key does not exist -> expired
      console.log(`Cleaning up expired room: ${roomId}`);
      await service.removeRoom(roomId);
    } else if (ttl === -1) {
      // No expiration set -> up to you: keep or force cleanup
      console.warn(`Room ${roomId} has no TTL set. Skipping cleanup.`);
    }
    // ttl >= 0 means still valid, so do nothing
}}

(async ()=>{
    await cleanRooms();

    // clean rooms every minute 
    setInterval(async () => {
        await cleanRooms();
    }, 60_000); // every 1 minute
})()
