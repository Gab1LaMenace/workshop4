import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import * as crypto from "../crypto";
import axios from "axios";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Store state for testing purposes
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;
  
  // Generate RSA keys
  const { publicKey, privateKey } = await crypto.generateRsaKeyPair();
  const pubKeyStr = await crypto.exportPubKey(publicKey);

  // Status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // Route to get private key for testing
  onionRouter.get("/getPrivateKey", async (req, res) => {
    const privateKeyStr = await crypto.exportPrvKey(privateKey);
    res.json({ result: privateKeyStr });
  });

  // Routes for inspecting messages (for testing)
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  // Message handling
  onionRouter.post("/message", async (req, res) => {
    try {
      const { message } = req.body;
      lastReceivedEncryptedMessage = message;

      // For RSA-OAEP with 2048 bits, the encrypted data will have a fixed size
      // We need to determine where the encrypted symmetric key ends and the payload begins
      // A typical approach is to use a fixed size for the RSA encrypted part      
      // We'll assume the first 344 characters (256 bytes in base64) are the encrypted symmetric key
      const encryptedKeyLength = 344;  // Approximate size of RSA-encrypted content in base64
      
      const encryptedSymKeyB64 = message.substring(0, encryptedKeyLength);
      const encryptedData = message.substring(encryptedKeyLength);
      
      // Decrypt the symmetric key using our private key
      const symKeyB64 = await crypto.rsaDecrypt(encryptedSymKeyB64, privateKey);
      
      // Decrypt the data using the symmetric key
      const decryptedData = await crypto.symDecrypt(symKeyB64, encryptedData);
      
      // Extract the destination (first 10 characters) and the remaining message
      const destinationStr = decryptedData.substring(0, 10);
      const remainingMessage = decryptedData.substring(10);
      
      // Update the state for testing
      lastMessageDestination = parseInt(destinationStr);
      lastReceivedDecryptedMessage = remainingMessage;
      
      // Forward the message to the next destination
      await axios.post(`http://localhost:${lastMessageDestination}/message`, {
        message: remainingMessage
      });
      
      res.status(200).send("success");
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Error processing message" });
    }
  });

  // Register with the registry on startup
  try {
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId,
      pubKey: pubKeyStr,
    });
    console.log(`Node ${nodeId} registered successfully`);
  } catch (error) {
    console.error(`Failed to register node ${nodeId}:`, error);
  }

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}