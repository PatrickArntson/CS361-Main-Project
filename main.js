const express = require('express')
const app = express();
const exphbs = require('express-handlebars');
// const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
// const { MongoClient } = require('mongodb');
const Port = process.env.port || 4000;
// const User = require('./users'); 
require('dotenv').config();

app.use(express.urlencoded({ extended: true}));
app.use(express.json());
app.engine('.handlebars', exphbs({ defaultLayout: 'main', extname: '.handlebars' }));
app.set('view engine', '.handlebars');

// Set up and connect to db
const uri = process.env.DATABASE_URL;
// const connectDB = async()=>{
//     await mongoose.connect(uri);
//     console.log('database is succesfully connected');
// }
// connectDB();
// const db = 'cs361_databases';
// const collection = MongoClient.collection('users');
// MongoClient.connect(uri, (err, client) =>{
//     if(err){
//         console.log('Db connection error')
//     }
//     console.log('database is sucessfuly connected')
// })
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    console.log('database is sucessfuly connected')
});
const collection = client.db("cs361_databases").collection("users");


// GET request routes
app.get('/', (req,res) => {
    res.render('login');
})

// Remember to change this route back to 'login' page, so that everyone has to log in to reach dashboard!!
app.get('/dashboard', (req,res) => {
    res.render('dashboard');
})

app.get('/register', (req,res) => {
    res.render('register');
})

app.get('/dashboard-special', async(req,res) => {
    console.log('started');
    try {
        // await collection.insertOne({email: 'test3@123.com', data:[{ticker: 'MSFT', price: 301.50, direction: 'Above'}]});
        // var findResult = await collection.find({}).toArray();
        // console.log('Found documents =>', findResult);
        // await collection.updateOne({email: 'test2@123.com', 'data.ticker' : 'AAPL'}, { $set: {"data.$.ticker": "MSFT"}});
        await collection.updateOne({email: 'test2@123.com'}, { $addToSet : {data : {'ticker': 'TSLA', 'price': 2000, 'direction': 'above'}}}, false, true);
        var findResult = await collection.find({email: "test2@123.com"}).toArray();
        for(i = 0; i < findResult[0]['data'].length; i++){
            console.log(findResult[0]['data'][i]['ticker']);
        }
        console.log('Found documents =>', findResult[0]['data'])
        // await collection.updateOne({email: 'test2@123.com', 'data.ticker' : 'MSFT'}, { $set: {'data.$.ticker': 'AAPL',  'data.$.price': 400, 'data.$.direction': 'Below'}});
        // await collection.deleteOne({email: 'test3@123.com'});
        // findResult = await collection.find({}).toArray();
        // console.log('Found documents =>', findResult)
    } catch (err) {
        console.log('error')
    }
    console.log('finished');
    res.render('dashboard');
    return;
})


// POST request routes
app.post('/dashboard', (req, res) => {

    if (req.body['login']){
        // connect to login microserver here to authenicate login
        console.log(req.body['email']);
    }

    if (req.body['save']){
        if (req.body['price-direction']){
            console.log(req.body['price-direction']);
        }
        if (!req.body['price-direction']){
            console.log('it worked!');
        }
    }

    if (req.body['delete']){
        console.log('delete me!')
    }

    console.log(req.body);
    var context = {};
    context.email = req.body.email;
    res.render('dashboard', context);
    return;
})

app.listen(Port, () => console.log('Server is running'));