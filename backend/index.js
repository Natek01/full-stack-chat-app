import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv"

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

    socket.on("join", ({ username, avatar }) => {
        users.set(socket.id, { username, avatar, id: socket.id }); // Include socket.id in user object
        io.emit("update_users", Array.from(users.values()));
        console.log(`${username} joined with avatar`);
    });

    socket.on("send_message", (message) => {
        const messageWithTimeStamp = {
            ...message,
            timeStamp: new Date().toISOString()
        };
        io.emit("receive_message", messageWithTimeStamp);
    });

    socket.on("send_private_message", ({ recipientId, message }) => {
        const sender = users.get(socket.id);
        const recipient = users.get(recipientId);
        if (recipient) {
            const privateMessage = {
                text: message,
                sender: sender.username,
                timeStamp: new Date().toISOString(),
                isPrivate: true,
                recipient: recipient.username // Include recipient for clarity
            };
            socket.to(recipientId).emit("receive_private_message", privateMessage);
            socket.emit("receive_private_message", privateMessage); // Echo back to sender
        }
    });

    socket.on("typing", (username) => {
        socket.broadcast.emit("user_typing", username);
    });

    socket.on("stop_typing", () => {
        socket.broadcast.emit("user_stopped_typing");
    });

    socket.on("disconnect", () => {
        const user = users.get(socket.id);
        if (user) {
            console.log(`${user.username} disconnected`);
            users.delete(socket.id);
            io.emit("update_users", Array.from(users.values())); // Update UI
        }
    });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});