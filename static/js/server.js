const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 定义数据文件路径
const TOPOLOGY_FILE = 'topology.json';
const BUSINESS_LINKS_FILE = 'business_links.json';

app.use(cors());
app.use(bodyParser.json());

// 工具函数：读取 JSON 文件
function readJSONFile(filePath, res) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            // 如果文件不存在，返回空数组
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error(`读取文件 ${filePath} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        try {
            const parsedData = JSON.parse(data);
            res.json(parsedData);
        } catch (parseErr) {
            console.error(`解析文件 ${filePath} 失败:`, parseErr);
            res.status(500).send('服务器错误');
        }
    });
}

// 工具函数：写入 JSON 文件
function writeJSONFile(filePath, data, res) {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error(`写入文件 ${filePath} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        res.send('保存成功');
    });
}

// 获取标准连接数据
app.get('/api/topology/links', (req, res) => {
    readJSONFile(TOPOLOGY_FILE, res);
});

// 保存标准连接数据
app.post('/api/topology/links', (req, res) => {
    const links = req.body;
    if (!Array.isArray(links)) {
        return res.status(400).send('请求数据格式错误，应为数组');
    }
    writeJSONFile(TOPOLOGY_FILE, links, res);
});

// 获取业务连接数据
app.get('/api/bd', (req, res) => {
    readJSONFile(BUSINESS_LINKS_FILE, res);
});

// 保存业务连接数据
app.post('/api/bd', (req, res) => {
    const businessLinks = req.body;
    if (!Array.isArray(businessLinks)) {
        return res.status(400).send('请求数据格式错误，应为数组');
    }
    writeJSONFile(BUSINESS_LINKS_FILE, businessLinks, res);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});
