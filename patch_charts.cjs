const fs = require('fs');

function patchChart(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('ResizeObserver')) return;
  
  content = content.replace(
    /window\.addEventListener\(['"`]resize['"`],\s*handleResize\);/g,
    `const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      handleResize();
    });
    resizeObserver.observe(chartContainerRef.current);`
  );
  
  content = content.replace(
    /window\.removeEventListener\(['"`]resize['"`],\s*handleResize\);/g,
    `resizeObserver.disconnect();`
  );
  
  fs.writeFileSync(filePath, content);
  console.log("Patched", filePath);
}

patchChart('src/components/combiner/CombinerChart.tsx');
patchChart('src/components/sniper/CorridorChart.tsx');
