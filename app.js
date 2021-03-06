let express = require('express');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let index = require('./routes/index');
// let users = require('./routes/users');
let request = require('request');
let cheerio = require('cheerio');
let fs = require('fs');
let app = express();
let mongoose = require('mongoose');
var db = mongoose.connection;
let Schema = mongoose.Schema;
let sleep = require('sleep');
let async = require('async');
let Promise = require("bluebird");
mongoose.Promise = require('bluebird');
mongoose.connect('localhost:27017/popcorn', function(err, result){
  if (err){
    console.log(err);
  }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);


  // ====================================== //
  //                 setup                  //
  // ====================================== //


// {
//   brew services start mongodb
//   mongo services mongodb
//   npm run server
// }


// let userDataSchema = new Schema({
//   title: String
//
// })

// ====================================== //
//              mongoose tips             //
// ====================================== //

/*
find :

id_movie.findOne({'imdb_id' : 'tt3470600'}, function (err, movie){
  if (err){
    console.log(err);
  } else {
    console.log(movie.title);
    console.log(movie.id);
    console.log(movie.runtime);
  }
})



set :

moviesCollection.update({_id : 'tt3470600'}, {cast: casting }, {upsert: true}, function (err, moviesCollection){
  if (err){
    console.log(err);
  } else {
    console.log("update ok");
  }
})



unset :
moviesCollection.update({_id : 'tt3470600'}, {$unset: {cast: casting }}, {upsert: true}, function (err, moviesCollection){
  if (err){
    console.log(err);
  } else {
    console.log("update ok");
  }
})
*/
// ====================================== //
//                                        //
// ====================================== //



let movieSchema = new Schema({
  _id: String
  , imdb_id: String
  , title: String
  , year: String
  , cast: Array
  , slug: String
  , synopsis: String
  , runtime: String
  , country: String
  , last_updated: Number
  , released: Number
  , certification: String
  , torrents: Object
  , trailer: String
  , genres: Array
  , images: Object
  , rating: Object
  , __v: Number
})


let moviesCollection = mongoose.model('movie', movieSchema);

function getAllTheIds(){
  let i = 0;
  var result = moviesCollection.find({}).select('_id').lean()
  .then(result => {
    async.eachSeries(result, function (elem, callback) {
      scrapeCast(elem, function () {
        ++i;
        callback()
      });
    })
  })
}

getAllTheIds()


function scrapeCast(elem, callback4){
  console.log("sleep 4 sec");
  sleep.sleep(4);

  let id = elem._id;
  let url1 = "http://www.imdb.com/title/";
  let url2 = "/fullcredits";
  let imdbUrl = url1 + id + url2;
  let interestingPart = [];
  request(imdbUrl, function (error, response, body){
    if (error){
      console.log(error);
    } else {
      let $ = cheerio.load(body)
      let actor = {};
      let array = [];
      let castList = $('[itemprop="name"]:not(h3)')
      async.series([
        function(callback) {
          async.each(castList, function(elem, next){
            array.push($(elem).text())
            array.length = array.length < 10 ? array.length : 10;
            next();
          }, function() {
            callback()
          })
        },
        function(callback) {
          moviesCollection.update({_id : id}, {cast: array }, {upsert: true}, function (err, moviesCollection){
            if (err){
              console.log(err);
              callback();
            } else {
              console.log(array);
              callback();
            }
          })
        }
      ],
      function() {
        callback4()
      })
    }
  })
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
