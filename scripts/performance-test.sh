#!/bin/bash
set -e

npm run build >/dev/null
export NODE_ENV=test
export JWT_SECRET=test-secret
export JWT_REFRESH_SECRET=test-refresh-secret
export MONGODB_URI=mongodb://localhost:27017/vegan-guide
export REDIS_URL=redis://localhost:6379

node dist/server.js &
SERVER_PID=$!
# wait for server to start
sleep 5

npx artillery run artillery.config.yml

kill $SERVER_PID
