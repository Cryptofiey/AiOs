const http = require('http');

async function test() {
  const query = `
    query GetTelegramGifts($collectionAddress: String!, $limit: Int, $offset: Int) {
      nftItems(
        collectionAddress: $collectionAddress
        limit: $limit
        offset: $offset
      ) {
        address
        name
        activeSale { fullPrice }
      }
    }
  `;
  const response = await fetch("https://api.getgems.io/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { collectionAddress: "EQBZj1V0sY892w8Q7YV2o_5zC4Kk3uHqjBvJzJ7bJm9-T2mC", limit: 5, offset: 0 }
    })
  });
  const text = await response.text();
  console.log(text);
}
test();
