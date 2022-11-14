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

const messageSchema = joi.object({
  to: joi.string().required().min(1),
  text: joi.string().required().min(1),
  type: joi.string().required().valid("message", "private_message"),
});

const refresh = 15000;
const userLastStatus = 10000;

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

app.post("/messages", async (req, res) => {
  const { user } = req.headers;
  const message = req.body;
  try {
    const isUser = await usersCollection.findOne({ name: user });
    if (!isUser) {
      return res.status(422).send({ message: "Usuário não está conectado" });
    }

    const { validationError } = messageSchema.validate(message, {
      abortEarly: false,
    });
    if (validationError) {
      const errors = validationError.details.map((detail) => detail.message);
      res.status(400).send(errors);
      return;
    }

    const adjustTime = dayjs().format("HH:mm:ss");

    await msgCollection.insertOne({
      ...message,
      from: user,
      time: adjustTime,
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const limit = Number(req.query.limit);

  try {
    const messagesList = await msgCollection.find().toArray();
    const filteredList = messagesList.filter((message) => {
      if (
        message.type === "message" ||
        message.to === user ||
        message.type === "status"
      ) {
        return true;
      }
    });
    if (limit) {
      return res.send(filteredList.slice(-limit));
    }
    res.send(filteredList);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;

  try {
    const isUser = await usersCollection.findOne({ name: user });
    if (!isUser) {
      return res.sendStatus(404);
    }

    await usersCollection.updateOne(
      { name: user },
      {
        $set: {
          lastStatus: Date.now(),
        },
      }
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

setInterval(async () => {
  try {
    const userList = await usersCollection.find().toArray();
    userList.forEach(async (user) => {
      const time = Date.now();
      const adjustTime = dayjs(time).format("HH:mm:ss");
      const interval = time - user.lastStatus;

      if (interval > userLastStatus) {
        await msgCollection.insertOne({
          from: user.name,
          to: "Todos",
          text: "sai da sala ...",
          type: "status",
          time: adjustTime,
        });

        await usersCollection.deleteOne({ name: user.name });
      }
    });
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
}, refresh);

app.listen(5000, () => {
  console.log("App running at port: 5000");
});
