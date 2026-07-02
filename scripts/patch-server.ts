import fs from "fs";

let code = fs.readFileSync("server.ts", "utf-8");

const startStr = "// 1. GET Gift Market Intel (Real dynamic simulation)";
const endStr = "// 1.0.1 GET Market Platforms connectivity status";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find boundaries");
  process.exit(1);
}

const getGemsLogic = `// GetGems API integration via Agent
const GETGEMS_API_ENDPOINT = "https://api.getgems.io/graphql";
const TELEGRAM_GIFTS_COLLECTION_ADDRESS = "EQBZj1V0sY892w8Q7YV2o_5zC4Kk3uHqjBvJzJ7bJm9-T2mC";
const GET_TELEGRAM_GIFTS_QUERY = \`
  query GetTelegramGifts($collectionAddress: String!, $limit: Int, $offset: Int) {
    nftItems(
      collectionAddress: $collectionAddress
      limit: $limit
      offset: $offset
    ) {
      address
      name
      description
      metadata { image }
      activeSale {
        fullPrice
      }
    }
  }
\`;

async function fetchTelegramGiftsFromGetGems() {
  try {
    const response = await fetch(GETGEMS_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: GET_TELEGRAM_GIFTS_QUERY,
        variables: { collectionAddress: TELEGRAM_GIFTS_COLLECTION_ADDRESS, limit: 20, offset: 0 },
      }),
    });
    if (!response.ok) return [];
    const result = await response.json();
    if (result.errors) return [];
    
    return (result.data?.nftItems || [])
      .filter((item: any) => item.activeSale?.fullPrice)
      .map((item: any) => ({
        id: item.address,
        name: item.name || "Telegram Gift",
        serialNumber: parseInt(item.name?.match(/#(\\d+)/)?.[1] || "0", 10) || 0,
        floorPriceTon: parseFloat(item.activeSale.fullPrice) / 1e9,
        image: item.metadata?.image || "https://via.placeholder.com/150",
        pattern: "Common"
      }));
  } catch (error) {
    console.error("Error fetching GetGems:", error);
    return [];
  }
}

app.get("/api/gifts/intel", async (req, res) => {
  try {
    const gifts = await fetchTelegramGiftsFromGetGems();
    if (gifts.length === 0) {
      // Fallback
      return res.json([{
        id: "gift_fallback",
        name: "Durov's Puzzles",
        serialNumber: 124,
        floorPriceTon: 13.8,
        image: "https://fragment.com/assets/nft/gift_puzzle.webp",
        pattern: "Common"
      }]);
    }
    res.json(gifts);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load gift market intelligence" });
  }
});

`;

const newCode = code.substring(0, startIndex) + getGemsLogic + code.substring(endIndex);

fs.writeFileSync("server.ts", newCode);
console.log("Patched server.ts successfully");
