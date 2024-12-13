from flask import Flask, render_template, send_from_directory
import subprocess
import os

app = Flask(__name__)

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

if __name__ == '__main__':
    run_server_js()  # 在启动 Flask 应用之前运行 server.js
    app.run()