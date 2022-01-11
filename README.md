# Installation:<br>
git clone https://github.com/applied-math-coding/redis-chat.git <br>
cd redis-chat <br>
npm i 


# Setup:
The application requires a redis instance to run with all its defaults:<br><br>
docker pull redis<br>
docker run --name some-redis -p 6379:6379 -d redis


# Starting:
The application can be started by running<br><br>
npm start

# Using
Do access http://localhost:3000/index.html with two different
browsers and supply the same channel to connect.
Then send messages from both sides.
