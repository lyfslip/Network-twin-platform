const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const snmp = require('net-snmp');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

/**
 * SNMP GET 路由
 * 请求参数JSON格式（POST）：
 * {
 *   "target": "192.168.1.10",
 *   "community": "public",
 *   "oids": ["1.3.6.1.2.1.1.1.0"] // 要获取的OID数组
 * }
 */
app.post('/api/snmp/get', (req, res) => {
    const { target, community, oids } = req.body;

    if (!target || !community || !Array.isArray(oids) || oids.length === 0) {
        return res.status(400).send('请求参数不正确，请提供 target、community 和 oids 数组');
    }

    // 创建SNMP会话
    const session = snmp.createSession(target, community);

    session.get(oids, (error, varbinds) => {
        session.close(); // 用完关闭会话
        if (error) {
            console.error("SNMP GET错误：", error);
            return res.status(500).send('SNMP GET 请求失败');
        } else {
            // varbinds是一个数组，包含每个OID的结果
            // 格式化返回结果
            const result = varbinds.map(vb => {
                let val = null;
                if (vb.value instanceof Buffer) {
                    val = vb.value.toString('utf8');
                } else {
                    val = vb.value;
                }
                return { oid: vb.oid, type: vb.type, value: val };
            });
            return res.json(result);
        }
    });
});


/**
 * SNMP SET 路由
 * 请求参数JSON格式（POST）：
 * {
 *   "target": "192.168.1.10",
 *   "community": "private",
 *   "oid": "1.3.6.1.4.1.12345.2",
 *   "value": 100,
 *   "type": "Integer" // 需要设置的值的类型，例如 Integer, OctetString, Gauge, Counter, IpAddress, Opaque, etc.
 * }
 *
 * 常用类型：
 * snmp.ObjectType.Integer
 * snmp.ObjectType.OctetString
 * snmp.ObjectType.Null
 * snmp.ObjectType.OID
 * snmp.ObjectType.IpAddress
 * snmp.ObjectType.Counter
 * snmp.ObjectType.Gauge
 * snmp.ObjectType.TimeTicks
 * snmp.ObjectType.Counter64
 * snmp.ObjectType.Opaque
 */
app.post('/api/snmp/set', (req, res) => {
    const { target, community, oid, value, type } = req.body;

    if (!target || !community || !oid || value === undefined || !type) {
        return res.status(400).send('请求参数不正确，请提供 target、community、oid、value、type');
    }

    const session = snmp.createSession(target, community);

    // 将字符串类型的类型名转换为 net-snmp 的常量
    const typeMap = {
        Integer: snmp.ObjectType.Integer,
        OctetString: snmp.ObjectType.OctetString,
        Counter: snmp.ObjectType.Counter,
        Gauge: snmp.ObjectType.Gauge,
        TimeTicks: snmp.ObjectType.TimeTicks,
        Opaque: snmp.ObjectType.Opaque,
        IpAddress: snmp.ObjectType.IpAddress,
        Counter64: snmp.ObjectType.Counter64,
        OID: snmp.ObjectType.OID
    };

    const snmpType = typeMap[type];
    if (!snmpType) {
        session.close();
        return res.status(400).send('不支持的SNMP类型');
    }

    const varbinds = [{
        oid,
        type: snmpType,
        value: value
    }];

    session.set(varbinds, (error, varbinds) => {
        session.close();
        if (error) {
            console.error("SNMP SET错误：", error);
            return res.status(500).send('SNMP SET 请求失败');
        } else {
            // 返回新设定的值
            const result = varbinds.map(vb => {
                let val = null;
                if (vb.value instanceof Buffer) {
                    val = vb.value.toString('utf8');
                } else {
                    val = vb.value;
                }
                return { oid: vb.oid, type: vb.type, value: val };
            });
            return res.json(result);
        }
    });
});


app.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});
