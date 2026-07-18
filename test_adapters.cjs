(async () => {
  const { TonnelAdapter } = await import('./src/lib/adapters/TonnelAdapter.ts');
  const { MrktAdapter } = await import('./src/lib/adapters/MrktAdapter.ts');
  console.log("Imports succeeded, but need to run in context of the app...");
})();
