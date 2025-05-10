const express = require('express');
const http = require('http');
const {Server}= require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: 'http://127.0.0.1:5500',
        methods : ["GET","POST"]
    }
});


io.on('connection', (socket) => {
    console.log("connection established : ", socket.id);
    let current_room = null;

    socket.on('join_room', (room_id, callback) => {
        // leave the old room
        if(current_room){
            socket.leave(current_room);
            console.log(`user ${socket.id} left room ${room_id}`);
            // notify the members of the room that a user left
            socket.to(current_room).emit('user_left',{
                user_id : socket.id,
                room_id
            })
        }
        socket.join(room_id);
        current_room = room_id;
        console.log(`User ${socket.id} joined room ${room_id}`);
        // notify the members of the room that a member joined them
        socket.to(room_id).emit('user_joined',{
            user_id: socket.id,
            room_id
        })

        callback({success:true, room_id});
    });

    socket.on('leave_room', (callback) => {
        if(!current_room){
            return callback({success:false, error : "Not in any room"});
        }

        socket.leave(current_room);
        console.log(`User ${socket.id} left the room ${current_room}`);
        socket.to(current_room).emit('user_left',{
            user_id:socket.id,
            current_room
        })

        callback({success:true, room_id:current_room});
    })

    socket.on('send_message', (message, callback) => {
        // if user not in a room return error
        if(!current_room){
            return callback({success:false, error : "Not in any room"});
        }

        // broadcas message to all members in the room
        socket.to(current_room).emit('room_message',{
            user_id: socket.id,
            message,
            timestamp : new Date()
        });

        callback({success:true, current_room})
    });

    socket.on('disconnect', ()=>{
        console.log('user disconnected');
    })
})


server.listen(3000, ()=>console.log("listening on 3000"))