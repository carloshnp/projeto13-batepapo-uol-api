import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
  await mongoClient.connect();
} catch (err) {
  console.log(err);
}

const db = mongoClient.db("projeto13_batepapo_uol_api");
const usersCollection = db.collection("users");
const msgCollection = db.collection("msg");

const userSchema = joi.object({
  name: joi.string().required(),
});

app.post("/participants", async (req, res) => {
  const user = req.body;
  try {
    const isUser = await usersCollection.findOne({ name: user.name });
    if (isUser) {
      return res
        .status(409)
        .send({ message: "Já existe um participante com esse nome" });
    }
    const { validationError } = userSchema.validate(user, {
      abortEarly: false,
    });
    if (validationError) {
      const errors = validationError.details.map((detail) => detail.message);
      return res.status(400).send(errors);
    }
    const time = Date.now();
    const adjustTime = dayjs(time).format("HH:mm:ss");
    await usersCollection.insertOne({ ...user, lastStatus: time });
    await msgCollection.insertOne({
      from: user.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: adjustTime,
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participantsArray = await usersCollection.find({}).toArray();
    res.send(participantsArray);
  } catch (err) {
    console.log(err);
  }
});

app.listen(5000, () => {
  console.log("App running at port: 5000");
});
