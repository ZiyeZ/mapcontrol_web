var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var mysql = require('mysql');

var d = require('domain').create();
d.on('error', function(err) {
  console.error(err);
});

var connection = mysql.createConnection({
	// host     : 'stampreward.com',
	host	 : 'localhost',
	// host	 : '52.2.245.50',
	user     : 'root',
	// password : 'dinoLab',
	database : 'ower',
	port     : '3306'
});

var port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// app.use(express.static(__dirname + '/client'));

app.get('/controlpanel', function (req, res) {
  app.use(express.static(__dirname + '/client'));
  res.sendFile(__dirname + '/client/index.html');
});

app.get('/update_washers', function(req, res) {
	connection.query('SELECT * FROM driver', function (error, result, fields) {
		if(error) {
			console.log(error);
		} else {
			// console.log("update washers");
			// console.log(result);
			res.send(result);
		}
	});
});

app.get('/update_requests', function(req, res) {
	var sqlQuery = 'SELECT * FROM  transaction INNER JOIN user INNER JOIN car WHERE transaction.user_id = user.user_id AND transaction.car_id = car.car_id';
	connection.query(sqlQuery, function (error, result, fields) {
		if(error) {
			console.log(error);
		} else {
			// console.log("update requests");
			// console.log(result);
			res.send(result);
		}
	});
})

connection.connect(function (err) {
	if(err) {
		console.log(err);
	}
});
app.listen(port);
console.log('Listening on port ' + port + '...');

