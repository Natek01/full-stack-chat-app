import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Chat = () => {
    const [username, setUsername] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState(null);
    const [users, setUsers] = useState([]);
    const [privateRecipient, setPrivateRecipient] = useState(null);
    const [unreadMessages, setUnreadMessages] = useState({});

    const chatEndRef = useRef(null);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessages((prevMessages) => [...prevMessages, data]);
        });
        socket.on("receive_private_message", (data) => {
            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, data];
                const senderId = users.find((u) => u.username === data.sender)?.id;
                // Increment unread count only if this user is the recipient and not viewing the sender’s chat
                if (
                    senderId &&
                    data.recipient === username && // This user is the recipient
                    senderId !== privateRecipient && // Not currently viewing this sender’s chat
                    data.text // Ensure it’s a text message
                ) {
                    setUnreadMessages((prev) => ({
                        ...prev,
                        [senderId]: (prev[senderId] || 0) + 1
                    }));
                }
                return updatedMessages;
            });
        });
        socket.on("user_typing", (user) => {
            setTypingUser(user);
        });
        socket.on("user_stopped_typing", () => {
            setTypingUser(null);
        });
        socket.on("update_users", (userList) => {
            setUsers(userList);
        });
        return () => {
            socket.off("receive_message");
            socket.off("receive_private_message");
            socket.off("user_typing");
            socket.off("user_stopped_typing");
            socket.off("update_users");
        };
    }, [privateRecipient, username, users]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleLogin = () => {
        if (username.trim()) {
            setIsUserLoggedIn(true);
            const profile = { username:username, avatar: previewAvatar || "👤" };
            socket.emit("join", profile);
        }
    };

    const sendMessage = () => {
        if (message.trim()) {
            if (privateRecipient) {
                socket.emit("send_private_message", {
                    recipientId: privateRecipient,
                    text: message
                });
            } else {
                const newMessage = { text: message, sender: username };
                socket.emit("send_message", newMessage);
            }
            setMessage("");
            socket.emit("stop_typing", { recipientId: privateRecipient });
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewAvatar(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);
        socket.emit("typing", { username, recipientId: privateRecipient });
        setTimeout(() => {
            socket.emit("stop_typing", { recipientId: privateRecipient });
        }, 2000);
    };

    const startPrivateChat = (recipientId) => {
        setPrivateRecipient(recipientId);
        setUnreadMessages((prev) => ({
            ...prev,
            [recipientId]: 0
        }));
    };

    const exitPrivateChat = () => {
        setPrivateRecipient(null);
    };

    const formatTime = (timeStamp) => {
        if (!timeStamp) return "";
        const date = new Date(timeStamp);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    };

    const displayedMessages = privateRecipient
        ? messages.filter(
              (msg) =>
                  msg.isPrivate &&
                  ((msg.sender === username && msg.recipient === users.find((u) => u.id === privateRecipient)?.username) ||
                   (msg.sender === users.find((u) => u.id === privateRecipient)?.username && msg.recipient === username))
          )
        : messages.filter((msg) => !msg.isPrivate);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-4">
            <div className="w-full max-w-lg mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
                {!isUserLoggedIn ? (
                    <div className="text-center flex flex-col items-center justify-center">
                        <h2 className="text-xl font-bold mb-2">💬 Enter Your Username</h2>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none w-full"
                        />
                        <span className="text-sm mt-6">Upload Avatar</span>
                        <label className="bg-gray-600 rounded-full cursor-pointer w-24 h-24 m-6 flex flex-col items-center justify-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                            {!previewAvatar ? (
                                "👤"
                            ) : (
                                <img
                                    src={previewAvatar}
                                    alt="Avatar Preview for profile image"
                                    className="w-full h-full mx-auto rounded-full border border-gray-500 object-cover"
                                />
                            )}
                        </label>
                        <button
                            onClick={handleLogin}
                            className="bg-blue-500 hover:bg-blue-600 transition duration-500 cursor-pointer px-4 py-2 rounded-md"
                        >
                            Start Chat
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center bg-gray-700 p-3 rounded-lg mb-4 max-w-xl">
                            <div className="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden mr-3">
                                {previewAvatar ? (
                                    <img
                                        src={previewAvatar}
                                        alt="User Avatar"
                                        className="w-full h-full rounded-full"
                                    />
                                ) : (
                                    <span className="text-2xl">👤</span>
                                )}
                            </div>
                            <p className="text-xl font-bold">{username}</p>
                        </div>
                        <h2 className="text-center text-xl font-bold mb-2">
                            💬 {privateRecipient ? `Private Chat with ${users.find((u) => u.id === privateRecipient)?.username}` : "Chat Room"}
                        </h2>

                        {/* User List for Private Messaging */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold">Online Users</h3>
                            <div className="flex flex-wrap gap-2">
                                {users
                                    .filter((user) => user.username !== username)
                                    .map((user) => (
                                        <div key={user.id} className="relative">
                                            <button
                                                onClick={() => startPrivateChat(user.id)}
                                                className={`p-2 rounded-md ${
                                                    privateRecipient === user.id
                                                        ? "bg-blue-600"
                                                        : "bg-gray-700"
                                                } hover:bg-blue-500`}
                                            >
                                                {user.username}
                                            </button>
                                            {unreadMessages[user.id] > 0 && (
                                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                    {unreadMessages[user.id]}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                            {privateRecipient && (
                                <div className="mt-2">
                                    <span className="text-sm text-gray-400">
                                        Chatting privately with: {users.find((u) => u.id === privateRecipient)?.username}
                                    </span>
                                    <button
                                        onClick={exitPrivateChat}
                                        className="ml-2 text-sm text-blue-400 hover:underline"
                                    >
                                        Exit Private Chat
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="h-80 overflow-y-auto border border-gray-700 p-2 rounded-lg">
                            {displayedMessages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex ${
                                        msg.sender === username ? "justify-end" : "justify-start"
                                    } my-2`}
                                >
                                    <div
                                        className={`p-3 rounded-xl ${
                                            msg.sender === username
                                                ? "bg-blue-500 text-white"
                                                : msg.isPrivate
                                                ? "bg-purple-500 text-white"
                                                : "bg-gray-700 text-white"
                                        }`}
                                    >
                                        <div className="font-semibold text-xs mb-1">
                                            {msg.sender} {msg.isPrivate ? "(Private)" : ""}
                                        </div>
                                        {msg.text}
                                        <div className="text-xs opacity-75">
                                            {formatTime(msg.timeStamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {typingUser && typingUser !== username && (
                                <div className="text-gray-400 text-lg ml-2">
                                    {typingUser} is typing...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="flex mt-3">
                            <input
                                type="text"
                                value={message}
                                onChange={handleTyping}
                                placeholder={
                                    privateRecipient
                                        ? `Message ${users.find((u) => u.id === privateRecipient)?.username}...`
                                        : "Type a message..."
                                }
                                className="flex-1 p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none"
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg ml-2"
                            >
                                ➤
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Chat;