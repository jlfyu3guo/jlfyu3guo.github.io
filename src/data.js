export const marketIndexes = [
  { symbol: '000001', name: '上证指数', value: 3394.52, change: 0.46, group: 'cn', market: 'SH', currency: 'CNY' },
  { symbol: '399001', name: '深证成指', value: 10876.13, change: 0.82, group: 'cn', market: 'SZ', currency: 'CNY' },
  { symbol: '399006', name: '创业板指', value: 2187.64, change: 1.12, group: 'cn', market: 'SZ', currency: 'CNY' },
  { symbol: 'HSI', name: '恒生指数', value: 24725.62, change: -0.31, group: 'hk', market: 'HK', currency: 'HKD' },
  { symbol: 'NI225', name: '日经225', value: 0, change: 0, group: 'asia', market: 'JP', currency: 'JPY' },
  { symbol: 'KOSPI', name: '韩国KOSPI', value: 0, change: 0, group: 'asia', market: 'KR', currency: 'KRW' }
];

const histories = {
  '600519': [1418,1424,1411,1432,1440,1436,1452,1461,1457,1470,1464,1478,1485,1479,1488,1496,1492,1505,1514,1508,1521,1517,1528,1536,1532,1543,1538,1549,1556,1548,1559],
  '300750': [188,191,189,194,198,196,201,204,202,207,211,208,214,218,215,219,223,221,226,229,225,231,234,232,237,240,238,244,247,245,251],
  '601318': [48.6,49.1,48.9,49.5,50.1,49.8,50.4,50.9,50.6,51.2,51.7,51.4,52,52.4,52.1,52.8,53.2,52.9,53.5,54,53.7,54.3,54.7,54.4,55,55.3,55.1,55.6,55.9,55.5,56.1],
  '000858': [121,123,122,125,127,126,129,131,130,133,132,135,137,136,139,141,140,143,145,144,147,146,149,151,150,153,152,155,157,156,159],
  '0700': [420,424,419,428,431,426,434,438,435,442,447,443,451,456,452,459,463,460,468,472,469,476,481,478,486,490,487,494,498,495,502],
  'AAPL': [208,210,209,212,214,211,215,218,216,220,223,221,225,228,226,230,232,231,235,237,234,239,241,240,244,246,243,248,250,247,252]
};

export const stocks = [
  { symbol: '600519', market: 'SH', name: '贵州茅台', sector: '消费', price: 1559.32, change: 1.08, group: 'cn', currency: 'CNY', portfolioEligible: true, history: histories['600519'] },
  { symbol: '300750', market: 'SZ', name: '宁德时代', sector: '新能源', price: 251.08, change: 2.36, group: 'cn', currency: 'CNY', portfolioEligible: true, history: histories['300750'] },
  { symbol: '601318', market: 'SH', name: '中国平安', sector: '金融', price: 56.12, change: 0.74, group: 'cn', currency: 'CNY', portfolioEligible: true, history: histories['601318'] },
  { symbol: '000858', market: 'SZ', name: '五粮液', sector: '消费', price: 159.06, change: -0.63, group: 'cn', currency: 'CNY', portfolioEligible: true, history: histories['000858'] },
  { symbol: '0700', market: 'HK', name: '腾讯控股', sector: '科技', price: 502.00, change: -1.18, group: 'hk', currency: 'HKD', portfolioEligible: false, history: histories['0700'] },
  { symbol: 'AAPL', market: 'US', name: 'Apple', sector: '科技', price: 252.04, change: 0.92, group: 'us', currency: 'USD', portfolioEligible: false, history: histories.AAPL },
  { symbol: 'MSFT', market: 'US', name: 'Microsoft', sector: '科技', price: 0, change: 0, group: 'us', currency: 'USD', portfolioEligible: false },
  { symbol: 'NVDA', market: 'US', name: 'NVIDIA', sector: '半导体', price: 0, change: 0, group: 'us', currency: 'USD', portfolioEligible: false },
  { symbol: 'TSLA', market: 'US', name: 'Tesla', sector: '汽车', price: 0, change: 0, group: 'us', currency: 'USD', portfolioEligible: false },
  { symbol: 'GOOGL', market: 'US', name: 'Alphabet', sector: '科技', price: 0, change: 0, group: 'us', currency: 'USD', portfolioEligible: false },
  { symbol: 'AMZN', market: 'US', name: 'Amazon', sector: '消费', price: 0, change: 0, group: 'us', currency: 'USD', portfolioEligible: false },
  { symbol: 'BTC', market: 'CRYPTO', name: 'Bitcoin', sector: '数字资产', price: 0, change: 0, group: 'crypto', currency: 'USD', portfolioEligible: false },
  { symbol: 'ETH', market: 'CRYPTO', name: 'Ethereum', sector: '数字资产', price: 0, change: 0, group: 'crypto', currency: 'USD', portfolioEligible: false },
  { symbol: 'SOL', market: 'CRYPTO', name: 'Solana', sector: '数字资产', price: 0, change: 0, group: 'crypto', currency: 'USD', portfolioEligible: false }
];

export const defaultHoldings = [
  { symbol: '600519', shares: 100, cost: 1488.50 },
  { symbol: '300750', shares: 500, cost: 228.30 },
  { symbol: '601318', shares: 1600, cost: 52.10 }
];
