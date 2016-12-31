var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var multer = require('multer');
var upload = multer( { dest: 'uploads/' } );

app.use(express.static(__dirname))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.post('/upload', upload.single( 'file' ), function (req, res, next) {
  console.log("Upload...");
  console.log(req.body.user_id);

  //res.send('POST request to /upload');
  return res.status( 200 ).send( req.file );
})

var room_id = 3;

var rooms = [ {name: 'Main', id: 0, messages: []}, 
              {name: 'Programming', id: 1, messages: []}, 
              {name: 'Religion', id: 2, messages: []} 
];

var users = [];

io.on('connection', function(socket){
  //var username = 'user'+Math.random().toString().slice(2,7);
  //socket.broadcast.emit('user connected', user);

  socket.on('disconnect', function(){
    for (var i = 0; i<users.length;i++) {
      if(users[i].id === socket.id) {
        users.splice(i,1);
        break;
      }
    }
    //io.emit('user disconnected', user);
  });

  socket.on('chat message', function(msg){
    var room;
    rooms.forEach(function(item) {
      if(item.id === msg.room) {
        room = item;
      }
    });

    // Push the message, store at most N newest
    room.messages.push(msg);
    if(room.messages.length > 100) {
      room.messages.shift();
    }

    socket.broadcast.emit('chat message', msg);
  });

  socket.on('join room', function(user, room) {
    socket.broadcast.emit('join room', user, room);
  });

  socket.on('create room', function(roomname) {
    rooms.push({name: roomname, id: room_id, messages: []});
    room_id += 1;
    io.emit("rooms", rooms);
  });

  socket.on('username', function(username, cb) {
    if(username === '') {
      cb({status: 1, message: 'Failure'});
      return;
    }
    var user_idx = null;
    for(var i = 0; i < users.length; i++) {
      if(users[i].username === username) {
        if(users[i].id === socket.id) {
          cb({status: 0, message: 'Success', username: username});
          return;
        }
        else {
          cb({status: 1, message: 'Failure'});
          return;
        }
      }
      if(users[i].id === socket.id) {
        user_idx = i;
      }
    }
    // Valid username, save and approve
    if(user_idx === null) {
      users.push({username: username, id: socket.id});
      socket.emit("rooms", rooms);
    }
    else {
      users[user_idx].username = username;
    }
    cb({status: 0, message: 'Success', username: username});
  });
});

http.listen(3000, '0.0.0.0', function(){
  console.log('listening on *:3000');
});