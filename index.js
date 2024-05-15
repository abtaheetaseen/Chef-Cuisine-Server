const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.use(cors({
    origin: [
        "https://chef-cuisine-f99ae.firebaseapp.com",
        "https://chef-cuisine-f99ae.web.app"
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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

// middlewares
const logger = (req, res, next) => {
    console.log("log info: ", req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({message: "Unauthorized Access"})
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if(err){
            return res.status(401).send({message: "Unauthorized Access"})
        }
        req.user = decoded;
        next();
    })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    // post users
    const userCollection = client.db("chefCuisineDB").collection("users");
    const foodCollection = client.db("chefCuisineDB").collection("foods");
    const orderCollection = client.db("chefCuisineDB").collection("orders");
    const feedbackCollection = client.db("chefCuisineDB").collection("feedbacks");

    // jwt related work
    app.post("/jwt", async (req, res) => {
        const user = req.body;
        console.log("user for token", user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "1d"})

        res
        .cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "strict"
        })
        .send({success: true})
    })

    // when logout token not in cookie
    app.post("/logout", async (req, res) => {
        const user = req.body;
        console.log("logging out", user);
        res.clearCookie("token", {maxAge: 0}).send({success: true})
    })

    // registered users
    app.post("/users", async(req, res) => {
        const user = req.body;
        const existingEmail = await userCollection.findOne({email: user.email})
        if(existingEmail) {
            console.log("User already exist in db")
            return;
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

    // post foods
    app.post("/foods", async (req, res) => {
        const foodItem = req.body;
        const result = await foodCollection.insertOne(foodItem);
        res.send(result);
    })

    // get all food with count sorting for top food section
    app.get("/foods", async (req, res) => {
        let query = {};
        if(req.query.email){
            query = { email: req.query.email }
        }

        const cursor = foodCollection.find(query).sort({"count": -1});
        const result = await cursor.toArray();
        res.send(result);
    })

    // get all food with name sorting for top food section
    app.get("/allFoods", async (req, res) => {
        const page = parseInt(req.query.page);
        const size = parseInt(req.query.size);
        const filter = req.query;
        console.log("search query", filter)
        

        let query = {
            foodName: {$regex: filter.search, $options: "i"}
        };

        // if(req.query.foodName){
        //     query = { foodName: req.query.foodName }
        // }

        const cursor = foodCollection.find(query).sort({"foodName": 1});
        const result = await cursor.skip(page * size).limit(size).toArray();
        res.send(result);
    })

    // total number of counts of allFoods for pagination
    app.get("/totalFoodsCount", async (req, res) => {
        const totalFoodsCount = await foodCollection.estimatedDocumentCount();
        res.send({totalFoodsCount})
    })

    // get single food by id
    app.get("/allFoods/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id : new ObjectId(id) };
        const result = await foodCollection.findOne(query);
        res.send(result);
    })

    // update single food item
    app.put("/allFoods/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id : new ObjectId(id) };
        const options = { upsert: true };
        const updatedFoodItem = req.body;
        const updatedDoc = {
            $set: {
                foodName: updatedFoodItem.foodName,
                foodImage: updatedFoodItem.foodImage,
                category: updatedFoodItem.category,
                quantity: updatedFoodItem.quantity,
                price: updatedFoodItem.price,
                foodOrigin: updatedFoodItem.foodOrigin,
                description: updatedFoodItem.description,
                name: updatedFoodItem.name,
                email: updatedFoodItem.email,
            }
        }

        const result = await foodCollection.updateOne(filter, updatedDoc, options);
        res.send(result);
    })

    // post user orders and update quantity and count on foodCollection
    app.post("/orders", async (req, res) => {
        const {foodId} = req.body;
        const {buyerQuantity} = req.body;
        const orderedItem = req.body;

        const foodResult = await foodCollection.findOneAndUpdate(
            { _id : new ObjectId(foodId), quantity: {$gt: 0} },
            {  $inc: { count: parseInt(buyerQuantity), quantity: -buyerQuantity } },
        )
        console.log(foodResult)

        const result = await orderCollection.insertOne(orderedItem);
        res.send(result);

    })

    // get specific user orders by email
    app.get("/orders", logger, verifyToken, async (req, res) => {
        console.log("token owner info : ", req.user)
        if(req.user.email !== req.query.email){
            return res.status(403).send({message: "Forbidden Access"})
        }
        let query = {};
        if(req.query?.email){
            query = {buyerEmail: req.query.email}
        }
        const result = await orderCollection.find(query).toArray();
        res.send(result);
    })

    // delete specific user order by user
    app.delete("/orders/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id : new ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);
    })

    // post method for gallery & feedbacks
    app.post("/feedbacks", async (req, res) => {
        const userFeedBack = req.body;
        const result = await feedbackCollection.insertOne(userFeedBack);
        res.send(result);
    })

    // get specific user feedback
    app.get("/feedbacks",  async (req, res) => {
        
        const result = await feedbackCollection.find().toArray();
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