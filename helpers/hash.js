const bcrypt = require('bcrypt');
const password = 'Fature25'; // Password baru kamu
const hash = bcrypt.hashSync(password, 10);
console.log('COPY HASH INI:');
console.log(hash);