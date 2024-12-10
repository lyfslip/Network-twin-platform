cd /path/to/your/project
git init     ##初始化 Git 仓库
https://github.com/lyfslip/Network-twin-platform.git/      #仓库地址
git remote add origin https://github.com/lyfslip/Network-twin-platform.git/
git checkout -b new/name
git add .
git commit -m "Initial commit"
git push -u origin new/name（失败的话git config --global http.sslVerify false关闭ssl验证）

