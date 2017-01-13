# ssChat

ssChat is a super simple web based chat application/service running on Node.js. A fully working demo is online at (http://chat.bugfree.fi)

## Installation

1. Install node.js (https://nodejs.org/en/)
2. Install and start MongoDB (https://www.mongodb.com)
3. Install dependencies: `npm install`
4. Start the server: `node index.js`
5. Start the bot: 'node bot.js' (Optional)
6. Chat!

## Features

- Users can join rooms and send messages
- Public room creation (on desktop)
- Private channels (click a username to initiate)
- Upload avatar images
- Emoji support
- uses MongoDB for managing rooms, messages and users

## Technologies

The backend uses [Node.js](https://nodejs.org) server with [socket.io](http://socket.io) for real-time communication handling. The frontend is JavaScript with [Bootstrap](http://getbootstrap.com) for responsive design. [MongoDB](https://www.mongodb.com) is used as a database for managing rooms, messages and users.

## Future plans

- File uploads
- Better UI design
- Room deletion UI
- Room creation for mobile