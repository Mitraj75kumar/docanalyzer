#!/bin/bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
echo "==> Building frontend..."
cd frontend
npm install
npm run build
cd ..
echo "==> Copying frontend build into backend/public..."
rm -rf backend/public
cp -r frontend/dist backend/public
echo "==> Creating deployment zip..."
cd backend
rm -f ../eb-deploy.zip
zip -r ../eb-deploy.zip . \
  -x "node_modules/*" \
-x "logs/*" \
 -x "src/uploads/*" \
-x ".env" \
  > /dev/null
cd ..
echo "==> Done: eb-deploy.zip created at project root."
