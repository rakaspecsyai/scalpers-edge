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
      const filterActive = volumeCondition; // diganti dari 'true' ke 'volumeCondition'

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

  export default calculateFVG;