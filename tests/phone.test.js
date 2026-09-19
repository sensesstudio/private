import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPhone, joinPhone, isValidPhone, DEFAULT_CODE } from '../src/phone.js';

test('phone numbers split into a known country code and local part, defaulting to Hong Kong', () => {
  assert.deepEqual(splitPhone('+85297919712'), { code: '+852', local: '97919712' });
  assert.deepEqual(splitPhone('+852 5555 0001'), { code: '+852', local: '5555 0001' });
  assert.deepEqual(splitPhone('+1 415 555 0100'), { code: '+1', local: '415 555 0100' });
  assert.deepEqual(splitPhone('+35191234567'), { code: '+351', local: '91234567' }); // longest code wins over +35
  assert.deepEqual(splitPhone('+2489876543'), { code: '+248', local: '9876543' }); // unlisted codes are kept
  assert.deepEqual(splitPhone('97919712'), { code: DEFAULT_CODE, local: '97919712' });
  assert.deepEqual(splitPhone(''), { code: DEFAULT_CODE, local: '' });
  assert.deepEqual(splitPhone('+852 '), { code: DEFAULT_CODE, local: '' });
  assert.equal(joinPhone('+852', '9791 9712'), '+852 9791 9712');
  assert.equal(joinPhone('+852', ''), '+852');
});

test('phone validation needs a plausible local number behind the code', () => {
  assert.equal(isValidPhone('+852 97919712'), true);
  assert.equal(isValidPhone('+852 9791-9712'), true);
  assert.equal(isValidPhone('+1 415 555 0100'), true);
  assert.equal(isValidPhone('+852 5555'), false); // the code alone plus four digits is not a number
  assert.equal(isValidPhone('+852'), false);
  assert.equal(isValidPhone('97919712'), false); // no code at all
  assert.equal(isValidPhone('+852 abcdefgh'), false);
});
