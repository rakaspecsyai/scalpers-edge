"use client";
// ReferenceArea dan ComposedChart ditambahkan
import { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart, ReferenceArea } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2, Brain, Check, BarChart2, Zap, Clock, Coins, Network, Bell, BellOff } from 'lucide-react';

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

// Kartu untuk Menampilkan Performa (DI-UPGRADE)
const PerformanceCard = ({ performance }) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-200">Backtest Performance</h3>
      <BarChart2 className="w-6 h-6 text-indigo-400" />
    </div>
    <div className="grid grid-cols-2 gap-4 text-center">
      <div>
        <p className="text-sm text-gray-400">Win Rate</p>
        <p className={`text-2xl font-semibold ${performance.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
          {performance.winRate}%
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">P/L Ratio</p>
        <p className={`text-2xl font-semibold ${performance.plRatio >= 1 ? 'text-green-500' : 'text-red-500'}`}>
          {performance.plRatio}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Trades</p>
        <p className="text-2xl font-semibold text-gray-200">{performance.trades}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Net PNL</p>
        <p className={`text-2xl font-semibold ${performance.netPnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {performance.netPnlPercent}%
        </p>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-700">
      <p className="text-sm text-gray-400 text-center">Initial Balance: $100</p>
      <p className="text-lg font-semibold text-gray-200 text-center">
        Final Balance: 
        <span className={`ml-2 ${performance.finalBalance >= 100 ? 'text-green-400' : 'text-red-400'}`}>
          ${performance.finalBalance}
        </span>
      </p>
    </div>
  </div>
);

// --- Halaman Utama ---

export default function Home() {
  const [coinPair, setCoinPair] = useState('ethereum'); // bitcoin, ethereum
  const [indicator, setIndicator] = useState('rsi'); // rsi, stochastic, fvg, all
  const [timeframe, setTimeframe] = useState('5m');
  const [chartData, setChartData] = useState([]);
  const [signal, setSignal] = useState('NEUTRAL');
  const [performance, setPerformance] = useState({ winRate: 0, plRatio: 0, trades: 0, netPnlPercent: 0, finalBalance: 100 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // --- STATE & REF BARU UNTUK AUDIO ---
  const [isMuted, setIsMuted] = useState(true);
  const audioCtxRef = useRef(null); // Menyimpan AudioContext
  // ------------------------------------

  // --- Fungsi Kalkulasi Indikator ---

  // 1. Kalkulasi RSI
  const calculateRSI = (data, period = 3) => {
    // Memastikan data cukup
    if (data.length <= period) return data;

    let gains = 0;
    let losses = 0;

    // Hitung average gain/loss awal
    for (let i = 1; i <= period; i++) {
      // Pastikan data[i] tidak undefined
      if (!data[i] || !data[i-1]) continue;
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change; // losses are positive values
      }
    }
    
    // Periksa apakah data[period] ada
    if (data[period]) {
        data[period].avgGain = gains / period;
        data[period].avgLoss = losses / period;
    } else {
        // Handle kasus jika data tidak cukup panjang
        return data;
    }

    // Hitung RSI untuk sisa data
    for (let i = period + 1; i < data.length; i++) {
      // Pastikan data[i] dan data[i-1] ada
      if (!data[i] || !data[i-1] || data[i-1].avgGain === undefined) continue;
      
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

  // 2. Kalkulasi Stochastic
  const calculateStochastic = (data, kPeriod = 3, dPeriod = 3) => {
    // Memastikan data cukup
    if (data.length < kPeriod) return data;

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
    // Memastikan data cukup untuk %D
    if (data.length < kPeriod + dPeriod - 1) return data;

    for (let i = kPeriod + dPeriod - 2; i < data.length; i++) {
      // Pastikan data[i-j].stochK tidak null/undefined
      let sumK = 0;
      let validKCount = 0;
      for (let j = 0; j < dPeriod; j++) {
        if (data[i - j] && typeof data[i - j].stochK === 'number') {
          sumK += data[i - j].stochK;
          validKCount++;
        }
      }
       if (validKCount > 0) {
         data[i].stochD = sumK / validKCount;
       } else {
         data[i].stochD = null; // atau 50, atau biarkan null
       }
    }
    return data;
  };

  // 3. Kalkulasi Volumatic Fair Value Gaps (FVG)
  const calculateFVG = (data) => {
    // Butuh 3 candle, jadi mulai dari index 2
    for (let i = 2; i < data.length; i++) {
      const prevCandle = data[i - 2]; // Candle 1
      const midCandle = data[i - 1];   // Candle 2 (tempat FVG ditandai)
      const currCandle = data[i];     // Candle 3

      // Cek Price Gap
      const bullishPriceGap = prevCandle.high < currCandle.low;
      const bearishPriceGap = prevCandle.low > currCandle.high;

      // Filter Volumatic "Big Beluga":
      // Volume Candle 2 harus lebih kecil dari Volume Candle 1
      const volumeCondition = midCandle.volume < prevCandle.volume;

      // HANYA UNTUK DEBUG: Kita matikan sementara 'volumeCondition'
      // Ganti 'true' kembali ke 'volumeCondition' jika ingin mengaktifkan filter Big Beluga
      const filterActive = volumeCondition; 

      // Hanya tandai jika KEDUA kondisi (Price Gap & Volume) terpenuhi
      if (bullishPriceGap && filterActive) { // diganti dari volumeCondition
        midCandle.fvgBull = { top: currCandle.low, bottom: prevCandle.high };
      }

      if (bearishPriceGap && filterActive) { // diganti dari volumeCondition
        midCandle.fvgBear = { top: prevCandle.low, bottom: currCandle.high };
      }
    }
    return data;
  };

  // 4. Kalkulasi Moving VWAP (MVWAP)
  const calculateVWAP = (data, period = 12) => {
    // Memastikan data cukup
    if (data.length < period) return data;

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      
      let totalPV = 0; // (Typical Price * Volume)
      let totalVolume = 0;

      for (const candle of slice) {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        totalPV += typicalPrice * candle.volume;
        totalVolume += candle.volume;
      }

      if (totalVolume === 0) {
        data[i].vwap = data[i-1]?.vwap || data[i].close; // Fallback
      } else {
        data[i].vwap = totalPV / totalVolume;
      }
    }
    return data;
  };

  // 5. FUNGSI BARU: Kalkulasi On-Balance Volume (OBV)
  const calculateOBV = (data) => {
    if (data.length === 0) return data;

    data[0].obv = 0; // Mulai OBV dari 0

    for (let i = 1; i < data.length; i++) {
      const prev = data[i-1];
      const curr = data[i];

      if (curr.close > prev.close) {
        curr.obv = (prev.obv || 0) + curr.volume; // Tambah volume
      } else if (curr.close < prev.close) {
        curr.obv = (prev.obv || 0) - curr.volume; // Kurangi volume
      } else {
        curr.obv = (prev.obv || 0); // Tetap
      }
    }
    return data;
  };


  // --- MESIN BACKTEST BARU ---
  const runBacktest = (data, initialBalance = 100) => {
    console.log("Running backtest...");
    let balance = initialBalance;
    let position = 'NONE'; // 'NONE', 'LONG', 'SHORT'
    let entryPrice = 0;
    const trades = []; // Menyimpan semua trade yang selesai

    for (let i = 1; i < data.length; i++) { // Mulai dari 1 untuk punya data 'kemarin'
      const candle = data[i];
      const signal = candle.signal; // Sinyal sudah di-generate di `runStrategy`

      // Logika Sederhana: Open di 'signal', Close di 'sinyal berlawanan'
      // 1. Logic untuk MASUK posisi
      if (position === 'NONE') {
        if (signal === 'LONG') {
          position = 'LONG';
          entryPrice = candle.close;
        } else if (signal === 'SHORT') {
          position = 'SHORT';
          entryPrice = candle.close;
        }
      }
      // 2. Logic untuk KELUAR posisi
      else if (position === 'LONG' && signal === 'SHORT') {
        // Tutup LONG, buka SHORT
        const exitPrice = candle.close;
        const pnlPercent = (exitPrice - entryPrice) / entryPrice;
        const pnlValue = balance * pnlPercent;
        balance += pnlValue;
        trades.push({ direction: 'LONG', pnl: pnlValue, pnlPercent: pnlPercent * 100 });
        
        // Langsung buka posisi SHORT (reversal)
        position = 'SHORT';
        entryPrice = candle.close;

      } else if (position === 'SHORT' && signal === 'LONG') {
        // Tutup SHORT, buka LONG
        const exitPrice = candle.close;
        const pnlPercent = (entryPrice - exitPrice) / entryPrice; // PNL short dibalik
        const pnlValue = balance * pnlPercent;
        balance += pnlValue;
        trades.push({ direction: 'SHORT', pnl: pnlValue, pnlPercent: pnlPercent * 100 });
        
        // Langsung buka posisi LONG (reversal)
        position = 'LONG';
        entryPrice = candle.close;
      }
    } // Akhir dari loop

    // Hitung metrik performa
    const totalTrades = trades.length;
    if (totalTrades === 0) {
      return { winRate: 0, plRatio: 0, trades: 0, netPnlPercent: 0, finalBalance: balance.toFixed(2) };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const winRate = (winningTrades.length / totalTrades) * 100;

    const totalGain = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgGain = totalGain / winningTrades.length || 0;

    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalLoss = losingTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgLoss = totalLoss / losingTrades.length || 0;

    const plRatio = (avgGain / Math.abs(avgLoss)) || 0; // Handle avgLoss = 0
    
    const netPnlPercent = ((balance - initialBalance) / initialBalance) * 100;

    console.log("Backtest complete:", { balance, totalTrades, winRate, plRatio });

    return {
      winRate: winRate.toFixed(1),
      plRatio: plRatio.toFixed(2),
      trades: totalTrades,
      netPnlPercent: netPnlPercent.toFixed(2),
      finalBalance: balance.toFixed(2)
    };
  };

  // --- FUNGSI AUDIO ---
  const playBeep = (type = 'long') => {
    // Hanya mainkan jika AudioContext sudah diinisialisasi oleh user
    if (!audioCtxRef.current) return;

    try {
      //durasi dan gap setting
      const beepDuration = 0.2; // durasi tiap beep dalam detik
      const gapDuration = 0.2; // jeda antar beep dalam detik
      const numberOfBeeps = 3; // jumlah beep

      const frequency = type === 'long' ? 432 : type === 'short' ? 528: 333; // Frekuensi dasar

      //memainkan beep sesuai jumlah
      for (let i = 0; i < numberOfBeeps; i++) {
        // const startTime = audioCtxRef.current.currentTime + i * (beepDuration + gapDuration);

        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);

        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime); // volume

        // Menghitung waktu mulai untuk setiap beep
        const startTime = audioCtxRef.current.currentTime + i * (beepDuration + gapDuration);
        const endTime = startTime + beepDuration;

        oscillator.start(startTime);
        oscillator.stop(startTime + beepDuration);
      }
    } catch (e) {
      console.error("Error playing beep:", e);
    }
  };
  // -------------------------

  // --- Fungsi Utama (DI-REFACTOR) ---

  const runStrategy = async (
    currentCoin = coinPair,
    currentIndicator = indicator,
    currentTimeframe = timeframe
  ) => {
    setIsLoading(true);
    console.log(`Running strategy for ${currentCoin} (${currentTimeframe}) using ${currentIndicator}...`);

    const coinMap = {
      bitcoin: "BTCUSDT",
      ethereum: "ETHUSDT",
      solana: "SOLUSDT",
      hyperliquid: "HYPEUSDT",
      aster: "ASTERUSDT",
      ripple: "XRPUSDT",
      doge: "DOGEUSDT",
      bnb: "BNBUSDT"
    };
    const symbol = coinMap[currentCoin];
    if (!symbol) {
      console.error("Invalid coin pair selected");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Data
      const response = await fetch(`https://fapi.asterdex.com/fapi/v1/klines?symbol=${symbol}&interval=${currentTimeframe}&limit=300`);
      if (!response.ok) throw new Error("Failed to fetch market data from Asterdex");

      const klines = await response.json();

      // 2. Format Data
      let formattedData = klines.map(d => ({
        time: parseInt(d[0]),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
        price: parseFloat(d[4]),
        // Inisialisasi properti
        rsi: null, stochK: null, stochD: null, fvgBull: null, fvgBear: null, vwap: null, obv: 0, signal: 'NEUTRAL'
      }));

      // 3. Kalkulasi SEMUA Indikator (kita hitung semua di awal)
      formattedData = calculateRSI(formattedData);
      formattedData = calculateStochastic(formattedData);
      formattedData = calculateFVG(formattedData);
      formattedData = calculateVWAP(formattedData);
      formattedData = calculateOBV(formattedData); // BARU: kalkulasi OBV

      // 4. (BARU) Generate Sinyal per Candle
      // Loop ini menentukan sinyal 'signal' di tiap candle, berdasarkan pilihan user
      for (let i = 1; i < formattedData.length; i++) {
        const candle = formattedData[i];
        const prevCandle = formattedData[i-1];

        // Dapatkan sinyal individual
        let rsiSignal = 'NEUTRAL', stochSignal = 'NEUTRAL', fvgSignal = 'NEUTRAL', vwapSignal = 'NEUTRAL', obvSignal = 'NEUTRAL'; // BARU: obvSignal

        if (candle.rsi < 10) rsiSignal = 'LONG';
        else if (candle.rsi > 90) rsiSignal = 'SHORT';

        if (candle.stochK < 20 && candle.stochD < 20) stochSignal = 'LONG';
        else if (candle.stochK > 80 && candle.stochD > 80) stochSignal = 'SHORT';

        // Sinyal FVG didasarkan pada candle SEBELUMNYA (recentData di logika lama)
        if (prevCandle.fvgBull) fvgSignal = 'LONG';
        else if (prevCandle.fvgBear) fvgSignal = 'SHORT';
        
        //Sinyal VWAP yang dikonfirmasi dengan OBV
        if (candle.close < candle.vwap && candle.obv > (prevCandle.obv || 0)) vwapSignal = 'LONG';
        else if (candle.close > candle.vwap && candle.obv < (prevCandle.obv || 0)) vwapSignal = 'SHORT';

        // BARU: Sinyal OBV (Momentum Konfirmasi)
        if (candle.obv > (prevCandle.obv || 0)) obvSignal = 'LONG';
        else if (candle.obv < (prevCandle.obv || 0)) obvSignal = 'SHORT';

        // Terapkan sinyal ke candle berdasarkan pilihan 'indicator'
        switch (currentIndicator) {
          case 'rsi':
            candle.signal = rsiSignal;
            break;
          case 'stochastic':
            candle.signal = stochSignal;
            break;
          case 'fvg':
            candle.signal = fvgSignal;
            break;
          case 'vwap':
            candle.signal = vwapSignal;
            break;
          case 'obv':
            candle.signal = obvSignal;
            break;
          case 'all': // BARU: Di-upgrade jadi 5 indikator
            if (rsiSignal === 'LONG' && stochSignal === 'LONG' && fvgSignal === 'LONG' && vwapSignal === 'LONG' && obvSignal === 'LONG') {
              candle.signal = 'LONG';
            } else if (rsiSignal === 'SHORT' && stochSignal === 'SHORT' && fvgSignal === 'SHORT' && vwapSignal === 'SHORT' && obvSignal === 'SHORT') {
              candle.signal = 'SHORT';
            } else {
              candle.signal = 'NEUTRAL';
            }
            break;
          default:
            candle.signal = 'NEUTRAL';
        }
      }

      // 5. (BARU) Jalankan Backtest dengan data yang sudah disinyalir
      const backtestResults = runBacktest(formattedData, 100);
      setPerformance(backtestResults); // Set performa dengan data BUKAN MOCKUP

      // 6. Set Sinyal TERAKHIR untuk UI
      const latestSignal = formattedData[formattedData.length - 1].signal || 'NEUTRAL'; 
      
      // --- LOGIKA MAIN SUARA ---
      if (!isMuted && latestSignal && latestSignal !== signal) {
        if (latestSignal === 'LONG') {
          playBeep('long');
        } else if (latestSignal === 'SHORT') {
          playBeep('short');
        }
        else {
          playBeep('neutral');
        }
      }
      // -------------------------

      setSignal(latestSignal); // Set sinyal UI
      setChartData(formattedData); // Set data chart
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error("Strategy execution failed:", error);
      // Jika error, set ke default
      setSignal('NEUTRAL');
      setPerformance({ winRate: 0, plRatio: 0, trades: 0, netPnlPercent: 0, finalBalance: 100 });
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UseEffect Hooks ---

  // Hook untuk menjalankan strategi
  useEffect(() => {
    // Pastikan
    if (typeof window !== "undefined") {
      runStrategy(coinPair, indicator, timeframe);

      const intervalId = setInterval(() => {
        console.log("Auto-refreshing data...");
        runStrategy(coinPair, indicator, timeframe);
      }, 1 * 60 * 1000); // 1 menit

      return () => clearInterval(intervalId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinPair, indicator, timeframe]);

  // --- HANDLER TOMBOL MUTE BARU ---
  const toggleMute = () => {
    // Inisialisasi AudioContext saat user klik pertama kali
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsMuted(!isMuted);
  };
  // -------------------------------

  // --- Helper untuk Format Chart ---
  const formatXAxis = (tickItem) => {
    return new Date(tickItem).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  
  // BARU: Tooltip kustom untuk Chart Harga (nampilin VWAP)
  const CustomPriceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Ambil data lengkap dari payload
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg text-sm">
          <p className="text-gray-300 font-semibold mb-1">{formatTooltipTime(label)}</p>
          
          {/* Harga (dari Area) */}
          <p style={{ color: '#c7d2fe' }}>{`Price: $${data.price.toFixed(2)}`}</p>
          
          {/* VWAP (dari Line) */}
          {data.vwap && (
            <p style={{ color: '#ff7300' }}>{`VWAP: $${data.vwap.toFixed(2)}`}</p>
          )}
          
          <p className="text-xs text-gray-500 mt-1">{`O: ${data.open} H: ${data.high} L: ${data.low} C: ${data.close}`}</p>
          <p className="text-xs text-gray-500">{`Vol: ${data.volume.toFixed(0)}`}</p>
        </div>
      );
    }
    return null;
  };
  
  const formatTooltipTime = (label) => new Date(label).toLocaleString();

  // Custom Tooltip untuk Chart Indikator (DI-UPGRADE)
  const CustomIndicatorTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Temukan data point berdasarkan timestamp (label)
      const point = chartData.find(d => d.time === label);

      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg text-sm">
          <p className="text-gray-300 font-semibold mb-1">{formatTooltipTime(label)}</p>
          {point?.rsi && (
            <p style={{ color: '#8884d8' }}>{`RSI: ${point.rsi.toFixed(2)}`}</p>
          )}
          {point?.stochK && (
             <p style={{ color: '#facc15' }}>{`%K: ${point.stochK.toFixed(2)}`}</p>
          )}
           {point?.stochD && (
             <p style={{ color: '#f87171' }}>{`%D: ${point.stochD.toFixed(2)}`}</p>
          )}
           {/* BARU: Tampilkan OBV */}
           {point?.obv !== undefined && (
             <p style={{ color: '#38bdf8' }}>{`OBV: ${point.obv.toLocaleString()}`}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // --- RENDER FVG AREAS (BARU) ---
  const fvgAreas = useMemo(() => {
    return chartData
      .map((d, i) => {
        // d adalah midCandle. Kita butuh waktu mulai candle BERIKUTNYA untuk 'x2'
        const nextTime = chartData[i + 1]?.time;
        if (!nextTime) return null; // Jangan gambar di candle terakhir

        // Gambar Bullish FVG (hijau transparan)
        if (d.fvgBull) {
          return (
            <ReferenceArea
              key={`fvgB_${d.time}`}
              x1={d.time}
              x2={nextTime}
              y1={d.fvgBull.bottom}
              y2={d.fvgBull.top}
              stroke="none"
              fill="rgba(0, 255, 0, 0.2)"
            />
          );
        }
        // Gambar Bearish FVG (merah transparan)
        if (d.fvgBear) {
          return (
            <ReferenceArea
              key={`fvgS_${d.time}`}
              x1={d.time}
              x2={nextTime}
              y1={d.fvgBear.bottom}
              y2={d.fvgBear.top}
              stroke="none"
              fill="rgba(255, 0, 0, 0.2)"
            />
          );
        }
        return null;
      })
      .filter(Boolean); // Hapus semua null
  }, [chartData]); // Kalkulasi ulang hanya jika chartData berubah

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

            {/* Tombol Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-white"
              title={isMuted ? "Unmute Alerts" : "Mute Alerts"}
            >
              {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5 text-indigo-400" />}
            </button>
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
                    Coin
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
                    <option value="doge">DOGE/USDT</option>
                    <option value="aster">ASTER/USDT</option>
                    <option value="hyperliquid">HYPE/USDT</option>
                  </select>
                </div>
                
                {/* Pilih Timeframe */}
                <div>
                  <label htmlFor="timeframe" className="block text-sm font-medium text-gray-400 mb-2">
                    <Clock className="w-4 h-4 inline-block mr-1" />
                    Timeframe
                  </label>
                  <select
                    id="timeframe"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
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
                    <option value="fvg">FVG</option>
                    <option value="vwap">VWAP (OBV Confirmation)</option>
                    <option value="obv">OBV</option>
                    {/* <option value="vwap_obv">VWAP + OBV</option> */} {/* Kita gabung ke 'all' */}
                    <option value="all">Combination (All 5)</option>
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

            {/* Performa (SEKARANG DATA ASLI) */}
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
                {/* BARU: Diubah jadi ComposedChart biar bisa nampung Area + Line (VWAP) */}
                <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  
                  {/* BARU: Tooltip kustom untuk nampilin VWAP */}
                  <Tooltip content={<CustomPriceTooltip />} />

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
                  
                  {/* FVG AREAS (tetap ada) */}
                  {fvgAreas}

                  {/* Garis Harga (tetap ada) */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#818cf8" // indigo-400
                    fill="url(#colorPrice)" 
                    strokeWidth={2} 
                    dot={false}
                    name="Price"
                  />

                  {/* BARU: Garis VWAP */}
                  <Line 
                    type="monotone" 
                    dataKey="vwap" 
                    stroke="#ff7300" // Oranye
                    strokeWidth={2} 
                    dot={false} 
                    name="VWAP (20)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Indikator (DI-UPGRADE DENGAN DUAL AXIS) */}
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
                  {/* BARU: Y-Axis KIRI untuk RSI/Stoch */}
                  <YAxis 
                    yAxisId="left"
                    orientation="right" 
                    domain={[0, 100]}
                    ticks={[10, 20, 30, 50, 70, 80, 90]}
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* BARU: Y-Axis KANAN untuk OBV */}
                  {(indicator === 'all' || indicator === 'obv') && (
                    <YAxis 
                      yAxisId="right"
                      orientation="left" // Taruh di kiri biar nggak tabrakan
                      domain={['auto', 'auto']}
                      stroke="#38bdf8" // Warna biru OBV
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} // Format jadi ribuan (K)
                    />
                  )}
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />

                  {/* Garis Horizontal (hanya untuk axis kiri) */}
                  <ReferenceArea yAxisId="left" y1={80} y2={100} fill="rgba(248, 113, 113, 0.1)" stroke="none" />
                  <ReferenceArea yAxisId="left" y1={0} y2={20} fill="rgba(167, 243, 208, 0.1)" stroke="none" />

                  {/* Garis Indikator */}
                  {(indicator === 'rsi' || indicator === 'all') && (
                    <Line yAxisId="left" type="monotone" dataKey="rsi" stroke="#8884d8" strokeWidth={2} dot={false} name="RSI" />
                  )}
                  {(indicator === 'stochastic' || indicator === 'all') && (
                    <>
                      <Line yAxisId="left" type="monotone" dataKey="stochK" stroke="#facc15" strokeWidth={2} dot={false} name="%K" />
                      <Line yAxisId="left" type="monotone" dataKey="stochD" stroke="#f87171" strokeWidth={1.5} dot={false} name="%D" />
                    </>
                  )}
                  {/* BARU: Garis OBV (hanya muncul saat 'all') */}
                  {(indicator === 'all' || indicator === 'obv') && (
                    <Line yAxisId="right" type="monotone" dataKey="obv" stroke="#38bdf8" strokeWidth={2} dot={false} name="OBV" />
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

