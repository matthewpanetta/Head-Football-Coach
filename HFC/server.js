const express = require("express");
const path = require("path");

const app = express();

app.use("/static", express.static(path.resolve(__dirname, "frontend", "static")));



app.get("*html_templates*", (req, res) => {
    console.log('routing to (html_templates)', req.url);
  res.sendFile(path.resolve(__dirname, "frontend",req.url));
});

app.get("/*", (req, res) => {
    console.log('routing to (wildcard)', req.url);
    res.sendFile(path.resolve(__dirname, "frontend", "index.html"));
});

app.listen(process.env.PORT || 5515, () => console.log("Server running on port", process.env.PORT || 5515));
