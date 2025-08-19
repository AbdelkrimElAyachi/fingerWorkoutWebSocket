const express = require('express');
const http = require('http');
const {Server}= require('socket.io');
const {createClient}= require('redis')

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: ['http://127.0.0.1:5500','http://localhost:5500'],
        methods : ["GET","POST"]
    }
});

// Redis client
const redis = createClient();
redis.connect();

io.on('connection', (socket) => {
    console.log("connection established : ", socket.id);
    let current_room = null;

    socket.on('disconnect', ()=>{
        console.log('user disconnected');
    })
})


server.listen(3000, ()=>console.log("listening on 3000"))