from flask import Flask, render_template, send_from_directory, request, jsonify
import subprocess
import os
import json

app = Flask(__name__)

# 假设 JSON 文件的路径
LINKS_FILE_PATH = 'topology.json'

@app.route('/terminal_data.json')
def get_terminal_data():
    return send_from_directory(os.getcwd(), 'terminal_data.json')

# 启动 server.js
def run_server_js():
    subprocess.Popen(['node', 'static/js/server.js'])

@app.route('/')
def main_page():
    return render_template('main.html')

@app.route('/info')
def info_page():
    return render_template('info.html')

@app.route('/api/topology/links', methods=['GET', 'POST'])
def manage_links():
    if request.method == 'GET':
        # 返回当前的连接状态
        if os.path.exists(LINKS_FILE_PATH):
            with open(LINKS_FILE_PATH, 'r') as f:
                return jsonify(json.load(f))
        return jsonify([])

    if request.method == 'POST':
        # 更新连接状态
        links = request.json
        with open(LINKS_FILE_PATH, 'w') as f:
            json.dump(links, f)
        return jsonify({'status': 'success'}), 200

if __name__ == '__main__':
    run_server_js()  # 在启动 Flask 应用之前运行 server.js
    app.run()