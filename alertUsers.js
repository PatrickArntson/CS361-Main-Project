const express = require('express')
const app = express();
const MongoClient = require('mongodb').MongoClient;
const fetch = require('cross-fetch');
const nodemailer = require('nodemailer');
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// connect to database
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('database is sucessfuly connected')
    getStockData();
    emailUsers();
});
const userCollection = client.db("cs361_databases").collection("users");
const tickerCollection= client.db("cs361_databases").collection("tickers");


// global for checking stock prices. Ex. { ticker1: value, ticker2: value}
var stockPriceData = { AAPL: 205, MSFT: 301};

// Set up emailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
    }
});
var mailOptions = {
    from: process.env.EMAIL,
    to: null,
    subject: 'Stock Price Alert',
    text: null
};


// function to retrieve stock tickers from database, retrieve stock prices from API, write stock prices to stockPriceData
async function getStockData() {
    // get array of all current tickers
    try {
        var findStockData = await tickerCollection.find().toArray();
        // call Josh's micoservice on all tickers in the findStockData array
        for(let i = 0; i < findStockData.length; i++){
            // add stock name and price to global object stockPriceData
            // stockPriceData[findStockData[i]] = {joshsAPI(findStockData[i])}
            console.log(findStockData[i]['ticker']);
        }
    } catch (err){
        console.log(err);
    }
    return;
}

// Once getStockData() has been run, this function emails alerts to users if their stock targets have hit
async function emailUsers(){
    try {
        var findUserData = await userCollection.find().toArray();
        // for each user
        for (let i = 0; i < findUserData.length; i++){
            // reset mailOptions
            mailOptions['to'] = null;
            mailOptions['text'] = null;
            var alertForUser = {}
            // if user has stocks on their watch list
            if (findUserData[i]['data'].length > 0){
                // for every stock on their watch list
                for (let j = 0; j < findUserData[i]['data'].length; j++){
                    // if user wants to be notified if stock is above target price
                    if (findUserData[i]['data'][j]['direction'] == true){
                        if (stockPriceData[findUserData[i]['data'][j]['ticker']] > findUserData[i]['data'][j]['price']){
                            // setting alertForUser { ticker: currPrice }
                            alertForUser[findUserData[i]['data'][j]['ticker']] = stockPriceData[findUserData[i]['data'][j]['ticker']];
                        }
                    }
                    // if user wants to be notified if stock is below target price 
                    else {
                        if (stockPriceData[findUserData[i]['data'][j]['ticker']] < findUserData[i]['data'][j]['price']){
                            // setting alertForUser { ticker: currPrice }
                            alertForUser[findUserData[i]['data'][j]['ticker']] = stockPriceData[findUserData[i]['data'][j]['ticker']];
                        }
                    }
                }
                var messageForUser = '';
                for (alert in alertForUser){
                    // might not be necessary if API brings back strings for prices instead of ints
                    var stringPrice = alertForUser[alert].toString();
                    messageForUser += (`${alert} hit your target! Current price is ${stringPrice} \n`);
                }

                // Email alerts to user
                mailOptions['to'] = findUserData[i]['email'];
                mailOptions['text'] = messageForUser;

                await transporter.sendMail(mailOptions, function(err, data){
                    if (err){
                        console.log(err);
                    } else {
                        console.log('Email has sent');
                    }
                });
            }
        }
    } catch (err)  {
        console.log(err);
    }
}

