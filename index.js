const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// const uri = "mongodb://localhost:27017";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.g5zarfc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCollection = client.db("laptoTech").collection("products");
    const categoryCollection = client.db("laptoTech").collection("category");
    const bookingCollection = client.db("laptoTech").collection("bookings");
    const usersCollection = client.db("laptoTech").collection("users");

    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    // app.get("/products/:id", async (req, res) => {
    //   const product_id = req.params.id;
    //   const query = { _id: ObjectId(product_id) };
    //   const result = await productsCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    // app.get("/category/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = category.filter((n) => n.product_id === id);
    //   const result = await productsCollection.find(query);

    //   res.send(result);
    // });

    app.get("/products/product_id/:id", async (req, res) => {
      const id = req.params.id;
      const query = { product_id: id };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // get bookings

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // /////Post method

    app.post("/bookings", async (req, res) => {
      const booking = req.body;

      const query = {
        productName: booking.productName,
        email: booking.email,
      };
      const alreadyBooked = await bookingCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have booking on ${booking.productName}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // post user

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

// ////////////////////////////////////////////////////////////////

app.get("/", (req, res) => {
  res.send("Laptotech server is running");
});

app.listen(port, () => {
  console.log(`Laptotech server is running on port, ${port}`);
});
