const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
require("dotenv").config()

app.use(cors());
app.use(express.json());

// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.ofi7kql.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    // post users
    const userCollection = client.db("chefCuisineDB").collection("users");
    const foodCollection = client.db("chefCuisineDB").collection("foods");
    const orderCollection = client.db("chefCuisineDB").collection("orders");

    app.post("/users", async(req, res) => {
        const user = req.body;
        console.log(user)
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    // post foods
    app.post("/foods", async (req, res) => {
        const foodItem = req.body;
        console.log(foodItem)
        const result = await foodCollection.insertOne(foodItem);
        res.send(result);
    })

    // get all food with count sorting for top food section
    app.get("/foods", async (req, res) => {
        const cursor = foodCollection.find().sort({"count": -1});
        const result = await cursor.toArray();
        res.send(result);
    })

    // get all food with name sorting for top food section
    app.get("/allFoods", async (req, res) => {
        const cursor = foodCollection.find().sort({"foodName": 1});
        const result = await cursor.toArray();
        res.send(result);
    })

    // get single food by id
    app.get("/allFoods/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id : new ObjectId(id) };
        const result = await foodCollection.findOne(query);
        res.send(result);
    })

    app.post("/orders", async (req, res) => {
        const {foodId} = req.body;
        const {buyerQuantity} = req.body;
        const orderedItem = req.body;
        // console.log(orderedItem);
        // console.log(foodId);
        // console.log(buyerQuantity);

        const foodResult = await foodCollection.findOneAndUpdate(
            { _id : new ObjectId(foodId), quantity: {$gt: 0} },
            {  $inc: { count: parseInt(buyerQuantity), quantity: -buyerQuantity } },
        )
        console.log(foodResult)

        const result = await orderCollection.insertOne(orderedItem);
        res.send(result);

    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Chef-Cuisine Server')
})

app.listen(port, () => {
    console.log(`server running on ${port}`)
})