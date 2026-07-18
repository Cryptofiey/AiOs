const { Address } = require('@ton/core');
const a = Address.parse('0:3e18ac91abe8725c2c34074a03c00369012abdaa5e05435a4e311406f35490f8');
console.log(a.toString({bounceable: true, testOnly: false}));
