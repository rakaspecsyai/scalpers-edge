import React from 'react';
import { BarChart2 } from 'lucide-react';


const PerformanceCard = ({ performance }) => (
  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-200">Backtest Performance (Mock)</h3>
      <BarChart2 className="w-6 h-6 text-indigo-400" />
    </div>
    <div className="grid grid-cols-2 gap-4 text-center">
      <div>
        <p className="text-sm text-gray-400">Win Rate</p>
        <p className="text-2xl font-semibold text-green-500">{performance.winRate}%</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">P/L Ratio</p>
        <p className="text-2xl font-semibold text-gray-200">{performance.plRatio}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Trades</p>
        <p className="text-2xl font-semibold text-gray-200">{performance.trades}</p>
      </div>
      <div>
        <p className="text-sm text-gray-400">Avg. Gain</p>
        <p className="text-2xl font-semibold text-green-500">{performance.avgGain}%</p>
      </div>
    </div>
  </div>
);

export default PerformanceCard;