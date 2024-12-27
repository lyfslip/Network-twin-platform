document.addEventListener('DOMContentLoaded', async function () {
    await loadLinksFromServer(); // 加载当前连接状态
});

async function loadLinksFromServer() {
    try {
        const response = await fetch('http://localhost:3000/api/topology/links');
        const links = await response.json();
        if (links) {
            option.series[0].links = links; // 更新连接数据
            myChart.setOption(option, true); // 更新图表
        }
    } catch (error) {
        console.error('加载连接时发生错误:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const linkCurvenessMap = {};

    // 工具函数：根据业务类型返回颜色
    function getLinkColor(type) {
        switch (type) {
            case '业务一':
                return 'gold'; // 
            case '业务二':
                return 'pink'; // 
            case '业务三':
                return 'orange'; // 
            case 'SLE连接':
                return 'green'; // 
            case 'SLB连接':
                return 'red'; // 
            case '协同链路':
                return 'yellow'; // 
            case '470Mhz专网':
                return '#5dc2fe'; // 
            default:
                return '#5dc2fe'; // 默认颜色
        }
    }

    const connectButton = document.querySelector('.form-group button:nth-of-type(1)'); // 建立连接按钮
    connectButton.addEventListener('click', async function () {
        const selects = document.querySelectorAll('.node-select');
        const connectionType = document.getElementById('connection-type').value;
        const sourceId = parseInt(selects[0].value);
        const targetId = parseInt(selects[1].value);

        if (!sourceId || !targetId || sourceId === targetId || !connectionType) {
            alert("请选择不同的节点进行连接！");
            return;
        }

        const sourceNode = nodes.find(node => node.id === sourceId);
        const targetNode = nodes.find(node => node.id === targetId);

        if (sourceNode && targetNode) {
            // 根据已有的连接数确定弯曲度
            const sourceName = sourceNode.name;
            const targetName = targetNode.name;
            const key = sourceName < targetName ? sourceName + '-' + targetName : targetName + '-' + sourceName;
            if (!linkCurvenessMap[key]) {
                linkCurvenessMap[key] = 0;
            }
            linkCurvenessMap[key] += 1;
            const curveness = Math.min(0.2 * linkCurvenessMap[key], 1);

            // 添加新的连接
            const newLink = {
                source: sourceName,
                target: targetName,
                value: connectionType,
                lineStyle: {
                    normal: {
                        type: 'dotted',
                        width: 2,
                        color: getLinkColor(connectionType),
                        curveness: 0
                    }
                }
            };
            option.series[0].links.push(newLink);
            myChart.setOption(option, true);

            // 更新任务说明框
            const taskDescription = document.getElementById('taskDescription');
            const listItem = document.createElement('li');
            listItem.innerText = `${sourceName} 和 ${targetName} 之间建立 ${connectionType}`;
            listItem.style.fontSize = '20px';
            listItem.style.color = 'white';
            taskDescription.appendChild(listItem);


            // 保存连接到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(option.series[0].links),
                });

                if (response.ok) {
                    alert(`成功建立连接：${sourceNode.name} → ${targetNode.name}`);
                    console.log("成功设置");
                } else {
                    alert(`连接保存失败：${response.status}`);
                }
            } catch (error) {
                console.error('保存连接时发生错误:', error);
                alert('保存连接时发生错误，请检查服务器！');
            }
            const targetOid = '1.3.6.1.4.1.2024.2.7.0';
            const setValue = 0; // 要设置的值
            async function sendSNMPSet(node, oid, type, value) {
                const ip = node.ip;
                const community = 'public'; // 根据需要动态获取或存储

                try {
                    const response = await fetch('http://localhost:3000/api/snmp/set', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // 如果后端需要 API 密钥，请在这里添加
                            // 'x-api-key': 'your-secure-api-key'
                        },
                        body: JSON.stringify({ ip, community, oid, type, value }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`成功设置 ${ip} 的 OID ${oid}:`, data);
                    } else {
                        const errorData = await response.json();
                        console.error(`设置 ${ip} 的 OID ${oid} 失败:`, errorData);
                    }
                } catch (error) {
                    console.error(`设置 ${ip} 的 OID ${oid} 时发生错误:`, error);
                }
            }

            // 发送 SNMP SET 到源节点和目标节点
            const setPromises = [sourceNode, targetNode].map(node => {
                // 查找要设置的 MIB
                if (!node) {
                    console.warn('节点未定义');
                    return Promise.resolve();
                }
                return sendSNMPSet(node, targetOid, 'INTEGER', setValue);
            });

            // 等待所有 SNMP SET 请求完成
            try {
                await Promise.all(setPromises);
                alert('成功发送 SNMP SET 指令到两个终端');
            } catch (error) {
                console.error('SNMP SET 请求时发生错误:', error);
                alert('SNMP SET 请求时发生错误，请检查服务器！');
            }
        }
    });


    const disconnectButton = document.querySelector('.form-group button:nth-of-type(2)'); // 断开连接按钮
    disconnectButton.addEventListener('click', async function () {
        const selects = document.querySelectorAll('.node-select');
        const sourceId = parseInt(selects[0].value);
        const targetId = parseInt(selects[1].value);

        if (!sourceId || !targetId || sourceId === targetId) {
            alert("请选择不同的节点进行断开！");
            return;
        }

        const sourceNode = nodes.find(node => node.id === sourceId);
        const targetNode = nodes.find(node => node.id === targetId);

        if (sourceNode && targetNode) {
            const sourceName = sourceNode.name;
            const targetName = targetNode.name;
            const initialLinkCount = option.series[0].links.length;
            option.series[0].links = option.series[0].links.filter(
                link => !(link.source === sourceNode.name && link.target === targetNode.name)
            );

            //if (option.series[0].links.length === initialLinkCount) {
            //     alert("未找到要断开的连接！");
            //     return;
            // }

            const taskDescription = document.getElementById('taskDescription');
            const listItem = document.createElement('li');
            listItem.innerText = `${sourceName} 和 ${targetName} 之间断开连接`;
            listItem.style.fontSize = '20px';
            listItem.style.color = 'white';
            taskDescription.appendChild(listItem);
            myChart.setOption(option, true);


            // 同步更新到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(option.series[0].links),
                });

                if (response.ok) {
                    alert(`成功断开连接：${sourceNode.name} → ${targetNode.name}`);
                } else {
                    alert(`连接断开后保存失败：${response.status}`);
                }
            } catch (error) {
                console.error('保存断开连接时发生错误:', error);
                alert('保存断开连接时发生错误，请检查服务器！');
            }
            const targetOid = '1.3.6.1.4.1.2024.2.7.0';
            const setValue = 1; // 要设置的值
            async function sendSNMPSet(node, oid, type, value) {
                const ip = node.ip;
                const community = 'public'; // 根据需要动态获取或存储

                try {
                    const response = await fetch('http://localhost:3000/api/snmp/set', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // 如果后端需要 API 密钥，请在这里添加
                            // 'x-api-key': 'your-secure-api-key'
                        },
                        body: JSON.stringify({ ip, community, oid, type, value }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`成功设置 ${ip} 的 OID ${oid}:`, data);
                    } else {
                        const errorData = await response.json();
                        console.error(`设置 ${ip} 的 OID ${oid} 失败:`, errorData);
                    }
                } catch (error) {
                    console.error(`设置 ${ip} 的 OID ${oid} 时发生错误:`, error);
                }
            }

            // 发送 SNMP SET 到源节点和目标节点
            const setPromises = [sourceNode, targetNode].map(node => {
                // 查找要设置的 MIB
                if (!node) {
                    console.warn('节点未定义');
                    return Promise.resolve();
                }
                return sendSNMPSet(node, targetOid, 'INTEGER', setValue);
            });

            // 等待所有 SNMP SET 请求完成
            try {
                await Promise.all(setPromises);
                alert('成功发送 SNMP SET 指令到两个终端,值为1');
            } catch (error) {
                console.error('SNMP SET 请求时发生错误:', error);
                alert('SNMP SET 请求时发生错误，请检查服务器！');
            }
        };

    });

    let isTaskEndedManually = false; // 标志变量，指示任务是否被手动结束

    const sendbdButton = document.querySelector('.business_start-button'); // 发送业务按钮
    sendbdButton.addEventListener('click', async function () {
        const selects = document.querySelectorAll('.node-select');
        const sourceId = parseInt(selects[3].value);
        const targetId = parseInt(selects[4].value);
        const businessType = document.getElementById('business-Type').value;

        if (!sourceId || !targetId || sourceId === targetId || !businessType) {
            alert("请正确选择终端和业务类型！");
            return;
        }

        const sourceNode = nodes.find(node => node.id === sourceId);
        const targetNode = nodes.find(node => node.id === targetId);

        if (sourceNode && targetNode) {
            const sourceName = sourceNode.name;
            const targetName = targetNode.name;
            const key = sourceName < targetName ? sourceName + '-' + targetName : targetName + '-' + sourceName;
            if (!linkCurvenessMap[key]) {
                linkCurvenessMap[key] = 0;
            }
            linkCurvenessMap[key] += 1;
            const curveness = Math.min(0.2 * linkCurvenessMap[key], 1);

            // 创建新的业务连接线，使用不同颜色区分业务类型
            const newLink = {
                source: sourceName,
                target: targetName,
                value: businessType,
                lineStyle: {
                    normal: {
                        color: getLinkColor(businessType),
                        width: 2,
                        type: 'dotted',
                        curveness: curveness
                    }
                },
                label: {
                    show: true,
                    formatter: businessType
                }
            };

            option.series[0].links.push(newLink);
            myChart.setOption(option, true);

            // 更新任务说明框
            const taskDescription = document.getElementById('taskDescription');
            const listItem = document.createElement('li');
            listItem.innerText = `${sourceName} 和 ${targetName} 之间发送 ${businessType} `;
            listItem.style.fontSize = '20px';
            listItem.style.color = 'white';
            taskDescription.appendChild(listItem);

            // 设置断开时间
            let disconnectTime;
            switch (businessType) {
                case '业务一':
                    disconnectTime = 8000; // 8秒后断开
                    break;
                case '业务二':
                    disconnectTime = 5000; // 5秒后断开
                    break;
                case '业务三':
                    disconnectTime = 3000; // 3秒后断开
                    break;
                default:
                    disconnectTime = 0; // 默认不断开
            }

            // 使用 setTimeout 在指定时间后断开连接
            if (disconnectTime > 0) {
                const timeoutId = setTimeout(async () => {
                    // 从业务连接中移除该连接
                    option.series[0].links = option.series[0].links.filter(
                        link => !(link.source === sourceName && link.target === targetName)
                    );
                    myChart.setOption(option, true);
                    alert(`成功断开业务连接：${sourceName} → ${targetName}`);

                    // 发送更新后的连接状态到服务器
                    try {
                        const response = await fetch('http://localhost:3000/api/topology/links', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(option.series[0].links),
                        });

                        if (!response.ok) {
                            console.error(`更新连接状态失败：${response.status}`);
                        }
                    } catch (error) {
                        console.error('保存连接时发生错误:', error);
                    }
                }, disconnectTime);
            }

            // 发送业务到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(option.series[0].links),
                });

                if (response.ok) {
                    alert(`成功建立业务连接：${sourceNode.name} → ${targetNode.name}`);
                } else {
                    alert(`业务连接保存失败：${response.status}`);
                }
            } catch (error) {
                console.error('保存业务连接时发生错误:', error);
                alert('保存业务连接时发生错误，请检查服务器！');
            }
            const targetOid = '1.3.6.1.4.1.2024.2.8.0';
            const setValue = "JPG"; // 要设置的值
            async function sendSNMPSet(node, oid, type, value) {
                const ip = node.ip;
                const community = 'public'; // 根据需要动态获取或存储

                try {
                    const response = await fetch('http://localhost:3000/api/snmp/set', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // 如果后端需要 API 密钥，请在这里添加
                            // 'x-api-key': 'your-secure-api-key'
                        },
                        body: JSON.stringify({ ip, community, oid, type, value }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`成功设置 ${ip} 的 OID ${oid}:`, data);
                    } else {
                        const errorData = await response.json();
                        console.error(`设置 ${ip} 的 OID ${oid} 失败:`, errorData);
                    }
                } catch (error) {
                    console.error(`设置 ${ip} 的 OID ${oid} 时发生错误:`, error);
                }
            }

            // 发送 SNMP SET 到源节点和目标节点
            const setPromises = [sourceNode, targetNode].map(node => {
                // 查找要设置的 MIB
                if (!node) {
                    console.warn('节点未定义');
                    return Promise.resolve();
                }
                return sendSNMPSet(node, targetOid, 'OCTET STRING', setValue);
            });

            // 等待所有 SNMP SET 请求完成
            try {
                await Promise.all(setPromises);
                alert('成功发送 SNMP SET 指令到两个终端,值为0');
            } catch (error) {
                console.error('SNMP SET 请求时发生错误:', error);
                alert('SNMP SET 请求时发生错误，请检查服务器！');
            }
        }
    });

    const disconnectbdButton = document.querySelector('.business_end-button'); // 断开业务按钮
    disconnectbdButton.addEventListener('click', async function () {
        const selects = document.querySelectorAll('.node-select');
        const sourceId = parseInt(selects[3].value);
        const targetId = parseInt(selects[4].value);

        if (!sourceId || !targetId || sourceId === targetId) {
            alert("请正确选择终端进行断开！");
            return;
        }

        const sourceNode = nodes.find(node => node.id === sourceId);
        const targetNode = nodes.find(node => node.id === targetId);

        if (sourceNode && targetNode) {
            const sourceName = sourceNode.name;
            const targetName = targetNode.name;

            // 从业务连接中移除该连接
            option.series[0].links = option.series[0].links.filter(
                link => !(link.source === sourceName && link.target === targetName)
            );

            myChart.setOption(option, true);
            isTaskEndedManually = true; // 设置标志变量为 true，表示任务已手动结束


            // 同步更新到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(option.series[0].links),
                });

                if (response.ok) {
                    alert(`成功断开业务连接：${sourceNode.name} → ${targetNode.name}`);
                } else {
                    alert(`断开业务连接后保存失败：${response.status}`);
                }
            } catch (error) {
                console.error('保存断开业务连接时发生错误:', error);
                alert('保存断开业务连接时发生错误，请检查服务器！');
            }
            const targetOid = '1.3.6.1.4.1.2024.2.8.0';
            const setValue = 1; // 要设置的值
            async function sendSNMPSet(node, oid, type, value) {
                const ip = node.ip;
                const community = 'public'; // 根据需要动态获取或存储

                try {
                    const response = await fetch('http://localhost:3000/api/snmp/set', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // 如果后端需要 API 密钥，请在这里添加
                            // 'x-api-key': 'your-secure-api-key'
                        },
                        body: JSON.stringify({ ip, community, oid, type, value }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`成功设置 ${ip} 的 OID ${oid}:`, data);
                    } else {
                        const errorData = await response.json();
                        console.error(`设置 ${ip} 的 OID ${oid} 失败:`, errorData);
                    }
                } catch (error) {
                    console.error(`设置 ${ip} 的 OID ${oid} 时发生错误:`, error);
                }
            }

            // 发送 SNMP SET 到源节点和目标节点
            const setPromises = [sourceNode, targetNode].map(node => {
                // 查找要设置的 MIB
                if (!node) {
                    console.warn('节点未定义');
                    return Promise.resolve();
                }
                return sendSNMPSet(node, targetOid, 'OCTET STRING', setValue);
            });

            // 等待所有 SNMP SET 请求完成
            try {
                await Promise.all(setPromises);
                alert('成功发送 SNMP SET 指令到两个终端,值为1');
            } catch (error) {
                console.error('SNMP SET 请求时发生错误:', error);
                alert('SNMP SET 请求时发生错误，请检查服务器！');
            }
        }
    });
});

const nodes = [
    {
        id: 1,
        name: "SLE终端1",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.58.105"
    },
    {
        id: 2,
        name: "SLE终端2",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 3,
        name: "SLE终端3",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 4,
        name: "协同控制节点1",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 5,
        name: "协同控制节点2",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 6,
        name: "专网终端1",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 7,
        name: "专网终端2",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 8,
        name: "SLB终端1",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
    {
        id: 9,
        name: "SLB终端2",
        mibs: [
            { oid: '1.3.6.1.4.1.2024.2.5.0', type: 'OCTET STRING' }, // ip地址
            { oid: '1.3.6.1.4.1.2024.2.3.0', type: 'INTEGER' },  // bw
            { oid: '1.3.6.1.4.1.2024.2.7.0', type: 'INTEGER' },//connectstate
            { oid: '1.3.6.1.4.1.2024.2.8.0', type: 'OCTET STRING' },//bdstate
            { oid: '1.3.6.1.4.1.2024.2.11', type: 'INTEGER' }//color 
        ],
        ip: "192.168.0.98"
    },
];

window.onload = function () {
    const selectBoxes = document.querySelectorAll('.node-select');
    for (let i = 0; i < selectBoxes.length; i++) {
        populateSelect(selectBoxes[i], nodes);
    }
};

function populateSelect(selectBox, data) {
    for (let node of data) {
        let option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.name;
        selectBox.appendChild(option);
    }
}

function updateTopology() {
    const selectedNodes = [];
    const selectBoxes = document.querySelectorAll('.node-select');

    for (let selectBox of selectBoxes) {
        const nodeId = parseInt(selectBox.value);
        if (!isNaN(nodeId)) {
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                selectedNodes.push(node.name);
            }
        }
    }

    displaySelectedNodes(selectedNodes);
}

function displaySelectedNodes(nodes) {
    const topologyArea = document.getElementById('topology-area');
    topologyArea.innerHTML = ''; // 清除之前的节点显示

    for (let nodeName of nodes) {
        const nodeDiv = document.createElement('div');
        nodeDiv.textContent = nodeName;
        topologyArea.appendChild(nodeDiv);
    }
}

async function saveLinksToServer() {
    await fetch('http://localhost:3000/api/topology/links', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(option.series[0].links),
    });
}
