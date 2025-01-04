/**
    Database Connection
**/
module.exports = function() {
	/* Variables */
	this.connection = null;
	this.mysql = require("mysql");
	
	/**
    SQL Setup
    Creates the connection to the database and then loads all the stats afterwards
    */
	this.sqlSetup = function() {
		// Create connection
		connection = mysql.createConnection({
			host     :  config.db.host,
			user     : config.db.user,
			password : config.db.password,
			database : config.db.database,
			charset: "utf8mb4",
            supportBigNumbers : true
		});
		// Connection connection
		connection.connect(err => {
			if(err) console.log(err);
		});
	}

	/**
    SQL Query
    Does a sql query and calls one callback with result on success and logs an error and calls another callback on failure
    Basically a wrapper for sqlQuery with mode=0
    **/
	this.sql = function(q, rC, eC) {
		sqlQuery(q, rC, eC, 0)
	}
	
	/**
    SQL Query (Internal)
    Does SQL Queries. Should only be called internally from other sql functions
    The universal sql query function. Takes a query and two callbacks, and optionally a mode value.
    Modes:
    0: Default query, resolves the promise with the query's result
    1: Either resolves with result[0].value if result[0] is set or runs the error callback
    */
	this.sqlQuery = function(query, resCallback = ()=>{}, errCallback = ()=>{}, mode = 0) {
		// Do query
		connection.query(query, function(err, result, fields) {
			// Check success
			if(!err && result) { 
				// Check which mode and return result accordingly
				switch(mode) {
					case 0: resCallback(result); break;
					case 1: result[0] ? resCallback(result[0].value) : errCallback(); break;
					default: resCallback(result); break;
				}
			} else { 
				// Handle error
				console.log(err);
				errCallback();
			}
		});
	}
    
    /**
    SQL Promise
    Does a sql query as a promise
    **/
    this.sqlProm = function(query) {
        return new Promise(res => {
              sql(query, result => {
                  res(result);
              });
        });
    }
    
    this.sqlPromOne = function(query) {
        return new Promise(res => {
              sql(query, result => {
                  res(result[0] ?? null);
              });
        });
    }
    
    /**
    SQL Promise (Escaped)
    Does a sql query as a promise and appends an escaped value which was parsed unescaped as a second parameter
    **/
    this.sqlPromEsc = function(query, val) {
        return sqlProm(query + connection.escape(val));
    }
    
    this.sqlPromOneEsc = function(query, val) {
        return sqlPromOne(query + connection.escape(val));
    }
	
}
