import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

// These variables store the last received and last sent messages for the user.
let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // GET route to retrieve the last received message
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // GET route to retrieve the last sent message
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // This route simulates sending a message
  _user.post("/sendMessage", (req, res) => {
    const { message } = req.body;

    // Update the last sent message
    lastSentMessage = message;

    res.status(200).send("Message sent");
  });

  // This route simulates receiving a message
  _user.post("/receiveMessage", (req, res) => {
    const { message } = req.body;

    // Update the last received message
    lastReceivedMessage = message;

    res.status(200).send("Message received");
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}
