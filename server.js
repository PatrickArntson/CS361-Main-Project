const express = require('express')
const app = express();
const exphbs = require('express-handlebars');
const MongoClient = require('mongodb').MongoClient;
const Port = process.env.port || 4000;
const fetch = require('cross-fetch');
const alertUsers = require('./alertUsers');
require('dotenv').config();

app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.engine('.handlebars', exphbs({ defaultLayout: 'main', extname: '.handlebars' }));
app.set('view engine', '.handlebars');

// Set up and connect to db
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('database is sucessfuly connected')
});
// Database Collections
const userCollection = client.db("cs361_databases").collection("users");
const tickerCollection= client.db("cs361_databases").collection("tickers");



// GET request routes
app.get('/', (req,res) => {
    res.render('login');
    return;
})

app.get('/login', (req,res) => {
    res.render('login');
    return;
})

app.get('/dashboard', (req,res) => {
    res.render('login');
    return;
})

app.get('/register', (req,res) => {
    res.render('register');
    return;
})


// POST request routes
app.post('/dashboard', async (req, res) => {
    var context = {};

    if (req.body['login']){
        // connect to login microserver here to authenicate login
        authenicate = true;
        loginService = async () => {
            try {
                const fetchRepsonse = await fetch('http://flip3.engr.oregonstate.edu:7070/login', {
                    method: "POST",
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: req.body['email'],
                        password: req.body['password'], 
                        collection: 'StockUser'
                    })
                })
                const data = await fetchRepsonse.json()
                console.log(data);
                if (data['errorMessage']){
                    context.alert2 = true;
                    res.render('login', context);
                }
                if(data['userNotFound'] == true){
                    context.alert = true;
                    console.log(context);
                    res.render('login', context);
                    return;
                }
                if(data['successfulLogin'] == true){
                    context.userData = [];
                    context.user = req.body['email'];
                    // find user data from database
                    var findUserData = await userCollection.find({email: req.body['email']}).toArray();
                    // if user has no stocks (new user)
                    if (findUserData.length == 0){
                        res.render('dashboard', context);
                        return;
                    }
                    for(i = 0; i < findUserData[0]['data'].length; i++){
                        completeData = findUserData[0]['data'][i];
                        completeData.user = req.body['email'];
                        context.userData.push(completeData);
                    }
                    // render dashboard with users data
                    console.log(context);
                    res.render('dashboard', context);
                    return;
                }
                else if(data['successfulLogin'] == false){
                    console.log(req.body.password);
                    context.alert = true;
                    res.render('login', context);
                    return;
                }

            } catch (e) {
                context.alert2 = true;
                res.render('login', context);
                return console.log(e);
            }
        }
        loginService();
    }

    if (req.body['save']){
        // convert direction to bool
        if(req.body['direction']){
            direction = true;
        } else {
            direction = false;
        }
        // convert price string to float
        price = parseFloat(req.body['price']);
        try {
            await userCollection.updateOne({email: req.body['save'], 'data.ticker' : req.body['ticker']}, { $set: {'data.$.ticker': req.body['ticker'],  'data.$.price': price, 'data.$.direction': direction}});
            context.userData = [];
            context.user = req.body['save'];
            // find user data from database
            var findUserData = await userCollection.find({email: req.body['save']}).toArray();
            for(i = 0; i < findUserData[0]['data'].length; i++){
                completeData = findUserData[0]['data'][i];
                completeData.user = req.body['save'];
                context.userData.push(completeData);
            }
            // render dashboard with users data
            console.log(context);
            res.render('dashboard', context);
            return;
        } catch (e) {
            return console.log(e);
        }
    }

    if (req.body['delete']){
        console.log('delete me!')
        try {
            await userCollection.updateOne({email: req.body['delete']},{ $pull:{data : {ticker : req.body['ticker']}}});
            context.userData = [];
            context.user = req.body['delete'];
            // find user data from database
            var findUserData = await userCollection.find({email: req.body['delete']}).toArray();
            for(i = 0; i < findUserData[0]['data'].length; i++){
                completeData = findUserData[0]['data'][i];
                completeData.user = req.body['delete'];
                context.userData.push(completeData);
            }
            // render dashboard with users data
            console.log(context);
            res.render('dashboard', context);
            // decrease number of users for ticker in ticker Collection
            var tickersVerification = await tickerCollection.find({ticker: req.body['ticker'].toUpperCase()}, {numOfUsers: 1}).toArray();
            if (tickersVerification[0]['numOfUsers'] == 1){
                await tickerCollection.deleteOne({ticker: req.body['ticker'].toUpperCase()});
            } else {
                await tickerCollection.updateOne({ticker: req.body['ticker'].toUpperCase()}, { $inc: {numOfUsers: -1}});
            }
            return;
        } catch (e) {
            return console.log(e);
        }
    }

    if(req.body['add-stock']){
        // if user doesnt input anything in the ticker field
        if (req.body['ticker'] == ''){
            try {
                context.alert1 = true;
                context.userData = [];
                context.user = req.body['add-stock'];
                // find user data from database
                var findUserData = await userCollection.find({email: req.body['add-stock']}).toArray();
                for(i = 0; i < findUserData[0]['data'].length; i++){
                    completeData = findUserData[0]['data'][i];
                    completeData.user = req.body['add-stock'];
                    context.userData.push(completeData);
                }
                // render dashboard with users data
                console.log(context);
                res.render('dashboard', context);
                return;
            } catch (e) {
                return console.log(e);
            }
        }
        var verifyStock = await userCollection.find({ email: req.body['add-stock'], 'data.ticker': req.body['ticker'].toUpperCase()}).toArray();
        // if user already has that ticker in their database
        if (verifyStock.length > 0){
            try {
                context.alert2 = true;
                context.userData = [];
                context.user = req.body['add-stock'];
                // find user data from database
                var findUserData = await userCollection.find({email: req.body['add-stock']}).toArray();
                for(i = 0; i < findUserData[0]['data'].length; i++){
                    completeData = findUserData[0]['data'][i];
                    completeData.user = req.body['add-stock'];
                    context.userData.push(completeData);
                }
                // render dashboard with users data
                console.log(context);
                res.render('dashboard', context);
                return;
            } catch (e) {
                return console.log(e);
            }
        } 
        // convert direction to bool
        if(req.body['direction']){
            direction = true;
        } else {
            direction = false;
        }
        // convert price string to float
        price = parseFloat(req.body['price']);
        try{
            // add stock to user collection
            await userCollection.updateOne({email: req.body['add-stock']}, { $addToSet : {data : {'ticker': req.body['ticker'].toUpperCase(), 'price': price, 'direction': direction}}}, false, true);
            context.userData = [];
            context.user = req.body['add-stock'];
            // find user data from database
            var findUserData = await userCollection.find({email: req.body['add-stock']}).toArray();
            for(i = 0; i < findUserData[0]['data'].length; i++){
                completeData = findUserData[0]['data'][i];
                completeData.user = req.body['add-stock'];
                context.userData.push(completeData);
            }
            // render dashboard with users data
            console.log(context);
            res.render('dashboard', context);
            // increase number of users for ticker in ticker Collection
            var tickersVerification = await tickerCollection.find({ticker: req.body['ticker'].toUpperCase()}).toArray();
            if (tickersVerification.length == 1){
                await tickerCollection.updateOne({ticker: req.body['ticker'].toUpperCase()}, { $inc: {numOfUsers: 1}});
            } else {
                await tickerCollection.insertOne({ticker: req.body['ticker'].toUpperCase(), currentPrice: 0.00, numOfUsers: 1});
            }
            return;
        } catch (e) {
            return console.log(e);
        }
    }
    return;
})


app.post('/register', async (req, res) => {
    var context = {}
    try {
        const fetchRepsonse = await fetch('http://flip3.engr.oregonstate.edu:7070/register', {
            method: "POST",
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: req.body['email'],
                password: req.body['password'], 
                collection: 'StockUser'
            })
        })
        const data = await fetchRepsonse.json()
        console.log(data);
        if (data['errorMessage']){
            context.alert2 = true;
            res.render('register', context);
        }
        if (data['alreadyRegistered'] == true){
            context.alert = true;
            res.render('register', context);
        } else {
            await userCollection.insertOne({email: req.body['email'], data:[]});
            res.render('login');
        }
        return;
    } catch (e) {
        context.alert2 = true;
        res.render('login', context);
        return console.log(e);
    }
})


app.listen(Port, () => console.log('Server is running'));