const express = require('express');
const http = require('http');
const {Server}= require('socket.io');
const {createClient}= require('redis')
const redisService = require('./services/redisService');

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5500','http://localhost:5500'],
        methods : ["GET","POST"]
    }
});

// Redis client
const redis = createClient();
redis.connect();

// Import handlers
const roomHandlers = require('./events/room-handlers');
const chatHandlers = require('./events/chatHandlers');
const gameHandlers = require('./events/gameHandlers');

io.on('connection',async (socket) => {

    const email = socket.handshake.auth.email;
    console.log(`user with email <${email}> connected succefully with socket id <${socket.id}>`);

    socket.userId = email;

    // Rejoin previous room if any
    const roomId = await redisService.getUserRoom(socket.userId);
    if (roomId) {
        socket.join(roomId);
        console.log(`user with email <${email}> joined room <${roomId}>`);
        socket.currentRoom = roomId;
        socket.to(roomId).emit('userReconnected', { userId : socket.userId, roomId });
    }

    roomHandlers(io, socket);
    chatHandlers(io, socket);
    gameHandlers(io, socket);

    socket.on('disconnecting', ()=>{
        const roomId = socket.currentRoom;
        if(roomId){
            socket.to(socket.currentRoom).emit('userLeft',{
                userId:socket.userId,
            })
        }
        console.log('user disconnected');
    })
})

server.listen(3000, ()=>console.log("listening on 3000"))
