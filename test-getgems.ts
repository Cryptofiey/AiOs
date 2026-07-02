import { GetGemsAdapter } from "./src/lib/adapters/GetGemsAdapter";

async function main() {
  const adapter = new GetGemsAdapter();
  (adapter as any).collectionAddress = "EQBZj1V0sY892w8Q7YV2o_5zC4Kk3uHqjBvJzJ7bJm9-T2mC";
  const items = await adapter.fetchLatestListings();
  console.log("Found items:", items.length);
  if (items.length > 0) {
    console.log("First item:", items[0]);
  }
}

main().catch(console.error);
