var app = require('express')();
var responseTime = require('response-time')
var axios = require('axios');
var redis = require('redis');

var client = redis.createClient();

client.on('error', function (err) {
    console.log("Error " + err);
});

app.set('port', (process.env.PORT || 5000));
app.use(responseTime());

//Calls to the endpoint (ASYNC)
function getUserData(user) {
  var githubEndpoint = 'https://api.github.com/users/' + user;
  return axios.get(githubEndpoint);
}

//Stringifies their data
function stringifyUserData(repositories) {
  return JSON.stringify(repositories.data);
}

//Decodes the string to add the source name
function decodeAndAddSource(string,sourceName){
              var newString = JSON.parse(string);
              newString.source = sourceName;
              return newString;
}

app.get('/api/:username', function(req, res) {
  var username = req.params.username;

  client.get(username, function(error, result) {

      if (result) {
              res.send(decodeAndAddSource(result,"redis"));
      } else {

        getUserData(username)
          .then(stringifyUserData)
          .then(function(jsonData) {
  			//expires 1 min
            client.setex(username, 60, jsonData);
           

            res.send(decodeAndAddSource(jsonData,"API"));
          }).catch(function(response) {
            if (response.status === 404){
              res.send('Not found');
            } else {

              res.send('An error has occurred');
            }
          });
      }

  });
});

app.listen(app.get('port'), function(){
  console.log('Server listening on port: ', app.get('port'));
});