document.addEventListener('DOMContentLoaded', function () {
    const button = document.querySelector('.form-group button:nth-of-type(1)'); // 建立连接按钮
    button.addEventListener('click', async function () {
        // 获取下拉选择框中的值
        const selects = document.querySelectorAll('.node-select');
        const connectionType = document.getElementById('connection-type').value; // 获取连接类型
        const sourceId = parseInt(selects[0].value);
        const targetId = parseInt(selects[1].value);

        if (!sourceId || !targetId || sourceId === targetId) {
            alert("请选择不同的节点进行连接！");
            return;
        }

        const sourceNode = nodes.find(node => node.id === sourceId);
        const targetNode = nodes.find(node => node.id === targetId);

        if (sourceNode && targetNode) {
            // 添加连接到拓扑图
            const newLink = {
                source: sourceNode.name,
                target: targetNode.name,
                value: connectionType,
                lineStyle: {
                    normal: {
                        type: 'dotted',
                        width: 2,
                        color: "#5dc2fe"
                    }
                }
            };
            option.series[0].links.push(newLink);

            // 更新图表
            myChart.setOption(option, true);

            // 保存连接到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // 设置请求头为 JSON
                    },
                    body: JSON.stringify(option.series[0].links), // 发送当前所有连接数据
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
            // 从连接中移除该连接
            const initialLinkCount = option.series[0].links.length;
            option.series[0].links = option.series[0].links.filter(
                link => !(link.source === sourceNode.name && link.target === targetNode.name)
            );

            if (option.series[0].links.length === initialLinkCount) {
                alert("未找到要断开的连接！");
                return;
            }

            // 更新图表
            myChart.setOption(option, true);

            // 同步更新到服务器
            try {
                const response = await fetch('http://localhost:3000/api/topology/links', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // 设置请求头为 JSON
                    },
                    body: JSON.stringify(option.series[0].links), // 发送当前所有连接数据
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
        }
    });

    const sendButton = document.querySelector('.send-business-button'); // 发送业务按钮
    sendButton.addEventListener('click', function () {
        const selects = document.querySelectorAll('.node-select');
        const sourceId = parseInt(selects[0].value); // 第一个选择框
        const targetId = parseInt(selects[1].value); // 第二个选择框
        const businessType = document.getElementById('business-Type').value; // 获取业务类型选择框的值

        if (!sourceId || !targetId || sourceId === targetId || !businessType) {
            alert("请正确选择终端和业务类型！");
            return;
        }

        // 在这两个终端之间添加一条新连线
        const newLink = {
            source: sourceId,
            target: targetId,
            value: businessType, // 使用选择的业务类型
            lineStyle: {
                normal: {
                    color: '#ff0000', // 设置新连线的颜色为红色
                    width: 2,
                    type: 'solid' // 设置为虚线
                }
            }
        };

        // 将新连线添加到现有的连线数据中
        option.series[0].links.push(newLink);

        // 更新图表
        myChart.setOption(option, true);
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

    // 初始化下拉选择框
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
        selectedNodes.push(nodes.find(node => node.id === parseInt(selectBox.value)).name);
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

// 在页面加载时加载数据
document.addEventListener('DOMContentLoaded', async function () {
    await loadLinksFromServer();
});



