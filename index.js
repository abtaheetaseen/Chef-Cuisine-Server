// chef-cuisine
// yZTsvw2yUch7k09H
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Chef-Cuisine Server')
})

app.listen(port, () => {
    console.log(`server running on ${port}`)
})