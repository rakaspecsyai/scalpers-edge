import React from 'react';
import { BarChart2 } from 'lucide-react';


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

export default PerformanceCard;