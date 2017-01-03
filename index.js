var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var multer = require('multer');
var upload = multer({dest: 'uploads/'}).single('file');

app.use(express.static(__dirname))

app.get('/', function(req, res){
  res.sendFile('index.html');
});

app.post('/upload', function (req, res) {
  upload(req, res, function(err) {
    if(err) {
      console.log("Multer error!");
      console.log(err);
      return;
    }

    //res.send('POST request to /upload');
    return res.status( 200 ).send( req.file );
  });
});

var room_id = 3;

var rooms = [ {name: 'Main', id: 0, messages: []}, 
              {name: 'Programming', id: 1, messages: []}, 
              {name: 'Religion', id: 2, messages: []} 
];

var private_rooms = [];

var users = [];

function get_user_id(username) {
  for(var i = 0; i < users.length; i++) {
    if(users[i].username === username) {
      return users[i].id;
    }
  }
  return null;
}

function get_username(id) {
  for(var i = 0; i < users.length; i++) {
    if(users[i].id === id) {
      return users[i].username;
    }
  }
  return null;
}

function create_private(socket1, socket2) {
  if(socket1 === socket2) 
    return null;
  if(socket1 === null || socket2 === null) 
    return null;

  if(socket1 > socket2) {
    var temp = socket2;
    socket2 = socket1;
    socket1 = temp;
  }
  for(var i = 0; i<private_rooms.length; i++) {
    if(private_rooms[i].users[0] == socket1 && private_rooms[i].users[1] ===socket2) {
      return null;
    }
  }
  return [socket1, socket2];
}

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
        // Push the message, store at most N newest
        room.messages.push(msg);
        if(room.messages.length > 100) {
          room.messages.shift();
        }
        socket.broadcast.emit('chat message', msg);
      }
    });

    for(var i = 0; i<private_rooms.length; i++) {
      if(private_rooms[i].id == msg.room) {
        var room = private_rooms[i];
        var buddy = null;
        if(socket.id === room.users[0]) {
          buddy = room.users[1];
        }
        else if(socket.id === room.users[1]) {
          buddy = room.users[0];
        }
        if(buddy) {
          io.sockets.connected[buddy].emit('chat message', msg);
        }
      }
    }
  });

  socket.on('join room', function(user, room) {
    socket.broadcast.emit('join room', user, room);
  });

  socket.on('create room', function(roomname) {
    rooms.push({name: roomname, id: room_id, messages: []});
    room_id += 1;
    io.emit("rooms", rooms);
  });

  socket.on('create private', function(username) {
    var buddy_id = get_user_id(username);
    var users = create_private(socket.id, buddy_id);
    if(users !== null) {
      var room = {id: room_id, users: users};
      private_rooms.push(room);
      io.sockets.connected[buddy_id].emit("private", {id: room_id, name: get_username(socket.id), messages: []});
      socket.emit("private", {id: room_id, name: username});
      room_id += 1;
    }
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