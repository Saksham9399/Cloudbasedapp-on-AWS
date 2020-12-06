//Created by Saksham Agarwal-19323666
const SERVER_PORT =3000;
const express = require("express")
const path = require("path")
const app = express()
const AWS = require("aws-sdk");
const fs = require("fs");

AWS.config.update({
    region: "us-east-1"
});

const AWS_BUCKET = "csu44000assign2useast20";
const AWS_FILENAME = "moviedata.json";
const TABLE = "Movies";

var s3params = {
    Bucket: AWS_BUCKET,
    Key: AWS_FILENAME
}

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

let publicPath = path.resolve(__dirname, "public")
app.use(express.static(publicPath))
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname + "/client.html"))
})

app.listen(SERVER_PORT,() => console.log('Server running on port:'+ SERVER_PORT))

app.post('/create', (req, res) => {
    console.log("Creating Table")
    var params = {
        TableName: TABLE,
        KeySchema: [
            { AttributeName: "year", KeyType: "HASH" },  //Partition key
            { AttributeName: "title", KeyType: "RANGE" }  //Sort key
        ],
        AttributeDefinitions: [
            { AttributeName: "year", AttributeType: "N" },
            { AttributeName: "title", AttributeType: "S" }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };


    dynamodb.createTable(params, function (err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });

    var s3 = new AWS.S3();
    
    //Adding movies to the database

    s3.getObject(s3params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
        } else {
            var allMovies = JSON.parse(data.Body.toString());
             allMovies.forEach(function (movie) {
                var params = {
                    TableName: TABLE,
                    Item: {
                        "year": movie.year,
                        "title": movie.title,
                        "rating": movie.info.rating,
                        "release": movie.info.release_date
                    }
                };

                docClient.put(params, function (err, data) {
                    if (err) {
                        console.error("Unable to add movie", movie.title, ". Error JSON:", JSON.$
                    } else {
                        console.log("Addition of Movie Successful:", movie.title);
                    }
                });
            });
        }
        console.log("Database created successfully");
    })
});

//Query the database
app.post('/query/:title/:year', (req, res) => {
    console.log("...")
    var myArray = {
        myList :[]
    }
    var year = parseInt(req.params.year)
    var title = req.params.title
    var params = {
        TableName : TABLE,
        ProjectionExpression:"#year, title, rating, #release",
        KeyConditionExpression: "#year = :yyyy and begins_with (title, :titleStart)",
        ExpressionAttributeNames:{
            "#year": "year",
            "#release":"release"
        },
        ExpressionAttributeValues: {
            ":yyyy": year,
            ":titleStart": title
        }
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function(item) {
                console.log(item.year +'  '+ item.title);
                var yearPush = item.year
                var titlePush = item.title
                var ratingPush = item.rating
                var releasePush = item.release
                myArray.myList.push(
                    {
                        Title: titlePush,
                        Year : yearPush,
                        Rating: ratingPush,
                        Release: releasePush
                    }
                )
            });
            console.log('Movies are printed')
            res.json(myArray)
        }
    });
});

app.post('/destroy', (req, res) => {
    console.log("Destroying");
    var params = {
        TableName : TABLE,
    };
    dynamodb.deleteTable(params, function(err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });
});