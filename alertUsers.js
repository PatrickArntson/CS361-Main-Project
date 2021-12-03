const express = require('express')
const app = express();
const MongoClient = require('mongodb').MongoClient;
const fetch = require('cross-fetch');
const nodemailer = require('nodemailer');
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// connect to database and run main program every 30 seconds
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('database is sucessfuly connected')
    main();
    setInterval(function(){main()}, 30000);
});
const userCollection = client.db("cs361_databases").collection("users");
const tickerCollection= client.db("cs361_databases").collection("tickers");


// global for checking stock prices. Ex. { ticker1: value, ticker2: value}
var stockPriceData = {};


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


// main function that runs every 30 seconds 
async function main(){
    try {
        // if the US stock market is currently open
        if (marketOpen()){
            var getData = await getStockData();
            var sendAlert = await emailUsers();
            getData;
            sendAlert;  
        } else {
            console.log('market is closed');
        }
    } catch (e){
        return console.log(e);
    }
}


// checks day and time to see if market is open
function marketOpen(){
    let date_ob = new Date();
    let time = date_ob.getHours() + (date_ob.getMinutes()/60);
    let day = date_ob.getDay();
    if ((6.5 <= time && time < 13) && (1 <= day && day <= 5)){
        return true;
    }
    return false
}


// function to retrieve stock tickers from database, retrieve stock prices from API, write stock prices to stockPriceData
async function getStockData(){
    // get array of all current tickers
    stockPriceData = {};
    try {
        // get all current stock tickers that are being watched
        var findStockData = await tickerCollection.find().toArray();
        for(let i = 0; i < findStockData.length; i++){
            // call Josh's micoservice on all tickers in the findStockData array
            const fetchRepsonse = await fetch('http://flip2.engr.oregonstate.edu:4797/api/v1/8242315161718/scrape/yahoofinance', {
                    method: "POST",
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ticker: findStockData[i]['ticker']
                    })
                })
            const data = await fetchRepsonse.json();
            
            // the commented code below is for when the josh's microservice sometimes sends strings instead of floats
            // var price = data['current-price'].split(',').join('');

            // add stock name and price to global object stockPriceData
            var price = data['current-price'];
            price = parseFloat(price);
            stockPriceData[findStockData[i]['ticker']] = price;
        }
    } catch (err){
        console.log(err);
    }
    console.log(stockPriceData);
    return;
};


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
                var count = 0;
                for (alert in alertForUser){
                    // might not be necessary if API brings back strings for prices instead of ints
                    var stringPrice = alertForUser[alert].toString();
                    messageForUser += (`${alert} hit your target! Current price is ${stringPrice} \n`);
                    count++;
                }
                
                if (count > 0){
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
        }
    } catch (err)  {
        console.log(err);
    }
}

