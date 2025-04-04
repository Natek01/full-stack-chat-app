import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";

const app = express();
const server = http.createServer(app);

app.use(cors());

dotenv.config(); // Load environment variables

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const users = new Map(); // Store users { socket.id: { username, avatar } }

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join", ({username, avatar}) => {
        users.set(socket.id, {username, avatar, id: socket.id });
        io.emit("update_users", Array.from(users.values()));
        console.log(`${username} joined with avatar`);
    });

    socket.on("send_message", (message) => {
        const messageWithTimeStamp = {
            ...message,
            timeStamp: new Date().toISOString(),
            isPrivate: false
        };
        io.emit("receive_message", messageWithTimeStamp);
    });

    socket.on("send_private_message", ({ recipientId, text }) => { // Adjusted to match frontend
        const sender = users.get(socket.id);
        const recipient = users.get(recipientId);
        if (recipient) {
            const privateMessage = {
                text,
                sender: sender.username,
                timeStamp: new Date().toISOString(),
                isPrivate: true,
                recipient: recipient.username
            };
            socket.to(recipientId).emit("receive_private_message", privateMessage);
            socket.emit("receive_private_message", privateMessage);
        }
    });

    socket.on("typing", ({ username, recipientId }) => {
        if (recipientId) {
            const recipient = users.get(recipientId);
            if (recipient) {
                socket.to(recipientId).emit("user_typing", username);
            }
        } else {
            socket.broadcast.emit("user_typing", username);
        }
    });

    socket.on("stop_typing", ({ recipientId }) => {
        if (recipientId) {
            const recipient = users.get(recipientId);
            if (recipient) {
                socket.to(recipientId).emit("user_stopped_typing");
            }
        } else {
            socket.broadcast.emit("user_stopped_typing");
        }
    });

    socket.on("disconnect", () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`${user.username} disconnected`);
            users.delete(socket.id);
            io.emit("update_users", Array.from(users.values()));
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});