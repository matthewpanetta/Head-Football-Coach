const express = require("express");
const path = require("path");

const app = express();

app.use("/static", express.static(path.resolve(__dirname, "frontend", "static")));

app.get("*js/modules*", (req, res) => {
    console.log('routing to (js modules)', req.url);
    var url = req.url.split('?')[0];
    //res.sendFile(path.resolve(__dirname, "frontend", url));
    res.sendfile(__dirname + url);
});

app.get("*html_templates*", (req, res) => {
  console.log('HTML Template', req.url);
    res.sendFile(path.resolve(__dirname, "frontend",req.url));
});

app.get("/World/:world_id/", (req, res) => {
  console.log('World Page', req.url, req.params);
    res.sendFile(path.resolve(__dirname, "frontend", "static/html_templates/world/base_world.html"));
});

app.get("/World/:world_id/Team/:team_id/", (req, res) => {
  console.log('World Page', req.url, req.params);
    res.sendFile(path.resolve(__dirname, "frontend", "static/html_templates/team/base_team.html"));
});

app.get("/*", (req, res) => {
    console.log('routing to (wildcard)', req.url, ' sending to', path.resolve(__dirname, "frontend",req.url));

    res.sendFile(path.resolve(__dirname, "frontend", req.url));
});

app.listen(process.env.PORT || 5515, () => console.log("Server running on port", process.env.PORT || 5515, ' from ', __dirname));
