'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Activity, BarChart2, ChevronDown, Cpu, Zap, TrendingUp, TrendingDown, Minus, Clock
} from 'lucide-react';

// --- Komponen Helper untuk UI ---

const SelectDropdown = ({ label, value, onChange, options, icon: Icon, disabled = false }) => (
  <div className="mb-4">
    <label className="flex items-center text-sm font-medium text-cyan-300 mb-1">
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-white appearance-none focus:outline-none focus:border-cyan-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
    </div>
  </div>
);

const PerformancePanel = ({ performance }) => (
  <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4">
    <h3 className="text-lg font-semibold text-white mb-3">Backtest Performance (Mocked)</h3>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <div className="text-gray-400">Win Rate</div>
        <div className={`text-xl font-bold ${performance.winRate > 50 ? 'text-green-400' : 'text-red-400'}`}>
          {performance.winRate.toFixed(2)}%
        </div>
      </div>
      <div>
        <div className="text-gray-400">Total Trades</div>
        <div className="text-xl font-bold text-white">{performance.trades}</div>
      </div>
      <div>
        <div className="text-gray-400">Profit/Loss</div>
        <div className={`text-xl font-bold ${performance.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {performance.pnl.toFixed(2)}%
        </div>
      </div>
      <div>
        <div className="text-gray-400">Sharpe Ratio</div>
        <div className="text-xl font-bold text-white">{performance.sharpe.toFixed(2)}</div>
      </div>
    </div>
  </div>
);

const SignalPanel = ({ signal }) => {
  const getSignalUI = () => {
    switch (signal.side) {
      case 'LONG':
        return {
          Icon: TrendingUp,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50'
        };
      case 'SHORT':
        return {
          Icon: TrendingDown,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/50'
        };
      default:
        return {
          Icon: Minus,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50'
        };
    }
  };

  const { Icon, color, bgColor, borderColor } = getSignalUI();

  return (
    <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-center">
        <Icon className={`w-8 h-8 mr-3 ${color}`} />
        <div>
          <div className={`text-2xl font-bold ${color}`}>{signal.side}</div>
          <p className="text-gray-300 text-sm">{signal.message}</p>
        </div>
      </div>
    </div>
  );
};


// --- Logika Indikator (Basis: CoinGecko 'price' data) ---

const calculateRSI = (data, period = 14) => {
  let rsiData = [...data];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < rsiData.length; i++) {
    const change = rsiData[i].price - rsiData[i - 1].price;
    rsiData[i].change = change;
    
    if (i <= period) {
      if (change > 0) gains += change;
      else losses -= change;
    }
  }
  
  if (rsiData.length <= period) return rsiData;

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (rsiData[period]) {
    rsiData[period].avgGain = avgGain;
    rsiData[period].avgLoss = avgLoss;
  }

  for (let i = period + 1; i < rsiData.length; i++) {
    const change = rsiData[i].change;
    let gain = change > 0 ? change : 0;
    let loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiData[i] = { ...rsiData[i], rsi, avgGain, avgLoss };
  }
  return rsiData;
};

const calculateStochastic = (data, period = 14, kSlowing = 3) => {
  let stochasticData = [...data];
  for (let i = period - 1; i < stochasticData.length; i++) {
    const periodSlice = stochasticData.slice(i - period + 1, i + 1);
    // Karena kita cuma punya 'price', kita anggap 'price' = 'low', 'high', dan 'close'
    const lowestLow = Math.min(...periodSlice.map(d => d.price));
    const highestHigh = Math.max(...periodSlice.map(d => d.price));
    const currentPrice = stochasticData[i].price;

    if (highestHigh - lowestLow === 0) {
      stochasticData[i].k = 50; 
    } else {
      const k = ((currentPrice - lowestLow) / (highestHigh - lowestLow)) * 100;
      stochasticData[i].k = k;
    }
  }

  // Calculate %D (Moving Average of %K)
  for (let i = period - 1 + kSlowing - 1; i < stochasticData.length; i++) {
    const kSlice = stochasticData.slice(i - kSlowing + 1, i + 1);
    const d = kSlice.reduce((sum, d) => sum + (d.k || 0), 0) / kSlowing;
    stochasticData[i].d = d;
  }
  return stochasticData;
};


// --- Komponen Utama Aplikasi ---

export default function Home() {
  const [coinPair, setCoinPair] = useState('ethereum'); // ID CoinGecko
  const [indicator, setIndicator] = useState('rsi');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState({ side: 'NEUTRAL', message: 'Select an indicator to run analysis.' });
  const [performance, setPerformance] = useState({ winRate: 0, trades: 0, pnl: 0, sharpe: 0 });
  const [lastUpdated, setLastUpdated] = useState(null);

  const coinOptions = [
    { value: 'ethereum', label: 'ETH/USD' },
    { value: 'bitcoin', label: 'BTC/USD' },
    { value: 'solana', label: 'SOL/USD' },
    { value: 'dogecoin', label: 'DOGE/USD' },
  ];
  
  // OPSI INDIKATOR BARU (FVG HILANG)
  const indicatorOptions = [
    { value: 'rsi', label: 'RSI (Relative Strength Index)' },
    { value: 'stochastic', label: 'Stochastic Oscillator' },
    { value: 'all', label: 'All Indicators (RSI + Stoch)' },
  ];

  // Fungsi untuk Fetch Data dan Menjalankan Analisis
  const runStrategy = async (currentCoin = coinPair, currentIndicator = indicator) => {
    setLoading(true);
    setSignal({ side: 'NEUTRAL', message: 'Fetching new market data and analyzing...' });

    try {
      // 1. Fetch Data
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${currentCoin}/market_chart?vs_currency=usd&days=1`);
      if (!response.ok) throw new Error("Gagal fetch data. Coba lagi nanti.");

      const data = await response.json();
      
      // API ini memberikan data 1-menit untuk 1 hari, kita anggap ini data 5m untuk demo
      // Kita ambil 500 data poin terakhir
      let parsedData = data.prices.slice(-500).map(item => ({
        timestamp: item[0],
        price: item[1],
        time: new Date(item[0]).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      }));

      // 2. Hitung Indikator
      let dataWithRSI = calculateRSI(parsedData, 14);
      let finalData = calculateStochastic(dataWithRSI, 14, 3);
      
      setChartData(finalData);

      // 3. Generate Sinyal
      const lastData = finalData[finalData.length - 1];
      if (!lastData) throw new Error("No data to analyze");

      let longSignal = false;
      let shortSignal = false;
      let message = 'Hold. No clear signal based on strategy.';

      switch (currentIndicator) {
        case 'rsi':
          if (lastData.rsi < 30) { longSignal = true; message = 'RSI Oversold (< 30). Potential LONG.'; }
          if (lastData.rsi > 70) { shortSignal = true; message = 'RSI Overbought (> 70). Potential SHORT.'; }
          break;
        case 'stochastic':
          if (lastData.k < 20 && lastData.d < 20) { longSignal = true; message = 'Stochastic Oversold (< 20). Potential LONG.'; }
          if (lastData.k > 80 && lastData.d > 80) { shortSignal = true; message = 'Stochastic Overbought (> 80). Potential SHORT.'; }
          break;
        case 'all': // Kombinasi RSI + Stoch
          if (lastData.rsi < 30 && lastData.k < 20) {
            longSignal = true; message = 'RSI & Stoch Confirmed Oversold. Strong LONG.';
          } else if (lastData.rsi > 70 && lastData.k > 80) {
            shortSignal = true; message = 'RSI & Stoch Confirmed Overbought. Strong SHORT.';
          } else if (lastData.rsi < 35 || lastData.k < 25) {
            longSignal = true; message = 'RSI or Stoch shows Oversold. Potential LONG.';
          } else if (lastData.rsi > 65 || lastData.k > 75) {
            shortSignal = true; message = 'RSI or Stoch shows Overbought. Potential SHORT.';
          }
          break;
      }

      if (longSignal) setSignal({ side: 'LONG', message });
      else if (shortSignal) setSignal({ side: 'SHORT', message });
      else setSignal({ side: 'NEUTRAL', message });

      // 4. MOCK Backtest
      setPerformance({
        winRate: 45 + (Math.random() * 20),
        trades: 100 + Math.floor(Math.random() * 50),
        pnl: -5 + (Math.random() * 25),
        sharpe: 0.5 + (Math.random() * 1.0)
      });
      
      setLastUpdated(new Date());

    } catch (error) {
      console.error("Strategy run failed:", error);
      setSignal({ side: 'NEUTRAL', message: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // useEffect untuk auto-refresh
  useEffect(() => {
    // Jalankan pertama kali
    runStrategy(coinPair, indicator);

    // Set timer untuk refresh setiap 3 menit (180000 ms)
    const intervalId = setInterval(() => {
      runStrategy(coinPair, indicator);
    }, 180000); 

    // Bersihkan timer saat komponen ganti
    return () => clearInterval(intervalId);
  }, [coinPair, indicator]); // Dependensi: Akan reset timer jika coin atau indikator ganti
  
  // Custom Tooltip untuk Chart (DI-UPDATE)
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-600 p-3 rounded-md text-sm">
          <p className="text-gray-300">{`Time: ${label}`}</p>
          <p className="text-cyan-400">{`Price: $${data.price.toFixed(2)}`}</p>
          {data.rsi && <p className="text-purple-400">{`RSI: ${data.rsi.toFixed(2)}`}</p>}
          {data.k && <p className="text-yellow-400">{`Stoch %K: ${data.k.toFixed(2)}`}</p>}
          {data.d && <p className="text-orange-400">{`Stoch %D: ${data.d.toFixed(2)}`}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex p-4" 
         style={{
           backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 190, 255, 0.1) 1px, transparent 0)',
           backgroundSize: '20px 20px'
         }}>
      
      {/* --- Sidebar --- */}
      <aside className="w-1/4 max-w-sm p-5 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-xl flex flex-col">
        <div className="flex items-center mb-6">
          <Zap className="w-8 h-8 text-cyan-400 mr-3" />
          <h1 className="text-2xl font-bold text-white">Scalper&apos;s Edge</h1>
        </div>
        
        {/* Controls */}
        <div className="flex-grow">
          <SelectDropdown
            label="Coin Pair"
            icon={Activity}
            value={coinPair}
            onChange={(val) => setCoinPair(val)}
            options={coinOptions}
          />
          
          <SelectDropdown
            label="Indicator Strategy"
            icon={BarChart2}
            value={indicator}
            onChange={(val) => setIndicator(val)}
            options={indicatorOptions}
          />
          
          <div className="mb-4">
            <label className="flex items-center text-sm font-medium text-cyan-300 mb-1">
              <Cpu className="w-4 h-4 mr-2" />
              Timeframe (Source)
            </label>
            <div className="w-full bg-gray-900/50 border border-gray-700 rounded-md px-3 py-2 text-white opacity-50">
              1-day data (from CoinGecko)
            </div>
          </div>
          
          {/* Status Update */}
          <div className="text-center mt-4">
            {loading ? (
               <div className="text-cyan-400 text-sm flex items-center justify-center">
                 <Cpu className="w-4 h-4 mr-2 animate-spin" />
                 <span>Analyzing...</span>
               </div>
            ) : (
              lastUpdated && (
                <div className="text-gray-400 text-xs flex items-center justify-center">
                  <Clock className="w-3 h-3 mr-1.5" />
                  Last Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )
            )}
          </div>
        </div>
        
        {/* Performance Panel */}
        <div className="mt-6">
          <PerformancePanel performance={performance} />
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 pl-6 flex flex-col">
        {/* Signal Panel */}
        <div className="mb-5">
          <SignalPanel signal={signal} />
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-5">
          <h2 className="text-xl font-semibold text-white mb-4 capitalize">{coinPair} - Price Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
              <XAxis dataKey="time" stroke="#718096" fontSize={12} />
              <YAxis domain={['auto', 'auto']} stroke="#718096" fontSize={12} orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#00BFFF" strokeWidth={2} dot={false} name="Price" />
            </LineChart>
          </ResponsiveContainer>

          <h2 className="text-xl font-semibold text-white mb-4 mt-6">Indicator Chart</h2>
          <ResponsiveContainer width="100%" height={200}>
            {/* CHART INDIKATOR BARU UNTUK NAMPILIN SEMUA */}
            <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="time" stroke="#718096" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#718096" fontSize={12} orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                
                {/* RSI */}
                <Line
                  type="monotone"
                  dataKey={indicator === 'all' || indicator === 'rsi' ? 'rsi' : null} // Hanya tampil jika dipilih
                  stroke="#9F7AEA" strokeWidth={2} dot={false} name="RSI"
                  connectNulls // Biar garis nggak putus
                />
                
                {/* STOCHASTIC */}
                <Line
                  type="monotone"
                  dataKey={indicator === 'all' || indicator === 'stochastic' ? 'k' : null} // Hanya tampil jika dipilih
                  stroke="#F6E05E" strokeWidth={2} dot={false} name="%K"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey={indicator === 'all' || indicator === 'stochastic' ? 'd' : null} // Hanya tampil jika dipilih
                  stroke="#F56565" strokeWidth={2} dot={false} name="%D"
                  connectNulls
                />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </main>
      
       {/* --- Watermark --- */}
      <div className="absolute bottom-4 right-8 text-xs text-gray-700/50 pointer-events-none">
        copyright 2025 by Kgs Raka Renata, helped by gemini
      </div>

    </div>
  );
}

