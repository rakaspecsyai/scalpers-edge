 import React from "react";
 
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

  export default CustomIndicatorTooltip;