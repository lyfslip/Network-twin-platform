const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const fs = require('fs');
const snmp = require('net-snmp');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

// 日志配置
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.File({ filename: 'snmp-set.log' })],
});

// 定义数据文件路径
const TOPOLOGY_FILE = 'topology.json';
const BUSINESS_LINKS_FILE = 'business_links.json';
const TERMINAL_DATA_FILE = 'terminal_data.json';

app.use(cors());
app.use(bodyParser.json());

// 工具函数：读取 JSON 文件
function readJSONFilePromise(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // 文件不存在时返回空对象或空数组
                    return resolve({});
                }
                return reject(err);
            }
            try {
                const parsedData = JSON.parse(data);
                resolve(parsedData);
            } catch (parseErr) {
                reject(parseErr);
            }
        });
    });
}

function writeJSONFilePromise(filePath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// 旧有接口：获取标准连接数据
app.get('/api/topology/links', (req, res) => {
    fs.readFile(TOPOLOGY_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error(`读取文件 ${TOPOLOGY_FILE} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        try {
            const parsedData = JSON.parse(data);
            res.json(parsedData);
        } catch (parseErr) {
            console.error(`解析文件 ${TOPOLOGY_FILE} 失败:`, parseErr);
            res.status(500).send('服务器错误');
        }
    });
});

// 旧有接口：保存标准连接数据
app.post('/api/topology/links', (req, res) => {
    const links = req.body;
    if (!Array.isArray(links)) {
        return res.status(400).send('请求数据格式错误，应为数组');
    }
    fs.writeFile(TOPOLOGY_FILE, JSON.stringify(links, null, 2), (err) => {
        if (err) {
            console.error(`写入文件 ${TOPOLOGY_FILE} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        res.send('保存成功');
    });
});

// 旧有接口：获取业务连接数据
app.get('/api/bd', (req, res) => {
    fs.readFile(BUSINESS_LINKS_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error(`读取文件 ${BUSINESS_LINKS_FILE} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        try {
            const parsedData = JSON.parse(data);
            res.json(parsedData);
        } catch (parseErr) {
            console.error(`解析文件 ${BUSINESS_LINKS_FILE} 失败:`, parseErr);
            res.status(500).send('服务器错误');
        }
    });
});

// 旧有接口：保存业务连接数据
app.post('/api/bd', (req, res) => {
    const businessLinks = req.body;
    if (!Array.isArray(businessLinks)) {
        return res.status(400).send('请求数据格式错误，应为数组');
    }
    fs.writeFile(BUSINESS_LINKS_FILE, JSON.stringify(businessLinks, null, 2), (err) => {
        if (err) {
            console.error(`写入文件 ${BUSINESS_LINKS_FILE} 失败:`, err);
            return res.status(500).send('服务器错误');
        }
        res.send('保存成功');
    });
});

// 新增接口：加载终端数据
app.get('/save-data', async (req, res) => {
    try {
        const data = await readJSONFilePromise(TERMINAL_DATA_FILE);
        res.json(data);
    } catch (error) {
        console.error(`读取 ${TERMINAL_DATA_FILE} 时出错:`, error);
        res.status(500).send('服务器错误');
    }
});

// 新增接口：保存终端数据
app.post('/save-data', async (req, res) => {
    const { terminal, values } = req.body;
    if (!terminal || typeof values !== 'object') {
        return res.status(400).send('请求数据格式错误，需包含terminal和values对象');
    }

    try {
        let data = await readJSONFilePromise(TERMINAL_DATA_FILE);
        // 若不存在则初始化为对象
        if (typeof data !== 'object' || data === null) {
            data = {};
        }
        // 更新指定终端数据
        data[terminal] = values;
        await writeJSONFilePromise(TERMINAL_DATA_FILE, data);
        res.json({ message: '数据已成功保存' });
    } catch (error) {
        console.error(`保存数据时出错:`, error);
        res.status(500).send('服务器错误');
    }
});
app.post('/api/snmp/get', (req, res) => {
    const { ip, community, oids } = req.body;

    if (!ip || !community || !oids || !Array.isArray(oids)) {
        return res.status(400).json({ error: '参数错误，需要 ip, community 和 oids 数组' });
    }

    const session = snmp.createSession(ip, community, { timeout: 3000, retries: 1 });

    session.get(oids, (error, varbinds) => {
        session.close();
        if (error) {
            return res.status(500).json({ error: `SNMP 请求失败: ${error.message}` });
        }

        const results = {};
        varbinds.forEach((vb) => {
            if (snmp.isVarbindError(vb)) {
                results[vb.oid] = `错误: ${snmp.varbindError(vb)}`;
            } else {
                results[vb.oid] = vb.value.toString();
            }
        });

        res.json(results);
    });
});

app.post('/api/snmp/set', (req, res) => {
    const { ip, community, oid, type, value } = req.body;

    // 检查必需的参数
    if (!ip || !community || !oid || !type || value === undefined) {
        return res.status(400).json({ error: '缺少参数：ip, community, oid, type, value' });
    }

    // 验证 IP 地址格式
    const isValidIP = (ip) => {
        const regex = /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
        return regex.test(ip);
    };

    if (!isValidIP(ip)) {
        return res.status(400).json({ error: '无效的 IP 地址格式' });
    }

    // 验证 OID 格式
    const isValidOID = (oid) => {
        const regex = /^(\d+\.)+\d+$/;
        return regex.test(oid);
    };

    if (!isValidOID(oid)) {
        return res.status(400).json({ error: '无效的 OID 格式' });
    }

    // 定义 SNMP 类型映射
    const typeMapping = {
        'INTEGER': snmp.ObjectType.Integer,
        'OCTET STRING': snmp.ObjectType.OctetString,
        'GAUGE': snmp.ObjectType.Gauge,
        'COUNTER': snmp.ObjectType.Counter,
        'TIMETICKS': snmp.ObjectType.TimeTicks,
        'IPADDRESS': snmp.ObjectType.IpAddress,
        'COUNTER64': snmp.ObjectType.Counter64
        // 根据需要添加更多类型
    };

    const snmpType = typeMapping[type.toUpperCase()];
    if (!snmpType) {
        return res.status(400).json({ error: `不支持的类型：${type}` });
    }

    // 创建 SNMP 会话（使用 SNMPv2c）
    const session = snmp.createSession(ip, community, { timeout: 3000, retries: 1 });

    // 创建 SET 请求的 Varbind
    const varbinds = [{ oid, type: snmpType, value }];

    session.set(varbinds, (error, varbinds) => {
        if (error) {
            logger.error({ ip, oid, value, error: error.toString() });
            return res.status(500).json({ error: error.toString() });
        }

        const result = {};
        varbinds.forEach((vb) => {
            if (snmp.isVarbindError(vb)) {
                result[vb.oid] = `错误：${snmp.varbindError(vb)}`;
            } else {
                result[vb.oid] = vb.value.toString();
            }
        });

        logger.info({ ip, oid, value, result });
        res.json({ message: 'SNMP SET 操作成功', result });
        session.close();

    });

});


app.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});
