var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var multer = require('multer');
var upload = multer({dest: 'uploads/'}).single('file');

var MongoClient = require('mongodb').MongoClient;
var mongoUrl = 'mongodb://localhost:27017/ssChat';
var mongoDB = null;

var room_id = 3;

var rooms = [ {name: 'Main', id: 0, messages: []}, 
              {name: 'Programming', id: 1, messages: []}, 
              {name: 'Religion', id: 2, messages: []} 
];

var private_rooms = [];

// Connect to MongoDB and save the db
MongoClient.connect(mongoUrl, function(err, db) {
  console.log("Connected Mongodb");
  mongoDB = db;
  mongoDB.collection('messages').drop();
  mongoDB.collection('users').drop();
  mongoDB.collection('rooms').drop();
});

function saveMessage(msg) {
  var collection = mongoDB.collection('messages');
  collection.insertOne(msg);
}


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

    return res.status( 200 ).send( req.file );
  });
});


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
  //socket.broadcast.emit('user connected', user);
  users.push({username: null, id: socket.id});
  mongoDB.collection('users').insertOne({username: null, id: socket.id});

  socket.on('disconnect', function(){
    mongoDB.collection('users').deleteOne({id: socket.id}, function() {
      return;
    });
    //io.emit('user disconnected', user);
  });

  socket.on('chat message', function(msg){
    var room;
    rooms.forEach(function(item) {
      if(item.id === msg.room) {
        room = item;
        // Push the message, store at most N newest
        saveMessage(msg);

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
    mongoDB.collection('users').findOne({username: username}, function(err, buddy) {
      mongoDB.collection('users').findOne({id: socket.id}, function(err, me) {
        var priv_users = create_private(me.id, buddy.id);
        if(priv_users !== null) {
          var room = {id: room_id, users: priv_users};
          private_rooms.push(room);
          io.sockets.connected[buddy.id].emit("private", {id: room_id, name: me.username, messages: []});
          socket.emit("private", {id: room_id, name: username});
          room_id += 1;
        }
      });
    });
  });

  socket.on('username', function(username, cb) {
    if(username === '') {
      cb({status: 1, message: 'Failure'});
      return;
    }
    mongoDB.collection('users').findOne({username: username}, function(err, username_owner) {
      mongoDB.collection('users').findOne({id: socket.id}, function(err, me) {
        if(me === username_owner) {
          // No change in name
          cb({status: 0, message: 'Success', username: username});
        }
        else if(username_owner === null) {
          // Userame not in use
          if(me.username === null) {
            // Initial room list
            socket.emit("rooms", rooms);
          }
          //me.username = username;
          mongoDB.collection('users').updateOne({id: socket.id}, {$set: {username: username}}, function() {
            cb({status: 0, message: 'Success', username: username});
          });
        }
        else {
          // Username in use
          cb({status: 1, message: 'Failure'});
        }
      });
    });
  });
});

http.listen(3000, '0.0.0.0', function(){
  console.log('listening on *:3000');
});