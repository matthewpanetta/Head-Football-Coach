const express = require("express");
const path = require("path");

const app = express();

const routes = [
  {route: "/", path: 'index/index/base.html'},

  {route: "/World/:world_id/",          path: 'world/world/base.html'},
  {route: "/World/:world_id/Rankings/", path: 'world/rankings/base.html'},

  {route: "/World/:world_id/Team/:team_id/",         path: 'team/team/base.html'},
  {route: "/World/:world_id/Team/:team_id/Schedule", path: 'team/schedule/base.html'},
  {route: "/World/:world_id/Team/:team_id/Roster",   path: 'team/roster/base.html'},

  {route: "/World/:world_id/Player/:player_id/",     path: 'player/player/base.html'},

  {route: "/World/:world_id/Game/:game_id/",     path: 'game/game/base.html'},

  {route: "/static",          path: 'static'},
  {route: "*html_templates*", path: 'url'},
  {route: "*js/modules*",     path: 'url'},
  {route: "/*",               path: 'url'},
]


routes.forEach(function(route) {
  app.get(route.route, (req, res) => {
    console.log('routing to ', route.route, req.url);

    var url = req.url.split('?')[0];

    if (route.path == 'url') {
      res.sendFile( __dirname + "/frontend" + url);
    }
    else {
      res.sendFile(__dirname + "/frontend/static/html_templates/"+route.path);
    }

  });
});


app.listen(process.env.PORT || 5515, () => console.log("Server running on port", process.env.PORT || 5515, ' from ', __dirname));
