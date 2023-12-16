const fs = require("fs");
const path = require("path");
const ejs = require('ejs');
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const app = express();
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(express.static(__dirname));


const portNumber = process.argv[2];
const prompt = "Stop to shutdown the server: ";
const exitMessage = "Shutting down the server";

app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);
process.stdout.write(prompt);
process.stdin.on("readable", function () {
    let dataInput = process.stdin.read();
    let command = String(dataInput).trim();
    if (command === "stop") {
        process.stdout.write(exitMessage);
        process.exit(0);
    }
});

app.get("/", (request, response) => {
    const variables = {
        portEJS : portNumber
    };
    response.render("home", variables);
});

app.get("/saveJoke", (request,response) => {
    const variables = {
        portEJS : portNumber
    };
    response.render("saveJoke", variables);
});


let completeJoke;
let jokesTable;

async function main() {
    app.use(bodyParser.urlencoded({extended:false}));
    app.post("/getJoke", async (request, response) => {
        let jokeType = request.body.type;
        let jokeObjectBody = await loadJokeArray(jokeType);
        let randomizedJoke = jokeObjectBody[Math.floor(Math.random() * jokeObjectBody.length)];
        console.log(randomizedJoke);
        let setup = randomizedJoke.setup;
        let punchline = randomizedJoke.punchline;
        
        completeJoke = `${setup}<br>${punchline}`;

        const variables = {
            jokeType : jokeType,
            dadJoke : completeJoke,
            portEJS : portNumber
        };
        response.render("getJoke", variables);
    });

    const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    try {
        app.use(bodyParser.urlencoded({extended:false}));
        app.post("/saveJoke", async (request, response) => {
            await client.connect();
            let jokeHolder = {joke: completeJoke};
            await insertJoke(client, databaseAndCollection, jokeHolder);
            const variables = {
                portEJS : portNumber
            };
            response.render("saveJoke", variables);
        });
        
        app.get("/savedJokes", async (request, response) => {
            await client.connect();
            const cursor = client.db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection).find();
            const result = await cursor.toArray();
            jokesTable = `<table border=1><tr><th>Jokes</th></tr>`;
            result.forEach(entry => {
                jokesTable += `<tr><td>${entry.joke}</td></tr>`;
            });
            jokesTable += `</table>`;
            const variables = {
                jokesTable : jokesTable,
                portEJS : portNumber
            };
            response.render("savedJokes", variables);
        });

        app.get("/removedJokes", async (request, response) => {
            await client.connect();
            const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .deleteMany({});
            const variables = {
                portEJS : portNumber
            };
            response.render("removedJokes", variables);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

};

async function loadJokeArray(jokeType) {
    const fetch = require("node-fetch");
    const url = `https://dad-jokes.p.rapidapi.com/joke/type/${jokeType}`;
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': 'ded2b8dec1mshd79161b47aeb6bcp1f2819jsn01ab40206333',
        'X-RapidAPI-Host': 'dad-jokes.p.rapidapi.com'
      }
    };

    try {
        const response = await fetch(url, options);
        const result = await response.json(); 
        return result.body;
    } catch (error) {
        console.error(error);
    }
  }

async function insertJoke(client, databaseAndCollection, newJoke) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newJoke);
}

  main();