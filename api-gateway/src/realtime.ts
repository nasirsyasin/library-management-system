import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { getApprovedIdentity } from "./auth";

interface ClientToServerEvents {}

interface ServerToClientEvents {
  "book-returned": (event: { bookId: string; notificationId: string }) => void;
}

interface InterServerEvents {}

interface SocketData {
  memberId: string;
}

export function createRealtimeServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "http://localhost:8082"],
    },
  });

  io.use((socket, next) => {
    const token: unknown = socket.handshake.auth.token;
    if (typeof token !== "string") return next(new Error("Unauthorized"));

    getApprovedIdentity(token)
      .then((identity) => {
        if (!identity) {
          next(new Error("Unauthorized"));
          return;
        }
        socket.data.memberId = identity.memberId;
        next();
      })
      .catch(() => next(new Error("Unauthorized")));
  });

  io.on("connection", (socket) => {
    socket.join(`member:${socket.data.memberId}`);
  });

  return io;
}