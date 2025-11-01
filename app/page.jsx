"use client";
import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, Brain, Check, BarChart2, Zap, Clock, Coins, Network } from 'lucide-react';

// --- Komponen UI ---

// Kartu untuk Dropdown Kontrol
const ControlCard = ({ children }) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">{children}</div>
);

// Kartu untuk Menampilkan Sinyal
const SignalCard = ({ signal, timeframe }) => {
  const signalConfig = {
    LONG: { icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-900' },
    SHORT: { icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-900' },
    NEUTRAL: { icon: Minus, color: 'text-yellow-500', bgColor: 'bg-yellow-900' },
  };
  const { icon: Icon, color, bgColor } = signalConfig[signal] || signalConfig.NEUTRAL;

  return (
    <div className={`rounded-lg p-6 shadow-xl ${bgColor} border border-gray-700`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Signal ({timeframe})</h3>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className={`text-5xl font-bold ${color} text-center animate-pulse`}>
        {signal}
      </div>
      <p className="text-center text-gray-400 mt-2">Based on selected indicator(s)</p>
    </div>
  );
};

// Kartu untuk Menampilkan Performa (Mockup)
const PerformanceCard = ({ performance }) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-200">Backtest Performance (Mock)</h3>
      <BarChart2 className="w-6 h-6 text-indigo-400" />
    </div>
    <div className="grid grid-cols-2 gap-4 text-center">
      <div>
        <p className="text-sm text-gray-400">Win Rate</p>
        <p className="text-2xl font-semibold text-green-500">{performance.winRate}%</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">P/L Ratio</p>
        <p className="text-2xl font-semibold text-gray-200">{performance.plRatio}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Trades</p>
        <p className="text-2xl font-semibold text-gray-200">{performance.trades}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Avg. Gain</p>
        <p className="text-2xl font-semibold text-green-500">{performance.avgGain}%</p>
      </div>
    </div>
  </div>
);

// --- Halaman Utama ---

export default function Home() {
  const [coinPair, setCoinPair] = useState('ethereum'); // bitcoin, ethereum, solana, ripple, bnb
  const [indicator, setIndicator] = useState('rsi'); // rsi, stochastic, all
  const [timeframe, setTimeframe] = useState('5m'); // 5m, 15m, 1h, 1d setting timeframe
  const [chartData, setChartData] = useState([]);
  const [signal, setSignal] = useState('NEUTRAL');
  const [performance, setPerformance] = useState({ winRate: 0, plRatio: 0, trades: 0, avgGain: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // --- Fungsi Kalkulasi Indikator ---

  // 1. Kalkulasi RSI
  const calculateRSI = (data, period = 14) => {
    let gains = 0;
    let losses = 0;

    // Hitung average gain/loss awal
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change; // losses are positive values
      }
    }

    data[period].avgGain = gains / period;
    data[period].avgLoss = losses / period;

    // Hitung RSI untuk sisa data
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      let gain = change > 0 ? change : 0;
      let loss = change < 0 ? -change : 0;

      data[i].avgGain = (data[i - 1].avgGain * (period - 1) + gain) / period;
      data[i].avgLoss = (data[i - 1].avgLoss * (period - 1) + loss) / period;

      if (data[i].avgLoss === 0) {
        data[i].rsi = 100;
      } else {
        const rs = data[i].avgGain / data[i].avgLoss;
        data[i].rsi = 100 - (100 / (1 + rs));
      }
    }
    return data;
  };

  // 2. Kalkulasi Stochastic (INI LOGIKA YANG BENAR MENGGUNAKAN OHLC)
  const calculateStochastic = (data, kPeriod = 14, dPeriod = 3) => {
    for (let i = kPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - kPeriod + 1, i + 1);
      let lowestLow = slice[0].low;
      let highestHigh = slice[0].high;

      for (let j = 1; j < slice.length; j++) {
        if (slice[j].low < lowestLow) lowestLow = slice[j].low;
        if (slice[j].high > highestHigh) highestHigh = slice[j].high;
      }

      const currentClose = data[i].close;
      if (highestHigh - lowestLow === 0) {
        data[i].stochK = 100; // Hindari pembagian dengan nol
      } else {
        data[i].stochK = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      }
    }

    // Hitung %D (Simple Moving Average dari %K)
    for (let i = kPeriod + dPeriod - 2; i < data.length; i++) {
      let sumK = 0;
      for (let j = 0; j < dPeriod; j++) {
        sumK += data[i - j].stochK;
      }
      data[i].stochD = sumK / dPeriod;
    }
    return data;
  };

  // --- Fungsi Utama: Fetch Data dan Menjalankan Analisis ---

  const runStrategy = async (currentCoin = coinPair,
    currentIndicator = indicator,
    currentTimeframe = timeframe) => {
    setIsLoading(true);
    console.log(`Running strategy for ${currentCoin}  in ${currentTimeframe} using ${currentIndicator}...`);

    // Mapping nama dropdown ke simbol API Asterdex
    const coinMap = {
      bitcoin: "BTCUSDT",
      ethereum: "ETHUSDT",
      solana: "SOLUSDT",
      ripple: "XRPUSDT",
      bnb: "BNBUSDT",
      hyperliquid: "HYPEUSDT",
      aster: "ASTERUSDT",
    };
    const symbol = coinMap[currentCoin];
    if (!symbol) {
      console.error("Invalid coin pair selected");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Data dari Asterdex (Endpoint /klines)
      // Mengambil 300 data 5-menit terakhir
      const response = await fetch(`https://fapi.asterdex.com/fapi/v1/klines?symbol=${symbol}&interval=${currentTimeframe}&limit=300`);

      if (!response.ok) throw new Error("Failed to fetch market data from Asterdex");

      const klines = await response.json();

      // 2. Format Data (Asterdex/Binance format: [timestamp, open, high, low, close, ...])
      let formattedData = klines.map(d => ({
        time: parseInt(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        price: parseFloat(d[4]), // 'price' untuk chart utama
        // inisialisasi nilai indikator
        rsi: null,
        stochK: null,
        stochD: null,
      }));

      // 3. Kalkulasi Indikator
      if (currentIndicator === 'rsi' || currentIndicator === 'all') {
        formattedData = calculateRSI(formattedData);
      }
      if (currentIndicator === 'stochastic' || currentIndicator === 'all') {
        formattedData = calculateStochastic(formattedData);
      }

      setChartData(formattedData);

      // 4. Ambil data terbaru untuk sinyal
      const latestData = formattedData[formattedData.length - 1];
      if (!latestData) {
        setSignal('NEUTRAL');
        setIsLoading(false);
        return;
      }

      // 5. Logika Sinyal (Berdasarkan Indikator)
      let currentSignal = 'NEUTRAL';
      switch (currentIndicator) {
        case 'rsi':
          if (latestData.rsi < 30) currentSignal = 'LONG';
          else if (latestData.rsi > 70) currentSignal = 'SHORT';
          break;
        case 'stochastic':
          if (latestData.stochK > 80 && latestData.stochD > 80) currentSignal = 'SHORT';
          else if (latestData.stochK < 20 && latestData.stochD < 20) currentSignal = 'LONG';
          break;
        case 'all':
          const rsiSignal = latestData.rsi < 30 ? 'LONG' : (latestData.rsi > 70 ? 'SHORT' : 'NEUTRAL');
          const stochSignal = (latestData.stochK < 20 && latestData.stochD < 20) ? 'LONG' : ((latestData.stochK > 80 && latestData.stochD > 80) ? 'SHORT' : 'NEUTRAL');
          
          if (rsiSignal === 'LONG' && stochSignal === 'LONG') currentSignal = 'LONG';
          else if (rsiSignal === 'SHORT' && stochSignal === 'SHORT') currentSignal = 'SHORT';
          else currentSignal = 'NEUTRAL';
          break;
        default:
          currentSignal = 'NEUTRAL';
      }
      setSignal(currentSignal);

      // 6. Mockup Performance (Data Palsu)
      setPerformance({
        winRate: Math.floor(Math.random() * 30) + 40, // 40-70%
        plRatio: (Math.random() * 1.5 + 1).toFixed(2), // 1.0 - 2.5
        trades: Math.floor(Math.random() * 50) + 20, // 20-70
        avgGain: (Math.random() * 0.5 + 0.2).toFixed(2), // 0.2% - 0.7%
      });

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error("Strategy execution failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UseEffect Hooks ---

  // Hook untuk menjalankan strategi saat koin atau indikator berubah
  useEffect(() => {
    runStrategy(coinPair, indicator, timeframe);

    // Set interval untuk auto-refresh setiap 3 menit
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing data...");
      runStrategy(coinPair, indicator);
    }, 3 * 60 * 1000); // 3 menit

    // Membersihkan interval saat komponen unmount atau dependencies berubah
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinPair, indicator, timeframe]); // Dependensi: jalankan ulang jika koin atau indikator berubah serta timeframe

  // --- Helper untuk Format Chart ---
  const formatXAxis = (tickItem) => {
    return new Date(tickItem).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatTooltipPrice = (value) => `$${value.toFixed(2)}`;
  
  const formatTooltipTime = (label) => new Date(label).toLocaleString();

  // Custom Tooltip untuk Chart Indikator
  const CustomIndicatorTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg text-sm">
          <p className="text-gray-300 font-semibold mb-1">{formatTooltipTime(label)}</p>
          {payload.find(p => p.dataKey === 'rsi') && (
            <p style={{ color: '#8884d8' }}>{`RSI: ${payload.find(p => p.dataKey === 'rsi').value.toFixed(2)}`}</p>
          )}
          {payload.find(p => p.dataKey === 'stochK') && (
             <p style={{ color: '#facc15' }}>{`%K: ${payload.find(p => p.dataKey === 'stochK').value.toFixed(2)}`}</p>
          )}
           {payload.find(p => p.dataKey === 'stochD') && (
             <p style={{ color: '#f87171' }}>{`%D: ${payload.find(p => p.dataKey === 'stochD').value.toFixed(2)}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // --- Render JSX ---

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Scalper&apos;s Edge
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {isLoading && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            )}
            {lastUpdated && !isLoading && (
              <>
                <Clock className="w-5 h-5" />
                <span>Last Updated: {lastUpdated}</span>
              </>
            )}
          </div>
        </header>

        {/* Grid Utama */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Kolom Kontrol & Sinyal (Kiri) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Kontrol */}
            <ControlCard>
              <div className="grid grid-cols-3 gap-4">
                {/* Pilih Koin */}
                <div>
                  <label htmlFor="coinPair" className="block text-sm font-medium text-gray-400 mb-2">
                    <Coins className="w-4 h-4 inline-block mr-1" />
                    Coin Pair
                  </label>
                  <select
                    id="coinPair"
                    value={coinPair}
                    onChange={(e) => setCoinPair(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ethereum">ETH/USDT</option>
                    <option value="bitcoin">BTC/USDT</option>
                    <option value="solana">SOL/USDT</option>
                    <option value="ripple">XRP/USDT</option>
                    <option value="bnb">BNB/USDT</option>
                    <option value="hyperliquid">HYPE/USDT</option>
                    <option value="aster">ASTER/USDT</option>
                  </select>
                </div>

                {/* Pilih Timeframe */}
                <div>
                  <label htmlFor="timeframe" className='block text-sm font-medium text-gray-400 mb-2'>
                    <Clock className='w-4 h-4 inline-block mr-1'/>
                    Timeframe
                  </label>
                  <select 
                    id="timeframe"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className='w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="1d">1d</option>
                  </select>
                </div>

                {/* Pilih Indikator */}
                <div>
                  <label htmlFor="indicator" className="block text-sm font-medium text-gray-400 mb-2">
                    <Brain className="w-4 h-4 inline-block mr-1" />
                    Indicator
                  </label>
                  <select
                    id="indicator"
                    value={indicator}
                    onChange={(e) => setIndicator(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="rsi">RSI</option>
                    <option value="stochastic">Stochastic</option>
                    <option value="all">Combination (All)</option>
                  </select>
                </div>
              </div>
            </ControlCard>

            {/* Sinyal */}
            {isLoading ? (
              <div className="flex justify-center items-center h-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <SignalCard signal={signal} timeframe={timeframe} />
            )}

            {/* Performa */}
            {isLoading ? (
               <div className="flex justify-center items-center h-48 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
                 <Loader2 className="w-12 h-12 text-gray-600 animate-spin" />
               </div>
            ) : (
              <PerformanceCard performance={performance} />
            )}
          </div>

          {/* Kolom Chart (Kanan) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Chart Harga */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.8)', // bg-gray-800 with opacity
                      borderColor: '#4b5563', // border-gray-600
                      borderRadius: '0.5rem', // rounded-lg
                      backdropFilter: 'blur(4px)',
                    }}
                    labelStyle={{ color: '#d1d5db' }} // text-gray-300
                    itemStyle={{ color: '#c7d2fe' }} // text-indigo-300
                    formatter={formatTooltipPrice}
                    labelFormatter={formatTooltipTime}
                  />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatXAxis} 
                    stroke="#6b7280" // text-gray-500
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    orientation="right" 
                    domain={['auto', 'auto']}
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#818cf8" // indigo-400
                    fill="url(#colorPrice)" 
                    strokeWidth={2} 
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Indikator */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip content={<CustomIndicatorTooltip />} />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={formatXAxis} 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    orientation="right" 
                    domain={[0, 100]}
                    ticks={[10, 20, 30, 50, 70, 80, 90]}
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                  {/* Garis Horizontal */}
                  <Line type="monotone" dataKey={() => 80} stroke="#f87171" strokeWidth={1} strokeDasharray="5 5" dot={false} legendType="none" />
                  <Line type="monotone" dataKey={() => 70} stroke="#facc15" strokeWidth={1} strokeDasharray="5 5" dot={false} legendType="none" />
                  <Line type="monotone" dataKey={() => 30} stroke="#a7f3d0" strokeWidth={1} strokeDasharray="5 5" dot={false} legendType="none" />
                  <Line type="monotone" dataKey={() => 20} stroke="#a7f3d0" strokeWidth={1} strokeDasharray="5 5" dot={false} legendType="none" />

                  {/* Garis Indikator */}
                  {(indicator === 'rsi' || indicator === 'all') && (
                    <Line type="monotone" dataKey="rsi" stroke="#8884d8" strokeWidth={2} dot={false} />
                  )}
                  {(indicator === 'stochastic' || indicator === 'all') && (
                    <>
                      <Line type="monotone" dataKey="stochK" stroke="#facc15" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="stochD" stroke="#f87171" strokeWidth={1.5} dot={false} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
          </div>
        </div>
      </div>
      {/* Watermark */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-700 font-mono opacity-50">
        copyright 2025 by Kgs Raka Renata, helped by gemini
      </div>
    </main>
  );
}

