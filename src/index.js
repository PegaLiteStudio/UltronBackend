require('dotenv').config();

const express = require('express')
const app = express()

const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');

const compression = require('compression');
const server = http.createServer(app);
const io = socketIO(server, {
    pingInterval: 5000, // Send ping every 5 seconds
    pingTimeout: 5000, // Disconnect if no pong received within 5 seconds
});

global.io = io;
global.connectedUsers = {};
global.currentPorcesses = {};

const databaseManager = require("./managers/databaseManager");

const userRoute = require('./routes/userRoutes')
const adminRoute = require('./routes/adminRoutes')

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(compression({
    level: 6, threshold: 0
}));


app.use('/user', userRoute);
app.use('/admin', adminRoute);

app.use(function (req, res) {
    return res.status(404).send({status: false, message: "Path Not Found"})
});


io.on('connection', (socket) => {
    console.log('A device connected:', socket.id);

    // Store connected users
    const {number} = socket.handshake.query;
    if (number) {
        connectedUsers[number] = socket.id;
        console.log('Connected users:', connectedUsers);
    }

    socket.on('disconnect', () => {
        console.log(`Device disconnected: ${socket.id}`);
        if (number && connectedUsers[number]) {
            if (connectedUsers[number] === socket.id) {
                delete connectedUsers[number];
            }
            console.log('Updated connected users:', connectedUsers);
        }
    });

});

const port = process.env.PORT || 3005;
server.listen(port, async () => {
    console.log("------------------------");
    console.log("Server running on Port", port);
    await databaseManager.connect();

});
