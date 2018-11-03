var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var fs = require("fs");
var sqlite3 = require('sqlite3').verbose();
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Database file
var db = new sqlite3.Database('./hackathon-demo.db');

function trim (str) {
  return str.replace(/[\s]/g, '');
}

// add functions
async function runJavaInstance(first_name, contact_number, customer_email, customer_postcode, customer_address) {
  let sql = `SELECT first_name, last_name, customer_phone, customer_email, customer_postcode, customer_address FROM CustomerDetails ORDER BY RANDOM() LIMIT 1;`
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach(row => {
      console.log(row);
      exec('./order.sh' + " " + row.first_name + " " + row.customer_phone + " " + row.customer_email + " "  + trim(row.customer_postcode)  + " " + row.customer_address);
      console.log("Pizza donation sent to " + row.first_name + " " + row.last_name)
    });
    
  });

}

app.use(express.static("www"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/personDetails", function(req, res) {
  res.sendFile(__dirname + "/www/personDetails.html");
});

app.get("/confirmation", (req, res) => {
  res.sendFile(__dirname + "/www/confirmation.html");
  runJavaInstance();
})

// database functions 
db.serialize(function() {  
  db.run("CREATE TABLE IF NOT EXISTS OrderDetails(order_id INTEGER PRIMARY KEY AUTOINCREMENT, order_quantity INTEGER, add_to_db VARCHAR(5))"); 
  db.run("CREATE TABLE IF NOT EXISTS CustomerDetails(customer_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name VARCHAR(50), last_name VARCHAR(50), customer_address VARCHAR(100), customer_postcode VARCHAR(20), customer_email VARCHAR(50), customer_phone VARCHAR(20))")
});  

app.post("/", function(req, res) {
  var orderQuantity = req.body.orderQuantity;
  var addToFutureList = req.body.addToFutureList;
  db.serialize(() => {
    var stmt = db.prepare('INSERT INTO OrderDetails (order_quantity, add_to_db) VALUES(?,?)');
    stmt.run(orderQuantity,addToFutureList)
    stmt.finalize();
  })
  console.log(orderQuantity)
  res.redirect("/personDetails");

});

app.post('/personDetails', function(req, res) {
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var address = req.body.address;
    var postcode = req.body.postcode;
    var email = req.body.email;
    var phone = req.body.phone;
    db.serialize(() => {
      var stmt = db.prepare('INSERT INTO CustomerDetails (first_name, last_name, customer_address, customer_postcode, customer_email, customer_phone) VALUES(?,?,?,?,?,?)');
      stmt.run(firstName, lastName, address, postcode, email, phone);
      stmt.finalize();
    });

    res.redirect("/confirmation");


})

app.listen(8000);
