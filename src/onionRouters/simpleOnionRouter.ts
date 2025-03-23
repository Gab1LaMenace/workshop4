import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT } from "../config";

// These variables store the last received encrypted message, decrypted message, and the message's destination.
let lastEncryptedMessage: string | null = null;
let lastDecryptedMessage: string | null = null;
let lastMessageDestination: number | null = null;

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // GET route to retrieve the last received encrypted message
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastEncryptedMessage });
  });

  // GET route to retrieve the last received decrypted message
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastDecryptedMessage });
  });

  // GET route to retrieve the destination of the last received message
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  // This route simulates receiving a message and processing it
  onionRouter.post("/receiveMessage", (req, res) => {
    const { encryptedMessage, decryptedMessage, destination } = req.body;

    // Set the last received data
    lastEncryptedMessage = encryptedMessage;
    lastDecryptedMessage = decryptedMessage;
    lastMessageDestination = destination;

    res.status(200).send("Message received and processed");
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
