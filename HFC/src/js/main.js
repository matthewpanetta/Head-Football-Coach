import { nunjucks_env } from '../../../../../../../common/js/nunjucks_tags.js';
import { index_group_sync, distance_between_coordinates, nest_children, deep_copy, weighted_random_choice, shuffle, body_from_position, round_decimal, normal_trunc, sum, add_season_to_date, average, get, distinct, set_intersect } from '../../../../../../../common/js/utils.js';
import { init_basic_table_sorting } from '../../../../../../../js/football-table/football-table.js';
import { team_game, conference, league_season, team, team_season, team_season_stats, coach, coach_team_season, player, player_team_season, player_team_season_stats, day, award } from '../../../../../../../js/schema.js';
import { driver_db, resolve_db, create_new_db } from '../../../../../../../js/database.js';
import { populate_player_modal, geo_marker_action } from '../../../../../../../js/modals.js';
import { page_world, page_world_rankings, page_world_standings, page_world_schedule, page_world_awards } from '../../../../../../../js/pages/world_pages.js';
import { page_team, page_team_schedule, page_team_roster, page_team_history } from '../../../../../../../js/pages/team_pages.js';
import { page_player } from '../../../../../../../js/pages/player_pages.js';
import { page_almanac_player_stats, page_almanac_history, page_almanac_player_records } from '../../../../../../../js/pages/almanac_pages.js';
import { page_game } from '../../../../../../../js/pages/game_pages.js';
import { page_index } from '../../../../../../../js/pages/index_pages.js';
import { position_group_map } from '../../../../../../../js/metadata.js';
import { generate_ranking_headlines } from '../../../../../../../js/headlines.js';
import '../../../../../../../js/sim_game.js';
import { draw_player_faces } from '../../../../../../../js/faces.js';
import { dayjs } from '../../../../../../../common/js/dayjs.js';

const nav_bar_links = async (common, data) => {
  const path = data.path;
  const group_name = data.group_name;
  const db = common.db;

  if (!db){
    return []
  }

  const league_seasons = db.league_season.find();
  const current_league_season = league_seasons.find((ls) => ls.is_current_season);
  console.log({
    db: db,
    league_seasons: league_seasons,
    current_league_season: current_league_season,
  });
  const season = current_league_season.season;
  const world_id = current_league_season.world_id;

  let phases = db.phase.find({ season: season });
  let periods = db.period.find({ season: season });
  let days = db.day.find({ season: season });
  let user_team = db.team.findOne({ team_id: current_league_season.user_team_id });

  const phases_by_phase_id = index_group_sync(phases, "index", "phase_id");

  let current_day = days.find(d => d.is_current);

  const current_period = periods.find((pe) => pe.period_id == current_day.period_id) || {};

  console.log({
    periods: periods,
    current_period: current_period,
    current_day:current_day,
    season: season,
    phases_by_phase_id: phases_by_phase_id,
  });
  current_period.phase = phases_by_phase_id[current_period.phase_id] || {};
  current_period.league_season = current_league_season;

  current_day.period = current_period;

  const team_id = user_team.team_id;
  const user_team_logo = user_team.team_logo;

  var can_sim = true,
    save_ls = true;

  var user_actions = [];
  var sim_action_period = {
    LinkDisplay: "Sim This period",
    id: "SimThisperiod",
    Href: "",
    ClassName: "sim-action",
  };
  var sim_action_phase = {
    LinkDisplay: "Sim This Phase",
    id: "SimThisPhase",
    Href: "",
    ClassName: "sim-action",
  };

  if (current_day != null) {
    if (current_period.phase.phase_name == "Pre-Season") {
      can_sim = true;
      save_ls = true;

      //Check for user team needing to cut players
      if (!current_league_season.preseason_tasks.user_cut_players) {
        if (user_team.player_count > current_league_season.players_per_team) {
          user_actions.push({
            LinkDisplay: "Cut Players",
            Href: `/World/${world_id}/Team/${team_id}/Roster`,
            ClassName: "",
          });
          can_sim = false;
        } else {
          current_league_season.preseason_tasks.user_cut_players = true;
          save_ls = true;
        }
      }

      //Check for user team needing captains
      if (user_team.captain_count < current_league_season.captains_per_team) {
        user_actions.push({
          LinkDisplay: "Set Captains",
          Href: `/World/${world_id}/Team/${team_id}/Roster`,
          ClassName: "",
        });
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!current_league_season.preseason_tasks.user_set_gameplan) {
        user_actions.push({
          LinkDisplay: "Set Gameplan",
          Href: `/World/${world_id}/Team/${team_id}/Gameplan`,
          ClassName: "",
        });
        can_sim = false;
      }

      //Check for user team needing gameplan
      if (!current_league_season.preseason_tasks.user_set_depth_chart) {
        user_actions.push({
          LinkDisplay: "Set Depth Chart",
          Href: `/World/${world_id}/Team/${team_id}/DepthChart`,
          ClassName: "",
        });
        can_sim = false;
      }

      can_sim = true; //TODO - change back!
      if (!can_sim) {
        sim_action_period.ClassName += " w3-disabled";
        sim_action_phase.ClassName += " w3-disabled";
      }

      if (save_ls) {
        db.league_season.update(current_league_season);
        await db.saveDatabaseAsync();
      }
    } else if (current_period.phase.phase_name == "Season Recap") {
      user_actions.push({
        LinkDisplay: "View Season Awards",
        Href: `/World/${world_id}/Awards`,
        ClassName: "",
      });
    } else if (current_period.phase.phase_name == "Coach Carousel") {
      user_actions.push({
        LinkDisplay: "View Coach Carousel",
        Href: `/World/${world_id}/CoachCarousel`,
        ClassName: "",
      });
    } else if (current_period.phase.phase_name == "Draft Departures") {
      user_actions.push({
        LinkDisplay: "View Player Departures",
        Href: `/World/${world_id}/PlayerDepartures`,
        ClassName: "",
      });
    } else if (current_period.phase.phase_name == "National Signing Day") {
      user_actions.push({
        LinkDisplay: "View Recruiting Board",
        Href: `/World/${world_id}/Recruiting`,
        ClassName: "",
      });
    } else if (current_period.phase.phase_name == "Prepare for Summer Camps") {
      user_actions.push({
        LinkDisplay: "Set Player Development",
        Href: `/World/${world_id}/PlayerDevelopment`,
        ClassName: "",
      });
    }

    sim_action_phase.LinkDisplay = "Sim to end of " + current_period.phase.phase_name;
    user_actions.unshift(sim_action_phase);


    if (!current_period.last_period_in_phase) {
      user_actions.unshift(sim_action_period);
    }

    const period_updates = current_period.period_updates || [];
    if (period_updates.length > 0) {
      user_actions.push({
        LinkDisplay: `Updates this period ${period_updates.length}`,
        id: "periodUpdates",
        Href: "#",
        ClassName: "period-updates",
      });
    }
  }

  can_sim = true; //TODO - Change back!!
  const LinkGroups = [
    {
      GroupName: "Action",
      GroupDisplay: `${current_period.period_name}, ${season}`,
      GroupLinks: user_actions,
    },
    {
      GroupName: "World",
      GroupDisplay: '<img src="/img/team_logos/ncaa-text.png" class="" alt="">',
      GroupLinks: [
        {
          LinkDisplay: "Overview",
          id: "",
          Href: `/World/${world_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Standings",
          id: "",
          Href: `/World/${world_id}/Standings`,
          ClassName: "",
        },
        {
          LinkDisplay: "Rankings",
          id: "",
          Href: `/World/${world_id}/Rankings`,
          ClassName: "",
        },
        {
          LinkDisplay: "Schedule",
          id: "",
          Href: `/World/${world_id}/Schedule`,
          ClassName: "",
        },
        {
          LinkDisplay: "Headline",
          id: "",
          Href: `/World/${world_id}/Headlines`,
          ClassName: "",
        },
        {
          LinkDisplay: "Recruiting",
          id: "",
          Href: `/World/${world_id}/Recruiting`,
          ClassName: "",
        },
        {
          LinkDisplay: "Awards & Races",
          id: "",
          Href: `/World/${world_id}/Awards`,
          ClassName: "",
        },
      ],
    },
    {
      GroupName: "Team",
      GroupDisplay: `<img src="${user_team_logo}" class="" alt="">`,
      GroupLinks: [
        {
          LinkDisplay: "Overview",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Schedule",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Schedule`,
          ClassName: "",
        },
        {
          LinkDisplay: "Roster",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Roster`,
          ClassName: "",
        },
        {
          LinkDisplay: "Depth Chart",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/DepthChart`,
          ClassName: "",
        },
        {
          LinkDisplay: "Gameplan",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/Gameplan`,
          ClassName: "",
        },
        {
          LinkDisplay: "Coaches",
          id: "",
          Href: `/World/${world_id}/Coaches/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Development",
          id: "",
          Href: `/World/${world_id}/PlayerDevelopment/Team/${team_id}`,
          ClassName: "",
        },
        {
          LinkDisplay: "History",
          id: "",
          Href: `/World/${world_id}/Team/${team_id}/History`,
          ClassName: "",
        },
      ],
    },
    {
      GroupName: "Almanac",
      GroupDisplay: "Almanac",
      GroupLinks: [
        {
          LinkDisplay: "History",
          id: "",
          Href: `/World/${world_id}/History`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Stats",
          id: "",
          Href: `/World/${world_id}/PlayerStats/Season/${season}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Player Records",
          id: "",
          Href: `/World/${world_id}/PlayerRecords`,
          ClassName: "",
        },
        {
          LinkDisplay: "Team Stats",
          id: "",
          Href: `/World/${world_id}/TeamStats/Season/${season}`,
          ClassName: "",
        },
        {
          LinkDisplay: "Team Records",
          id: "",
          Href: `/World/${world_id}/TeamRecords`,
          ClassName: "",
        },
        {
          LinkDisplay: "Hall of Fame",
          id: "",
          Href: `/World/${world_id}/HallOfFame`,
          ClassName: "",
        },
        {
          LinkDisplay: "Amazing Stats",
          id: "",
          Href: `/World/${world_id}/AmazingStats`,
          ClassName: "",
        },
        {
          LinkDisplay: "Coach Stats",
          id: "",
          Href: `/World/${world_id}/Coaches`,
          ClassName: "",
        },
        {
          LinkDisplay: "Shortlists",
          id: "",
          Href: `/World/${world_id}/Shortlists`,
          ClassName: "",
        },
        {
          LinkDisplay: "Search",
          id: "nav-search",
          Href: "#",
          ClassName: "w3-input",
          world_id: world_id,
        },
      ],
    },
    {
      GroupName: "Game",
      GroupDisplay: "Game",
      GroupLinks: [
        { LinkDisplay: "Home Page", id: "", Href: "/", ClassName: "" },
        { LinkDisplay: "Admin", id: "", Href: "/admin", ClassName: "" },
        { LinkDisplay: "Audit", id: "", Href: "/audit", ClassName: "" },
        { LinkDisplay: "Credits", id: "", Href: "/Credits", ClassName: "" },
        {
          LinkDisplay: "Acheivements",
          id: "",
          Href: "/Acheivements",
          ClassName: "",
        },
      ],
    },
  ];

  $.each(LinkGroups, function (ind, Group) {
    $.each(Group.GroupLinks, function (ind, Link) {
      if (Link["LinkDisplay"] == path && Group["GroupName"] == group_name) {
        Link["ClassName"] = "Selected";
      }
    });
  });

  can_sim = true; //TODO - Change back!!
  var SimActionStatus = { CanSim: can_sim, LinkGroups: [] };
  SimActionStatus["LinkGroups"] = LinkGroups;
  return SimActionStatus;
};

const create_team_season = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = common.season;

  db.league_season.findOne({ season: season });

  let teams = db.team.find();
  let previous_team_seasons = db.team_season.find({ season: season - 1 });

  var team_seasons_tocreate = [];
  var team_season_stats_tocreate = [];

  let previous_team_seasons_by_team_id = index_group_sync(
    previous_team_seasons,
    "index",
    "team_id"
  );

  var last_team_season_id = db.team_season.nextId("team_season_id");

  console.log({
    data: data,
    teams: teams,
  });
  $.each(teams, function (ind, team) {
    var team_season_id = last_team_season_id;
    if (team.team_id < 0) {
      if (team.team_id == -1) {
        team_season_id = -1;
      } else {
        team_season_id = -1 * season;
      }
      var new_team_season = new team_season({
        team_season_id: team_season_id,
        team_id: team.team_id,
        world_id: data.world_id,
        season: data.season,
        conference_name: null,
        conference_season_id: null,
        is_user_team: false,
      });

      team_seasons_tocreate.push(new_team_season);
    } else {
      let division_name = data.conferences_by_conference_name[
        team.conference.conference_name
      ].conference_season.divisions.find((d) => d.teams.includes(team.team_name)).division_name;

      let previous_team_season = previous_team_seasons_by_team_id[team.team_id] || {};

      let gameplan = team.starting_tendencies ||
        previous_team_season.gameplan || {
          offense: {
            playbook: "Spread",
            pass_tendency: 51,
            playcall_aggressiveness: 4,
            playclock_urgency: 4,
          },
          defense: {
            playbook: "4-3",
            blitz_tendency: 5,
            man_coverage_tendency: 5,
          },
        };

      var new_team_season = new team_season({
        team_season_id: team_season_id,
        team_id: team.team_id,
        world_id: data.world_id,
        season: data.season,
        league_id: team.league_id,
        conference_name: team.conference_name,
        conference_season_id:
          data.conferences_by_conference_name[team.conference.conference_name].conference_season
            .conference_season_id,
        division_name: division_name,
        is_user_team: team.is_user_team || false,
        gameplan: gameplan,
      });

      var new_team_season_stats = new team_season_stats(team_season_id);
      last_team_season_id += 1;

      team_seasons_tocreate.push(new_team_season);
      team_season_stats_tocreate.push(new_team_season_stats);
    }
  });

  console.log({
    team_seasons_tocreate: team_seasons_tocreate,
    team_season_stats_tocreate: team_season_stats_tocreate,
  });

  await Promise.all([
    db.team_season.insert(team_seasons_tocreate),
    db.team_season_stats.insert(team_season_stats_tocreate),
  ]);

  await db.saveDatabaseAsync();
};

const populate_all_depth_charts = async (common, team_season_ids) => {
  const db = common.db;
  const season = common.season;

  let adjacent_positions = {
    QB: ["RB", "S", "WR", "LB"],
    RB: ["FB", "WR", "LB"],
    FB: ["TE", "RB"],
    WR: ["TE", "RB", "CB"],
    TE: ["WR", "FB", "OT"],
    OT: ["G", "C", "TE", "DL", "EDGE"],
    G: ["C", "OT", "DL", "EDGE"],
    C: ["G", "OT", "DL", "EDGE"],
    DL: ["EDGE", "LB", "G"],
    EDGE: ["DL", "LB"],
    LB: ["EDGE", "S"],
    CB: ["S", "LB", "WR"],
    S: ["CB", "LB", "RB", "TE"],
    K: ["P", "G", "CB", "S", "DL", "EDGE", "QB", "RB", "WR", "TE", "OT", "LB"],
    P: ["K", "G", "CB", "S", "DL", "EDGE", "QB", "RB", "WR", "TE", "OT", "LB"],
  };

  let position_minimum_count = {
    QB: 3,
    RB: 4,
    FB: 1,
    WR: 6,
    TE: 3,
    OT: 4,
    G: 3,
    C: 2,
    DL: 4,
    EDGE: 4,
    LB: 5,
    CB: 5,
    S: 4,
    K: 2,
    P: 2,
  };

  let position_starter_count = {
    QB: 1,
    RB: 1,
    FB: 1,
    WR: 3,
    TE: 1,
    OT: 2,
    G: 2,
    C: 1,
    DL: 2,
    EDGE: 2,
    LB: 3,
    CB: 2,
    S: 2,
    K: 1,
    P: 1,
  };

  console.log({ team_season_ids: team_season_ids, 'db.player_team_season': db.player_team_season });
  if (team_season_ids) {
    team_season_ids = new Set(team_season_ids);

    var team_seasons = db.team_season.find({
      season: season,
      team_season_id: { $in: team_season_ids },
    });
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
    var player_team_seasons = db.player_team_season.find({
      season: season,
      team_season_id: { $in: team_season_ids },
    });
    var player_team_seasons_by_team_season_id = index_group_sync(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  } else {
    var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
    var player_team_seasons = db.player_team_season.find({
      season: season,
      team_season_id: { $gt: 0 },
    });
    var player_team_seasons_by_team_season_id = index_group_sync(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  }

  console.log({
    season: season,
    db: db,
    player_team_seasons: player_team_seasons,
    team_seasons: team_seasons,
  });
  let player_team_seasons_to_update = [];

  for (var team_season_id in player_team_seasons_by_team_season_id) {
    let starter_player_team_season_ids = new Set();

    var player_team_season_list = player_team_seasons_by_team_season_id[team_season_id];
    let ts = team_seasons_by_team_season_id[team_season_id];
    console.log({
      ts:ts, team_seasons_by_team_season_id:team_seasons_by_team_season_id, player_team_season_list:player_team_season_list,
      team_season_id:team_season_id, player_team_seasons_by_team_season_id:player_team_seasons_by_team_season_id
    });

    player_team_season_list = player_team_season_list.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );

    player_team_season_list.forEach((pts, ind) => (pts.player_team_overall_rank = ind + 1));

    ts.depth_chart = {};

    var position_player_team_season_obj = index_group_sync(
      player_team_season_list,
      "group",
      "position"
    );

    Object.keys(position_minimum_count).forEach(function (pos) {
      if (!(pos in position_player_team_season_obj)) {
        position_player_team_season_obj[pos] = [];
      }
    });

    //TODO what if this is empty
    for (var position in position_player_team_season_obj) {
      var position_player_team_season_list = position_player_team_season_obj[position];

      if (position_player_team_season_list.length < position_minimum_count[position]) {
        let potential_players_to_add = [];
        adjacent_positions[position].forEach(function (pos) {
          potential_players_to_add = potential_players_to_add.concat(
            position_player_team_season_obj[pos].slice(
              0,
              position_starter_count[pos] +
                position_minimum_count[position] -
                position_player_team_season_list.length +
                1
            )
          );
        });
        potential_players_to_add = potential_players_to_add.filter(
          (pts) => !starter_player_team_season_ids.has(pts.player_team_season_id)
        );

        position_player_team_season_list =
          position_player_team_season_list.concat(potential_players_to_add);
        position_player_team_season_list = position_player_team_season_list.slice(
          0,
          position_minimum_count[position]
        );
      }

      for (
        let ind = 0;
        ind < position_starter_count[position] && ind < position_player_team_season_list.length;
        ind++
      ) {
        starter_player_team_season_ids.add(
          position_player_team_season_list[ind].player_team_season_id
        );
      }

      position_player_team_season_list.forEach(
        (pts, ind) => (pts.depth_chart_rank = Math.min(pts.depth_chart_rank || 10000, ind + 1))
      );
      player_team_seasons_to_update = player_team_seasons_to_update.concat(
        position_player_team_season_list
      );
      ts.depth_chart[position] = position_player_team_season_list.map(
        (pts) => pts.player_team_season_id
      );
    }

    team_seasons_to_update.push(ts);
  }

  db.team_season.update(team_seasons_to_update);
  db.player_team_season.update(player_team_seasons_to_update);

  await db.saveDatabaseAsync();

  console.log({
    player_team_seasons_to_update: player_team_seasons_to_update,
    team_seasons_to_update: team_seasons_to_update,
    db: db,
  });
};

const create_conference_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  let conference_season_id = db.conference_season.nextId("conference_season_id");

  var conference_seasons_to_create = [];

  for (const conference of data.conferences) {
    conference_season_id = conference_season_id + 1;
    var new_conference_season = {
      world_id: world_id,
      conference_id: conference.conference_id,
      conference_season_id: conference_season_id,
      season: season,
      divisions: conference.divisions,
      conference_champion_team_season_id: null,
    };

    conference_seasons_to_create.push(new_conference_season);
  }

  console.log("conference_seasons_to_create", {
    conference_seasons_to_create: conference_seasons_to_create,
  });

  db.conference_season.insert(conference_seasons_to_create);
  await db.saveDatabaseAsync();
};

const create_schedule = (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var games_to_create = [],
    team_games_to_create = [],
    team_games_to_create_ids = [];
  var team_season_schedule_tracker = {};
  const games_per_team = 16;

  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  index_group_sync(team_seasons, "index", "team_id");
  const conferences_by_conference_id = index_group_sync(
    db.conference.find(),
    "index",
    "conference_id"
  );
  const conference_seasons_by_conference_season_id = index_group_sync(
    db.conference_season.find({ season: season }),
    "index",
    "conference_season_id"
  );

  const phases = index_group_sync(db.phase.find({ season: season }), "index", "phase_id");
  var periods = db.period.find({ season: season });
  $.each(periods, function (ind, period) {
    period.phase = phases[period.phase_id];
  });
  console.log({
    phases:phases,
    periods:periods,
    db:db, common:common
  });
  periods = periods.filter((period) => period.phase && period.phase.phase_name == "Regular Season");
  let all_period_ids = new Set(periods.map((w) => w.period_id));
  let all_periods_by_period_id = index_group_sync(periods, "index", "period_id");

  let periods_game_scheduled = {};
  all_period_ids.forEach(w_id => periods_game_scheduled[w_id] = 0);

  index_group_sync(periods, "index", "period_name");

  team_seasons.length;

  for (let team_season of team_seasons) {
    let team_conference =
      conferences_by_conference_id[
        conference_seasons_by_conference_season_id[team_season.conference_season_id].conference_id
      ];

      team_season.conference_season = conference_seasons_by_conference_season_id[team_season.conference_season_id];
      team_season.conference_season.conference = conferences_by_conference_id[team_season.conference_season.conference_id];
      team_season.full_division_name = team_season.conference_season.conference.conference_abbreviation + ' ' + team_season.division_name;

    team_season_schedule_tracker[team_season.team_season_id] = {
      schedule: {
        games_to_schedule: games_per_team,
        games_scheduled: 0,
        home_games: 0,
        away_games: 0,
        net_home_games: 0,
      },
      periods_scheduled: new Set(),
      available_period_ids: new Set(all_period_ids),
      opponents_scheduled: new Set(),
      conference_season_id: team_season.conference_season_id,
      division_name: team_season.division_name,
      team: teams_by_team_id[team_season.team_id],
      full_division_name: team_conference.conference_abbreviation + ' ' + team_season.division_name
    };

  }
  var games_to_create_ids = [];

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var scheduling_dict = {
    team_season_schedule_tracker: team_season_schedule_tracker,
    all_period_ids: all_period_ids,
    periods_game_scheduled:periods_game_scheduled,
    all_periods_by_period_id: all_periods_by_period_id,
    world_id: world_id,
    season: season,
    next_team_game_id: next_team_game_id,
    next_game_id: next_game_id,
    team_games_to_create_ids: team_games_to_create_ids,
    team_games_to_create: team_games_to_create,
    games_to_create_ids: games_to_create_ids,
    games_to_create: games_to_create,
  };

  scheduling_dict.schedule_phases = [
    {type: "intra-division", num_periods: 3, constraint: 'early or end of season', schedule_mechanism: "1x4"},
    {type: "intra-conference seed match", num_periods: 1, constraint: 'early or end of season', schedule_mechanism: "2x1"},
    {type: "intra-division", num_periods: 4, constraint: 'middle of season', schedule_mechanism: "1x4+BYE"},
    {type: "inter division round", num_periods: 4, schedule_mechanism: "2x4"},
    {type: "inter division round", num_periods: 4, schedule_mechanism: "2x4"},
    {type: "intra-conference seed match", num_periods: 1, schedule_mechanism: "2x1"},
  ];

  let phase_available_periods = new Set(all_period_ids);
  scheduling_dict.schedule_phases.forEach(function (schedule_phase) {
    schedule_phase.periods = schedule_phase.periods || [];
    for (let ind = 0; ind < schedule_phase.num_periods; ind++) {
      let possible_periods = [...phase_available_periods];
      let period_weights = [];

      if (schedule_phase.constraint == "early or end of season") {
        period_weights = possible_periods.map((w_id) => [
          w_id,
          Math.abs((all_period_ids.size / 2) - all_periods_by_period_id[w_id].schedule_period_number) ** 4,
        ]);
      } else if (schedule_phase.constraint == "middle of season") {
        period_weights = possible_periods.map((w_id) => [
          w_id,
          (all_period_ids.size -
            Math.abs((all_period_ids.size / 2) - all_periods_by_period_id[w_id].schedule_period_number) * 2) ** 4,
        ]);
      } else {
        period_weights = possible_periods.map((w_id) => [w_id, 4]);
      }

      let chosen_period_id = weighted_random_choice(period_weights);
      schedule_phase.periods.push(chosen_period_id);
      phase_available_periods.delete(chosen_period_id);
    }
  });

  console.log({
    phase_available_periods:phase_available_periods,
    all_periods_by_period_id:all_periods_by_period_id,
    all_period_ids:all_period_ids,
    all_period_ids_l:all_period_ids.length,
    'scheduling_dict.schedule_phases': scheduling_dict.schedule_phases
  });

  let inter_division_pairs = {
    "AFC South": ["NFC South", "AFC West"],
    "AFC North": ["NFC North", "AFC East"],
    "NFC East":  ["AFC East",  "NFC North"],
    "NFC West":  ["AFC West",  "NFC South"]
  };

  let intra_conference_seed_pairs = {
    "AFC South": ["AFC East", "AFC North"],
    "AFC West": ["AFC North", "AFC East"],
    "NFC South": ["NFC East", "NFC North"],
    "NFC West": ["NFC North", "NFC East"],
  };

  let division_list = [
    "AFC South", "AFC West","AFC North", "AFC East","NFC South", "NFC West","NFC North", "NFC East"
  ];

  let group_pairing_mechanism = {
    "1x4":[
      [[0,1], [2,3]],
      [[0,2], [1,3]],
      [[0,3], [1,2]],
    ],
    "2x1": [
      [[0,4], [1,5], [2,6], [3,7]]
    ],
    "1x4+BYE":[
      [[0,1], [2,3]],
      [[0,2]],
      [[1,3]],
      [[0,3], [1,2]],
    ],
    "2x4":[
      [[0,4], [1,5], [2,6], [3,7]],
      [[0,5], [1,4], [2,7], [3,6]],
      [[0,6], [1,7], [2,4], [3,5]],
      [[0,7], [1,6], [2,5], [3,4]],
    ],
  };

  let team_seasons_by_full_division_name = index_group_sync(team_seasons, 'group', 'full_division_name');

  let team_pairs = [];

  for (let division_name of division_list){
    let division_team_seasons = team_seasons_by_full_division_name[division_name];
    let division_team_season_ids = division_team_seasons.map(ts => ts.team_season_id);

    let scheduling_phases = scheduling_dict.schedule_phases.filter(sp => sp.type == 'intra-division');

    scheduling_phases.forEach(function(schedule_phase){
      division_team_season_ids = shuffle(division_team_season_ids);

      let schedule_mechanism = group_pairing_mechanism[schedule_phase.schedule_mechanism];
      schedule_mechanism.forEach(function(schedule_period, period_ind){
        let period_id = schedule_phase.periods[period_ind];
        schedule_period.forEach(function(pair){
          let ts_id_a = division_team_season_ids[pair[0]];
          let ts_id_b = division_team_season_ids[pair[1]];
          team_pairs.push([ts_id_a, ts_id_b, {period_id: period_id,allow_duplicates: true}]);
        });
      });
    });
  }

  for (let [division_name_a, mapped_divisions] of Object.entries(inter_division_pairs)){
    let scheduling_phases = scheduling_dict.schedule_phases.filter(sp => sp.type == 'inter division round');
    console.log({
      division_name_a:division_name_a,
      mapped_divisions:mapped_divisions
    });
    mapped_divisions.forEach(function(division_name_b, div_ind){
      let schedule_phase = scheduling_phases[div_ind];

      let division_a_teams = shuffle(team_seasons_by_full_division_name[division_name_a]);
      let division_b_teams = shuffle(team_seasons_by_full_division_name[division_name_b]);

      let division_a_team_season_ids = division_a_teams.map(ts => ts.team_season_id);
      let division_b_team_season_ids = division_b_teams.map(ts => ts.team_season_id);

      let all_teams = division_a_team_season_ids.concat(division_b_team_season_ids);

      let schedule_mechanism = group_pairing_mechanism[schedule_phase.schedule_mechanism];
      schedule_mechanism.forEach(function(schedule_period, period_ind){
        let period_id = schedule_phase.periods[period_ind];
        schedule_period.forEach(function(pair){
          let ts_id_a = all_teams[pair[0]];
          let ts_id_b = all_teams[pair[1]];
          team_pairs.push([ts_id_a, ts_id_b, {period_id: period_id}]);
        });
      });
    });
  }

  console.log({
    team_pairs:team_pairs
  });

  for (let [division_name_a, mapped_divisions] of Object.entries(intra_conference_seed_pairs)){
    let scheduling_phases = scheduling_dict.schedule_phases.filter(sp => sp.type == 'intra-conference seed match');
    console.log({
      division_name_a:division_name_a,
      mapped_divisions:mapped_divisions
    });
    mapped_divisions.forEach(function(division_name_b, div_ind){
      let schedule_phase = scheduling_phases[div_ind];

      let division_a_teams = team_seasons_by_full_division_name[division_name_a].sort((ts_a, ts_b) => ts_a.division_rank - ts_b.division_rank);
      let division_b_teams = team_seasons_by_full_division_name[division_name_b].sort((ts_a, ts_b) => ts_a.division_rank - ts_b.division_rank);

      let division_a_team_season_ids = division_a_teams.map(ts => ts.team_season_id);
      let division_b_team_season_ids = division_b_teams.map(ts => ts.team_season_id);

      let all_teams = division_a_team_season_ids.concat(division_b_team_season_ids);

      console.log({
        schedule_phase:schedule_phase,
        scheduling_phases:scheduling_phases,
        div_ind:div_ind,
        mapped_divisions:mapped_divisions,
        division_name_b:division_name_b,
        division_name_a:division_name_a
      });

      let schedule_mechanism = group_pairing_mechanism[schedule_phase.schedule_mechanism];
      schedule_mechanism.forEach(function(schedule_period, period_ind){
        let period_id = schedule_phase.periods[period_ind];
        schedule_period.forEach(function(pair){
          let ts_id_a = all_teams[pair[0]];
          let ts_id_b = all_teams[pair[1]];
          team_pairs.push([ts_id_a, ts_id_b, {period_id: period_id}]);
        });
      });
    });
  }

  // team_pairs = shuffle(team_pairs);
  for (let team_pair of team_pairs){
    schedule_game(common, scheduling_dict, team_pair);
  }

  let total_missing_games = 0;
  for (var team_season_obj of Object.values(team_season_schedule_tracker)) {
    total_missing_games += team_season_obj.schedule.games_to_schedule;
  }

  scheduling_dict.total_missing_games = total_missing_games;
  return scheduling_dict;

  // let team_seasons_to_update = Object.values(team_seasons);

};


const save_created_schedule = async(data) => {
  let common = data.common;
  let db = common.db;

  let best_total_missing_games = 1000000000;
  let best_scheduling_dict = null;
  let attempt_count = 1;
  while (best_total_missing_games > 0 && attempt_count < 1000){
    let scheduling_dict = create_schedule(data);
    if (scheduling_dict.total_missing_games < best_total_missing_games){
      best_total_missing_games = scheduling_dict.total_missing_games;
      best_scheduling_dict = scheduling_dict;
    }

    attempt_count += 1;
    console.log('Trying create_schedule again', {
      attempt_count:attempt_count,
      best_scheduling_dict:best_scheduling_dict,
      best_total_missing_games:best_total_missing_games,
      'scheduling_dict.total_missing_games': scheduling_dict.total_missing_games,
      scheduling_dict:scheduling_dict
    });
  }
  
  let games_to_create = best_scheduling_dict.games_to_create;
  let team_games_to_create = best_scheduling_dict.team_games_to_create;

  db.game.insert(games_to_create);
  db.team_game.insert(team_games_to_create);
  await db.saveDatabaseAsync();

  console.log("At end of create_schedule", {
    games_to_create: games_to_create,
    team_games_to_create: team_games_to_create,
  });
};

const age_out_rating = (rating_group, rating, value, age) => {
  var age_out_years = age < 25 ? 25 - age : 0;

  if (!age_out_years) {
    return value;
  }

  let rating_change_probability = 0.1;

  if (rating_group == "athleticism") {
    rating_change_probability = 0.05;
  } else if (rating_group == "passing") {
    rating_change_probability = 0.7;
  } else if (rating_group == "rushing") {
    rating_change_probability = 0.2;
  } else if (rating_group == "receiving") {
    rating_change_probability = 0.3;
  } else if (rating_group == "defense") {
    rating_change_probability = 0.45;
  } else if (rating_group == "blocking") {
    rating_change_probability = 0.6;
  } else {
    rating_change_probability = 0.1;
  }

  var severe_rating_change_probability = rating_change_probability / 5;

  for (var i = 0; i < age_out_years; i++) {
    var rand = Math.random();
    if (rand < severe_rating_change_probability) {
      value -= 8;
    } else if (rand < rating_change_probability) {
      value -= 4;
    }
  }

  if (value < 1) {
    return 1;
  }

  return round_decimal(value, 0);
};

const assign_player_jersey_numbers = async (common, season) => {
  const db = common.db;

  common.stopwatch(common, "Assigning jersey numbers - starting");
  let player_team_seasons = db.player_team_season.find({ season: season });
  let player_team_seasons_by_team_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  common.stopwatch(common, "Assigning jersey numbers - fetched PTSs");

  let player_ids = player_team_seasons.map((pts) => pts.player_id);
  let players = db.player.find({ player_id: { $in: player_ids } });
  let players_by_player_id = index_group_sync(players, "index", "player_id");

  common.stopwatch(common, "Assigning jersey numbers - Fetched Players");

  let player_team_seasons_to_save = [];
  let players_to_save = [];

  var url = "/data/import_json/position_numbers.json";
  var json_data = await fetch(url);
  var all_position_numbers = await json_data.json();

  common.stopwatch(common, "Assigning jersey numbers - Fetched default jersey nums");

  for (let [team_season_id, team_player_team_seasons] of Object.entries(
    player_team_seasons_by_team_season_id
  )) {
    let chosen_numbers = new Set(
      team_player_team_seasons
        .map((pts) => players_by_player_id[pts.player_id].jersey_number)
        .filter((num) => num)
    );
    let available_numbers = new Set(
      Array(99)
        .fill(1)
        .map((x, y) => x + y)
    );
    chosen_numbers.forEach(function (num) {
      available_numbers.delete(num);
    });

    console.log({
      chosen_numbers: chosen_numbers,
      available_numbers: available_numbers,
    });

    team_player_team_seasons = team_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );
    team_player_team_seasons.forEach(function (pts) {
      let this_player = players_by_player_id[pts.player_id];

      let chosen_number = this_player.jersey_number;
      let loop_count = 0;
      while (chosen_number == null && loop_count < 100) {
        let try_chosen_number = -1;
        if (loop_count > 50) {
          try_chosen_number = weighted_random_choice(available_numbers, null);
        } else {
          try_chosen_number = weighted_random_choice(all_position_numbers[pts.position], null);
        }

        if (try_chosen_number && available_numbers.has(try_chosen_number)) {
          chosen_number = try_chosen_number;
        }

        loop_count += 1;
      }

      pts.jersey_number = chosen_number;
      this_player.jersey_number = chosen_number;

      player_team_seasons_to_save.push(pts);
      players_to_save.push(this_player);

      chosen_numbers.add(chosen_number);
      available_numbers.delete(chosen_number);
    });
  }

  common.stopwatch(common, "Assigning jersey numbers - Assigned all numbers");

  db.player_team_season.update(player_team_seasons_to_save);
  db.player.update(players_to_save);

  await db.saveDatabaseAsync();

  common.stopwatch(common, "Assigning jersey numbers - Saved & done");
};

const assign_players_to_teams = async (common, world_id, season, team_seasons) => {
  const db = common.db;

  const teams = db.team.find({ team_id: { $gt: 0 } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  let player_team_seasons = db.player_team_season.find({ season: season, team_season_id: 0 });

  let player_ids = player_team_seasons.map((pts) => pts.player_id);

  let players = db.player.find({ player_id: { $in: player_ids } });
  let players_by_player_id = index_group_sync(players, "index", "player_id");
  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

  index_group_sync(team_seasons, "index", "team_id");
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  var team_position_options = [
    {
      QB: 3,
      RB: 4,
      FB: 1,
      WR: 6,
      TE: 3,
      OT: 4,
      G: 4,
      C: 2,
      EDGE: 4,
      DL: 4,
      LB: 6,
      CB: 6,
      S: 4,
      K: 1,
      P: 1,
    },
  ];

  for (const team_season of team_seasons) {
    team_season.team_position_option = deep_copy(
      team_position_options[Math.floor(Math.random() * team_position_options.length)]
    );
  }

  const player_team_seasons_by_position = index_group_sync(
    player_team_seasons,
    "group",
    "position"
  );
  console.log("player_team_seasons", {
    player_team_seasons_by_position: player_team_seasons_by_position,
    player_team_seasons: player_team_seasons,
  });

  let player_team_seasons_tocreate = [];

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) =>
        pts_b.ratings.overall.potential +
        pts_b.ratings.overall.OVERALL -
        (pts_a.ratings.overall.potential + pts_a.ratings.overall.overall)
    );

    let position_team_season_ids = team_seasons
      .map((ts) => Array(ts.team_position_option[position]).fill([ts.team_season_id]).flat())
      .flat();

    if (position == "P" || position == "K") {
      position_team_season_ids = shuffle(team_seasons.map((ts) => ts.team_season_id));
      position_team_season_ids = position_team_season_ids.concat(
        shuffle(team_seasons.map((ts) => ts.team_season_id))
      );
    } else {
      position_team_season_ids = shuffle(position_team_season_ids);
    }

    console.log({
      position_team_season_ids: position_team_season_ids,
      position_player_team_seasons: position_player_team_seasons,
    });

    for (const team_season_id of position_team_season_ids) {
      var team_season = team_seasons_by_team_season_id[team_season_id];

      var prestige_slice_lower_bound = Math.floor(
        position_player_team_seasons.length * team_season.prestige_lower_slice_ratio
      );
      var prestige_slice_upper_bound = Math.ceil(
        position_player_team_seasons.length * team_season.prestige_upper_slice_ratio
      );

      var prestige_slice_gap = prestige_slice_upper_bound - prestige_slice_lower_bound;
      // var r = Math.random();
      // var player_team_season_index = Math.floor(
      //   prestige_slice_lower_bound + (r * prestige_slice_gap)
      // );

      // var chosen_player_team_season = position_player_team_seasons.splice(
      //   player_team_season_index,
      //   1
      // );

      console.log({
        team_season: team_season,
        position_player_team_seasons: position_player_team_seasons,
        "team_season.prestige_upper_slice_ratio": team_season.prestige_upper_slice_ratio,
        "team_season.prestige_lower_slice_ratio": team_season.prestige_lower_slice_ratio,
        prestige_slice_gap: prestige_slice_gap,
        prestige_slice_upper_bound: prestige_slice_upper_bound,
        prestige_slice_lower_bound: prestige_slice_lower_bound,
      });
      let available_position_player_team_seasons = position_player_team_seasons.slice(
        0,
        position_player_team_seasons.length
      );
      let available_position_player_team_seasons_tuples =
        available_position_player_team_seasons.map(function (pts) {
          return [pts, pts.ratings.overall.overall + pts.ratings.overall.potential];
        });
      let chosen_player_team_season = weighted_random_choice(
        available_position_player_team_seasons_tuples
      );
      // console.log({available_position_player_team_seasons_tuples:available_position_player_team_seasons_tuples, chosen_player_team_season:chosen_player_team_season})

      if (chosen_player_team_season) {
        chosen_player_team_season.team_season_id = team_season_id;
        player_team_seasons_tocreate.push(chosen_player_team_season);
      } else {
        console.log("Didnt match player");
      }

      position_player_team_seasons = position_player_team_seasons.filter(
        (pts) => pts != chosen_player_team_season
      );
    }

    console.log({
      position: position,
      position_team_season_ids: position_team_season_ids,
      player_team_seasons: player_team_seasons,
      player_team_seasons_tocreate: player_team_seasons_tocreate,
    });
  }

  player_team_seasons_tocreate.forEach(function (pts) {
    delete pts.player;
    delete pts.team_distances;
  });

  console.log({ player_team_seasons_tocreate: player_team_seasons_tocreate });
  db.player_team_season.update(player_team_seasons_tocreate);

  await db.saveDatabaseAsync();
};

const create_coaches = async (data) => {
  const common = data.common;
  const db = common.db;
  var coaches_tocreate = [];
  var ethnicity_map = { white: 25, black: 25, hispanic: 25, asian: 25 };

  const positions = ["HC", "OC", "DC", "ST"];

  const num_coaches_to_create = positions.length * data.team_seasons.length;

  const coach_names = random_name(ddb, num_coaches_to_create);
  const coach_cities = random_city(ddb, num_coaches_to_create);

  var coach_counter = 0;

  let teams = db.team.find({ team_id: { $gt: 0 } });
  let team_brand_weights = teams.map((t) => [
    t.team_id,
    Math.floor(t.team_ratings.program_history ** 0.5),
  ]);

  var coach_id_counter = db.coach.nextId("coach_id");

  for (let team_season of data.team_seasons) {
    for (const coaching_position of positions) {
      let body = body_from_position("coach");
      let ethnicity = weighted_random_choice(ethnicity_map);
      let alma_mater_team_id = weighted_random_choice(team_brand_weights);
      var coach_obj = {
        coach_id: coach_id_counter,
        name: coach_names[coach_counter],
        world_id: data.world_id,
        coaching_position: coaching_position,
        hometown: coach_cities[coach_counter],
        ethnicity: ethnicity,
        body: body,
        alma_mater_team_id: parseInt(alma_mater_team_id),
      };

      coaches_tocreate.push(new coach(coach_obj));

      coach_counter += 1;
      coach_id_counter += 1;
    }
  }
  console.log({ coaches_tocreate: coaches_tocreate });
  db.coach.insert(coaches_tocreate);

  await db.saveDatabaseAsync();
};

const create_coach_team_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  common.season;

  const team_seasons = data.team_seasons;

  var coach_team_seasons_tocreate = [];
  let coach_team_season_id_counter = db.coach_team_season.nextId("coach_team_season_id");

  for (const coach of data.coaches) {
    var init_data = {
      coach_id: coach.coach_id,
      coach_team_season_id: coach_team_season_id_counter,
      team_season_id: -1,
      season: data.season,
      world_id: data.world_id,
      coaching_position: coach.coaching_position,
      age: Math.floor(Math.random() * 30) + 30,
    };

    var new_cts = new coach_team_season(init_data);

    coach_team_seasons_tocreate.push(new_cts);
    coach_team_season_id_counter += 1;
  }

  const coach_team_seasons_by_position = index_group_sync(
    coach_team_seasons_tocreate,
    "group",
    "coaching_position"
  );
  console.log({
    coach_team_seasons_tocreate: coach_team_seasons_tocreate,
    coach_team_seasons_by_position: coach_team_seasons_by_position,
  });
  coach_team_seasons_tocreate = [];

  for (const position in coach_team_seasons_by_position) {
    var coach_team_seasons = coach_team_seasons_by_position[position];

    let ind = 0;
    for (const team_season of team_seasons) {
      let chosen_coach_team_season = coach_team_seasons[ind];
      chosen_coach_team_season.team_season_id = team_season.team_season_id;

      chosen_coach_team_season.contract = {
        overall_years: 5,
        years_remaining: Math.floor(Math.random() * 5) + 1,
        compensation: 1_000_000,
        goals: {
          wins_per_season: { value: 6, importance: 10 },
          final_rank: { value: 25, importance: 8 },
        },
      };

      coach_team_seasons_tocreate.push(chosen_coach_team_season);

      ind += 1;
    }
  }

  db.coach_team_season.insert(coach_team_seasons_tocreate);

  await db.saveDatabaseAsync();
};

const generate_player_ratings = async (common, world_id, season) => {
  const db = common.db;

  let players = db.player.find();
  let players_by_player_id = index_group_sync(players, 'index', 'player_id');
  let player_team_seasons = db.player_team_season.find({ season: season });

  player_team_seasons = nest_children(player_team_seasons, players_by_player_id, 'player_id', 'player');

  var url = "/data/import_json/player_archetype_overall_coefficients.json";
  var json_data = await fetch(url);
  var player_overall_coefficients_list = await json_data.json();
  let player_overall_coefficients = index_group_sync(player_overall_coefficients_list, 'group', 'position');

  Object.entries(player_overall_coefficients).forEach(function(entry_obj){
    let key = entry_obj[0];
    let vals = entry_obj[1];

    player_overall_coefficients[key] = index_group_sync(vals, 'index', 'archetype');
  });
  console.log({
    url: url,
    player_team_seasons: player_team_seasons,
    player_overall_coefficients: player_overall_coefficients,
  });

  var position_overall_max = {};
  var position_overall_min = {};

  player_team_seasons
    .filter((pts) => pts.ratings)
    .forEach(function (pts) {
      pts.potential_ratings = deep_copy(pts.ratings);
    });

  console.log({player_team_seasons:player_team_seasons});
  for (let pts of player_team_seasons.filter((pts) => !pts.ratings)) {
    let position_archetype = deep_copy((player_overall_coefficients[pts.position][pts.archetype] || player_overall_coefficients[pts.position][`${pts.position}_Balanced`]).skills);
    pts.ratings = pts.ratings || {};
    pts.potential_ratings = {};
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];

      pts.ratings[rating_group_key] = pts.ratings[rating_group_key] || {};
      pts.potential_ratings[rating_group_key] = {};
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        var rating_mean = rating_obj.mean;
        var rating_std = rating_obj.std;

        var rating_value =
          pts.ratings[rating_group_key][rating_key] ||
          round_decimal(normal_trunc(rating_mean, rating_std, 1, 100), 0);

        pts.potential_ratings[rating_group_key][rating_key] = rating_value;

        let aged_out_rating_value = age_out_rating(
          rating_group_key,
          rating_key,
          rating_value,
          pts.age
        );

        pts.ratings[rating_group_key][rating_key] = aged_out_rating_value;
      }
    }
  }

  for (let pts of player_team_seasons) {
    let overall_impact = 0;
    let balanced_overall_impact = 0;
    let potential_impact = 0;
    let position_archetype = deep_copy((player_overall_coefficients[pts.position][pts.archetype] || player_overall_coefficients[pts.position][`${pts.position}_Balanced`]).skills);
    let balanced_position_archetype = deep_copy(player_overall_coefficients[pts.position][`${pts.position}_Balanced`].skills);
    // console.log({pts:pts})
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        // var rating_overall_impact = rating_obj.ovr_weight_percentage;
        // let balanced_rating_overall_impact = balanced_position_archetype[rating_group_key][rating_key].ovr_weight_percentage;
        var rating_overall_impact = rating_obj.one_based_ovr_weight_percentage || 0;
        let balanced_rating_overall_impact = balanced_position_archetype[rating_group_key][rating_key].one_based_ovr_weight_percentage || 0;

        overall_impact +=
          (pts.ratings[rating_group_key][rating_key]) * rating_overall_impact;

        balanced_overall_impact += 
          (pts.ratings[rating_group_key][rating_key]) * balanced_rating_overall_impact;
        

        if (!pts.ratings[rating_group_key][rating_key]){
          console.log('Missing rating?',{
            'pts.ratings[rating_group_key][rating_key]': pts.ratings[rating_group_key][rating_key],
            rating_key:rating_key,
            rating_group_key:rating_group_key,
            pts:pts,
            'pts.ratings': pts.ratings
          });
        }

        potential_impact +=
          (pts.potential_ratings[rating_group_key][rating_key]) *
          rating_overall_impact;
      }
    }

    pts.ratings.overall = pts.ratings.overall || {};
    pts.ratings.overall.overall = Math.floor(Math.max(overall_impact, balanced_overall_impact)) || 0;
    pts.ratings.overall.potential = Math.floor(potential_impact) || 0;

    if (!(pts.position in position_overall_max)) {
      position_overall_max[pts.position] = pts.ratings.overall.overall || 0;
      position_overall_min[pts.position] = pts.ratings.overall.overall || 100;
    }

    position_overall_max[pts.position] = Math.max(
      position_overall_max[pts.position],
      pts.ratings.overall.overall || 0
    );
    position_overall_min[pts.position] = Math.min(
      position_overall_min[pts.position],
      pts.ratings.overall.overall || 100
    );

    if (position_overall_max[pts.position] == pts.ratings.overall.overall){
      console.log('Hit new max', {
        pts:pts,
        position_overall_max:position_overall_max,
        'pts.ratings.overall': pts.ratings.overall,
        position_archetype:position_archetype
      });
    } 
  }

  console.log({
    position_overall_max:position_overall_max,
    position_overall_min:position_overall_min,
    overalls: player_team_seasons.map(pts => pts.ratings.overall.overall)
  });

  var goal_overall_max = 99;
  var goal_overall_min = 30;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const pts of player_team_seasons) {
    let original_overall = pts.ratings.overall.overall;
    let original_potential = pts.ratings.overall.potential;

      pts.ratings.overall.overall = Math.floor(
        ((pts.ratings.overall.overall - position_overall_min[pts.position]) /
          (position_overall_max[pts.position] - position_overall_min[pts.position])) **
          1.01 *
          goal_overall_range +
          goal_overall_min
      );

    pts.ratings.overall.potential = Math.floor(
      ((pts.ratings.overall.potential - position_overall_min[pts.position]) /
        (position_overall_max[pts.position] - position_overall_min[pts.position])) **
        1.01 *
        goal_overall_range +
        goal_overall_min
    );

    if (!pts.ratings.overall.potential || !pts.ratings.overall.overall) {
      console.log("broken overall", {
        pts: pts,
        "pts.ratings.overall.potential ": pts.ratings.overall.potential,
        "pts.ratings.overall.overall": pts.ratings.overall.overall,
        goal_overall_range: goal_overall_range,
        "pts.position": pts.position,
        goal_overall_min: goal_overall_min,
        position_overall_min:position_overall_min,
        "position_overall_min[pts.position]": position_overall_min[pts.position],
        " position_overall_max[pts.position]": position_overall_max[pts.position],
        original_overall: original_overall,
        original_potential: original_potential,
      });
    }

    delete pts.potential_ratings;
  }

  console.log("setting ratings", { player_team_seasons: player_team_seasons });
  //
  db.player_team_season.update(player_team_seasons);
  await db.saveDatabaseAsync();
};

const create_new_players_and_player_team_seasons = async (common, world_id, season) => {
  const db = common.db;

  let players_tocreate = [];
  let player_team_seasons_tocreate = [];
  let player_team_season_stats_tocreate = [];

  const position_ethnicity =
    //numbers normalized from https://theundefeated.com/features/the-nfls-racial-divide/
    {
      QB: { white: 65, black: 25, hispanic: 5, asian: 5 },
      RB: { white: 25, black: 65, hispanic: 10, asian: 5 },
      FB: { white: 50, black: 50, hispanic: 15, asian: 2 },
      WR: { white: 25, black: 65, hispanic: 5, asian: 5 },
      TE: { white: 50, black: 50, hispanic: 15, asian: 2 },
      OT: { white: 45, black: 55, hispanic: 15, asian: 1 },
      G: { white: 40, black: 50, hispanic: 15, asian: 1 },
      C: { white: 40, black: 50, hispanic: 15, asian: 1 },
      EDGE: { white: 20, black: 80, hispanic: 10, asian: 1 },
      DL: { white: 10, black: 80, hispanic: 10, asian: 1 },
      LB: { white: 25, black: 75, hispanic: 10, asian: 1 },
      CB: { white: 10, black: 100, hispanic: 10, asian: 2 },
      S: { white: 15, black: 80, hispanic: 10, asian: 5 },
      K: { white: 70, black: 10, hispanic: 25, asian: 25 },
      P: { white: 70, black: 10, hispanic: 25, asian: 25 },
    };

  var player_id_counter = db.player.nextId("player_id");
  var player_team_season_id_counter = db.player_team_season.nextId("player_team_season_id");

  var url = "/data/import_json/players.json";
  var data = await fetch(url);
  var player_list = await data.json();

  let leagues = db.league.find();
  let all_teams = db.team.find();

  let teams_by_league_id = index_group_sync(all_teams, 'group', 'league_id');

  leagues.forEach(leag => leag.teams = teams_by_league_id[leag.league_id]);

  const num_players_to_create = sum(leagues.map(leag => leag.roster.season_roster_max * leag.teams.length));

  const player_names = random_name(ddb, num_players_to_create);
  const player_cities = random_city(ddb, num_players_to_create);
  const player_colleges = random_college(db, num_players_to_create);

  console.log('pre league loop',{
    player_colleges:player_colleges,
    player_cities:player_cities,
    player_names:player_names,
    player_list:player_list
  });

  leagues.forEach(function (leag) {
    let team_seasons = db.team_season.find({league_id: leag.league_id, season: season});
    let team_seasons_by_team_id = index_group_sync(team_seasons, "index", "team_id");
    let teams = nest_children(leag.teams, team_seasons_by_team_id, "team_id", "team_season");
    let teams_by_team_abbreviation = index_group_sync(teams, "index", "team_abbreviation");

    console.log({ season:season, teams_by_team_abbreviation: teams_by_team_abbreviation, leag:leag, teams:teams });

    console.log({
      player_names:player_names,
      player_cities:player_cities,
      player_colleges:player_colleges,
      num_players_to_create:num_players_to_create,
    });

    if (season == 2022 && leag.league_abbreviation == 'NFL') {
      
      console.log({
        player_list: player_list,
      });

      for (let p of player_list) {

        let archetype = p.archetype || `${p.position}_Balanced`;
        console.log({
          p:p, archetype:archetype
        });

        var player_obj = new player({
          player_id: player_id_counter,
          name: p.name,
          world_id: world_id,
          hometown: p.hometown,
          college: p.college,
          ethnicity: p.ethnicity || weighted_random_choice(position_ethnicity[p.position]),
          body: p.body,
          draft_info: p.draft_info,
          position: p.position,
          archetype: archetype,
        });

        let player_team_season_obj = new player_team_season({
          world_id: world_id,
          player_id: player_id_counter,
          player_team_season_id: player_team_season_id_counter,
          season: season,
          age: p.current_player_team_season.age,
          ratings: p.current_player_team_season.ratings,
          team_season_id:
            teams_by_team_abbreviation[p.current_player_team_season.team_abbreviation].team_season
              .team_season_id,
          position: p.position,
          archetype: archetype,
        });

        var new_player_team_season_stats = new player_team_season_stats(
          player_team_season_id_counter
        );
        player_team_season_stats_tocreate.push(new_player_team_season_stats);

        players_tocreate.push(player_obj);
        player_team_seasons_tocreate.push(player_team_season_obj);
        player_id_counter += 1;
        player_team_season_id_counter += 1;
      }
    }
  });

  console.log({
    players_tocreate: players_tocreate,
    player_team_seasons_tocreate: player_team_seasons_tocreate,
  });
  await Promise.all([
    db.player.insert(players_tocreate),
    db.player_team_season.insert(player_team_seasons_tocreate),
    db.player_team_season_stats.insert(player_team_season_stats_tocreate),
  ]);

  await db.saveDatabaseAsync();
};

const create_phase = async (season, common) => {
  const db = common.db;

  let dates = db.day.find();
  let dates_by_day_id = index_group_sync(dates, 'index', 'day_id');

  var url = "/data/import_json/calendar.json";
  var data = await fetch(url);
  var calendar_dim = await data.json();

  let phase_id = db.phase.nextId("phase_id");
  let period_id = db.period.nextId("period_id");

  // This function takes a day_id as input and returns the next date to display
  const next_date = function(d) {
    console.log({d:d, dates_by_day_id:dates_by_day_id, 'dates_by_day_id[d]': dates_by_day_id[d]});
    return dates_by_day_id[d].next_date_display
  };
  const date_add = function(iter_day_id, days_to_add){
    for (let day_index = 0; day_index < days_to_add - 1; day_index++){
      console.log({
        day_index:day_index,
        iter_day_id:iter_day_id,
        days_to_add:days_to_add
      });
      iter_day_id = next_date(iter_day_id);
    }
    return iter_day_id;
  };

  let phases_to_create = [];

  Object.entries(calendar_dim).forEach(function(entr){
    entr[0];
    let league_calendar_obj = entr[1];

    let phases = league_calendar_obj.phases || [];

    let previous_phase_end_date = null;

    phases.forEach(function(ph){
      ph.season = season;
      ph.phase_id = phase_id;

      ph.start_date = ph.start_date ? add_season_to_date(season, ph.start_date) : null;
      ph.end_date = ph.end_date ? add_season_to_date(season, ph.end_date) : null;

      if (!ph.start_date){
        if (previous_phase_end_date){
          ph.start_date = next_date(previous_phase_end_date);
        }
      }
      let previous_period_end_date = null;

      ph.periods = ph.periods || [];
      console.log({
        ph:ph
      });
      if (ph.periods.length == 0 && ph.period_week_template){
        for (let template_week_index = 0; template_week_index < ph.template_week_count; template_week_index++){
          let period_obj = deep_copy(ph.period_week_template);

          period_obj.start_date = previous_period_end_date ? next_date(previous_period_end_date) : ph.start_date;

          period_obj.end_date = date_add(period_obj.start_date, ph.template_week_length);

          previous_period_end_date = period_obj.end_date;
          period_obj.period_name = period_obj.period_name.replace('{{index}}', template_week_index + 1);
          ph.periods.push(period_obj);
        }
      }

      console.log({
        'ph.periods': ph.periods,
        ph:ph
      });

      ph.periods.forEach(function(pe){
        pe.season = season;
        pe.period_id = period_id;

        pe.start_date = pe.start_date ? add_season_to_date(season, pe.start_date) : next_date(previous_period_end_date || previous_phase_end_date);
        pe.end_date = pe.end_date ? add_season_to_date(season, pe.end_date) : date_add(pe.start_date, pe.week_length);

        previous_period_end_date = pe.end_date;
        previous_phase_end_date = previous_period_end_date;

        period_id += 1;
      });

      if (!ph.end_date){
        ph.end_date = previous_period_end_date;
      }

      console.log({
        ph:ph
      });

      phase_id += 1;

      phases_to_create.push(ph);
    });
  });

  let periods_to_create = [];
  let days_to_save = [];

  phases_to_create.forEach(function(ph){
    periods_to_create = periods_to_create.concat(ph.periods);
    delete ph.periods;
  });

  periods_to_create.forEach(function(pe){
    console.log({ 
      db: db, 
      pe: pe 
    });
    let period_dates = dates.filter(d => d.date.isBetween(pe.start_date, pe.end_date, '[]'));
    console.log({      db: db, 
      pe: pe , period_dates:period_dates});

      period_dates.forEach(function(dt){
        dt.period_id = pe.period_id;
        dt.phase_id = pe.phase_id;
        dt.season = season;
        days_to_save.push(dt);
      });
  });

  console.log({days_to_save:days_to_save});

  db.day.update(days_to_save);
  db.period.insert(periods_to_create);
  db.phase.insert(phases_to_create);
  await db.saveDatabaseAsync();
};

const create_dates = async (common, season, seasons_in_to_future = 2
) => {
  const db = common.db;

  var url = "/data/import_json/world.json";
  var data = await fetch(url);
  var world_dim = await data.json();

  let new_dates = [];
  let existing_dates = db.day.find();
  let existing_day_ids = new Set(existing_dates.map(d => d.day_id));

  for (let season_index = 0; season_index < seasons_in_to_future; season_index++){
    let iter_season = season + season_index;
    let league_start_date = iter_season + '-' + world_dim.league_start_date;
    let league_end_date = (iter_season + 1) + '-' + world_dim.league_start_date;
  
    let start_date = dayjs(league_start_date);
    let stop_date = dayjs(league_end_date);
    let iter_date = start_date.clone();
  
    while(iter_date.isBefore(stop_date, 'day')){
      let day_id = iter_date.format('YYYY-MM-DD');
      if (! existing_day_ids.has(day_id)){
        new_dates.push(new day(iter_date.clone(), iter_season, new_dates.length == 0));
      }
      iter_date = iter_date.add(1, 'day');
    }
  }

  console.log({
    new_dates:new_dates
  });

  db.day.insert(new_dates);
  await db.saveDatabaseAsync();
};

const get_rivalries = async (teams) => {
  const team_names = teams.map((t) => t.team_location_name);

  var url = "/data/import_json/rivalries.json";
  var data = await fetch(url);
  var rival_dimension = await data.json();

  rival_dimension = rival_dimension.filter(
    (r) => team_names.includes(r.team_name_1) && team_names.includes(r.team_name_2)
  );

  rival_dimension = shuffle(rival_dimension);
  rival_dimension = rival_dimension.sort(function (a, b) {
    if (a.preferred_period_id == undefined) return 1;
    if (b.preferred_period_id == undefined) return 0;
    if (a.preferred_period_id < b.preferred_period_id) return -1;
    if (a.preferred_period_id > b.preferred_period_id) return 1;
    return 0;
  });

  return rival_dimension;
};

const get_leagues = async () => {
  var url = "/data/import_json/league.json";
  var data = await fetch(url);
  var leagues = await data.json();

  leagues.forEach(function(l, ind){
    l.league_id = ind + 1;
  });

  return leagues;
};

const get_teams = async () => {
  var url = "/data/import_json/team.json";
  var data = await fetch(url);
  var teams = await data.json();

  teams.forEach(function (t) {
    t.team_color_primary_hex = t.team_color_primary_hex.replace("#", "");
    t.team_color_secondary_hex = t.team_color_secondary_hex.replace("#", "");

    if (t.jersey.lettering_color) {
      t.jersey.lettering_color = t.jersey.lettering_color.replace("#", "");
    }

    t.field = t.field || {
      endzones: {
        style: "text",
        endzone_color: "407A21",
        text: t.team_location_name,
        text_color: t.team_color_primary_hex,
        text_border_color: "FFFFFF",
      },
    };
  });

  return teams;
};

const get_conferences = async (conference_version) => {
  conference_version = conference_version || "";

  var url = `/data/import_json/conference${conference_version}.json`;
  console.log({ url: url });
  var data = await fetch(url);
  var conferences = await data.json();
  console.log({ conferences: conferences });

  return conferences;
};

const random_name = (ddb, num_names) => {
  var name_list = [];

  const first_name_list = ddb.first_names.find();
  const last_name_list = ddb.last_names.find();

  let final_first_name_obj = first_name_list[first_name_list.length - 1];
  let final_last_name_obj = last_name_list[last_name_list.length - 1];

  for (var i = 0; i <= num_names; i++) {
    const r_first = Math.floor(Math.random() * final_first_name_obj.stop);
    const r_last = Math.floor(Math.random() * final_last_name_obj.stop);

    const chosen_first = first_name_list.find((name_obj) => name_obj.stop > r_first);
    const chosen_last = last_name_list.find((name_obj) => name_obj.stop > r_last);

    name_list.push({ first: chosen_first.name, last: chosen_last.name });
  }
  return name_list;
};

const random_college = async (ddb, num_colleges) => {
  var college_list_url = "/data/import_json/colleges.json";
  var college_list_html = await fetch(college_list_url);
  let college_list = await college_list_html.json();

  let college_weights = college_list.map(co => [co.team, co.players ** 2.1]);

  let chosen_college_list = weighted_random_choice(college_weights, 'None', num_colleges);

  return chosen_college_list;
};

const random_city = (ddb, num_cities) => {
  let city_list = ddb.cities.find();
  let chosen_city_list = [];

  let total_occurance = sum(city_list.map((c) => c.occurance));

  for (var i = 0; i <= num_cities; i++) {
    let r_city = Math.floor(Math.random() * total_occurance);
    let chosen_city = city_list.find(function (city_obj) {
      r_city -= city_obj.occurance;
      return r_city <= 0;
    });
    chosen_city_list.push(chosen_city);
  }
  return chosen_city_list;
};
window.table_key_map = null;
window.reverse_table_key_map = null;

const resolve_route_parameters = async (pathname) => {
  let routes = [
    { route: "/", f: page_index },

    { route: "/admin", path: "admin/admin/base.html" },
    { route: "/admin/Database/:database", path: "admin/database/base.html" },
    { route: "/admin/Database/:database/Table/:table", path: "admin/table/base.html" },

    { route: "/World/:world_id/", f: page_world, group_name: 'World', path: 'Overview' },
    { route: "/World/:world_id/Rankings/", f: page_world_rankings, group_name: 'World', path: 'Rankings' },
    { route: "/World/:world_id/Standings/", f: page_world_standings, group_name: 'World', path: 'Standings' },
    {
      route: "/World/:world_id/Standings/Conference/:conference_id",
      path: "world/standings/base.html", group_name: 'World', path: 'Standings'
    },
    { route: "/World/:world_id/Schedule/", f: page_world_schedule, group_name: 'World', path: 'Schedule' },
    { route: "/World/:world_id/Awards/", f: page_world_awards, group_name: 'World', path: 'Awards' },

    {
      route: "/World/:world_id/Conference/:conference_id",
      path: "conference/conference/base.html", group_name: 'Conference', path: 'Overview'
    },

    { route: "/World/:world_id/Recruiting/", path: "world/recruiting/base.html", group_name: 'World', path: 'Recruiting' },

    {
      route: "/World/:world_id/PlayerStats/Season/:season",
      f: page_almanac_player_stats, group_name: 'Almanac', path: 'Player Stats'
    },
    { route: "/World/:world_id/TeamStats/Season/:season", path: "almanac/team_stats/base.html", group_name: 'Almanac', path: 'Team Stats' },

    { route: "/World/:world_id/History", f: page_almanac_history, group_name: 'Almanac', path: 'History' },
    { route: "/World/:world_id/PlayerRecords", f: page_almanac_player_records, group_name: 'Almanac', path: 'Player Records' },
    { route: "/World/:world_id/TeamRecords", path: "almanac/team_records/base.html", group_name: 'Almanac', path: 'Team Records' },
    { route: "/World/:world_id/CoachStats", path: "almanac/coach_stats/base.html", group_name: 'Almanac', path: 'Coach Stats' },
    { route: "/World/:world_id/Shortlists", path: "almanac/shortlists/base.html", group_name: 'Almanac', path: 'Shortlist' },
    { route: "/World/:world_id/AmazingStats", path: "almanac/amazing_stats/base.html", group_name: 'Almanac', path: 'Amazing Stats' },
    {
      route: "/World/:world_id/AmazingStats/Season/:season/",
      path: "almanac/amazing_stats/base.html", group_name: 'Almanac', path: 'Amazing Stats'
    },

    { route: "/World/:world_id/Team/:team_id/", f: page_team, group_name: 'Team', path: 'Overview' },
    { route: "/World/:world_id/Team/:team_id/Season/:season/", f: page_team, group_name: 'Team', path: 'Overview' },
    { route: "/World/:world_id/Team/:team_id/Schedule", f: page_team_schedule, group_name: 'Team', path: 'Schedule' },
    {
      route: "/World/:world_id/Team/:team_id/Schedule/Season/:season/",
      f: page_team_schedule, group_name: 'Team', path: 'Schedule'
    },
    { route: "/World/:world_id/Team/:team_id/Roster", f: page_team_roster, group_name: 'Team', path: 'Roster' },
    {
      route: "/World/:world_id/Team/:team_id/Roster/Season/:season",
      f: page_team_roster, group_name: 'Team', path: 'Roster'
    },
    { route: "/World/:world_id/Team/:team_id/Gameplan", path: "team/gameplan/base.html", group_name: 'Team', path: 'Gameplan' },
    {
      route: "/World/:world_id/Team/:team_id/Gameplan/Season/:season",
      path: "team/gameplan/base.html", group_name: 'Team', path: 'Gameplan'
    },
    { route: "/World/:world_id/Team/:team_id/History", f: page_team_history, group_name: 'Team', path: 'History' },

    { route: "/World/:world_id/Player/:player_id/", f: page_player, group_name: 'Player', path: 'Overview' },
    { route: "/World/:world_id/Coach/:coach_id/", path: "coach/coach/base.html", group_name: 'Coach', path: 'Overview' },

    { route: "/World/:world_id/Game/:game_id/", f: page_game, group_name: 'Game', path: 'Overview' },

    { route: "/World/:world_id/Search/:search_keyword/", path: "search/search/base.html", group_name: 'Search', path: 'Overview' },

    { route: "", path: "static" },
    { route: "*html_templates*", path: "url" },
    { route: "*js/modules*", path: "url" },
    { route: "/*", path: "url" },
  ];

  const route_pattern_split = pathname.split("/").filter((str) => str.length > 0);
  const route_params = pathname.split("/").filter((str) => str.length > 0);

  routes.forEach(function (route) {
    route.route_parts = route.route.split("/").filter((str) => str.length > 0);
  });

  routes = routes.filter((route) => route.route_parts.length == route_params.length);
  routes = routes.filter(function (route) {
    route.params = {};
    for (let ind = 0; ind < route.route_parts.length; ind++) {
      if (route.route_parts[ind] != route_params[ind] && !route.route_parts[ind].includes(":")) {
        return false;
      } else if (route.route_parts[ind].includes(":")) {
        let key = route.route_parts[ind];
        key = key.replace(":", "");
        let val = route_params[ind];

        route.params[key] = val;
        if (/^\d+$/.test(val)) {
          route.params[key] = parseInt(val);
        }
      }
    }
    return true;
  });

  let winning_route = routes[0];

  console.log({
    routes: routes,
    winning_route: winning_route,
    route_params: route_params,
    route_pattern_split: route_pattern_split,
  });
  return winning_route;
};

const common_functions = async (path) => {
  let winning_route = await resolve_route_parameters(path);
  console.log({
    path: path,
    winning_route: winning_route,
  });
  const params = winning_route.params;
  const world_id = params.world_id;

  var world_object = {};
  const ddb = await driver_db();
  if (world_id != undefined) {
    world_object = ddb.world.findOne({ world_id: world_id });
  }

  let db = null;
  if (world_id) {
    db = await resolve_db({ database_id: world_id });
  }

  return {
    winning_route: winning_route,
    db: db,
    ddb: ddb,
    world_id: world_id,
    world_object: world_object,
    params: params,
    season: world_object.current_season,
    distance_between_coordinates: distance_between_coordinates,
    schedule_bowl_season: schedule_bowl_season,
    process_bowl_results: process_bowl_results,
    calculate_team_needs: calculate_team_needs,
    populate_player_modal: populate_player_modal,
    tier_placement: tier_placement,
    new_world_action:new_world_action,
    stopwatch: stopwatch,
    primary_color: "1763B2",
    secondary_color: "333333",
  };
};

const stopwatch = async (common, message) => {
  var currentTime = performance.now();
  window.lastStopwatch = window.lastStopwatch || common.startTime;
  console.log(
    `${message}- total time: ${parseInt(currentTime - common.startTime)} ms, since last: ${parseInt(
      currentTime - window.lastStopwatch
    )} ms`
  );
  window.lastStopwatch = currentTime;
};

const calculate_team_needs = async (common, team_season_ids = null) => {
  var startTime = performance.now();

  const db = await common.db;
  const season = common.season;

  let team_seasons = [];

  if (!team_season_ids) {
    team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
    team_season_ids = team_seasons.map((ts) => ts.team_season_id);
  } else {
    team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });
  }

  const player_team_seasons = db.player_team_season.find({
    team_season_id: { $in: team_season_ids },
  });
  const player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  const position_starters_map = {
    QB: [1, 0.05],
    RB: [1, 0.4],
    FB: [0.2],
    WR: [1, 1, 0.75, 0.25, 0.1],
    TE: [1, 0.5],
    OT: [1, 1, 0.1],
    G: [1, 1, 0.1],
    C: [1, 0.1],
    EDGE: [1, 1, 0.5, 0.25],
    DL: [1, 0.9, 0.4, 0.25],
    LB: [1, 1, 1, 0.75, 0.25],
    CB: [1, 1, 0.6, 0.25],
    S: [1, 1, 0.4],
    K: [1],
    P: [1],
  };

  const overall_list = [99, 95, 90, 85, 80, 75, 70, 65, 60, 55, 45, 30, 0];

  const class_map = {
    SR: 0,
    "SR (RS)": 0,
    JR: 1,
    "JR (RS)": 1,
    SO: 2,
    "SO (RS)": 2,
    FR: 3,
    "FR (RS)": 3,
    "HS SR": 4,
  };

  for (const team_season of team_seasons) {
    team_season.recruiting.position_needs = {};
    for (const [position, player_team_season_ids] of Object.entries(
      team_season.depth_chart_with_recruits
    )) {
      team_season.recruiting.position_needs[position] = [];
      let position_player_overalls = player_team_season_ids.map((pts_id) => ({
        class_val: class_map[player_team_seasons_by_player_team_season_id[pts_id].class.class_name],
        class: player_team_seasons_by_player_team_season_id[pts_id].class.class_name,
        overall: player_team_seasons_by_player_team_season_id[pts_id].ratings.overall.overall,
      }));
      position_player_overalls = position_player_overalls.filter(
        (pts_obj) => pts_obj.class_val > 0
      );

      for (const overall of overall_list) {
        let overall_obj = { overall: overall, playing_time_val: 0 };
        for (const class_val of [1, 2, 3, 4]) {
          let year_position_player_overalls = position_player_overalls.filter(
            (pts_obj) => pts_obj.class_val >= class_val
          );
          let overall_index = year_position_player_overalls.findIndex(
            (pts_obj) => pts_obj.overall < overall
          );
          if (overall_index == -1) {
            overall_index = year_position_player_overalls.length;
          }
          let overall_playtime_modifier = position_starters_map[position][overall_index] || 0;
          overall_obj.playing_time_val += overall_playtime_modifier;
        }
        overall_obj.playing_time_val = Math.ceil(overall_obj.playing_time_val * 5);
        team_season.recruiting.position_needs[position].push(overall_obj);
      }
    }
  }

  // team_seasons.forEach((ts) => delete ts.recruiting);

  db.team_season.update(team_seasons);

  await db.saveDatabaseAsync();

  var endTime = performance.now();
  console.log(`Time taken to calculate_team_needs: ${parseInt(endTime - startTime)} ms`);
};

const calculate_team_overalls = async (common) => {
  const db = await common.db;
  const season = common.season;
  const team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  const position_map = {
    QB: { group: "Offense", unit: "QB", typical_starters: 1, overall_weight: 2.0 },
    RB: { group: "Offense", unit: "RB", typical_starters: 1, overall_weight: 0.6 },
    FB: { group: "Offense", unit: "FB", typical_starters: 1, overall_weight: 0.15 },
    WR: { group: "Offense", unit: "REC", typical_starters: 2, overall_weight: 0.75 },
    TE: { group: "Offense", unit: "REC", typical_starters: 1, overall_weight: 0.6 },
    OT: { group: "Offense", unit: "OL", typical_starters: 2, overall_weight: 0.75 },
    G: { group: "Offense", unit: "OL", typical_starters: 2, overall_weight: 0.5 },
    C: { group: "Offense", unit: "OL", typical_starters: 1, overall_weight: 0.4 },

    EDGE: { group: "Defense", unit: "DL", typical_starters: 2, overall_weight: 0.75 },
    DL: { group: "Defense", unit: "DL", typical_starters: 2, overall_weight: 0.6 },
    LB: { group: "Defense", unit: "LB", typical_starters: 3, overall_weight: 0.4 },
    CB: { group: "Defense", unit: "DB", typical_starters: 2, overall_weight: 0.5 },
    S: { group: "Defense", unit: "DB", typical_starters: 2, overall_weight: 0.4 },

    K: { group: "Special Teams", unit: "ST", typical_starters: 1, overall_weight: 0.05 },
    P: { group: "Special Teams", unit: "ST", typical_starters: 1, overall_weight: 0.05 },
  };

  var rating_min_max = {
    overall: { min: 100, max: 0 },
    by_position_group: {},
    by_position_unit: {},
    by_position: {},
  };

  for (const position in position_map) {
    var position_obj = position_map[position];
    if (!(position in rating_min_max.by_position)) {
      rating_min_max.by_position[position] = { min: 100, max: 0 };
    }
    if (!(position_obj.group in rating_min_max.by_position_group)) {
      rating_min_max.by_position_group[position_obj.group] = {
        min: 100,
        max: 0,
      };
    }
    if (!(position_obj.unit in rating_min_max.by_position_unit)) {
      rating_min_max.by_position_unit[position_obj.unit] = { min: 100, max: 0 };
    }
  }

  console.log({ team_seasons: team_seasons, position_map:position_map });
  var player_team_season_ids = team_seasons
    .map((ts) =>
      Object.entries(ts.depth_chart)
        .map((pos_obj) => pos_obj[1].slice(0, position_map[pos_obj[0]].typical_starters))
        .flat()
    )
    .flat();
  const player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  for (const team_season of team_seasons) {
    team_season.rating = {
      overall: { sum: 0, count: 0 },
      by_position: {},
      by_position_group: {},
      by_position_unit: {},
    };

    for (const position in position_map) {
      var position_obj = position_map[position];
      var position_unit = position_obj.unit;
      var position_group = position_obj.group;

      if (!(position in team_season.rating.by_position)) {
        team_season.rating.by_position[position] = { sum: 0, count: 0 };
      }
      if (!(position_group in team_season.rating.by_position_group)) {
        team_season.rating.by_position_group[position_group] = {
          sum: 0,
          count: 0,
        };
      }
      if (!(position_unit in team_season.rating.by_position_unit)) {
        team_season.rating.by_position_unit[position_unit] = {
          sum: 0,
          count: 0,
        };
      }

      var player_team_season_ids = team_season.depth_chart[position].slice(
        0,
        position_map[position].typical_starters
      );

      var overall_sum = player_team_season_ids
        .map(
          (pts_id) => player_team_seasons_by_player_team_season_id[pts_id].ratings.overall.overall * position_map[player_team_seasons_by_player_team_season_id[pts_id].position].overall_weight
        )
        .reduce((acc, val) => acc + val, 0);

      team_season.rating.overall.count += position_map[position].typical_starters;
      team_season.rating.by_position[position].count += position_map[position].typical_starters;
      team_season.rating.by_position_group[position_group].count +=
        position_map[position].typical_starters;
      team_season.rating.by_position_unit[position_unit].count +=
        position_map[position].typical_starters;

      team_season.rating.overall.sum += overall_sum;
      team_season.rating.by_position[position].sum += overall_sum;
      team_season.rating.by_position_group[position_group].sum += overall_sum;
      team_season.rating.by_position_unit[position_unit].sum += overall_sum;
    }

    team_season.rating.overall = round_decimal(
      team_season.rating.overall.sum / team_season.rating.overall.count,
      1
    );

    rating_min_max.overall.max = Math.max(rating_min_max.overall.max, team_season.rating.overall);
    rating_min_max.overall.min = Math.min(rating_min_max.overall.min, team_season.rating.overall);

    for (const position in team_season.rating.by_position) {
      team_season.rating.by_position[position] = round_decimal(
        team_season.rating.by_position[position].sum /
          team_season.rating.by_position[position].count,
        1
      );

      rating_min_max.by_position[position].max = Math.max(
        rating_min_max.by_position[position].max,
        team_season.rating.by_position[position]
      );
      rating_min_max.by_position[position].min = Math.min(
        rating_min_max.by_position[position].min,
        team_season.rating.by_position[position]
      );
    }
    for (const position_group in team_season.rating.by_position_group) {
      team_season.rating.by_position_group[position_group] = round_decimal(
        team_season.rating.by_position_group[position_group].sum /
          team_season.rating.by_position_group[position_group].count,
        1
      );

      //	console.log({rating_min_max:rating_min_max, position_group:position_group, 'team_season.rating.by_position_group': team_season.rating.by_position_group})

      rating_min_max.by_position_group[position_group].max = Math.max(
        rating_min_max.by_position_group[position_group].max,
        team_season.rating.by_position_group[position_group]
      );
      rating_min_max.by_position_group[position_group].min = Math.min(
        rating_min_max.by_position_group[position_group].min,
        team_season.rating.by_position_group[position_group]
      );
    }
    for (const position_unit in team_season.rating.by_position_unit) {
      team_season.rating.by_position_unit[position_unit] = round_decimal(
        team_season.rating.by_position_unit[position_unit].sum /
          team_season.rating.by_position_unit[position_unit].count,
        1
      );

      rating_min_max.by_position_unit[position_unit].max = Math.max(
        rating_min_max.by_position_unit[position_unit].max,
        team_season.rating.by_position_unit[position_unit]
      );
      rating_min_max.by_position_unit[position_unit].min = Math.min(
        rating_min_max.by_position_unit[position_unit].min,
        team_season.rating.by_position_unit[position_unit]
      );
    }
  }

  var goal_overall_max = 99;
  var goal_overall_min = 70;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const team_season of team_seasons) {
    team_season.rating.overall = Math.floor(
      ((team_season.rating.overall - rating_min_max.overall.min) * goal_overall_range) /
        (rating_min_max.overall.max - rating_min_max.overall.min) +
        goal_overall_min
    );

    for (const position in team_season.rating.by_position) {
      team_season.rating.by_position[position] = Math.floor(
        ((team_season.rating.by_position[position] - rating_min_max.by_position[position].min) *
          goal_overall_range) /
          (rating_min_max.by_position[position].max - rating_min_max.by_position[position].min) +
          goal_overall_min
      );
    }
    for (const position_group in team_season.rating.by_position_group) {
      team_season.rating.by_position_group[position_group] = Math.floor(
        ((team_season.rating.by_position_group[position_group] -
          rating_min_max.by_position_group[position_group].min) *
          goal_overall_range) /
          (rating_min_max.by_position_group[position_group].max -
            rating_min_max.by_position_group[position_group].min) +
          goal_overall_min
      );
    }
    for (const position_unit in team_season.rating.by_position_unit) {
      team_season.rating.by_position_unit[position_unit] = Math.floor(
        ((team_season.rating.by_position_unit[position_unit] -
          rating_min_max.by_position_unit[position_unit].min) *
          goal_overall_range) /
          (rating_min_max.by_position_unit[position_unit].max -
            rating_min_max.by_position_unit[position_unit].min) +
          goal_overall_min
      );
    }
  }

  db.team_season.update(team_seasons);
  await db.saveDatabaseAsync();
};

const calculate_primetime_games = async (this_period, all_periods, common) => {
  const db = common.db;
  const season = common.season;

  let next_period = db.period.findOne({ period_id: this_period.period_id + 1 });

  if (!next_period) {
    return null;
  }

  let games = db.game.find({ period_id: next_period.period_id });

  let teams = db.team.find();
  let teams_by_team_id = index_group_sync(teams, "index", "team_id");

  let team_seasons = db.team_season.find({ season: season });
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");

  let team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  games
    .filter((g) => g.home_team_season_id > 0)
    .forEach(function (g) {
      g.home_team_season = team_seasons_by_team_season_id[g.home_team_season_id];
      g.away_team_season = team_seasons_by_team_season_id[g.away_team_season_id];

      let min_power_rank = Math.min(g.home_team_season.power_rank, g.away_team_season.power_rank);
      g.summed_power_rank = g.home_team_season.power_rank + g.away_team_season.power_rank;

      g.summed_power_rank -= Math.floor(g.home_team_season.team.team_ratings.brand / 4);
      g.summed_power_rank -= Math.floor(g.away_team_season.team.team_ratings.brand / 4);

      if (g.home_team_season.conference_season_id == g.away_team_season.conference_season_id) {
        if (next_period.schedule_week_number >= 13) {
          if (
            g.home_team_season.record.conference_gb <= 0.5 &&
            g.away_team_season.record.conference_gb <= 0.5
          ) {
            g.summed_power_rank -= 14;
          } else if (
            g.home_team_season.record.conference_gb <= 1.5 &&
            g.away_team_season.record.conference_gb <= 1.5
          ) {
            g.summed_power_rank -= 7;
          }
        } else if (next_period.schedule_week_number >= 8) {
          if (
            g.home_team_season.record.conference_gb <= 0.5 &&
            g.away_team_season.record.conference_gb <= 0.5
          ) {
            g.summed_power_rank -= 7;
          } else if (
            g.home_team_season.record.conference_gb <= 1.5 &&
            g.away_team_season.record.conference_gb <= 1.5
          ) {
            g.summed_power_rank -= 3;
          }
        }

        delete g.home_team_season;
        delete g.away_team_season;
      }

      if (g.rivalry_game) {
        g.summed_power_rank -= min_power_rank;
      }
    });

  games = games.sort((g_a, g_b) => g_a.summed_power_rank - g_b.summed_power_rank);
  let primetime_games = games.slice(0, 5);

  console.log({ games: games, primetime_games: primetime_games });
  if (primetime_games.length) {
    console.log({ "primetime_games[0]": primetime_games[0] });
    primetime_games.forEach((g) => (g.is_primetime_game = true));
    primetime_games[0].is_game_of_the_week = true;
  }

  db.game.update(games);
  await db.saveDatabaseAsync();
};

const calculate_power_rankings = async (blank_var, common) => {
  const db = common.db;

  let ls = db.league_season.findOne({ season: common.season });
  let teams = db.team.find();
  let team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  let conference_seasons = db.conference_season.find({ season: common.season });
  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  let conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );

  let periods = db.period.find({ season: { $between: [common.season - 1, common.season + 1] } });
  let periods_by_period_id = index_group_sync(periods, "index", "period_id");

  let all_days = db.day.find({season:common.season});
  let this_day = all_days.find(d => d.is_current);

  let current_period = periods_by_period_id[this_day.period_id] || {};

  console.log({ this_day:this_day, all_days:all_days, periods: periods, current_period: current_period });

  let team_season_stats = db.team_season_stats.find({ team_season_id: { $in: team_season_ids } });
  const team_season_stats_by_team_season_id = index_group_sync(
    team_season_stats,
    "index",
    "team_season_id"
  );
  team_seasons = nest_children(
    team_seasons,
    team_season_stats_by_team_season_id,
    "team_season_id",
    "stats"
  );

  let team_games = db.team_game.find({ team_season_id: { $in: team_season_ids } });
  let game_ids = team_games.map((tg) => tg.game_id);
  let games = db.game.find({ game_id: { $in: game_ids } });
  games = nest_children(games, periods_by_period_id, "period_id", "period");

  let games_by_game_id = index_group_sync(games, "index", "game_id");

  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  //team_games = team_games.filter((tg) => tg.game.was_played);
  // team_games = team_games.filter((tg) => (tg.game.period.schedule_period_number || 2000) <= 1999);
  let team_games_by_team_season_id = index_group_sync(team_games, "group", "team_season_id");

  let teams_by_team_id = index_group_sync(teams, "index", "team_id");
  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  team_seasons = nest_children(
    team_seasons,
    team_games_by_team_season_id,
    "team_season_id",
    "team_games"
  );
  team_seasons = team_seasons.filter((ts) => ts.team_id > 0);
  console.log({ team_seasons: team_seasons });

  let overall_power_modifier = 1;
  if (current_period.period_name == "Pre-Season") {
    overall_power_modifier = 5;
  }
  if (current_period.schedule_week_number) {
    overall_power_modifier = 3 - current_period.schedule_week_number * 0.15;
  }

  for (let ts of team_seasons) {
    ts.srs = {
      loops: 0,
      overall_rating: Math.ceil(
        ts.rating.overall ** overall_power_modifier / 99 ** (overall_power_modifier - 1)
      ),
      wins: 0,
      losses: 0,
      games_played: 0,
      fractional_wins: 0,
      fractional_losses: 0,
      fractional_games_played: 0,
    };

    ts.team_games = ts.team_games || [];

    ts.srs.all_team_season_ids = ts.team_games.map((tg) => tg.opponent_team_season_id);
    ts.srs.played_team_season_ids = ts.team_games
      .filter((tg) => tg.game.was_played)
      .map((tg) => tg.opponent_team_season_id);
    ts.srs.unplayed_team_season_ids = ts.team_games
      .filter((tg) => !tg.game.was_played)
      .map((tg) => tg.opponent_team_season_id);

    ts.played_team_games = ts.team_games
      .filter((tg) => tg.game.was_played)
      .sort((tg_a, tg_b) => tg_a.game.period_id - tg_b.game.period_id);
    ts.srs.games_played = ts.played_team_games.length;

    let game_index = 0;
    for (let tg of ts.played_team_games) {
      ts.srs.wins += tg.is_winning_team ? 1 : 0;
      ts.srs.losses += tg.is_winning_team ? 0 : 1;

      tg.game_fractional_share = (1.0 / (ts.srs.games_played - game_index)) ** 0.2;

      ts.srs.fractional_wins += (tg.is_winning_team ? 1.0 : 0) * tg.game_fractional_share;
      ts.srs.fractional_losses += (tg.is_winning_team ? 0 : 1.0) * tg.game_fractional_share;

      ts.srs.fractional_games_played += tg.game_fractional_share;
      game_index += 1;
    }
    ts.srs.net_win_count = ts.srs.wins - ts.srs.losses;
    ts.srs.fractional_net_win_count = ts.srs.fractional_wins - ts.srs.fractional_losses;
    ts.srs.rating = ts.srs.overall_rating + ts.srs.fractional_net_win_count;
    ts.srs.original_rating = ts.srs.rating;
    ts.srs.rating_list = [ts.srs.rating];
  }

  let overall_list = team_seasons.map((ts) => ts.srs.rating);
  let average_overall = Math.ceil(average(overall_list));

  let team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  console.log({
    team_seasons: team_seasons,
    average_overall: average_overall,
    overall_list: overall_list,
  });

  for (let iter_ind = 1; iter_ind <= 3; iter_ind++) {
    for (let ts of Object.values(team_seasons_by_team_season_id)) {
      let total_opponent_rating = 0;
      let fractional_opponent_rating = 0;
      for (let tg of ts.played_team_games) {
        total_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating;
        fractional_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating *
          tg.game_fractional_share;
      }
      ts.srs.schedule_factor = Math.round(
        (fractional_opponent_rating + ts.srs.fractional_net_win_count * average_overall) /
          (ts.srs.fractional_games_played || 1)
      );
    }

    for (let ts of Object.values(team_seasons_by_team_season_id)) {
      // ts.srs.rating = (ts.srs.original_rating + ts.srs.schedule_factor) / 2;
      ts.srs.rating = (ts.srs.rating * iter_ind + ts.srs.schedule_factor) / (iter_ind + 1);
      ts.srs.rating_list.unshift(ts.srs.rating);
    }
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    // ts.srs.rating = Math.round(((ts.srs.rating * 1) + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
    if (ts.srs.games_played <= 2) {
      ts.srs.rating *= ts.srs.games_played;
      ts.srs.rating += (2 - ts.srs.games_played) * ts.srs.original_rating;
      ts.srs.rating /= 2;
    }
    ts.srs.rating = Math.round(
      (ts.srs.rating * 9 + (ts.rankings.srs_ratings[0] || ts.srs.rating) * 1) / 10
    );
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    ts.srs.sos = ts.srs.sos || {};
    let count = 0;
    let summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.all_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_all_opponents = summed_srs / count;
    } else {
      ts.srs.sos.all_opponents = 0;
    }

    count = 0;
    summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.played_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_played_opponents = summed_srs / count;
    } else {
      ts.srs.sos.played_opponents = 0;
    }

    count = 0;
    summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.unplayed_team_season_ids) {
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count += 1;
    }

    if (count) {
      ts.srs.sos.sos_unplayed_opponents = (summed_srs * 1.0) / count;
    } else {
      ts.srs.sos.unplayed_opponents = 0;
    }

    console.log({
      summed_srs: summed_srs,
      count: count,
      "ts.srs.unplayed_team_season_ids": ts.srs.unplayed_team_season_ids,
      "ts.srs.sos.sos_unplayed_opponents": ts.srs.sos.sos_unplayed_opponents,
      ts: ts,
    });
  }

  console.log({ team_seasons_by_team_season_id: team_seasons_by_team_season_id });

  team_seasons = team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;
    return 0;
  });

  // for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
  //   ts.srs.rating = Math.round((ts.srs.rating + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
  // }

  console.log({
    ls: ls,
    team_seasons: team_seasons,
  });

  let sorted_team_seasons = team_seasons.sort(function (ts_a, ts_b) {
    if (ts_a.results.national_champion) return -1;
    if (ts_b.results.national_champion) return 1;

    if (ls.playoffs.playoffs_started && !ls.playoffs.playoffs_complete) {
      if ((ts_a.playoff.seed || 200) < (ts_b.playoff.seed || 200)) return -1;
      if ((ts_a.playoff.seed || 200) > (ts_b.playoff.seed || 200)) return 1;
    }

    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;

    if (
      ts_a.record.defeated_teams.includes(ts_b.team_season_id) &&
      !ts_b.record.defeated_teams.includes(ts_a.team_season_id)
    )
      return -1;
    if (ts_b.record.defeated_teams.includes(ts_a.team_season_id)) return 1;

    if (ts_a.record.losses < ts_b.record.losses) return -1;
    if (ts_a.record.losses > ts_b.record.losses) return 1;

    if (ts_a.record.net_wins > ts_b.record.net_wins) return -1;
    if (ts_a.record.net_wins < ts_b.record.net_wins) return 1;

    if (ts_a.team.team_ratings.program_history > ts_b.team.team_ratings.program_history) return -1;
    if (ts_b.team.team_ratings.program_history < ts_a.team.team_ratings.program_history) return 1;

    return 0;
  });

  let rank_counter = 1;

  for (var team_season of sorted_team_seasons) {
    console.log({ team_season: team_season });
    team_season.rankings.power_rank.unshift(rank_counter);
    team_season.rankings.srs_ratings.unshift(team_season.srs.rating);
    team_season.rankings.sos = team_season.rankings.sos || {
      all_opponents_sos: [],
      played_opponents_sos: [],
      unplayed_opponents_sos: [],
      all_opponents_sos_ranking: [],
      played_opponents_sos_ranking: [],
      unplayed_opponents_sos_ranking: [],
    };
    team_season.rankings.sos.all_opponents_sos.unshift(team_season.srs.sos.sos_all_opponents);
    team_season.rankings.sos.played_opponents_sos.unshift(team_season.srs.sos.sos_played_opponents);
    team_season.rankings.sos.unplayed_opponents_sos.unshift(
      team_season.srs.sos.sos_unplayed_opponents
    );
    rank_counter += 1;

    if (team_season.rankings.power_rank.length > 1) {
      team_season.rankings.power_rank_delta =
        team_season.rankings.power_rank[1] - team_season.rankings.power_rank[0];
      team_season.rankings.power_rank_delta_abs = Math.abs(team_season.rankings.power_rank_delta);
    } else {
      team_season.rankings.power_rank_delta = 0;
      team_season.rankings.power_rank_delta_abs = 0;
    }
  }

  console.log({ sorted_team_seasons: sorted_team_seasons });
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.stats.points_per_game - ts_a.stats.points_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.offense.unshift(rank_counter);
    rank_counter += 1;
  }

  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_a.stats.points_allowed_per_game - ts_b.stats.points_allowed_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.defense.unshift(rank_counter);
    rank_counter += 1;
  }

  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.stats.point_differential_per_game - ts_a.stats.point_differential_per_game;
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.stat_rankings.overall.unshift(rank_counter);
    rank_counter += 1;
  }

  //ALL SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.rankings.sos.all_opponents_sos[0] - ts_a.rankings.sos.all_opponents_sos[0];
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.all_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  //PLAYED SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return ts_b.rankings.sos.played_opponents_sos[0] - ts_a.rankings.sos.played_opponents_sos[0];
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.played_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  //UNPLAYED SOS
  sorted_team_seasons = sorted_team_seasons.sort(function (ts_a, ts_b) {
    return (
      ts_b.rankings.sos.unplayed_opponents_sos[0] - ts_a.rankings.sos.unplayed_opponents_sos[0]
    );
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.unplayed_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  let headline_id = db.headline.nextId("headline_id");
  let ranking_headlines = await generate_ranking_headlines(
    common,
    sorted_team_seasons,
    current_period,
    headline_id
  );

  console.log({ sorted_team_seasons: sorted_team_seasons, ranking_headlines: ranking_headlines });
  for (team_season of sorted_team_seasons) {
    delete team_season.team;
    delete team_season.season_stats;
    delete team_season.team_games;
    delete team_season.srs;
    delete team_season.conference_season;
  }

  db.team_season.update(sorted_team_seasons);
  db.headline.insert(ranking_headlines);

  await db.saveDatabaseAsync();
};

const calculate_standings = async (this_period, common) => {
  const db = await common.db;
  let all_periods = db.period.find({season:common.season});
  index_group_sync(all_periods, "index", "period_id");

  let conference_seasons = db.conference_season.find({ season: common.season });
  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  let conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  let team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  team_seasons = nest_children(
    team_seasons,
    conference_seasons_by_conference_season_id,
    "conference_season_id",
    "conference_season"
  );

  team_seasons.forEach(function (ts) {
    ts.full_division_name =
      ts.conference_season.conference.conference_abbreviation + " " + ts.division_name;
  });

  let team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  let team_seasons_by_full_division_name = index_group_sync(
    team_seasons,
    "group",
    "full_division_name"
  );

  for (var [division_name, division_team_seasons] of Object.entries(
    team_seasons_by_full_division_name
  )) {
    let sorted_team_seasons = division_team_seasons.sort(function (a, b) {
      if (a.results.conference_champion) return -1;
      if (b.results.conference_champion) return 1;

      if (a.record.net_wins > b.record.net_wins) return -1;
      if (a.record.net_wins < b.record.net_wins) return 1;

      if (a.record.defeated_teams.includes(b.team_season_id)) return -1;
      if (b.record.defeated_teams.includes(a.team_season_id)) return 1;

      if (a.record.conference_net_wins > b.record.conference_net_wins) return -1;
      if (a.record.conference_net_wins < b.record.conference_net_wins) return 1;

      if (a.record.division_losses > b.record.division_losses) return 1;
      if (a.record.division_losses < b.record.division_losses) return -1;

      if (a.record.conference_losses > b.record.conference_losses) return 1;
      if (a.record.conference_losses < b.record.conference_losses) return -1;

      if (a.rankings.power_rank[0] > b.rankings.power_rank[0]) return 1;
      if (a.rankings.power_rank[0] < b.rankings.power_rank[0]) return -1;

      return 0;
    });

    let top_ts_net_wins = sorted_team_seasons[0].record.division_net_wins;
    sorted_team_seasons.forEach(function (ts, ind) {
      ts.record.conference_gb = (top_ts_net_wins - ts.record.division_net_wins) / 2;

      ts.rankings.division_rank.unshift(ind + 1);
    });
  }

  for (var [conference_season_id, conference_team_seasons] of Object.entries(
    team_seasons_by_conference_season_id
  )) {
    let sorted_team_seasons = conference_team_seasons.sort(function (a, b) {
      if (a.results.conference_champion) return -1;
      if (b.results.conference_champion) return 1;

      if (a.record.net_wins > b.record.net_wins) return -1;
      if (a.record.net_wins < b.record.net_wins) return 1;

      if (a.record.defeated_teams.includes(b.team_season_id)) return -1;
      if (b.record.defeated_teams.includes(a.team_season_id)) return 1;

      if (a.record.division_losses > b.record.division_losses) return 1;
      if (a.record.division_losses < b.record.division_losses) return -1;

      if (a.record.conference_losses > b.record.conference_losses) return 1;
      if (a.record.conference_losses < b.record.conference_losses) return -1;

      if (a.rankings.power_rank[0] > b.rankings.power_rank[0]) return 1;
      if (a.rankings.power_rank[0] < b.rankings.power_rank[0]) return -1;

      return 0;
    });

    let top_ts_net_wins = sorted_team_seasons[0].record.conference_net_wins;
    sorted_team_seasons.forEach(function (ts, ind) {
      ts.record.conference_gb = (top_ts_net_wins - ts.record.conference_net_wins) / 2;

      ts.rankings.conference_rank.unshift(ind + 1);
    });
  }

  team_seasons.forEach((ts) => delete ts.conference_season);
  team_seasons.forEach((ts) => delete ts.full_division_name);

  db.team_season.update(team_seasons);
  await db.saveDatabaseAsync();
};


const choose_players_of_the_week = async (this_period, common) => {
  const db = common.db;

  const games = db.game.find({ period_id: this_period.period_id });
  const game_ids = games.map((g) => g.game_id);
  const games_by_game_id = index_group_sync(games, "index", "game_id");

  var team_games = db.team_game.find({ game_id: { $in: game_ids } });
  const team_game_ids = team_games.map((tg) => tg.team_game_id);
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  const team_games_by_team_game_id = index_group_sync(team_games, "index", "team_game_id");

  var player_team_games = db.player_team_game.find({ team_game_id: { $in: team_game_ids } });

  const player_team_season_ids = player_team_games.map((ptg) => ptg.player_team_season_id);
  var player_team_seasons = db.player_team_season.find({
    player_team_season_id: { $in: player_team_season_ids },
  });

  player_team_seasons = player_team_seasons.map(function (pts) {
    pts.position_group = position_group_map[pts.position];
    return pts;
  });

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({ player_id: { $in: player_ids } });
  console.log({
    players: players,
    player_ids: player_ids,
    player_team_seasons: player_team_seasons,
    player_team_season_ids: player_team_season_ids,
    player_team_games: player_team_games,
  });
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  const player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );
  player_team_games = nest_children(
    player_team_games,
    player_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "player_team_season"
  );

  player_team_games = player_team_games.filter(
    (ptg) => ptg.game_stats.games.weighted_game_score > 0
  );
  player_team_games = player_team_games.sort(
    (ptg_a, ptg_b) =>
      ptg_b.game_stats.games.weighted_game_score - ptg_a.game_stats.games.weighted_game_score
  );
  player_team_games = nest_children(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  console.log({ player_team_games: player_team_games });
  player_team_games.map((ptg) =>
    get(ptg, "player_team_season.team_season.conference_season_id")
  );

  const player_team_games_by_conference_season_id = index_group_sync(
    player_team_games,
    "group",
    "player_team_season.team_season.conference_season_id"
  );
  var player_team_games_by_position_group = index_group_sync(
    player_team_games,
    "group",
    "player_team_season.position_group"
  );

  var awards_to_save = [];

  let award_id = db.award.nextId("award_id");

  for (const position_group in player_team_games_by_position_group) {
    var position_group_player_team_games = player_team_games_by_position_group[position_group];
    var ptg = position_group_player_team_games[0];
    var a = new award(
      award_id,
      ptg.player_team_season_id,
      ptg.player_team_game_id,
      this_period.period_id,
      this_period.season,
      "position_group",
      position_group,
      "national",
      "week",
      null
    );
    awards_to_save.push(a);
    award_id += 1;
  }

  for (const conference_season_id in player_team_games_by_conference_season_id) {
    player_team_games = player_team_games_by_conference_season_id[conference_season_id];

    var player_team_games_by_position_group = index_group_sync(
      player_team_games,
      "group",
      "player_team_season.position_group"
    );

    for (const position_group in player_team_games_by_position_group) {
      position_group_player_team_games = player_team_games_by_position_group[position_group];
      var ptg = position_group_player_team_games[0];
      var a = new award(
        award_id,
        ptg.player_team_season_id,
        ptg.player_team_game_id,
        this_period.period_id,
        this_period.season,
        "position_group",
        position_group,
        "conference",
        "week",
        conference_season_id
      );
      awards_to_save.push(a);
      award_id += 1;
    }
  }

  db.award.insert(awards_to_save);

  await db.saveDatabaseAsync();

  console.log({
    player_team_games: player_team_games,
    player_team_games_by_conference_season_id: player_team_games_by_conference_season_id,
    player_team_games_by_position_group: player_team_games_by_position_group,
  });
};

const close_out_season = async (this_period, common) => {
  const db = common.db;

  const league_season = db.league_season.findOne(this_period.season);

  league_season.is_season_complete = true;

  db.league_season.update(league_season);

  await db.saveDatabaseAsync();
};

const choose_all_americans = async (this_period, common) => {
  const db = common.db;

  stopwatch(common, "Starting choose_all_americans");

  const position_count_map = {
    QB: 1,
    RB: 2,
    FB: 0,
    WR: 3,
    TE: 1,
    OT: 2,
    G: 2,
    C: 1,

    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 3,
    S: 2,

    K: 1,
    P: 1,
  };

  var player_team_seasons = db.player_team_season.find({
    season: common.season,
    team_season_id: { $gt: 0 },
  });
  const player_team_season_ids = player_team_seasons.map((pts) => pts.player_team_season_id);
  const player_team_season_stats = db.player_team_season_stats.find({
    player_team_season_id: { $in: player_team_season_ids },
  });
  const player_team_season_stats_by_player_team_season_id = index_group_sync(
    player_team_season_stats,
    "index",
    "player_team_season_id"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_season_stats_by_player_team_season_id,
    "player_team_season_id",
    "season_stats"
  );
  //player_team_seasons = player_team_seasons.filter(pts => pts.season_stats.games.weighted_game_score > 0);
  stopwatch(common, "Fetched PTSs");

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = db.player.find({ player_id: { $in: player_ids } });
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  stopwatch(common, "Fetched Players");

  const team_season_ids = distinct(player_team_seasons.map((pts) => pts.team_season_id));
  var team_seasons = db.team_season.find({ team_season_id: { $in: team_season_ids } });

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = db.team.find({ team_id: { $in: team_ids } });
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  stopwatch(common, "Fetched TSs and Teams");

  let award_id = db.award.nextId("award_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, "team_id", "team");
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );

  let player_team_seasons_by_team_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  stopwatch(common, "Fetched Indexed data");

  for (let [team_season_id, ts_player_team_seasons] of Object.entries(
    player_team_seasons_by_team_season_id
  )) {
    ts_player_team_seasons = ts_player_team_seasons.sort(
      (pts_a, pts_b) => pts_b.average_weighted_game_score - pts_a.average_weighted_game_score
    );
    ts_player_team_seasons.forEach(
      (pts, ind) => (pts.team_season_average_weighted_game_score_rank = ind + 1)
    );
  }

  player_team_seasons = player_team_seasons.sort(
    (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
  );
  console.log({ player_team_seasons: player_team_seasons });
  player_team_seasons.map((pts) =>
    get(pts, "team_season.conference_season_id")
  );

  const player_team_seasons_by_conference_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season.conference_season_id"
  );
  var player_team_seasons_by_position = index_group_sync(player_team_seasons, "group", "position");

  var awards_to_save = [];

  stopwatch(common, "Sorted data");

  const heisman_player_team_season = player_team_seasons[0];
  var a = new award(
    award_id,
    heisman_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Heisman",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  var maxwell_player_team_season_index = 0;
  if (r > 0.25) {
    maxwell_player_team_season_index = 0;
  } else if (r > 0.1) {
    maxwell_player_team_season_index = 2;
  } else {
    maxwell_player_team_season_index = 3;
  }
  const maxwell_player_team_season = player_team_seasons[maxwell_player_team_season_index];
  var a = new award(
    award_id,
    maxwell_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Maxwell",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const camp_player_team_season_index = Math.floor(5 * r);
  const camp_player_team_season = player_team_seasons[camp_player_team_season_index];
  var a = new award(
    award_id,
    camp_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Camp",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const rimington_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "G" || pts.position == "C");
  const rimington_player_team_season = rimington_player_team_seasons[0];
  var a = new award(
    award_id,
    rimington_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Rimington",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const outland_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "G" || pts.position == "C" || pts.position == "DL"
  );
  const outland_player_team_season = outland_player_team_seasons[0];
  var a = new award(
    award_id,
    outland_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Outland",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const thorpe_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "CB" || pts.position == "S"
  );
  const thorpe_player_team_season = thorpe_player_team_seasons[0];
  var a = new award(
    award_id,
    thorpe_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Thorpe",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  //TODO  - include punters
  // const guy_player_team_seasons = player_team_seasons.filter(pts => pts.position == 'P');
  // const guy_player_team_season = guy_player_team_seasons[0];
  // var a = new award(guy_player_team_season.player_team_season_id, null, this_period.period_id, this_period.season, 'individual', 'Ray Guy', 'national', 'regular season', null, 'National');
  // awards_to_save.push(a)

  const groza_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "K");
  const groza_player_team_season = groza_player_team_seasons[0];
  var a = new award(
    award_id,
    groza_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Lou Groza",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const mackey_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "TE");
  const mackey_player_team_season = mackey_player_team_seasons[0];
  var a = new award(
    award_id,
    mackey_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Mackey",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const biletnikoff_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "WR");
  const biletnikoff_player_team_season = biletnikoff_player_team_seasons[0];
  var a = new award(
    award_id,
    biletnikoff_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Biletnikoff",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const walker_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "RB");
  const walker_player_team_season = walker_player_team_seasons[0];
  var a = new award(
    award_id,
    walker_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Doak Walker",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const butkus_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "LB");
  const butkus_player_team_season = butkus_player_team_seasons[0];
  var a = new award(
    award_id,
    butkus_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Butkus",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const obrien_player_team_seasons = player_team_seasons.filter((pts) => pts.position == "QB");
  const obrien_player_team_season = obrien_player_team_seasons[0];
  var a = new award(
    award_id,
    obrien_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "O'Brien",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const nagurski_player_team_seasons = player_team_seasons.filter(
    (pts) =>
      pts.position == "EDGE" ||
      pts.position == "DL" ||
      pts.position == "LB" ||
      pts.position == "CB" ||
      pts.position == "S"
  );
  const nagurski_player_team_season = nagurski_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    nagurski_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Nagurski",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  var r = Math.random();
  const bednarik_player_team_seasons = player_team_seasons.filter(
    (pts) =>
      pts.position == "EDGE" ||
      pts.position == "DL" ||
      pts.position == "LB" ||
      pts.position == "CB" ||
      pts.position == "S"
  );
  const bednarik_player_team_season = bednarik_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    bednarik_player_team_season.player_team_season_id,
    null,
    this_period.period_id,
    this_period.season,
    "individual",
    "Bednarik",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  stopwatch(common, "Top Individual awards chosen");

  //AWARDS TODO:
  //  Burlsworth Trophy - former walk-on
  //  Wuerffel Trophy  - high character
  //  Campbell Trophy  - academics + on-field
  //  Paul Hornung Award - Versatility
  // Patrick Mannelly Award - Long snapper
  // Jon Cornish Trophy - best canadian player

  //  George Munger Award - Coach of the year
  //  Broyles Award - best assistant coach

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    for (var i = 0; i < position_count_map[position]; i++) {
      let pts = position_player_team_seasons[i];
      var a = new award(
        award_id,
        pts.player_team_season_id,
        null,
        this_period.period_id,
        this_period.season,
        "position",
        position,
        "national",
        "regular season",
        null,
        "First"
      );
      awards_to_save.push(a);
      award_id += 1;
    }

    for (var i = position_count_map[position]; i < position_count_map[position] * 2; i++) {
      let pts = position_player_team_seasons[i];
      var a = new award(
        award_id,
        pts.player_team_season_id,
        null,
        this_period.period_id,
        this_period.season,
        "position",
        position,
        "national",
        "regular season",
        null,
        "Second"
      );
      awards_to_save.push(a);
      award_id += 1;
    }

    position_player_team_seasons = position_player_team_seasons.filter(
      (pts) => pts.class.class_name == "FR"
    );
    for (var i = 0; i < position_count_map[position]; i++) {
      let pts = position_player_team_seasons[i];
      if (pts) {
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_period.period_id,
          this_period.season,
          "position",
          position,
          "national",
          "regular season",
          null,
          "Freshman"
        );
        awards_to_save.push(a);
        award_id += 1;
      }
    }
  }

  stopwatch(common, "Position awards chosed");

  for (const conference_season_id in player_team_seasons_by_conference_season_id) {
    player_team_seasons = player_team_seasons_by_conference_season_id[conference_season_id];

    let conference_player_team_season_of_the_year = player_team_seasons[0];

    var a = new award(
      award_id,
      conference_player_team_season_of_the_year.player_team_season_id,
      null,
      this_period.period_id,
      this_period.season,
      "individual",
      "Conference POTY",
      "conference",
      "regular season",
      parseInt(conference_season_id),
      "Conference"
    );

    awards_to_save.push(a);
    award_id += 1;

    var player_team_seasons_by_position = index_group_sync(
      player_team_seasons,
      "group",
      "position"
    );

    for (const position in player_team_seasons_by_position) {
      var position_player_team_seasons = player_team_seasons_by_position[position];
      for (var i = 0; i < position_count_map[position]; i++) {
        let pts = position_player_team_seasons[i];
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_period.period_id,
          this_period.season,
          "position",
          position,
          "conference",
          "regular season",
          parseInt(conference_season_id),
          "First"
        );

        awards_to_save.push(a);
        award_id += 1;
      }

      for (var i = position_count_map[position]; i < position_count_map[position] * 2; i++) {
        let pts = position_player_team_seasons[i];
        var a = new award(
          award_id,
          pts.player_team_season_id,
          null,
          this_period.period_id,
          this_period.season,
          "position",
          position,
          "conference",
          "regular season",
          parseInt(conference_season_id),
          "Second"
        );

        awards_to_save.push(a);
        award_id += 1;
      }

      position_player_team_seasons = position_player_team_seasons.filter(
        (pts) => pts.class.class_name == "FR"
      );
      for (var i = 0; i < position_count_map[position]; i++) {
        let pts = position_player_team_seasons[i];
        console.log({
          position: position,
          position_player_team_seasons: position_player_team_seasons,
          i: i,
          pts: pts,
          conference_season_id: conference_season_id,
        });
        if (pts) {
          var a = new award(
            award_id,
            pts.player_team_season_id,
            null,
            this_period.period_id,
            this_period.season,
            "position",
            position,
            "conference",
            "regular season",
            parseInt(conference_season_id),
            "Freshman"
          );

          awards_to_save.push(a);
          award_id += 1;
        }
      }
    }
  }

  stopwatch(common, "Conference awards chosed");

  db.award.insert(awards_to_save);
  await db.saveDatabaseAsync();

  console.log({
    awards_to_save: awards_to_save,
    player_team_seasons: player_team_seasons,
    player_team_seasons_by_conference_season_id: player_team_seasons_by_conference_season_id,
    player_team_seasons_by_position: player_team_seasons_by_position,
  });
};

const advance_to_next_period = async (this_period, common) => {
  const db = await common.db;
  const ddb = await driver_db();
  const world = ddb.world.findOne({ world_id: common.world_id });
  const all_periods = db.period.find({ season: { $gte: common.season } });
  const all_periods_by_period_id = index_group_sync(all_periods, "index", "period_id");

  console.log({ all_periods: all_periods });

  let next_period = all_periods_by_period_id[this_period.period_id + 1];

  this_period.is_current = false;
  next_period.is_current = true;

  if (this_period.season != next_period.season) {
    const league_seasons = db.league_season.find({ season: { $gte: common.season } });

    const current_league_season = league_seasons.find((ls) => ls.season == this_period.season);
    const next_league_season = league_seasons.find((ls) => ls.season == next_period.season);

    current_league_season.is_current_season = false;
    next_league_season.is_current_season = true;

    db.league_season.update(current_league_season);
    db.league_season.update(next_league_season);

    world.current_season = next_period.season;
  } else {
    console.log("did not find different seasons");
  }

  db.period.update([this_period, next_period]);

  const current_team_season = db.team_season.findOne({
    team_id: world.user_team.team_id,
    season: common.season,
  });
  world.current_period = next_period.period_name;
  world.user_team.team_record = current_team_season.record_display;

  ddb.world.update(world);

  await db.saveDatabaseAsync();
  await ddb.saveDatabaseAsync();

  return next_period;
};

const refresh_page = async (next_period) => {
  window.onbeforeunload = function () {};
  await navigate_to_href(next_period.world_href);
};

const sim_action = async (duration, common) => {
  window.onbeforeunload = function () {
    return "Week is currently simming. Realoading may PERMANENTLY corrupt your save. Are you sure?";
  };

  const db = common.db;

  const season = common.world_object.current_season;
  common.world_id;
  common.world_object;

  const all_periods = db.period.find({ season: { $gte: season } });

  const all_phases = db.phase.find({ season: { $gte: season } });
  const all_phases_by_phase_id = index_group_sync(all_phases, "index", "phase_id");
  console.log({
    all_phases_by_phase_id: all_phases_by_phase_id,
    all_periods: all_periods,
    season: season,
  });
  $.each(all_periods, function (ind, period) {
    period.phase = all_phases_by_phase_id[period.phase_id];
    period.phase.season = season;
  });

  const current_period = all_periods.find((w) => w.is_current);

  var sim_period_list = [];

  if (duration == "Simperiod") {
    sim_period_list = [current_period];
  } else if (duration == "SimPhase") {
    sim_period_list = all_periods.filter(
      (w) => w.period_id >= current_period.period_id && w.phase_id == current_period.phase_id
    );
  } else {
    sim_period_list = [current_period];
  }
  for (var this_period of sim_period_list) {
    console.log({ team_game: team_game });
    await sim_period_games(this_period, common);

    console.log({ team_game: team_game });

    if (this_period.period_name == "Conference Championships") {
      await assign_conference_champions(this_period, common);
      await choose_all_americans(this_period, common);
    }

    if (this_period.phase.phase_name == "Postseason") {
      await process_bowl_results(common);
    }

    if (
      this_period.period_name != "Playoff period 1" &&
      this_period.period_name != "Playoff period 2" &&
      this_period.period_name != "Playoff period 3"
    ) {
      await calculate_power_rankings(this_period, all_periods);
    }

    if (this_period.period_name == "Playoff period 4") {
      await close_out_season(this_period, common);
    }

    if (this_period.period_name == "period 15") {
      await schedule_conference_championships(this_period, common);
    }


    // if (this_week.week_name == "Season Recap") {
    //   await initialize_new_season(this_week, common);
    // }

    await choose_players_of_the_week(this_period, common);
    await calculate_primetime_games(this_period, all_periods, common);
    //await periodly_recruiting(common);
    //await populate_all_depth_charts(common);
    //await calculate_team_needs(common);

    var next_period = await advance_to_next_period(this_period, common);
    console.log("Ready to refresh_page");
  }

  await refresh_page(next_period);
};

const search_input_action = () => {
  var val = $("#nav-search-input").val();
  val = val.trim();
  if (val.length > 0) {
    var world_id = $("#nav-search-input").attr("worldid");
    window.location = `/World/${world_id}/Search/${val}`;
  }
};

const change_dom_display = async (elem, display) => {
  $(elem).css("display", display);
  $(window).scrollTop(0);
};


const add_listeners = async (common) => {
  $("#nav-search").on("click", function () {
    search_input_action();
  });

  $("#nav-search-input").on("keyup", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
      search_input_action();
      // Do something
    }
  });

  var SimMap = {
    SimThisperiod: "Simperiod",
    SimThisPhase: "SimPhase",
  };

  $(".sim-action:not(.w3-disabled)").click(async function (e) {
    $("#SimDayModal").css({ display: "block" });

    var sim_duration = SimMap[$(this).attr("id")];

    await sim_action(sim_duration, common);

    //TODO add notifications
    // $.notify(
    //   res.status,
    //   { globalPosition:"right bottom", className: 'error' }
    // );
  });

  $(".nav-tab-button").on("click", async function (event, target) {
    if ($(this).attr("id") == "nav-sidebar-tab") {
      $("#sidebar").addClass("sidebar-open");
      $(".sidebar-fade").addClass("sidebar-fade-open");

      $(".sidebar-fade-open").on("click", function () {
        $(this).removeClass("sidebar-fade-open");
        $("#sidebar").removeClass("sidebar-open");
      });
      return false;
    }

    var ClickedTab = $(event.target)[0];
    $.each($(".selected-tab"), function (index, tab) {
      var TargetTab = $(tab);
      $(TargetTab).css("backgroundColor", "");
      $(TargetTab).removeClass("selected-tab");
    });

    $(ClickedTab).addClass("selected-tab");
    console.log({ "common.render_content.page": common.render_content.page });
    $(ClickedTab).css("background-color", "#" + common.render_content.page.SecondaryColor);

    var NewTabContent = $("#" + $(this).attr("id").replace("-tab", ""))[0];

    $.each($(".tab-content"), async function (index, OldTabContent) {
      await change_dom_display($(OldTabContent), "none");
    });

    await change_dom_display($(NewTabContent), "block");
    setTimeout(async function () {
      await draw_player_faces(common);
    }, 1000);
  });

  $("#nav-team-dropdown-container .conference-button").on("click", function (event, target) {
    var conference_selected = $(event.currentTarget).attr("conference-button-val");

    if (conference_selected == "All") {
      $("#nav-team-dropdown-container .team-link").removeClass("w3-hide");
    } else {
      $("#nav-team-dropdown-container .team-link").addClass("w3-hide");
      $(
        '#nav-team-dropdown-container .team-link[conference-button-val="' +
          conference_selected +
          '"]'
      ).removeClass("w3-hide");
    }
  });
};

const assign_conference_champions = async (this_period, common) => {
  const db = await common.db;
  const season = common.season;

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  let conference_seasons = db.conference_season.find({ season: season });

  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  const conference_seasons_by_conference_season_id = index_group_sync(
    conference_seasons,
    "index",
    "conference_season_id"
  );

  let team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });
  const team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");
  const team_games_this_period = db.team_game.find({ period_id: this_period.period_id });

  const winning_team_seasons = team_games_this_period
    .filter((tg) => tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);

  const losing_team_seasons = team_games_this_period
    .filter((tg) => !tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);
  //winning_team_seasons = winning_team_seasons;

  let conference_seasons_to_put = [];
  winning_team_seasons.forEach(function (ts) {
    ts.results.conference_champion = true;

    let conference_season = conference_seasons_by_conference_season_id[ts.conference_season_id];
    conference_season.conference_champion_team_season_id = ts.team_season_id;

    conference_seasons_to_put.push(conference_season);

    if (conference_season.conference.divisions.length == 2) {
      ts.results.division_champion = true;
    } else if (
      conference_season.conference.divisions.length == 1 &&
      ts.rankings.division_rank[0] == 1
    ) {
      ts.results.division_champion = true;
    }
  });

  losing_team_seasons.forEach(function (ts) {
    let conference_season = conference_seasons_by_conference_season_id[ts.conference_season_id];
    // conference_season.conference_champion_team_season_id = ts.team_season_id;

    if (conference_season.conference.divisions.length == 2) {
      ts.results.division_champion = true;
    }
  });

  let championship_gameless_team_season_champs = [];
  let conference_seasons_without_championship_game = conference_seasons.filter(
    (cs) =>
      !cs.conference.schedule_format.hold_conference_championship_game &&
      !cs.conference.is_independent
  );
  conference_seasons_without_championship_game.forEach(function (cs) {
    let cs_team_seasons = team_seasons.filter(
      (ts) => ts.conference_season_id == cs.conference_season_id
    );
    let champ_ts = cs_team_seasons.find((ts) => ts.rankings.division_rank[0] == 1);

    champ_ts.results.conference_champion = true;
    championship_gameless_team_season_champs.push(champ_ts);

    cs.conference_champion_team_season_id = champ_ts.team_season_id;
    conference_seasons_to_put.push(cs);
  });

  conference_seasons_to_put.forEach((cs) => delete cs.conference);

  console.log("conference_seasons_to_put", {
    conference_seasons_to_put: conference_seasons_to_put,
  });

  db.team_season.update(winning_team_seasons);
  db.team_season.update(losing_team_seasons);
  db.team_season.update(championship_gameless_team_season_champs);
  db.conference_season.update(conference_seasons_to_put);

  await db.saveDatabaseAsync();
};

const schedule_conference_championships = async (this_period, common) => {
  console.log({ team_game: team_game });
  const db = await common.db;

  let conferences = db.conference.find();
  let conferences_by_conference_id = index_group_sync(conferences, "index", "conference_id");

  let next_period = db.period.findOne({ period_id: this_period.period_id + 1 });

  var conference_seasons = db.conference_season.find({ season: this_period.phase.season });

  conference_seasons = nest_children(
    conference_seasons,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );

  conference_seasons = conference_seasons.filter(
    (cs) => cs.conference.schedule_format.hold_conference_championship_game
  );

  var team_seasons = db.team_season.find({ season: this_period.phase.season, team_id: { $gt: 0 } });
  team_seasons = team_seasons.filter((ts) => ts.rankings.division_rank[0] <= 2);
  var team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [];

  $.each(conference_seasons, function (ind, conference_season) {
    var championship_teams =
      team_seasons_by_conference_season_id[conference_season.conference_season_id];

    if (
      conference_season.conference.schedule_format.conference_championship_selection_method ==
      "top 2"
    ) {
      championship_teams = championship_teams.sort(
        (ts_a, ts_b) => ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0]
      );
      championship_teams = championship_teams.slice(0, 2);
    } else if (
      conference_season.conference.schedule_format.conference_championship_selection_method ==
      "division winners"
    ) {
      championship_teams = championship_teams.filter((ts) => ts.rankings.division_rank[0] == 1);
    }

    championship_teams = championship_teams.map((ts) => ts.team_season_id);
    [team_a, team_b] = championship_teams;
    console.log({
      team_game: team_game,
      championship_teams: championship_teams,
      conference_season: conference_season,
    });

    var team_game_a = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: next_team_game_id + 1,
      period_id: next_period.period_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_a),
      opponent_team_season_id: parseInt(team_b),
    });
    var team_game_b = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id + 1,
      is_home_team: false,
      opponent_team_game_id: next_team_game_id,
      period_id: next_period.period_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_b),
      opponent_team_season_id: parseInt(team_a),
    });

    team_games_to_create.push(team_game_a);
    team_games_to_create.push(team_game_b);

    games_to_create.push({
      game_id: next_game_id,
      season: common.season,
      home_team_season_id: parseInt(team_a),
      away_team_season_id: parseInt(team_b),
      home_team_game_id: next_team_game_id,
      away_team_game_id: next_team_game_id + 1,
      period_id: next_period.period_id,
      game_time: "7:05PM",
      was_played: false,
      outcome: {
        home_team_score: null,
        away_team_score: null,
        winning_team_season_id: null,
        losing_team_season_id: null,
      },
      rivalry: null,
      bowl: null,
      is_neutral_site_game: true,
      broadcast: { regional_broadcast: false, national_broadcast: false },
      world_id: common.world_id,
    });

    next_game_id += 1;
    next_team_game_id += 2;
  });

  db.game.insert(games_to_create);
  db.team_game.insert(team_games_to_create);

  await db.saveDatabaseAsync();
};

const process_bowl_results = async (common) => {
  const db = common.db;
  const season = common.season;

  var phases = db.phase.find({ season: season });
  var phases_by_phase_id = index_group_sync(phases, "index", "phase_id");
  var periods = db.period.find({ season: season });
  periods = nest_children(periods, phases_by_phase_id, "phase_id", "phase");

  console.log({ periods: periods });

  var this_period = periods.find((w) => w.is_current);

  var bowl_periods = index_group_sync(
    periods.filter((w) => w.phase.phase_name == "Postseason"),
    "index",
    "period_name"
  );

  var current_league_season = db.league_season.findOne({ season: season });

  var current_playoff_round_index = current_league_season.playoffs.playoff_rounds.findIndex(
    (pr) => pr.period_name == this_period.period_name
  );

  var teams = db.team.find({ team_id: { $gt: 0 } });
  index_group_sync(teams, "index", "team_id");

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  var team_seasons_by_team_season_id = index_group_sync(team_seasons, "index", "team_season_id");

  var games_this_period = db.game.find({ period_id: this_period.period_id });
  var team_games_by_game_id = index_group_sync(
    db.team_game.find({ period_id: this_period.period_id }),
    "group",
    "game_id"
  );

  var team_seasons_to_save = [];

  $.each(games_this_period, function (ind, game) {
    let winning_team_season =
      team_seasons_by_team_season_id[game.outcome.winning_team.team_season_id];
    let losing_team_season =
      team_seasons_by_team_season_id[game.outcome.losing_team.team_season_id];

    winning_team_season.results.bowl = deep_copy(game.bowl);
    winning_team_season.results.bowl.is_winning_team = true;

    losing_team_season.results.bowl = deep_copy(game.bowl);
    losing_team_season.results.bowl.is_winning_team = false;

    winning_team_season.results.bowl.game_id = game.game_id;
    losing_team_season.results.bowl.game_id = game.game_id;

    winning_team_season.results.bowl.opposing_team_season_id = losing_team_season.team_season_id;
    losing_team_season.results.bowl.opposing_team_season_id = winning_team_season.team_season_id;

    if (game.bowl.bowl_name == "National Championship") {
      winning_team_season.results.national_champion = true;
      current_league_season.playoffs.playoffs_complete = true;
    }

    team_seasons_to_save.push(winning_team_season);
    team_seasons_to_save.push(losing_team_season);
    console.log({
      winning_team_season: winning_team_season,
      losing_team_season: losing_team_season,
      team_seasons_to_save: team_seasons_to_save,
      game: game,
      bowl: game.bowl,
    });
  });

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [];

  console.log({
    current_playoff_round_index: current_playoff_round_index,
    "current_league_season.playoffs": current_league_season.playoffs,
  });

  if (
    current_playoff_round_index >= 0 &&
    current_playoff_round_index < current_league_season.playoffs.playoff_rounds.length - 1
  ) {
    var current_playoff_round =
      current_league_season.playoffs.playoff_rounds[current_playoff_round_index];
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index
    ].is_current_round = false;
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index + 1
    ].is_current_round = true;
    var next_playoff_round =
      current_league_season.playoffs.playoff_rounds[current_playoff_round_index + 1];
    var next_playoff_round_period = bowl_periods[next_playoff_round.period_name];

    var team_seasons_advancing = [];

    for (const playoff_game of current_playoff_round.playoff_games) {
      if (playoff_game.bye_game) {
        team_seasons_advancing.push({
          seed: playoff_game.team_objs[0].seed,
          team_season: team_seasons_by_team_season_id[playoff_game.team_objs[0].team_season_id],
        });
      } else {
        var playoff_team_games = team_games_by_game_id[playoff_game.game_id];
        var winning_team_game = playoff_team_games.find((tg) => tg.is_winning_team);
        var winning_team_season_id = winning_team_game.team_season_id;

        team_seasons_advancing.push({
          seed: playoff_game.team_objs.find((to) => to.team_season_id == winning_team_season_id)
            .seed,
          team_season: team_seasons_by_team_season_id[winning_team_season_id],
        });
      }
    }

    team_seasons_advancing = team_seasons_advancing.sort(
      (ts_a, ts_b) => ts_b.team_season.playoff.seed - ts_a.team_season.playoff.seed
    );

    console.log({ team_seasons_advancing: team_seasons_advancing });

    if (team_seasons_advancing.length > 0) {
      var next_game_id = db.game.nextId("game_id");
      var next_team_game_id = db.team_game.nextId("team_game_id");

      var period_id = next_playoff_round_period.period_id;
      var counter = 0;

      while (team_seasons_advancing.length > 0) {
        var team_season_a = team_seasons_advancing.pop();
        team_seasons_advancing = team_seasons_advancing.reverse();
        var team_season_b = team_seasons_advancing.pop();
        team_seasons_advancing = team_seasons_advancing.reverse();

        var team_a = team_season_a.team_season.team_season_id;
        var team_b = team_season_b.team_season.team_season_id;

        var team_game_a = new team_game({
          world_id: common.world_id,
          season: common.season,
          team_game_id: next_team_game_id,
          is_home_team: true,
          opponent_team_game_id: next_team_game_id + 1,
          period_id: period_id,
          game_id: next_game_id,
          team_season_id: parseInt(team_a),
          opponent_team_season_id: parseInt(team_b),
        });
        var team_game_b = new team_game({
          world_id: common.world_id,
          season: common.season,
          team_game_id: next_team_game_id + 1,
          is_home_team: false,
          opponent_team_game_id: next_team_game_id,
          period_id: period_id,
          game_id: next_game_id,
          team_season_id: parseInt(team_b),
          opponent_team_season_id: parseInt(team_a),
        });

        team_games_to_create.push(team_game_a);
        team_games_to_create.push(team_game_b);

        games_to_create.push({
          game_id: next_game_id,
          season: common.season,
          home_team_season_id: parseInt(team_a),
          away_team_season_id: parseInt(team_b),
          home_team_game_id: next_team_game_id,
          away_team_game_id: next_team_game_id + 1,
          period_id: period_id,
          game_time: "7:05PM",
          was_played: false,
          outcome: {
            home_team_score: null,
            away_team_score: null,
            winning_team_season_id: null,
            losing_team_season_id: null,
          },
          rivalry: null,
          bowl: { bowl_name: next_playoff_round.round_name, is_playoff: true },
          broadcast: { regional_broadcast: false, national_broadcast: false },
          world_id: common.world_id,
        });

        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs = [];
        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs.push({
          seed: team_season_a.seed,
          team_season_id: team_a,
          team_game_id: next_team_game_id,
        });
        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].team_objs.push({
          seed: team_season_b.seed,
          team_season_id: team_b,
          team_game_id: next_team_game_id + 1,
        });

        current_league_season.playoffs.playoff_rounds[
          current_playoff_round_index + 1
        ].playoff_games[counter].game_id = next_game_id;

        counter += 1;
        next_team_game_id = next_team_game_id + 2;
        next_game_id = next_game_id + 1;
      }
    }
  }

  await Promise.all([
    db.game.insert(games_to_create),
    db.team_game.insert(team_games_to_create),
    db.team_season.update(team_seasons_to_save),
    db.league_season.update(current_league_season),
  ]);

  await db.saveDatabaseAsync();
};

const schedule_bowl_season = async (all_periods, common) => {
  let bowl_url = `/data/import_json/bowls.json`;
  let bowl_json = await fetch(bowl_url);
  let bowls = await bowl_json.json();

  const db = await common.db;

  var current_league_season = db.league_season.find({ season: common.season });
  current_league_season = current_league_season[0];

  var number_playoff_teams = current_league_season.playoffs.number_playoff_teams;

  var team_seasons = db.team_season.find({ season: common.season, team_id: { $gt: 0 } });
  index_group_sync(
    db.team.find({ team_id: { $gt: 0 } }),
    "index",
    "team_id"
  );

  var num_teams = db.team.find({ team_id: { $gt: 0 } }).length;

  var max_bowl_bound_teams = num_teams - number_playoff_teams;
  var max_bowls = Math.floor(max_bowl_bound_teams / 2);

  bowls = bowls.slice(0, max_bowls);

  team_seasons = team_seasons.sort(function (team_season_a, team_season_b) {
    if (team_season_a.rankings.power_rank[0] < team_season_b.rankings.power_rank[0]) return -1;
    if (team_season_a.rankings.power_rank[0] > team_season_b.rankings.power_rank[0]) return 1;
    return 0;
  });

  let number_guaranteed_conference_champions_in_playoff = 6;
  let top_playoff_seeds_saved_for_conference_champions = 4;
  let conference_champions_in_playoff = team_seasons
    .filter((ts) => ts.results.conference_champion)
    .slice(0, number_guaranteed_conference_champions_in_playoff);
  let top_seeded_conference_champions_in_playoff = conference_champions_in_playoff.slice(
    0,
    top_playoff_seeds_saved_for_conference_champions
  );

  let playoff_team_season_ids = new Set(
    conference_champions_in_playoff.map((ts) => ts.team_season_id)
  );
  let top_seeded_playoff_team_season_ids = new Set(
    top_seeded_conference_champions_in_playoff.map((ts) => ts.team_season_id)
  );

  let ts_ind = 0;
  while (playoff_team_season_ids.size < number_playoff_teams) {
    let ts = team_seasons[ts_ind];
    if (!playoff_team_season_ids.has(ts.team_season_id)) {
      playoff_team_season_ids.insert(ts.team_season_id);
    }
    ts_ind += 1;
  }

  var playoff_bound_team_seasons = top_seeded_conference_champions_in_playoff.concat(
    team_seasons.filter(
      (ts) =>
        !top_seeded_playoff_team_season_ids.has(ts.team_season_id) &&
        playoff_team_season_ids.has(ts.team_season_id)
    )
  );
  playoff_bound_team_seasons.forEach((ts, ind) => (ts.playoff.seed = ind + 1));

  console.log({ playoff_bound_team_seasons: playoff_bound_team_seasons });

  var bowl_bound_team_seasons = team_seasons.filter(
    (ts) =>
      !playoff_team_season_ids.has(ts.team_season_id) &&
      ts.rankings.power_rank[0] <= bowls.length * 2 + number_playoff_teams
  );

  var bowl_periods = index_group_sync(
    all_periods.filter((w) => w.phase.phase_name == "Postseason"),
    "index",
    "period_name"
  );

  var taken_team_season_ids = [],
    possible_team_seasons = [],
    chosen_team_season = null;

  $.each(bowls, function (ind, bowl) {
    possible_team_seasons = bowl_bound_team_seasons
      .filter((ts) => !taken_team_season_ids.includes(ts.team_season_id))
      .slice(0, 5);
    bowl.teams = [];
    chosen_team_season =
      possible_team_seasons[Math.floor(Math.random() * possible_team_seasons.length)];
    bowl.teams.push(chosen_team_season);

    taken_team_season_ids.push(chosen_team_season.team_season_id);

    (chosen_team_season = null), (loop_count = 0);
    possible_team_seasons = possible_team_seasons.filter(
      (ts) => !taken_team_season_ids.includes(ts.team_season_id)
    );

    while (
      (chosen_team_season == null ||
        chosen_team_season.conference_season_id == bowl.teams[0].conference_season_id ||
        chosen_team_season.record.defeated_teams.includes(bowl.teams[0].team_season_id) ||
        bowl.teams[0].record.defeated_teams.includes(chosen_team_season.team_season_id)) &&
      loop_count < 100
    ) {
      chosen_team_season =
        possible_team_seasons[Math.floor(Math.random() * possible_team_seasons.length)];
      loop_count += 1;
    }

    if (chosen_team_season != undefined) {
      bowl.teams.push(chosen_team_season);
      taken_team_season_ids.push(chosen_team_season.team_season_id);
    }
  });

  var next_game_id = db.game.nextId("game_id");
  var next_team_game_id = db.team_game.nextId("team_game_id");

  if (!(last_team_game === undefined)) {
    next_team_game_id = last_team_game.team_game_id + 1;
  }

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    games_to_create = [],
    team_ids = [];

  const playoff_round = current_league_season.playoffs.playoff_rounds[0];
  const playoff_period_id = bowl_periods[playoff_round.period_name].period_id;

  for (const playoff_game of playoff_round.playoff_games) {
    team_ids = [];
    for (const team_obj of playoff_game.team_objs) {
      team_obj.team_season_id = playoff_bound_team_seasons[team_obj.seed - 1].team_season_id;
    }

    console.log({ playoff_game: playoff_game });

    if (playoff_game.bye_game) {
      playoff_game.game_id = null;
    } else {
      [team_season_id_a, team_season_id_b] = playoff_game.team_objs.map((to) => to.team_season_id);

      var team_game_a = new team_game({
        world_id: common.world_id,
        season: common.season,
        team_game_id: next_team_game_id,
        is_home_team: true,
        opponent_team_game_id: next_team_game_id + 1,
        period_id: playoff_period_id,
        game_id: next_game_id,
        team_season_id: parseInt(team_season_id_a),
        opponent_team_season_id: parseInt(team_season_id_b),
      });
      var team_game_b = new team_game({
        world_id: common.world_id,
        season: common.season,
        team_game_id: next_team_game_id + 1,
        is_home_team: false,
        opponent_team_game_id: next_team_game_id,
        period_id: playoff_period_id,
        game_id: next_game_id,
        team_season_id: parseInt(team_season_id_b),
        opponent_team_season_id: parseInt(team_season_id_a),
      });

      team_games_to_create.push(team_game_a);
      team_games_to_create.push(team_game_b);

      games_to_create.push({
        game_id: next_game_id,
        season: common.season,
        home_team_season_id: parseInt(team_a),
        away_team_season_id: parseInt(team_b),
        home_team_game_id: next_team_game_id,
        away_team_game_id: next_team_game_id + 1,
        period_id: playoff_period_id,
        game_time: "7:05PM",
        was_played: false,
        outcome: {
          home_team_score: null,
          away_team_score: null,
          winning_team_season_id: null,
          losing_team_season_id: null,
        },
        rivalry: null,
        is_neutral_site_game: true,
        bowl: { bowl_name: playoff_round.round_name, is_playoff: true },
        broadcast: { regional_broadcast: false, national_broadcast: false },
        world_id: common.world_id,
      });

      playoff_game.game_id = next_game_id;

      playoff_game.team_objs[0].team_game_id = next_team_game_id;
      playoff_game.team_objs[1].team_game_id = next_team_game_id + 1;

      next_game_id += 1;
      next_team_game_id += 2;
    }
  }

  playoff_round.is_current_round = true;
  current_league_season.playoffs.playoffs_started = true;
  current_league_season.playoffs.playoff_rounds[0] = playoff_round;

  $.each(bowls, function (ind, bowl) {
    team_ids = bowl.teams.map((ts) => ts.team_season_id);
    [team_a, team_b] = team_ids;

    period_id = bowl_periods[bowl.bowl_period_name].period_id;

    var team_game_a = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: next_team_game_id + 1,
      period_id: period_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_a),
      opponent_team_season_id: parseInt(team_b),
    });
    var team_game_b = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id + 1,
      is_home_team: false,
      opponent_team_game_id: next_team_game_id,
      period_id: period_id,
      game_id: next_game_id,
      team_season_id: parseInt(team_b),
      opponent_team_season_id: parseInt(team_a),
    });

    team_games_to_create.push(team_game_a);
    team_games_to_create.push(team_game_b);

    games_to_create.push({
      game_id: next_game_id,
      season: common.season,
      home_team_season_id: parseInt(team_a),
      away_team_season_id: parseInt(team_b),
      home_team_game_id: next_team_game_id,
      away_team_game_id: next_team_game_id + 1,
      period_id: period_id,
      game_time: "7:05PM",
      was_played: false,
      outcome: {
        home_team_score: null,
        away_team_score: null,
        winning_team_season_id: null,
        losing_team_season_id: null,
      },
      rivalry: null,
      bowl: { bowl_name: bowl.bowl_name, is_playoff: false },
      broadcast: { regional_broadcast: false, national_broadcast: false },
      world_id: common.world_id,
    });

    next_game_id += 1;
    next_team_game_id += 2;
  });

  await Promise.all([
    db.game.insert(games_to_create),
    db.team_game.insert(team_games_to_create),
    db.league_season.update(current_league_season),
    db.team_season.update(playoff_bound_team_seasons),
  ]);

  await db.saveDatabaseAsync();
};

const schedule_game = (common, scheduling_dict, team_set) => {
  var team_a = team_set[0],
    team_b = team_set[1],
    matchup_options = team_set[2];

  if (Math.random() < 0.5) {
    [team_a, team_b] = [team_b, team_a];
  }

  if (
    !matchup_options.allow_duplicates &&
    (scheduling_dict.team_season_schedule_tracker[team_a].opponents_scheduled.has(team_b) ||
      scheduling_dict.team_season_schedule_tracker[team_b].opponents_scheduled.has(team_a))
  ) {
    return "Already scheduled, and not allowed.";
  }

  let chosen_period_id = matchup_options.period_id;

  if (!chosen_period_id) {
    var available_periods = set_intersect(
      scheduling_dict.team_season_schedule_tracker[team_a].available_period_ids,
      scheduling_dict.team_season_schedule_tracker[team_b].available_period_ids
    );
    available_periods = [...available_periods];
    if (available_periods.length > 0) {
      let dict_for_random = [team_a, team_b].map(function (team_id) {
        return [team_id, 3];
      });
      dict_for_random = Object.fromEntries(dict_for_random);
      let chosen_home_team = weighted_random_choice(dict_for_random);
      let chosen_away_team = [team_a, team_b].find((team_id) => team_id != chosen_home_team);

      team_a = chosen_home_team;
      team_b = chosen_away_team;

      let available_period_weights = available_periods.map(function (period_id) {
        return [period_id, scheduling_dict.periods_game_scheduled[period_id] ** 4 || 0];
      });
      available_period_weights = Object.fromEntries(available_period_weights);
      chosen_period_id = parseInt(weighted_random_choice(available_period_weights, -1));

      if (chosen_period_id == -1) {
        available_period_weights = available_periods.map(function (period_id) {
          return [
            period_id,
            Math.ceil(
              Math.abs(scheduling_dict.all_periods_by_period_id[period_id].schedule_period_number - 9.5) **
                4
            ),
          ];
        });
        available_period_weights = Object.fromEntries(available_period_weights);
        chosen_period_id = parseInt(weighted_random_choice(available_period_weights, -1));
      }
    }
    else {
      return "No periods for game"
    }
  }

  if (chosen_period_id) {
    scheduling_dict.team_season_schedule_tracker[team_a]["schedule"].games_to_schedule -= 1;
    scheduling_dict.team_season_schedule_tracker[team_a]["schedule"].games_scheduled += 1;
    scheduling_dict.team_season_schedule_tracker[team_a]["schedule"].home_games += 1;
    scheduling_dict.team_season_schedule_tracker[team_a]["schedule"].net_home_games += 1;
    scheduling_dict.team_season_schedule_tracker[team_a].periods_scheduled.add(chosen_period_id);
    scheduling_dict.team_season_schedule_tracker[team_a].available_period_ids.delete(chosen_period_id);
    scheduling_dict.team_season_schedule_tracker[team_a].opponents_scheduled.add(team_b);

    scheduling_dict.team_season_schedule_tracker[team_b]["schedule"].games_to_schedule -= 1;
    scheduling_dict.team_season_schedule_tracker[team_b]["schedule"].games_scheduled += 1;
    scheduling_dict.team_season_schedule_tracker[team_b]["schedule"].away_games += 1;
    scheduling_dict.team_season_schedule_tracker[team_b]["schedule"].net_home_games -= 1;
    scheduling_dict.team_season_schedule_tracker[team_b].periods_scheduled.add(chosen_period_id);
    scheduling_dict.team_season_schedule_tracker[team_b].available_period_ids.delete(chosen_period_id);
    scheduling_dict.team_season_schedule_tracker[team_b].opponents_scheduled.add(team_a);

    var team_game_a = new team_game({
      world_id: scheduling_dict.world_id,
      season: scheduling_dict.season,
      team_game_id: scheduling_dict.next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: scheduling_dict.next_team_game_id + 1,
      period_id: chosen_period_id,
      game_id: scheduling_dict.next_game_id,
      team_season_id: parseInt(team_a),
      opponent_team_season_id: parseInt(team_b),
    });
    var team_game_b = new team_game({
      world_id: scheduling_dict.world_id,
      season: scheduling_dict.season,
      team_game_id: scheduling_dict.next_team_game_id + 1,
      is_home_team: false,
      opponent_team_game_id: scheduling_dict.next_team_game_id,
      period_id: chosen_period_id,
      game_id: scheduling_dict.next_game_id,
      team_season_id: parseInt(team_b),
      opponent_team_season_id: parseInt(team_a),
    });

    scheduling_dict.team_games_to_create.push(team_game_a);
    scheduling_dict.team_games_to_create.push(team_game_b);

    scheduling_dict.team_games_to_create_ids.push(scheduling_dict.next_team_game_id);
    scheduling_dict.team_games_to_create_ids.push(scheduling_dict.next_team_game_id + 1);

    scheduling_dict.games_to_create.push({
      game_id: scheduling_dict.next_game_id,
      season: scheduling_dict.season,
      home_team_season_id: parseInt(team_a),
      away_team_season_id: parseInt(team_b),
      home_team_game_id: scheduling_dict.next_team_game_id,
      away_team_game_id: scheduling_dict.next_team_game_id + 1,
      period_id: chosen_period_id,
      game_time: "7:05PM",
      was_played: false,
      outcome: {
        home_team_score: null,
        away_team_score: null,
        winning_team_season_id: null,
        losing_team_season_id: null,
      },
      bowl: null,
      broadcast: { regional_broadcast: false, national_broadcast: false },
      world_id: scheduling_dict.world_id,
    });

    scheduling_dict.games_to_create_ids.push(scheduling_dict.next_game_id);

    scheduling_dict.next_game_id += 1;
    scheduling_dict.next_team_game_id += 2;

    scheduling_dict.periods_game_scheduled[chosen_period_id] += 1;

    return "Scheduled";
  } else {
    return "No available periods";
  }
};

const tier_placement = (tiers, population_size, distribution, rank_place) => {
  console.log({
    tiers: tiers,
    population_size: population_size,
    distribution: distribution,
    rank_place: rank_place,
  });
  Array(tiers)
    .fill(1)
    .map((x, y) => x + y);
  var tier_dict = {};
  for (var i = 1; i <= tiers; i++) {
    tier_dict[i] = {
      start: null,
      stop: null,
      segment_size: 0,
      segment_ratio: 0,
      population_count: 0,
    };
  }

  var middle_tier = Math.floor(tiers / 2) + 1;
  var total_segment_size = 0;

  var previous_stop = 0;
  var placement = 0;

  if (distribution == "Normal") {
    for (var tier in tier_dict) {
      var tier_obj = tier_dict[tier];
      tier_obj.segment_size = middle_tier - Math.abs(middle_tier - tier);
      total_segment_size += tier_obj.segment_size;
    }
  } else if (distirbution == "Uniform") {
    console.log("tier", tier);
  }

  for (var tier in tier_dict) {
    var tier_obj = tier_dict[tier];
    tier_obj.segment_ratio = tier_obj.segment_size / total_segment_size;
    tier_obj.population_count = Math.ceil(tier_obj.segment_ratio * population_size);

    tier_obj.start = previous_stop + 1;
    tier_obj.stop = tier_obj.start + tier_obj.population_count;
    previous_stop = tier_obj.stop;

    if (rank_place >= tier_obj.start && rank_place <= tier_obj.stop) {
      placement = tier;
    }
  }

  console.log({ placement: placement });

  return placement;
};

const update_create_world_modal = async (completed_stage_id, started_stage_id) => {
  $("#" + completed_stage_id).html(
    '<i class="fa fa-check-circle" style="color:green; font-size: 20px;"></i>'
  );
  $("#" + started_stage_id).html(
    '<div class="spinner-border spinner-border-sm" role="status"></div>'
  );
};

const new_world_action = async (common, database_suffix) => {
  $(".conference-select-table").addClass("w3-hide");
  $(".create-progress-table").removeClass("w3-hide");

  await update_create_world_modal(null, "create-world-table-new-world");

  const new_db = await create_new_db();

  const db = await new_db["db"];

  const new_season_info = new_db["new_season_info"];

  const world_id = new_season_info.world_id;
  const season = new_season_info.current_season;

  common.db = db;
  common.season = season;

  let leagues_from_json = await get_leagues();
  leagues_from_json.forEach((leag, ind) => leag.league_id = ind+1);
  db.league.insert(leagues_from_json);

  let leagues_by_league_name = index_group_sync(leagues_from_json, 'index', 'league_name');

  var teams_from_json = await get_teams();

  var conferences_from_json = await get_conferences(database_suffix);
  console.log({ conferences_from_json: conferences_from_json });

  var team_names_to_include = [];
  const conference_name_by_team_name = {};

  let conferences_to_save = [];
  $.each(conferences_from_json, function (ind, conf_data) {
    conf_data.world_id = world_id;
    conf_data.conference_id = ind + 1;
    let conf_league = leagues_by_league_name[conf_data.league_name];
    console.log({
      conf_league:conf_league,
      leagues_by_league_name:leagues_by_league_name,
      leagues_from_json:leagues_from_json,
      conf_data:conf_data,
      'conf_data.league_name': conf_data.league_name
    });

    conf_data.league_id = conf_league.league_id;

    conf_data.conference_color_primary_hex = conf_data.conference_color_primary_hex.replace(
      "#",
      ""
    );
    conf_data.conference_color_secondary_hex = conf_data.conference_color_secondary_hex.replace(
      "#",
      ""
    );

    let team_names = conf_data.divisions.map((d) => d.teams);
    team_names = team_names.flat();
    team_names_to_include = team_names_to_include.concat(team_names);

    for (var team_name of team_names) {
      conference_name_by_team_name[team_name] = conf_data.conference_name;
    }

    conferences_to_save.push(new conference(conf_data));
  });

  console.log("adding", { db: db, "db.conference": db.conference, conferences_to_save });
  db.conference.insert(conferences_to_save);
  await db.saveDatabaseAsync();

  var conferences = db.conference.find();

  teams_from_json = teams_from_json.filter((t) =>
    team_names_to_include.includes(t.team_location_name + " " + t.team_nickname)
  );
  const num_teams = teams_from_json.length;

  const season_data = {
    season: season,
    world_id: world_id,
    captains_per_team: 3,
    players_per_team: 55,
    num_teams: num_teams,
  };
  const new_season = new league_season(season_data, undefined);
  console.log({ new_season: new_season });
  db.league_season.insert(new_season);
  await db.saveDatabaseAsync();

  await create_dates(common, season, 4);
  console.log({ season: season, common: common, db: db, new_season_info: new_season_info });
  await create_phase(season, common);
  const rivalries = await get_rivalries(teams_from_json);

  await create_conference_seasons({
    common: common,
    conferences: conferences,
    season: season,
    world_id: world_id,
  });
  var conference_seasons = index_group_sync(db.conference_season.find(), "index", "conference_id");

  conferences = nest_children(
    conferences,
    conference_seasons,
    "conference_id",
    "conference_season"
  );
  const conferences_by_conference_name = index_group_sync(conferences, "index", "conference_name");
  const conferences_by_team_name = {};

  console.log({
    conference_name_by_team_name: conference_name_by_team_name,
  });

  for (let [team_name, conference_name] of Object.entries(conference_name_by_team_name)) {
    conferences_by_team_name[team_name] =
      conferences_by_conference_name[conference_name_by_team_name[team_name]];
    console.log({
      team_name: team_name,
      conference_name: conference_name,
    });
  }

  console.log({
    conferences_by_team_name: conferences_by_team_name,
    conference_name_by_team_name: conference_name_by_team_name,
    conferences_by_conference_name: conferences_by_conference_name,
  });

  var teams = [],
    rivals_team_1 = [],
    rivals_team_2 = [];
  const jersey_options = [
    "football-standard",
    "football-ponies",
    "football-sparta",
    "football-three-stripe",
    "football-two-stripe",
  ];

  let cities = ddb.cities.find();
  console.log({ cities: cities });
  let cities_by_city_state = index_group_sync(cities, "index", "city_state");

  teams_from_json = teams_from_json.sort((t_a, t_b) =>
    t_a.team_location_name > t_b.team_location_name ? 1 : -1
  );

  var team_id_counter = 1;
  for (let t of teams_from_json) {
    if (t.jersey.invert) {
      t.jersey.teamColors = [
        "#FFFFFF",
        `#${team.team_color_primary_hex}`,
        `#${team.team_color_secondary_hex}`,
      ];
    } else if (t.jersey.flip_primaries) {
      t.jersey.teamColors = [
        `#${t.team_color_secondary_hex}`,
        `#${t.team_color_primary_hex}`,
        "#FFFFFF",
      ];
    } else {
      t.jersey.teamColors = [
        `#${t.team_color_primary_hex}`,
        `#${t.team_color_secondary_hex}`,
        "#FFFFFF",
      ];
    }

    if (t.helmet){
      t.helmet.background = t.helmet.background.replace('#', '');
      t.helmet.facemask = t.helmet.facemask.replace('#', '');
    }

    if (t.jersey.lettering) {
      t.jersey.lettering_color = t.jersey.lettering_color || "FFFFFF";
    }

    t.team_name = t.team_location_name + " " + t.team_nickname;

    t.jersey.id = t.jersey.id || jersey_options[Math.floor(Math.random() * jersey_options.length)];

    rivals_team_1 = rivalries
      .filter((r) => r.team_name_1 == t.team_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_2,
          opponent_team_id: null,
          preferred_period_number: r.preferred_period_number,
          rivalry_name: r.rivalry_name,
        };
      });
    rivals_team_2 = rivalries
      .filter((r) => r.team_name_2 == t.team_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_1,
          opponent_team_id: null,
          preferred_period_number: r.preferred_period_number,
          rivalry_name: r.rivalry_name,
        };
      });

    rivals_team_1.concat(rivals_team_2);

    console.log({
      conferences_by_team_name: conferences_by_team_name,
      t: t,
    });

    t.location.lat = cities_by_city_state[t.location.city + ", " + t.location.state].lat;
    t.location.long = cities_by_city_state[t.location.city + ", " + t.location.state].long;

    t.league_id = conferences_by_team_name[t.team_name].league_id;
    t.world_id = world_id;
    t.team_id = team_id_counter;

    t.conference = {
      conference_id: conferences_by_team_name[t.team_name].conference_id,
      conference_name: conferences_by_team_name[t.team_name].conference_name,
    };

    teams.push(
      new team(t)
    );

    team_id_counter += 1;
  }

  teams.push(
    new team({
      team_id: -1,
      team_location_name: "Available",
      team_nickname: "Players",
      world_id: world_id,
      team_abbreviation: "AVAIL",
      team_color_primary_hex: "1763B2",
      team_color_secondary_hex: "FFFFFF",
      rivals: [],
      jersey: {
        invert: false,
        id: "football-standard",
        teamColors: ["#1763B2", "#000000", "#FFFFFF"],
      },
      team_ratings: {},
      location: {
        city: "Washington",
        state: "DC",
      },
      conference: {},
    })
  );

  teams.push(
    new team({
      team_id: -2,
      team_location_name: season,
      team_nickname: "Recruits",
      world_id: world_id,
      team_abbreviation: "RECRUIT",
      team_color_primary_hex: "1763B2",
      team_color_secondary_hex: "FFFFFF",
      rivals: [],
      jersey: {
        invert: false,
        id: "football-standard",
        teamColors: ["#1763B2", "#000000", "#FFFFFF"],
      },
      team_ratings: {},
      location: {
        city: "Washington",
        state: "DC",
      },
      conference: {},
    })
  );

  const teams_by_team_name = index_group_sync(teams, "index", "team_location_name");

  console.log({ teams: teams });

  let city_names = {};
  $.each(teams, function (ind, team) {
    $.each(team.rivals, function (ind, rival) {
      rival.opponent_team_id = teams_by_team_name[rival.opponent_name].team_id;
    });

    city_names[team.location.city] = (city_names[team.location.city] || 0) + 1;
  });

  for (let team of teams) {
    team.headline_metadata = {};
    team.headline_metadata.unique_city_name = city_names[team.location.city] == 1;
  }

  console.log({ teams: teams, city_names: city_names });
  db.team.insert(teams);
  await db.saveDatabaseAsync();

  await update_create_world_modal(
    "create-world-table-new-world",
    "create-world-table-create-teams"
  );

  await create_team_season({
    common: common,
    season: season,
    world_id: world_id,
    conferences_by_conference_name: conferences_by_conference_name,
  });

  var team_seasons = db.team_season.find({ season: season, team_id: { $gt: 0 } });

  teams = db.team.find({ team_id: { $gt: 0 } });
  // teams.forEach(t => delete t.starting_tendencies);
  // await db.team.update(teams);

  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  await update_create_world_modal(
    "create-world-table-create-teams",
    "create-world-table-create-coaches"
  );

  await create_coaches({
    common: common,
    team_seasons: team_seasons,
    teams_by_team_id: teams_by_team_id,
    world_id: world_id,
    season: season,
  });

  await update_create_world_modal(
    "create-world-table-create-coaches",
    "create-world-table-assign-coaches"
  );

  var coaches = db.coach.find();
  await create_coach_team_seasons({
    common: common,
    coaches: coaches,
    world_id: world_id,
    team_seasons: team_seasons,
    season: season,
  });

  await update_create_world_modal(
    "create-world-table-assign-coaches",
    "create-world-table-create-players"
  );

  await create_new_players_and_player_team_seasons(common, world_id, season);

  await update_create_world_modal(
    "create-world-table-create-players",
    "create-world-table-player-ratings"
  );

  await generate_player_ratings(common, world_id, season);

  await update_create_world_modal(
    "create-world-table-player-ratings",
    "create-world-table-assign-players"
  );

  await assign_players_to_teams(common, world_id, season, team_seasons);

  await assign_player_jersey_numbers(common, season);

  await update_create_world_modal(
    "create-world-table-assign-players",
    "create-world-table-depth-charts"
  );
  await populate_all_depth_charts(common);

  await update_create_world_modal(
    "create-world-table-depth-charts",
    "create-world-table-team-talent"
  );
  await calculate_team_overalls(common);

  await update_create_world_modal(
    "create-world-table-team-talent",
    "create-world-table-recruiting-class"
  );
  // await calculate_team_needs(common);
  // await create_recruiting_class(common);

  await update_create_world_modal(
    "create-world-table-recruiting-class",
    "create-world-table-rankings"
  );

  let all_days = db.day.find({season:season});

  const all_periods = db.period.find({ season: season });
  let periods_by_period_id = index_group_sync(all_periods, 'index', 'period_id');
  all_days = nest_children(all_days, periods_by_period_id, 'period_id', 'period');

  let this_day = all_days.find(d => d.is_current);
  console.log({this_day:this_day, all_days:all_days});
  this_day.phase = db.phase.findOne({phase_id: this_day.phase_id});

  console.log({
    this_day:this_day,
    all_days:all_days,
    db:db
  });

  await calculate_power_rankings(this_day, common);
  await calculate_standings(this_day, common);

  await update_create_world_modal(
    "create-world-table-rankings",
    "create-world-table-create-schedule"
  );
  await save_created_schedule({
    common: common,
    season: season,
    world_id: world_id,
  });

  // await choose_preseason_all_americans(common);

  await update_create_world_modal("create-world-table-create-schedule", null);

  conferences = db.conference.find();
  teams = db.team.find({ team_id: { $gt: 0 } });
  console.log({ teams: teams });
  teams.sort(function (t_a, t_b) {
    if (t_b.conference.conference_name > t_a.conference.conference_name) {
      return -1;
    } else if (t_b.conference.conference_name < t_a.conference.conference_name) {
      return 1;
    } else {
      if (t_b.team_location_name > t_a.team_location_name) {
        return -1;
      } else if (t_b.team_location_name < t_a.team_location_name) {
        return 1;
      }
    }
    return 0;
  });
  console.log({ teams: teams, "common.nunjucks_env": nunjucks_env });
  var url = "/html_templates/index/index/choose_team_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  let render_content = {
    teams: teams,
  };

  const renderedHtml = nunjucks_env.renderString(html, render_content);

  $(".choose-team-table").html(renderedHtml);
  $(".create-progress-table").addClass("w3-hide");
  $(".choose-team-table").removeClass("w3-hide");

  geo_marker_action(common);
  init_basic_table_sorting(common, "#choose-team-table", 0);
  $(".modal-dialog").css("max-width", "85%");
  $(".modal-dialog").css("width", "85%");

  console.log({
    db: db,
    ddb: ddb,
    world_id: world_id,
    season: season,
  });
  const current_league_season = db.league_season.findOne({ season: season });
  const world = ddb.world.findOne({ world_id: world_id });
  world.current_league_season = current_league_season;

  $(".choose-team-table button").on("click", async function () {
    let team_id = parseInt($(this).closest("[team-id]").attr("team-id"));
    const user_team = db.team.findOne({ team_id: team_id });

    const user_team_season = db.team_season.findOne({
      team_id: team_id,
      season: current_league_season.season,
    });

    console.log({
      user_team: user_team,
      user_team_season: user_team_season,
      current_league_season: current_league_season,
      team_id: team_id,
      teams: teams,
      c: teams[0].constructor,
      this: $(this),
    });

    current_league_season.user_team_id = team_id;
    user_team_season.is_user_team = true;
    user_team.is_user_team = true;

    world.user_team = {};
    world.user_team.team_nickname = user_team.team_nickname;
    world.user_team.team_location_name = user_team.team_location_name;
    world.user_team.team_logo_url = user_team.team_logo;
    world.user_team.team_record = "0-0";
    world.user_team.team_id = user_team.team_id;

    ddb.world.update(world);
    db.league_season.update(current_league_season);
    db.team_season.update(user_team_season);
    db.team.update(user_team);

    await db.saveDatabaseAsync();
    await ddb.saveDatabaseAsync();

    await navigate_to_href(`/World/${world_id}`);
  });
};

const navigate_to_href = async (href) => {
  // event.preventDefault();
  window.onbeforeunload = function () {};
  history.pushState({ path: href }, "", href);
  await page(href);
};

$(document).ready(async function () {
  var startTime = performance.now();

  $(document).on("click", async function (event) {
    const target = $(event.target);
    const parent_link = $(target).closest("[href]");
    const href = parent_link.attr("href");

    if (href) {
      event.preventDefault();
      await navigate_to_href(href);
    }
  });

  window.onpopstate = async function () {
    await navigate_to_href(location.pathname);
    //await page(location.pathname);
  };

  // await action(common);

  //await page(location.pathname);
  await navigate_to_href(location.pathname);

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
});

const page = async (path) => {
  console.log("page", path);
  const common = await common_functions(path);
  var startTime = performance.now();
  common.startTime = startTime;

  console.log({
    common: common,
    winning_route: common.winning_route,
    "common.winning_route.f": common.winning_route.f,
  });

  common.nav_bar_links = await nav_bar_links(common, common.winning_route);

  console.log({
    db: common.db
  });

  await common.winning_route.f(common);

  let team_games = common.db.team_game.find();
  let team_games_by_team_season_id = index_group_sync(team_games, "group", "team_season_id");

  console.log("team_games_by_team_season_id", {
    team_games_by_team_season_id: Object.entries(team_games_by_team_season_id).map((e) => [
      e[0],
      e[1].length,
    ]),
  });

  await add_listeners(common);
  var endTime = performance.now();
  console.log(`Time taken to render ${path}: ${parseInt(endTime - startTime)} ms`);
};
