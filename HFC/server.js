const express = require("express");
const path = require("path");

const app = express();

app.use("/static", express.static(path.resolve(__dirname, "frontend", "static")));



app.get("*html_templates*", (req, res) => {
    console.log('routing to (html_templates)', req.url, req.url.split('?')[0]);
    var url = req.url.split('?')[0];
  res.sendFile(path.resolve(__dirname, "frontend", url));
});

app.get("/*", (req, res) => {
    console.log('routing to (wildcard)', req.url);
    res.sendFile(path.resolve(__dirname, "frontend", "index.html"));
});

app.listen(process.env.PORT || 5515, () => console.log("Server running on port", process.env.PORT || 5515));
