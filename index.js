const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.g5zarfc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  // console.log("token inside", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productsCollection = client.db("laptoTech").collection("products");
    const categoryCollection = client.db("laptoTech").collection("category");
    const bookingCollection = client.db("laptoTech").collection("bookings");
    const usersCollection = client.db("laptoTech").collection("users");
    const myProductsCollection = client
      .db("laptoTech")
      .collection("myProducts");
    const advertiseCollection = client.db("laptoTech").collection("advertise");

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

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/products/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category: id };
      const result = await productsCollection.find(query).toArray();

      res.send(result);
    });

    // get bookings

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
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

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send({ accessToken: "Unauthorized user" });
    });

    // Get all users

    app.get("/users", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // Make admin

    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // make seller
    app.put("/users/seller/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "seller",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //  check the user is seller or not
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    // allSellers

    app.get("/users/seller", async (req, res) => {
      const email = req.body.email;
      const query = { role: "seller" };
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });
    // allBuyers

    app.get("/users/buyers", async (req, res) => {
      const email = req.body.email;
      const query = { role: "user" };
      const user = await usersCollection.find(query).toArray();
      res.send(user);
    });

    // check the user is admin or not

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // post my products

    app.post("/myProducts", verifyJWT, async (req, res) => {
      const myProduct = req.body;
      const result = await myProductsCollection.insertOne(myProduct);
      res.send(result);
    });

    app.get("/myProducts", verifyJWT, async (req, res) => {
      const query = {};
      const result = await myProductsCollection.find(query).toArray();
      res.send(result);
    });
    // advertise

    app.post("/advertise", async (req, res) => {
      const advertise = req.body;
      const result = await myProductsCollection.insertOne(advertise);
      res.send(result);
    });

    app.get("/advertise", async (req, res) => {
      const query = {};
      const result = await myProductsCollection.find(query).toArray();
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
