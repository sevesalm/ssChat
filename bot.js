var quotes = [ "Doubt thou the stars are fire; Doubt that the sun doth move; Doubt truth to be a liar; But never doubt I love.",
"This above all: to thine own self be true, And it must follow, as the night the day, Thou canst not then be false to any man.",
"There is nothing either good or bad, but thinking makes it so.",
"To die, to sleep - To sleep, perchance to dream - ay, there's the rub, For in this sleep of death what dreams may come...",
"There are more things in Heaven and Earth, Horatio, than are dreamt of in your philosophy.",
"Though this be madness, yet there is method in't." ,
"Brevity is the soul of wit.",
"Listen to many, speak to a few.",
"Conscience doth make cowards of us all.",
"One may smile, and smile, and be a villain.",
"My words fly up, my thoughts remain below: Words without thoughts never to heaven go.",
"This above all: to thine own self be true.",
"Now cracks a noble heart. Good-night, sweet prince; And flights of angels sing thee to thy rest.",
"Sweets to the sweet.",
"Lord Polonius: What do you read, my lord? Hamlet: Words, words, words. Lord Polonius: What is the matter, my lord? Hamlet: Between who? Lord Polonius: I mean, the matter that you read, my lord.",
"When sorrows come, they come not single spies. But in battalions!",
"The lady doth protest too much, methinks.",
"God hath given you one face, and you make yourself another.",
"Madness in great ones must not unwatched go.",
"What a piece of work is a man! How noble in reason! how infinite in faculty! in form, in moving, how express and admirable! in action how like an angel! in apprehension how like a god! the beauty of the world! the paragon of animals! And yet, to me, what is this quintessence of dust?",
"I loved Ophelia. Forty thousand brothers could not, with all their quantity of love, make up my sum.",
"Words, words, words.",
"I must be cruel only to be kind; Thus bad begins, and worse remains behind.",
"If we are true to ourselves, we can not be false to anyone.",
"So full of artless jealousy is guilt, It spills itself in fearing to be spilt.",
"Something is rotten in the state of Denmark.",
"To be honest, as this world goes, is to be one man picked out of ten thousand.",
"I am but mad north-north-west. When the wind is southerly, I know a hawk from a handsaw."];

var socket = require('socket.io-client')('http://localhost:3000');
var moment = require('moment');
var me = {name: null, avatarURL: 'https://pbs.twimg.com/profile_images/65929093/hamlet-48.jpg'};
var my_room = null;

function emit_quote() {
	var str = quotes[Math.floor(Math.random()*quotes.length)];
	var message = {
	    user:       me,
	    message:    str,
	    room:       my_room,
	    time:       moment()
	}
	socket.emit('chat message', message );
}

socket.on('connect', function(){
	console.log("Chatspeare: connected");
	socket.emit('username', 'Chatspeare', function(data) {
		if(!data.status) {
			console.log("Chatspeare: got username");
			me.name = data.username;
		}
		else {
			console.log("No username!");
		}
	});
});

socket.on('new public', function(room, messages) {
	if(room.id === 3) {
		my_room = 3;
		socket.emit('join room', me, 0);
		console.log("Chatspeare: start chatting");
		(function loop() {
		    var rand = Math.random()*4000 + 3000;
		    setTimeout(function() {
		            emit_quote();
		            loop();  
		    }, rand);
		}());
	}
});