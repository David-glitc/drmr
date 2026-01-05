// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import * as anchor from "@coral-xyz/anchor";
import * as dotenv from "dotenv";

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.
  // You can access custom environment variables like:
  // const customVar = process.env.YOUR_CUSTOM_VAR;
};
