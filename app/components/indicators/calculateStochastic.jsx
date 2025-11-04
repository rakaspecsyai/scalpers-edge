 const calculateStochastic = (data, kPeriod = 3, dPeriod = 3) => {
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

  export default calculateStochastic;