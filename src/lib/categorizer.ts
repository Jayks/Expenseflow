const CATEGORIES = {
  Salary: ['salary', 'wages', 'stipend', 'bonus', 'payout', 'remuneration', 'pension'],
  Rent: ['rent', 'house rent', 'maintenance', 'owner', 'society', 'apartment', 'realty', 'home loan'],
  Food: ['swiggy', 'zomato', 'restaurant', 'cafe', 'bakery', 'blinkit', 'zepto', 'starbucks', 'mcdonald', 'kfc', 'burger king', 'pizza', 'eats', 'tea', 'coffee', 'dining', 'food', 'market', 'hotel', 'juice', 'sweet', 'catering'],
  Transport: ['uber', 'ola', 'metro', 'fuel', 'petrol', 'irctc', 'indigo', 'airtel', 'recharge', 'fastag', 'parking', 'toll', 'shell', 'hpcl', 'bpcl', 'makemytrip', 'clear trip', 'ixigo', 'flight', 'railway', 'auto', 'taxi', 'parking'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'mall', 'store', 'apple', 'reliance', 'ajio', 'nykaa', 'tata cliq', 'dmart', 'bigbasket', 'grocery', 'supermarket', 'fashion', 'retail', 'clothing', 'footwear', 'lifestyle', 'titan', 'jewelry'],
  Utilities: ['electricity', 'water', 'gas', 'broadband', 'jio', 'bsnl', 'vi', 'bill', 'insurance', 'tneb', 'bescom', 'mobile', 'lic', 'policy', 'premium', 'tangedco', 'recharge', 'act fibernet', 'hathway'],
  Entertainment: ['netflix', 'spotify', 'bookmyshow', 'theatre', 'pvr', 'hotstar', 'prime video', 'youtube', 'gaming', 'steam', 'playstation', 'cinema', 'multiplex', 'club', 'membership', 'disney'],
  Health: ['pharmacy', 'hospital', 'clinic', 'doctor', 'apollo', 'pharmeasy', 'healthians', 'practo', 'medplus', 'lab', 'diagnostics', 'medical', 'dentist', 'optician'],
  Transfer: ['neft', 'imps', 'upi transfer', 'self transfer', 'wallet topup', 'selftransfer', 'to self', 'from self', 'payment to', 'transfer to', 'jayakumar', 'cash dep', 'withdraw', 'atm', 'rtgs', 'icicibank2015', 'hdfcbank3171', 'hdfc bank', 'icici bank', 'anupriya', 'bhindhoo', 'babun', 'transfer'],
  Investment: ['zerodha', 'groww', 'kuvera', 'mutual fund', 'sip', 'equity', 'stock', 'upstox', 'angel', 'coinswitch', 'fd', 'rd', 'investment', 'ppf', 'nps'],
  Tax: ['income tax', 'tds', 'gst', 'tax', 'profession tax', 'challan'],
  Education: ['narayanaeducation', 'linkedin', 'udemy', 'school', 'college', 'course', 'tuition'],
  CreditCard: ['cred club', 'cred', 'credit card bill'],
};

export function categorize(description: string, amount: number = 0, type: string = 'debit'): string {
  const desc = description.toLowerCase();

  // Custom overrides
  if (amount > 100000 && desc.includes('neft') && type === 'credit') return 'Salary';
  if (desc.includes('cash edl') || desc.includes('atm') || desc.includes('withdraw')) return 'Transfer';
  if (desc.includes('pantproject')) return 'Shopping';
  if (desc.includes('svopticals')) return 'Health';
  if (desc.includes('srisairamhotchip') || desc.includes('srivigneshchickenandmuttoncentre')) return 'Food';
  if (desc.includes('netflix')) return 'Entertainment';
  if (desc.includes('narayana') || desc.includes('linkedin') || desc.includes('udemy')) return 'Education';
  if (desc.includes('cred.telecom') || desc.includes('dreamplug')) return 'Utilities';
  if (desc.includes('cred.club') || desc.includes('cred club') || desc.includes('cred ')) return 'Credit Card';
  
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      if (category === 'CreditCard') return 'Credit Card';
      return category;
    }
  }
  
  return 'Other';
}
