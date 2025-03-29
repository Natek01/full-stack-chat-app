const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors()); // Enable CORS for frontend requests

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Adjust for your frontend
        methods: ["GET", "POST"]
    }
});

const activeUsers = new Map(); // Store connected users

io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    socket.on("join", (username) => {
        activeUsers.set(socket.id, username);
        console.log(`✅ ${username} joined the chat`);
    });

    socket.on("send_message", (message) => {
        io.emit("receive_message", message);
    });

    // Typing indicator (sent to other users only)
    socket.on("typing", (username) => {
        socket.broadcast.emit("user_typing", username); // Sent to everyone except the sender
    });

    socket.on("stop_typing", () => {
        socket.broadcast.emit("user_stopped_typing");
    });

    socket.on("disconnect", () => {
        const username = activeUsers.get(socket.id);
        if (username) {
            console.log(`❌ ${username} disconnected`);
            activeUsers.delete(socket.id);
        }
    });
});

// Default route
app.get("/", (req, res) => {
    res.send("Chat Server Running");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
