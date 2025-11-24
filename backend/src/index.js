import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";


dotenv.config(
    {path: "./.env"}
);

connectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("Error occurred while starting the server", err)
    });
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    console.log("Mongo DB conncection failed!!", err)
})




