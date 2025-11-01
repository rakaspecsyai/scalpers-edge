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

  export default calculateRSI;