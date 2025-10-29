const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

const password = '123456';
generateHash(password)
  .then((hash) => {
    console.log('Hash:', hash);
  })
  .catch((error) => {
    console.error('Error:', error);
  });