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

var initial_rooms = [ 
  {name: 'Main', public: true, id: 0}, 
  {name: 'Programming', public: true, id: 1}, 
  {name: 'Religion', public: true, id: 2} 
];

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

// Connect to MongoDB and save the db
MongoClient.connect(mongoUrl, function(err, db) {
  console.log("MongoDB: connected");
  mongoDB = db;

  // Clear all previous data from DB
  console.log("MongoDB: clear previous collections");
  mongoDB.collection('messages').remove();
  mongoDB.collection('users').remove();
  mongoDB.collection('rooms').remove();

  // Insert initial public room
  console.log("MongoDB: insert initial rooms");
  mongoDB.collection('rooms').insert(initial_rooms);

  // Start the server
  var port = 3000
  http.listen(port, function(){
    console.log('ssChat: listen on localhost:%d', port);
  });
});

function is_connected(id) {
  return (io.sockets.connected[id] !== undefined && io.sockets.connected[id].connected);
}


io.on('connection', function(socket){
  //socket.broadcast.emit('user connected', user);
  mongoDB.collection('users').insertOne({username: null, id: socket.id});

  socket.on('disconnect', function(){
    mongoDB.collection('users').deleteOne({id: socket.id}, function() {
      mongoDB.collection('rooms').find({members: {$in: [socket.id]}}).toArray(function(err, rooms) {
        // Delete private channels user participated in 
        rooms.forEach(function(room) {
          room.members.forEach(function(member) {
            if(is_connected(member)) {
              io.sockets.connected[member].emit('delete room', room.id);
            }
          });
        });
        return;
      });
    });
    //io.emit('user disconnected', user);
  });

  // User sends a message
  socket.on('chat message', function(msg){
    mongoDB.collection('messages').insertOne(msg);
    mongoDB.collection('rooms').findOne({id: msg.room}, function(err, room) {
      if(room.public === true) {
        // Send public messages to all except sender
        socket.broadcast.emit('chat message', msg);
      }
      else {
        // Send private messages only to other party
        room.members.forEach(function(member) {
          if(member !== socket.id && is_connected(member)) {
            io.sockets.connected[member].emit('chat message', msg);
          }
        });
      }
    });
  });

  // User joins a room
  socket.on('join room', function(user, room) {
    socket.broadcast.emit('join room', user, room);
  });

  // User requests a new public room
  socket.on('create room', function(roomname) {
    var room = {name: roomname, public: true, id: room_id};
    room_id += 1;
    mongoDB.collection('rooms').insertOne(room, function() {
      io.emit("new public", room, []);
    });
  });

  // User wants to create a private room
  socket.on('create private', function(username) {
    mongoDB.collection('users').findOne({username: username}, function(err, buddy) {
      mongoDB.collection('users').findOne({id: socket.id}, function(err, me) {
        if(me && buddy) {
          mongoDB.collection('rooms').findOne({$and: [{public: false},{members: {$in: [buddy.id]}}, {members: {$in: [me.id]}}]}, function(err, room) {
            if(room === null) {
              // No such private room exists
              var room = {
                members: [me.id, buddy.id], 
                public: false, 
                id: room_id
              };
              mongoDB.collection('rooms').insertOne(room);
              io.sockets.connected[buddy.id].emit("new private", {id: room_id, name: me.username});
              socket.emit("new private", {id: room_id, name: username});
              room_id += 1;
            }
          });
        }
      });
    });
  });

  // User requests a username
  socket.on('username', function(username, cb) {
    if(username === '') {
      cb({status: 1, message: 'Failure'});
      return;
    }
    mongoDB.collection('users').findOne({username: username}, function(err, username_owner) {
      mongoDB.collection('users').findOne({id: socket.id}, function(err, me) {
        if(username_owner === null) {
          // Requested userame not in use
          if(me.username === null) {
            // Initial username request - emit initial room list
            mongoDB.collection('rooms').find({public: true}).sort({id: 1}).toArray(function(err, rooms) {
              rooms.forEach(function(room) {
                mongoDB.collection('messages').find({room: room.id}).limit(100).sort({time: 1}).toArray(function(err, messages) {
                  socket.emit("new public", room, messages);
                });
              });
            });
          }
          mongoDB.collection('users').updateOne({id: socket.id}, {$set: {username: username}}, function() {
            cb({status: 0, message: 'Success', username: username});
          });
        }
        else if(me.id == username_owner.id) {
          // No change in name
          cb({status: 0, message: 'Success', username: username});
        }
        else {
          // Username already in use
          cb({status: 1, message: 'Failure'});
        }
      });
    });
  });
});

