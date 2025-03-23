import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

// In-memory storage for registered nodes
let nodesRegistry: { nodeId: number; pubKey: string }[] = [];

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // Route to get all registered nodes
  _registry.get("/getNodes", (req: Request, res: Response) => {
    res.json({ nodes: nodesRegistry });
  });

  _registry.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey }: RegisterNodeBody = req.body;
  
    // Check if the node is already registered
    const existingNode = nodesRegistry.find((node) => node.nodeId === nodeId);
    if (existingNode) {
      // If the node is already registered, return a response
      return res.status(400).json({ error: "Node already registered" });
    }
  
    // Register the new node
    nodesRegistry.push({ nodeId, pubKey });
    console.log(`Node ${nodeId} registered successfully`);
  
    // Respond with a success message after registering the node
    return res.status(200).json({ message: "Node registered successfully" });
  });
  

  // Status route
  _registry.get("/status", (req, res) => {
    res.json({ result: "live" });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
