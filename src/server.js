/**
 * add modules to require
 */
var express = require('express');
var bodyParser = require('body-parser')
var fs = require('fs')
var SfBaiduParser = require("./lib/sf_baidu_parser")


/**
 * set and start web server
 */
var app = express();
var xxx = new SfBaiduParser('http://rj.baidu.com')
app.listen(process.env.PORT, process.env.IP, function () {
  console.log('Server started on ' + process.env.IP + ':' + process.env.PORT)
})

/**
* web routes
*/
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.get('/scrape', urlencodedParser, function(req, res){
    var expect_event = xxx.get_groups(false)
    res.redirect('/result')
});

app.get('/result', function (req,res){
    res.send(Object.keys(xxx.db.groups).join(','))
})