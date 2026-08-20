@echo off
chcp 65001 >nul
echo ================================================
echo  拾弦提琴工坊 - 公网隧道（微信扫码用）
echo  请保持本窗口开启，复制输出的 https://xxxx.lhr.life 地址
echo ================================================
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -R 80:localhost:8080 nokey@localhost.run
pause
