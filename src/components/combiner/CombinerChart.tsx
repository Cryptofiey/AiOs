import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface ChartProps {
  data: { time: string; value: number }[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export function CombinerChart({
  data,
  colors: {
    backgroundColor = 'transparent',
    lineColor = '#2962FF',
    textColor = '#71717a',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
  } = {},
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const newSeries = chart.addAreaSeries({
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
      lineWidth: 2,
    });
    
    // Sort data by time
    const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    // Map data to lightweight charts format
    const formattedData = sortedData.map(d => ({
      time: new Date(d.time).getTime() / 1000 as any,
      value: d.value,
    }));
    
    if (formattedData.length > 0) {
      newSeries.setData(formattedData);
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      handleResize();
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
