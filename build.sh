#!/bin/bash

echo "🎵 Building DAWAI Server..."

# フロントエンドのビルド
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Frontend build completed!"

# バックエンドの依存関係を確認
echo "🔧 Checking backend dependencies..."
pip install -r requirements.txt

echo "🎉 Build completed successfully!"
echo "🚀 You can now run: python main.py"
