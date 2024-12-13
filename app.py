from flask import Flask, render_template
import subprocess

app = Flask(__name__)

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
