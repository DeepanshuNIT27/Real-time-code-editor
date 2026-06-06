import { io } from "socket.io-client";

export const initSocket = async () => {
  const options = {
    forceNew: true,
    reconnectionAttempts: Infinity,
    timeout: 10000,
    transports: ["polling", "websocket"],
    // ⭐ UPDATE: Sirf ye line add ki, baki structure same rakha hai
    withCredentials: true,
  };

  return new Promise((resolve, reject) => {
    const socket = io(import.meta.env.VITE_BACKEND_URL, options);

    // Only resolve after socket is truly connected
    socket.on("connect", () => {
      console.log("Socket truly connected:", socket.id);
      resolve(socket);
    });

    // Reject on connection error
    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      reject(err);
    });
  });
};
