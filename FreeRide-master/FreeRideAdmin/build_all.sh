echo $VERSION
git checkout develop && git pull && yarn && VERSION=$VERSION yarn build-dev && cp -R ./build ../builds/dev &&
git checkout stage && git pull && yarn && VERSION=$VERSION yarn build-stage && cp -R ./build ../builds/stage &&
git checkout master && git pull && yarn && VERSION=$VERSION yarn build && cp -R ./build ../builds/prod