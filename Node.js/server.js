const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DATA_FILE = 'topology.json';
const cors = require('cors');
app.use(cors())

// 使用 body-parser 解析 JSON 请求体
app.use(bodyParser.json());

// 读取存储的连接数据
app.get('/api/topology/links', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('读取文件失败:', err);
            return res.status(500).send('服务器错误');
        }
        res.json(JSON.parse(data || '[]')); // 如果文件为空，返回空数组
    });
});

// 保存新的连接数据
app.post('/api/topology/links', (req, res) => {
    const links = req.body;
    if (!Array.isArray(links)) {
        return res.status(400).send('请求数据格式错误，应为数组');
    }

    fs.writeFile(DATA_FILE, JSON.stringify(links, null, 2), (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return res.status(500).send('服务器错误');
        }
        res.send('保存成功');
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});
