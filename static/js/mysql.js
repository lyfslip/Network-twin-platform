// db.js
const mysql = require('mysql2');

// 配置数据库连接
const pool = mysql.createPool({
  host: 'localhost',       // 数据库主机地址
  user: 'root',            // 数据库用户名
  password: 'password',    // 数据库密码
  database: 'test_db',     // 数据库名称
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise(); // 使用 promise 方便异步操作
