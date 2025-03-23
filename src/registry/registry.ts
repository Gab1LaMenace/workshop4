import bodyParser from "body-parser";
import express from "express";
import { REGISTRY_PORT } from "../config";

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

  // Store registered nodes
  const nodes: Node[] = [];

  // Status route
  _registry.get("/status", (req, res) => {
    res.send("live");
  });

  // Route for nodes to register themselves
  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;
    
    // Check if node with this ID already exists
    const existingNodeIndex = nodes.findIndex(node => node.nodeId === nodeId);
    
    if (existingNodeIndex !== -1) {
      // Update existing node
      nodes[existingNodeIndex] = { nodeId, pubKey };
    } else {
      // Add new node
      nodes.push({ nodeId, pubKey });
    }
    
    res.status(200).send("success");
  });

  // Route for users to get the registry
  _registry.get("/getNodeRegistry", (req, res) => {
    res.json({ nodes });
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`Registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}