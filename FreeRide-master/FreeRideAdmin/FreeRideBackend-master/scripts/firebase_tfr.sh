echo "Exporting from firebase.."
firebase database:get /$1 --project tfr-rebuild --pretty > $1.json
echo "Switching id..."
awk '$0 ~ /^  "/ {split($0, a, "\""); print "\{ " "\"_id\": " " \"" a[2] "\","; next}{print}' $1.json > $1_tmp.json
echo "Converting to array..."
awk 'NR==1{print "[";next}/^}/{print "]";next}{print}' $1_tmp.json > $1_array.json
echo "Uploading to mongodb..."
mongoimport --host 3.93.83.181 --username freeride --password 'hsthdb123' --db firebase_database --collection $1 --jsonArray --drop --file $1_array.json --authenticationDatabase firebase_database
rm $1.json $1_tmp.json $1_array.json
echo "Completed user dump"
echo "Exporting from authData.."
firebase auth:export $1_auth.csv --format=csv --project tfr-rebuild
echo "Converting to array..."
echo "Uploading to mongodb..."
mongoimport --host 3.93.83.181 --username freeride --password 'hsthdb123' --db firebase_database --collection $1_auth --drop --type csv --file $1_auth.csv --authenticationDatabase firebase_database --fields UID,Email,Email_Verified,Password_Hash,Password_Salt,Name,Photo_URL,Google_ID,Google_Email,Google_Display_Name,Google_Photo_URL,Facebook_ID,Facebook_Email,Facebook_Display_Name,Facebook_Photo_URL,Twitter_ID,Twitter_Email,Twitter_Display_Name,Twitter_Photo_URL,GitHub_ID,GitHub_Email,GitHub_Display_Name,GitHub_Photo_URL,User_Creation_Time,Last_SignIn_Time,Phone_Number
rm $1_auth.csv
echo "Completed auth dump"
