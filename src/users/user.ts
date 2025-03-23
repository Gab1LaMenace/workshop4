import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, REGISTRY_PORT, BASE_ONION_ROUTER_PORT } from "../config";
import axios from "axios";
import * as crypto from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // Store state for testing purposes
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;
  let lastCircuit: number[] | null = null; // Added for /getLastCircuit endpoint

  // Status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Routes for inspecting messages (for testing)
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // New route for getting the last circuit used
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit });
  });

  // Receive message
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("success"); // Changed to return "success" as expected by tests
  });

  // Send message through onion routing
  _user.post("/sendMessage", async (req, res) => {
    try {
      const { message, destinationUserId } = req.body as SendMessageBody;
      lastSentMessage = message;

      // Get the node registry
      const registryResponse = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
      const { nodes } = registryResponse.data;

      // We need at least 3 distinct nodes
      if (nodes.length < 3) {
        res.status(400).json({ error: "Not enough nodes available for routing" });
        return;
      }

      // Randomly select 3 distinct nodes for our circuit
      const shuffled = [...nodes].sort(() => 0.5 - Math.random());
      const circuit = shuffled.slice(0, 3);
      
      // Store the circuit for testing
      lastCircuit = circuit.map(node => node.nodeId);

      // Prepare the destination (user port)
      const destinationPort = BASE_USER_PORT + destinationUserId;
      const paddedDestination = destinationPort.toString().padStart(10, '0');

      // Create symmetric keys for each node
      const symKeys = await Promise.all([
        crypto.createRandomSymmetricKey(),
        crypto.createRandomSymmetricKey(),
        crypto.createRandomSymmetricKey()
      ]);

      // Exported form of the symmetric keys for encryption
      const exportedSymKeys = await Promise.all(symKeys.map(key => crypto.exportSymKey(key)));

      // Building the onion layers (from exit node to entry node)
      // Start with the raw message and the destination user port
      let encryptedMessage = message;
      
      // Layer 3 (exit node)
      // Prepend the destination user port to the message
      const exitNodeData = paddedDestination + encryptedMessage;
      // Encrypt with the exit node's symmetric key
      encryptedMessage = await crypto.symEncrypt(symKeys[2], exitNodeData);
      // Encrypt the symmetric key with the exit node's public key
      const encryptedExitKey = await crypto.rsaEncrypt(exportedSymKeys[2], circuit[2].pubKey);
      // Prepare next destination (middle node port)
      const middleNodePort = BASE_ONION_ROUTER_PORT + circuit[1].nodeId;
      const paddedMiddlePort = middleNodePort.toString().padStart(10, '0');
      
      // Layer 2 (middle node)
      // Prepend the exit node port to the encrypted message
      const middleNodeData = paddedMiddlePort + encryptedExitKey + encryptedMessage;
      // Encrypt with the middle node's symmetric key
      encryptedMessage = await crypto.symEncrypt(symKeys[1], middleNodeData);
      // Encrypt the symmetric key with the middle node's public key
      const encryptedMiddleKey = await crypto.rsaEncrypt(exportedSymKeys[1], circuit[1].pubKey);
      // Prepare next destination (entry node port)
      const entryNodePort = BASE_ONION_ROUTER_PORT + circuit[0].nodeId;
      const paddedEntryPort = entryNodePort.toString().padStart(10, '0');
      
      // Layer 1 (entry node)
      // Prepend the middle node port to the encrypted message
      const entryNodeData = paddedEntryPort + encryptedMiddleKey + encryptedMessage;
      // Encrypt with the entry node's symmetric key
      encryptedMessage = await crypto.symEncrypt(symKeys[0], entryNodeData);
      // Encrypt the symmetric key with the entry node's public key
      const encryptedEntryKey = await crypto.rsaEncrypt(exportedSymKeys[0], circuit[0].pubKey);
      
      // Final message: encrypted symmetric key + encrypted data
      const finalMessage = encryptedEntryKey + encryptedMessage;
      
      // Send the message to the entry node
      await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
        message: finalMessage
      });

      res.send("success"); // Changed to return "success" as expected by tests
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Error sending message" });
    }
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}