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

  export default runStrategy;