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
mongoClient.connect(() => {
    db = mongoClient.db('projeto13_batepapo_uol_api')
})

app.listen(5000, () => {
  console.log("App running at port: 5000");
});
