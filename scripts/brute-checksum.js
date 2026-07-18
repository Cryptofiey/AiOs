import { Address } from '@ton/core';

const base = 'EQAfwjBDmB9i_E_9iafQgn9p8ohN_toM6S_0f69P2vT9r08'; // 47 chars
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

for (let c of chars) {
  const addr = base + c;
  try {
    const a = Address.parse(addr);
    console.log('Valid Usernames:', addr, a.toRawString());
    break;
  } catch (e) {}
}

const base2 = 'EQB_xSBDmB9i_E_9iafQgn9p8ohN_toM6S_0f69P2vT9r90'; // 47 chars
for (let c of chars) {
  const addr = base2 + c;
  try {
    const a = Address.parse(addr);
    console.log('Valid Numbers:', addr, a.toRawString());
    break;
  } catch (e) {}
}
