import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONG0_URI)
let db;

try {
  await mongoClient.connect()
} catch (err) {
  console.log(err)
}

db = mongoClient.db('projeto13_batepapo_uol_api')
const usersCollection = db.collection('users')
const msgCollection = db.collection('msg')

app.listen(5000, () => {
  console.log("App running at port: 5000");
});
