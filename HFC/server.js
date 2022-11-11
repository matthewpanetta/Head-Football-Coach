const express = require("express");
const path = require("path");

const app = express();

const routes = [
  { route: "/", path: "index/index/base.html" },

  { route: "/admin", path: "admin/admin/base.html" },
  { route: "/admin/Database/:database", path: "admin/database/base.html" },
  { route: "/admin/Database/:database/Table/:table", path: "admin/table/base.html" },

  { route: "/World/:world_id/", path: "world/world/base.html" },
  { route: "/World/:world_id/Week/:short_name/", path: "world/week/base.html" },
  { route: "/World/:world_id/Rankings/", path: "world/rankings/base.html" },
  { route: "/World/:world_id/Standings/", path: "world/standings/base.html" },
  {
    route: "/World/:world_id/Standings/Conference/:conference_id",
    path: "world/standings/base.html",
  },
  { route: "/World/:world_id/Schedule/", path: "world/schedule/base.html" },
  { route: "/World/:world_id/Awards/", path: "world/awards/base.html" },

  { route: "/World/:world_id/Conference/:conference_id", path: "conference/conference/base.html" },

  { route: "/World/:world_id/Recruiting/", path: "world/recruiting/base.html" },

  { route: "/World/:world_id/PlayerStats/Season/:season", path: "almanac/player_stats/base.html" },
  { route: "/World/:world_id/TeamStats/Season/:season", path: "almanac/team_stats/base.html" },

  { route: "/World/:world_id/History", path: "almanac/history/base.html" },
  { route: "/World/:world_id/PlayerRecords", path: "almanac/player_records/base.html" },
  { route: "/World/:world_id/TeamRecords", path: "almanac/team_records/base.html" },
  { route: "/World/:world_id/AmazingStats", path: "almanac/amazing_stats/base.html" },
  {
    route: "/World/:world_id/AmazingStats/Season/:season/",
    path: "almanac/amazing_stats/base.html",
  },

  { route: "/World/:world_id/Team/:team_id/", path: "team/team/base.html" },
  { route: "/World/:world_id/Team/:team_id/Season/:season/", path: "team/team/base.html" },
  { route: "/World/:world_id/Team/:team_id/Schedule", path: "team/schedule/base.html" },
  {
    route: "/World/:world_id/Team/:team_id/Schedule/Season/:season/",
    path: "team/schedule/base.html",
  },
  { route: "/World/:world_id/Team/:team_id/Roster", path: "team/roster/base.html" },
  { route: "/World/:world_id/Team/:team_id/Roster/Season/:season", path: "team/roster/base.html" },
  { route: "/World/:world_id/Team/:team_id/Gameplan", path: "team/gameplan/base.html" },
  {
    route: "/World/:world_id/Team/:team_id/Gameplan/Season/:season",
    path: "team/gameplan/base.html",
  },
  { route: "/World/:world_id/Team/:team_id/History", path: "team/history/base.html" },

  { route: "/World/:world_id/Player/:player_id/", path: "player/player/base.html" },
  { route: "/World/:world_id/Coach/:coach_id/", path: "coach/coach/base.html" },

  { route: "/World/:world_id/Game/:game_id/", path: "game/game/base.html" },

  { route: "/World/:world_id/Search/:search_keyword/", path: "search/search/base.html" },

  { route: "/static", path: "static" },
  { route: "*html_templates*", path: "url" },
  { route: "*js/modules*", path: "url" },
  { route: "/*", path: "url" },
];

const cacheTime = 1000 * 60 * 60 * 24 * 7 // ~one week - 1000 ms, 60 sec, 60 mins, 24 hrs, 30 days

routes.forEach(function (route) {
  app.get(route.route, (req, res) => {
    console.log("routing to ", route.route, req.url);

    // if (req.url.includes('png') || req.url.includes('modules') || req.url.includes('css')){
    if (req.url.includes('png')){
        res.set("Cache-Control", `public, max-age=${cacheTime}`);
    }

    var url = req.url.split("?")[0];
    if (route.path == "url") {
      res.sendFile(__dirname + "/frontend" + url.toLowerCase());
    } else {
      res.sendFile(__dirname + "/frontend/static/html_templates/" + route.path.toLowerCase());
    }
  });
});

app.listen(process.env.PORT || 5515, () =>
  console.log("Server running on port", process.env.PORT || 5515, " from ", __dirname)
);
