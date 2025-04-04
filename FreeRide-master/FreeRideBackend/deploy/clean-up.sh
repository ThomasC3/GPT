pwd

export FOLDER=/home/ubuntu/apps

if [ -d $FOLDER ]
then
 rm -rf $FOLDER
fi

mkdir -p $FOLDER