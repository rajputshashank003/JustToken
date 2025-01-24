const express = require("express");
const multer = require("multer");
require("dotenv").config();
const cors = require("cors");
const path = require("path");

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });

const { storage } = require("./cloudinary.config.js");
const MetaData = require("./models/Metadata.js");
const upload = multer( { storage } );

const app = express();
app.use(cors({credentials: true , origin: '*'}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post(
  "/api/v1/upload/metadata", 
  upload.single("file") , 
  async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No image file uploaded!");
        }

        const { name, symbol, description, walletKey, mintKey } = req.body;

        if(!name || name.length == 0 || !symbol || symbol.length == 0 || !description || description.length == 0 || 
          !walletKey || walletKey.length == 0 || !mintKey || mintKey.length == 0
        ) {
          return res.status(400).send("Insufficient data");
        }

        const image = req.file.path;
        const key = walletKey + name + symbol + mintKey;
        console.log(key);
        
        const data = new MetaData({
            name,
            symbol,
            description,
            image,
            key,
        });

        const metaData = await data.save();

        res.status(201).json({
          success : true,
          data : process.env.METADATA_LINK + key,
        });
    } catch (error) {
        console.error("Error in upload route:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.get("/api/v1/metadata.json", async (req , res) => {
  try {
      const data = await MetaData.findOne({key : req.query.key});
      if(!data){
          return res.status(404).json({
              success : false,
              data : "data not found in database!"
          })
      }
      return res.status(200).json(data);
    } catch (err){
      return res.status(500).json("Internal server error");
    }
})

app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
})


const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});