const calculateVWAP = (data, period = 20) => {
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

  export default calculateVWAP;