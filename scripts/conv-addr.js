import { Address } from '@ton/core';

function toHex(addr) {
  try {
    const a = Address.parse(addr);
    return a.toRawString();
  } catch (e) {
    return e.message;
  }
}

console.log('Candidate Fragment:', toHex('EQCA6v_7-X3f6p97L694_0v4v4v4v4v4v4v4v4v4v4v4v4v4'));
