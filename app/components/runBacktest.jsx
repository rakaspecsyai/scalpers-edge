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
      return { winRate: 0, plRatio: 0, trades: 0, netPnlPercent: 0, finalBalance: initialBalance };
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

export default runBacktest;