pwd

export FOLDER=/home/ubuntu/apps

cd $FOLDER

# NODE_ENV=development pm2 start --interpreter ./node_modules/\@babel/node/bin/babel-node.js server.js

pm2 restart all