#!/bin/bash

# 切換到工作目錄
cd /home

# 檢查是否為首次安裝(通過檢查是否存在特定標記文件)
if [ ! -f ".setup_complete" ]; then
    echo "First installation detected, starting system initialization..."
    
    # 更新系統套件
    apt-get update
    apt-get upgrade -y
    
    # 安裝必要的系統套件
    apt install tzdata -y
    apt install -y ca-certificates curl gnupg
    
    echo "Installing Node.js LTS (v22.x)..."
    
    # 創建 keyrings 目錄
    sudo mkdir -p /etc/apt/keyrings
    
    # 下載並添加 NodeSource GPG key
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    
    # 設定 Node.js 主要版本號
    NODE_MAJOR=22
    
    # 添加 NodeSource repository
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    
    # 更新套件索引
    apt update
    
    # 安裝 Node.js (包含 npm)
    apt install nodejs -y
    
    # 驗證安裝
    echo "Node.js installation completed!"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    
    # 創建安裝完成標記
    touch .setup_complete
    echo "System initialization completed!"
else
    echo "System initialization already completed, skipping installation steps..."
    echo "Current Node.js version: $(node --version)"
    echo "Current npm version: $(npm --version)"
fi

# 安裝/更新 npm 依賴套件
echo "Installing/updating npm dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "No package.json found, skipping npm install..."
fi

# 運行應用程式
echo "Starting application..."
if [ -f "package.json" ]; then
    # 檢查是否有 build script
    if grep -q '"build"' package.json 2>/dev/null; then
        echo "Running build script..."
        npm run build
    else
        echo "No build script found, skipping build step..."
    fi
    
    # 檢查是否有 start script
    if grep -q '"start:https"' package.json 2>/dev/null; then
        echo "Running start script for https..."
        npm run start:https
    elif grep -q '"start"' package.json 2>/dev/null; then
        echo "Running start script..."
        npm run start
    else
        echo "No start script found, please configure your package.json start script..."
    fi
else
    echo "No package.json found, please initialize your Node.js project first with 'npm init'"
fi