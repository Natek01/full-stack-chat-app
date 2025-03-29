import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Chat = () => {
    const [username, setUsername] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [typingUser, setTypingUser] = useState(null);
    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const chatEndRef = useRef(null);
    let typingTimeout = useRef(null);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            setMessages((prevMessages) => [...prevMessages, data]);
        });

        socket.on("user_typing", (user) => {
            setTypingUser(user);
        });

        socket.on("user_stopped_typing", () => {
            setTypingUser(null);
        });

        socket.on("update_users", (users) => {
            setOnlineUsers(users);
            if (userProfile) {
                const updatedProfile = users.find(user => user.username === userProfile.username);
                if (updatedProfile) setUserProfile(updatedProfile);
            }
        });

        return () => {
            socket.off("receive_message");
            socket.off("user_typing");
            socket.off("user_stopped_typing");
            socket.off("update_users");
        };
    }, [userProfile]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogin = () => {
        if (username.trim()) {
            setIsUserLoggedIn(true);
            const profile = {
                username,
                avatar: avatarPreview || "👤" // Use uploaded avatar or default emoji
            };
            setUserProfile(profile);
            socket.emit("join", profile);
        }
    };

    const sendMessage = () => {
        if (message.trim() !== "") {
            const newMessage = { text: message, sender: username };
            socket.emit("send_message", newMessage);
            setMessage("");
            socket.emit("stop_typing");
        }
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);
        socket.emit("typing", username);

        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            socket.emit("stop_typing");
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-4">
                {!isUserLoggedIn ? (
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">💬 Enter Your Username</h2>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none w-full mb-2"
                        />
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Upload Avatar (optional)</label>
                            <div className="flex items-center justify-center">
                                <label className="cursor-pointer">
                                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">👤</span>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            className="bg-blue-500 hover:bg-blue-600 mt-2 px-4 py-2 rounded-md"
                        >
                            Start Chat
                        </button>
                    </div>
                ) : (
                    <>
                        {/* User Profile Section */}
                        {userProfile && (
                            <div className="flex items-center justify-center mb-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {userProfile.avatar && (typeof userProfile.avatar === 'string' && userProfile.avatar.startsWith('data:image')) ? (
                                            <img src={userProfile.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">{userProfile.avatar}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold mt-2">{userProfile.username}</p>
                                </div>
                            </div>
                        )}

                        {/* Online Users Section */}
                        <div className="bg-gray-700 p-3 rounded-lg mb-4">
                            <h3 className="text-center text-lg font-bold mb-2">🟢 Online Users</h3>
                            <div className="flex flex-wrap gap-2">
                                {onlineUsers.map((user, index) => (
                                    <div key={index} className="flex items-center bg-gray-600 p-2 rounded-lg">
                                        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden mr-2">
                                            {user.avatar && (typeof user.avatar === 'string' && user.avatar.startsWith('data:image')) ? (
                                                <img src={user.avatar} alt="User Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl">{user.avatar}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{user.username}</p>
                                            <p className="text-xs text-green-400">Online</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <h2 className="text-center text-xl font-bold mb-2">💬 Chat Room</h2>
                        <div className="h-80 overflow-y-auto border border-gray-700 p-2 rounded-lg">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === username ? "justify-end" : "justify-start"} my-2`}>
                                    <div className={`p-3 rounded-xl ${msg.sender === username ? "bg-blue-500 text-white" : "bg-gray-700 text-white"}`}>
                                        <div className="font-semibold text-xs mb-1">{msg.sender}</div>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {typingUser && typingUser !== username && (
                                <div className="text-gray-400 text-sm ml-2">{typingUser} is typing...</div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="flex mt-3">
                            <input 
                                type="text" 
                                value={message} 
                                onChange={handleTyping} 
                                placeholder="Type a message..." 
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