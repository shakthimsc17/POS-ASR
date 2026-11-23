import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 ASRTEX Textile POS API Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🕒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
