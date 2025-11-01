import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

export default SignalCard;