const WORDS = 'Acorn Amber Apple Apricot Bamboo Beach Berry Birch Bloom Breeze Brook Cedar Cherry Cloud Cocoa Coral Daisy Dawn Dune Elm Fern Field Finch Flame Flint Forest Frost Garden Ginger Grove Hazel Hill Honey Iris Jade Lake Laurel Leaf Lemon Lily Lotus Maple Meadow Mint Moon Moss Ocean Olive Orchid Peach Pearl Pine Plum Poppy Rain Reed River Rose Sage Sand Shell Sky Snow Stone Sun Tea Tide Tulip Vale Wave Willow Wind Wood Wren'.split(' ');
function randomBelow(max, cryptoProvider) {
  const limit = Math.floor(0x100000000 / max) * max;
  let value;
  do { value = cryptoProvider.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
  return value % max;
}
export function temporaryPassword(cryptoProvider = globalThis.crypto) {
  return Array.from({ length: 3 }, () => WORDS[randomBelow(WORDS.length, cryptoProvider)]).join('') +
    String(randomBelow(10000, cryptoProvider)).padStart(4, '0');
}
export function validNewPassword(password, current) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 72 &&
    new TextEncoder().encode(password).length <= 72 && /[a-z]/i.test(password) && /[0-9]/.test(password) && password !== current;
}
export function validTemporaryPassword(password) {
  return typeof password === 'string' && password.length >= 8 &&
    new TextEncoder().encode(password).length <= 72 && /[a-z]/i.test(password) && /[0-9]/.test(password);
}
