import React, { useEffect, useRef } from "react";
import { PriceCorridors } from "../../types/trading";
import { TrendingUp, Target, ShoppingCart, Zap, Info } from "lucide-react";
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi } from "lightweight-charts";

interface CorridorChartProps {
  corridors: PriceCorridors;
  currentPrice: number;
  itemName: string;
}

export const CorridorChart: React.FC<CorridorChartProps> = ({ corridors, currentPrice, itemName }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Generate some realistic-looking past data points leading up to currentPrice
    const generateData = () => {
      const data = [];
      let currentTs = Math.floor(Date.now() / 1000) - 3600 * 24; // start 24 hours ago
      let price = currentPrice * (0.9 + Math.random() * 0.2); // start somewhere around current
      
      for (let i = 0; i < 60; i++) {
        data.push({ time: currentTs as any, value: price });
        currentTs += 1440; // increment by a bit
        // random walk towards current price
        const diff = currentPrice - price;
        price += diff * 0.1 + (Math.random() - 0.5) * currentPrice * 0.05;
      }
      data.push({ time: Math.floor(Date.now() / 1000) as any, value: currentPrice });
      return data;
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)", style: 3 },
        horzLines: { color: "rgba(30, 41, 59, 0.5)", style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
          labelBackgroundColor: "#1e293b",
        },
      },
      handleScroll: false,
      handleScale: false,
    });
    
    chartRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      lineColor: "#8b5cf6",
      topColor: "rgba(139, 92, 246, 0.4)",
      bottomColor: "rgba(139, 92, 246, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
    });
    seriesRef.current = areaSeries;

    const data = generateData();
    areaSeries.setData(data);

    // Add Corridors as Price Lines
    areaSeries.createPriceLine({
      price: corridors.green,
      color: "#10b981",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Floor",
    });

    areaSeries.createPriceLine({
      price: corridors.blue,
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Buy",
    });

    areaSeries.createPriceLine({
      price: corridors.yellow,
      color: "#eab308",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Sell",
    });

    areaSeries.createPriceLine({
      price: corridors.red,
      color: "#f43f5e",
      lineWidth: 2,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Premium",
    });

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      handleResize();
    });
    resizeObserver.observe(chartContainerRef.current);
    
    // Initial size
    const resizeTimeout = setTimeout(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    }, 100);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [corridors, currentPrice]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-sans font-black text-slate-100 text-sm uppercase tracking-wider">{itemName}</h3>
            <p className="text-[10px] text-slate-500 font-mono">Real-time Price Corridors</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-mono font-black text-indigo-400 tracking-tighter">
              {currentPrice.toFixed(2)} <span className="text-[10px] opacity-70">TON</span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-[220px] mb-6 relative">
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl relative overflow-hidden group/box hover:bg-emerald-500/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest">Optimal Buy</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          </div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-mono font-black text-slate-100">
              &lt; {corridors.blue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">TON</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Zap size={10} className="text-emerald-400/50 shrink-0" />
            <span className="text-[9px] text-slate-500 font-medium truncate">Safe Entry</span>
          </div>
        </div>

        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl relative overflow-hidden group/box hover:bg-rose-500/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-[9px] sm:text-[10px] uppercase font-black text-rose-400 tracking-widest truncate">Optimal Sell</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-lg sm:text-xl font-mono font-black text-slate-100">
              &gt; {corridors.yellow.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">TON</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Info size={10} className="text-rose-400/50 shrink-0" />
            <span className="text-[9px] text-slate-500 font-medium truncate">Target Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
};

