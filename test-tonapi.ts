async function main() {
  const res = await fetch("https://api.getgems.io/v1/public/nft/collection/EQAOQdwdw8kGftJCSFgOErM1mBjYPe4DBPq8-AhF6vr9si5N/items");
  const text = await res.text();
  console.log("GetGems:", text.substring(0, 100));
}
main();
