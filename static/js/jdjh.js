document.addEventListener('DOMContentLoaded', function () {
    const linkCurvenessMap = {};

    // 工具函数：根据业务类型返回颜色
    function getLinkColor(type) {
        switch (type) {
            case '业务一':
                return '#FF0000'; // 红色
            case '业务二':
                return '#00FF00'; // 绿色
            case '业务三':
                return '#FFA500'; // 橙色
            case 'SLE连接':
                return 'white'; // SLE连接用蓝色
            case 'SLB连接':
                return 'red'; // SLB连接用红色
            case '协同链路':
                return 'yellow'; // 协同链路用黄色
            case '470MHz专网':
                return 'green'; // 470MHz专网用绿色
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

        if (!sourceId || !targetId || sourceId === targetId) {
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
                } else {
                    alert(`连接保存失败：${response.status}`);
                }
            } catch (error) {
                console.error('保存连接时发生错误:', error);
                alert('保存连接时发生错误，请检查服务器！');
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
            const initialLinkCount = option.series[0].links.length;
            option.series[0].links = option.series[0].links.filter(
                link => !(link.source === sourceNode.name && link.target === targetNode.name)
            );

            if (option.series[0].links.length === initialLinkCount) {
                alert("未找到要断开的连接！");
                return;
            }

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
        };
    });

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
            const key = sourceName < targetName ? sourceName + '-' + targetName : targetName + '-' + sourceName;

            // 从业务连接中移除该连接
            const initialLinkCount = option.series[0].links.length;
            option.series[0].links = option.series[0].links.filter(
                link => !(link.source === sourceName && link.target === targetName)
            );

            if (option.series[0].links.length === initialLinkCount) {
                alert("未找到要断开的业务连接！");
                return;
            }
            myChart.setOption(option, true);
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
        }
    });
});

const nodes = [
    { id: 1, name: "SLE终端1" },
    { id: 2, name: "SLE终端2" },
    { id: 3, name: "SLE终端3" },
    { id: 4, name: "协同控制节点1" },
    { id: 5, name: "协同控制节点2" },
    { id: 6, name: "专网终端1" },
    { id: 7, name: "专网终端2" },
    { id: 8, name: "SLB终端1" },
    { id: 9, name: "SLB终端2" },
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

async function loadLinksFromServer() {
    const response = await fetch('http://localhost:3000/api/topology/links');
    const links = await response.json();
    if (links) {
        option.series[0].links = links;
        myChart.setOption(option, true); // 更新图表
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    await loadLinksFromServer();
});
