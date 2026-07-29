import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import { createServer } from "node:http";

import mongoose from "mongoose";

import { Server } from "socket.io";

import cors from "cors";
import { connect } from "node:http2";
import { connectToSocket } from "./controllers/socketManager.js";

import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000));
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb", extended:true}));

app.use("/api/v1/users/", userRoutes);

const start = async () => {
    try {
        const connectionDb = await mongoose.connect('mongodb+srv://yashsantoshwakchaure_db_user:AFoGoEoHrLdh6ojv@cluster0.mfoxcbh.mongodb.net/');

        console.log(`MONGO conected  DB host: ${connectionDb.connection.host}`);
        server.listen(app.get("port"), () => {
            console.log("LISTENING ON PORT 8000");
        });
    }
    catch (err) {
        console.error(err);
    }

}
start();

