let db = undefined;
var ddb = undefined;

const deep_copy = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (obj.constructor === RegExp) {
    return obj;
  }

  const return_value = new obj.constructor();

  for (const key of Object.keys(obj)) {
    return_value[key] = deep_copy(obj[key]);
  }

  return return_value;
};

const get_from_dict = (obj, key) => {
  let key_parts = key.split(".");
  let iter_obj = obj;
  let loop_count = 0;
  let max_loop = key_parts.length;
  for (key_part of key_parts) {
    loop_count += 1;
    if (loop_count == max_loop) {
      if (key_part in iter_obj) {
        return iter_obj[key_part];
      }
      return null;
    }
    if (typeof iter_obj === "object") {
      if (key_part in iter_obj) {
        iter_obj = iter_obj[key_part];
        continue;
      } else {
        return null;
      }
    }
  }
};

const increment_parent = (child, parent) => {
  for (const key of Object.keys(child)) {
    if (!(key in parent)) {
      parent[key] = deep_copy(child[key]);
      continue;
    }

    if (typeof child[key] == "object") {
      increment_parent(child[key], parent[key]);
    } else {
      if (key == "lng") {
        parent[key] = Math.max((parent[key] || 0), (child[key] || 0));
      } else if (key == "games_played" || key == "team_games_played") {
        parent[key] = (parent[key] || 0) + 1;
      } else {
        parent[key] = (parent[key] || 0) + (child[key] || 0);
      }
    }
  }
};

class headline {
  constructor(headline_id, week_id, headline_text, headline_type, headline_relevance) {
    this.headline_id = headline_id;
    this.week_id = week_id;
    this.headline_text = headline_text;
    this.headline_type = headline_type;
    this.headline_relevance = headline_relevance;
  }
}

class award {
  constructor(
    award_id,
    player_team_season_id,
    player_team_game_id,
    week_id,
    season,
    award_group,
    award_group_type,
    award_team_set,
    award_timeframe,
    conference_season_id,
    award_team
  ) {
    this.award_id = award_id;
    this.week_id = week_id;
    this.player_team_season_id = player_team_season_id;
    this.player_team_game_id = player_team_game_id;
    this.season = season;
    this.award_group = award_group; //individual, position, position group
    this.award_team_set = award_team_set; //conference, national
    this.conference_season_id = conference_season_id;
    this.award_group_type = award_group_type; //offense, defense, QB, RB, etc
    this.award_timeframe = award_timeframe; // Week, Season, Preseason, Playoffs
    this.award_team = award_team; //First, Second, National
  }

  get award_name() {
    var award_name = "";
    if (this.award_team_set == "conference") {
      if (this.award_timeframe == "week") {
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        award_name = `${this.season}`;
      } else if (this.award_timeframe == "pre-season") {
        award_name = `${this.season}`;
      }
    } else {
      if (this.award_timeframe == "week") {
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == "individual") {
          award_name = `${this.season} ${this.award_group_type}`;
        } else {
          award_name = `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_name = `${this.season}`;
      }
    }

    return award_name;
  }

  get award_group_name() {
    console.log({this:this})
    var award_group_name = "";
    var award_name = "";
    if (this.award_team_set == "conference") {
      if (this.award_timeframe == "week") {
        award_group_name = `${this.conference_season.conference.conference_abbreviation} ${this.award_group_type} Player of the Week`;
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == 'individual'){
          award_group_name = `${this.conference_season.conference.conference_abbreviation} POTY`;
          award_name = `${this.season}`;
        }
        else {
          award_group_name = `${this.award_team} Team ${this.conference_season.conference.conference_abbreviation} All-Conference ${this.award_group_type}`;
          award_name = `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_group_name = `${this.conference_season.conference.conference_abbreviation} Preseason All-Conference ${this.award_group_type}`;
        award_name = `${this.season}`;
      }
    } else {
      if (this.award_timeframe == "week") {
        award_group_name = `National ${this.award_group_type} Player of the Week`;
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (
          this.award_group == "position"
        ) {
			if (this.award_team == 'First'){
				award_group_name = `All-American ${this.award_group_type}`;
			}
			else {
				award_group_name = `${this.award_team} Team All-American ${this.award_group_type}`;
			}
          award_name = `${this.season}`;
        } else {
          award_group_name = this.award_group_type + ' Trophy';
          award_name = `${this.season}`;
        }
      } else if (this.award_timeframe == "pre-season") {
        award_group_name = `Preseason All-American ${this.award_group_type}`;
      }
    }
    console.log({ award_group_name: award_group_name, this: this });
    return award_group_name;
  }

  get award_href() {
    if (this.player_team_game) {
      return this.player_team_game.team_game.game.game_href;
    }
    return "";
  }
}

class player_team_game {
  constructor(player_team_game_id, team_game_id, player_team_season_id) {
    this.player_team_game_id = player_team_game_id;
    this.team_game_id = team_game_id;
    this.player_team_season_id = player_team_season_id;
    this.top_stats = [];
    this.game_stats = {
      games: {
        game_score: 0,
        weighted_game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 1,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };
  }

  get passer_rating() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (8.4 * this.game_stats.passing.yards +
          330 * this.game_stats.passing.tds +
          100 * this.game_stats.passing.completions -
          200 * this.game_stats.passing.ints) /
          this.game_stats.passing.attempts,
        1
      );
    }

    return 0;
  }

  get passing_yards_per_game() {
    return this.game_stats.passing.yards;
  }
  get rushing_yards_per_game() {
    return this.game_stats.rushing.yards;
  }

  get completion_percentage() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (this.game_stats.passing.completions * 100) /
          this.game_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get is_qualified_passer() {
    if (
      this.game_stats.games.games_played &&
      this.game_stats.passing.attempts / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get completion_percentage_qualified() {
    if (this.is_qualified_passer) {
      return this.completion_percentage;;
    }

    return 0;
    
  }

  get passing_yards_per_attempt() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        this.game_stats.passing.yards / this.game_stats.passing.attempts,
        1
      );
    }

    return 0
    
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(
        this.game_stats.rushing.yards / this.game_stats.rushing.carries,
        1
      );
    }

    return 0;
    
  }

  get is_qualified_rusher() {
    if (
      this.game_stats.games.games_played > 0 &&
      this.game_stats.rushing.carries / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.game_stats.receiving.receptions) {
      return round_decimal(
        this.game_stats.receiving.yards / this.game_stats.receiving.receptions,
        1
      );
    }

    return 0;
   
  }

  get receiving_yards_per_catch_qualified() {
    if (this.game_stats.receiving.receptions >= 5) {
      return round_decimal(
        this.game_stats.receiving.yards / this.game_stats.receiving.receptions,
        1
      );
    }

    return 0;
    
  }

  get defense_action_count() {
    return (
      (this.game_stats.defense.tackles || 0) +
      (this.game_stats.defense.deflections || 0) +
      (this.game_stats.defense.ints || 0) +
      (this.game_stats.defense.sacks || 0)
    );
  }

  get yards_from_scrimmage() {
    return this.game_stats.receiving.yards + this.game_stats.rushing.yards;
  }
}

class week {
  constructor(){

  }
}
class phase {
  constructor(){

  }
}

class world {
  constructor(){

  }
}

class team_game {
  constructor(team_game_options) {
    //this = team_game_options;
    for (var key in team_game_options) {
      this[key] = team_game_options[key];
    }
    this.points = null;
    this.is_winning_team = null;
    this.record = {
      wins: 0,
      losses: 0,
      conference_wins: 0,
      conference_losses: 0,
    };
    this.national_rank = null;
    this.top_stats = [];

    this.game_stats = {
      team: {
        points: 0,
        time_of_possession: 0,
        possessions: 0,
        turnovers: 0,
        biggest_lead: 0,
        down_efficiency: {
          all: { success: 0, total: 0 },
          1: { success: 0, total: 0 },
          2: { success: 0, total: 0 },
          3: { success: 0, total: 0 },
        },
        field_position: {
          total_drives: 0,
          total_start_yard: 0,
        },
        drive_efficiency: {
          20: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
          40: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
        },
        downs: {
          first_downs: {
            total: 0,
            passing: 0,
            rushing: 0,
            penalty: 0,
          },
          third_downs: {
            attempts: 0,
            conversions: 0,
          },
          fourth_downs: {
            attempts: 0,
            conversions: 0,
          },
          two_points: {
            attempts: 0,
            conversions: 0,
          },
        },
      },
      games: {
        game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 1,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };

    this.opponent_game_stats = deep_copy(this.game_stats);
  }

  get record_display(){
    return `${this.record.wins} - ${this.record.losses}`
  }

  get time_of_possession_formatted() {
    let minutes = Math.floor(this.game_stats.team.time_of_possession / 60);
    let seconds = Math.floor(this.game_stats.team.time_of_possession % 60);
    let seconds_display = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}:${seconds_display}`;
  }

  get total_yards() {
    return this.game_stats.passing.yards + this.game_stats.rushing.yards;
  }

  get third_down_conversion_percentage() {
    if (this.game_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.game_stats.team.downs.third_downs.conversions * 100) /
        this.game_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get fourth_down_conversion_percentage() {
    if (this.game_stats.team.downs.fourth_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.game_stats.team.downs.fourth_downs.conversions * 100) /
        this.game_stats.team.downs.fourth_downs.attempts,
      1
    );
  }

  get national_rank_display() {
    if (this.national_rank == null) {
      return null;
    }
    if (this.national_rank <= 25) {
      return `(${this.national_rank})`;
    }
    return "";
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(
        this.game_stats.rushing.yards / this.game_stats.rushing.carries,
        1
      );
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.game_stats.games.games_played > 0 &&
      this.game_stats.rushing.carries / this.game_stats.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get plays() {
    return this.game_stats.passing.attempts + this.game_stats.rushing.carries;
  }

  get yards_per_play() {
    if (this.plays == 0) {
      return 0;
    }
    return round_decimal(this.total_yards / this.plays,1);
  }

  get passer_rating() {
    if (this.game_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.game_stats.passing.yards +
        330 * this.game_stats.passing.tds +
        100 * this.game_stats.passing.completions -
        200 * this.game_stats.passing.ints) /
        this.game_stats.passing.attempts,
      1
    );
  }
}

class team {
  build_team_logo(size_obj) {
    var folder_prefix = "/static/img/team_logos/";
    var size_suffix = "";
    if ("img_size" in size_obj) {
      size_suffix = "_" + size_obj["img_size"];
    }

    if (this.team_id < 0) {
      var path = folder_prefix + "ncaa.png";
    } else {
      var path =
        folder_prefix +
        this.school_name +
        "_" +
        this.team_name +
        size_suffix +
        ".png";
    }

    path = path
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("&", "_")
      .replaceAll("'", "")
      .replaceAll("-", "_");

    return path;
  }

  get team_field_a_text() {
    if (this.school_name.length > 12) {
      if (this.team_name.length > 10) {
        return this.team_abbreviation;
      }
      return this.team_name;
    }
    return this.school_name;
  }

  get team_field_b_text() {
    if (this.team_name.length > 12) {
      if (this.school_name.length > 10) {
        return this.team_abbreviation;
      }
      return this.school_name;
    }
    return this.team_name;
  }

  get full_name() {
    return `${this.school_name} ${this.team_name}`;
  }

  get team_href() {
    if (this.team_id == -2) {
      return `/World/${this.world_id}/Recruiting`;
    }
    return `/World/${this.world_id}/Team/${this.team_id}`;
  }

  get team_logo() {
    if (false && this.team_logo_url && this.team_logo_url.length > 0){
      return this.team_logo_url;
    }
    else {
      var folder_prefix = "/static/img/team_logos/";
      var size_suffix = "";

      if (this.team_id < 0) {
        var path = folder_prefix + "ncaa.png";
      } else {
        var path =
          folder_prefix +
          this.school_name +
          "_" +
          this.team_name +
          size_suffix +
          ".png";
      }

      path = path
        .toLowerCase()
        .replaceAll(" ", "_")
        .replaceAll("&", "_")
        .replaceAll("'", "")
        .replaceAll("-", "_");

      return path;
      }
  }

  luma(color) {
    var R = color.slice(0, 2);
    var G = color.slice(2, 4);
    var B = color.slice(4, 6);

    const luma =
      (0.299 * parseInt(R, 16) ** 2 +
        0.587 * parseInt(G, 16) ** 2 +
        0.114 * parseInt(B, 16) ** 2) **
      0.5;
    return luma;
  }

  get secondary_color_display() {
    if (this.luma(this.team_color_secondary_hex) < 230) {
      return this.team_color_secondary_hex;
    }
    return "000000";
  }
}

class league_season {
  constructor(init_obj, previous_season) {
    this.season = init_obj.season;
    this.world_id = init_obj.world_id;
    this.is_season_complete = false;

    this.playoffs = {
      playoffs_started: false,
      playoffs_complete: false,
      number_playoff_rounds: 4,
      number_playoff_teams: 12,
      playoff_rounds: [
        {
          playoff_round_number: 1,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 1",
          next_week_name: "Bowl Week 2",
          round_name: "National Quarterfinals",
          playoff_games: [
            {
              team_objs: [
                { seed: 1, team_game_id: null, team_season_id: null },
              ],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 8, team_game_id: null, team_season_id: null },
                { seed: 9, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 4, team_game_id: null, team_season_id: null },
              ],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 5, team_game_id: null, team_season_id: null },
                { seed: 12, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 2, team_game_id: null, team_season_id: null },
              ],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 7, team_game_id: null, team_season_id: null },
                { seed: 10, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 3, team_game_id: null, team_season_id: null },
              ],
              bye_game: true,
              seeds_set: true,
              game_id: null,
            },
            {
              team_objs: [
                { seed: 6, team_game_id: null, team_season_id: null },
                { seed: 11, team_game_id: null, team_season_id: null },
              ],
              bye_game: false,
              seeds_set: true,
              game_id: null,
            },
          ],
        },
        {
          playoff_round_number: 2,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 2",
          next_week_name: "Bowl Week 3",
          round_name: "National Quarterfinals",
          playoff_games: [
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
            {
              team_objs: [],
              bye_game: false,
              seeds_set: false,
              game_id: null,
            },
          ],
        },
        {
          playoff_round_number: 3,
          is_current_round: false,
          is_championship: false,
          week_name: "Bowl Week 3",
          next_week_name: "Bowl Week 4",
          round_name: "National Semifinals",
          playoff_games: [
            { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
            { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
          ],
        },
        {
          playoff_round_number: 4,
          is_current_round: false,
          is_championship: true,
          week_name: "Bowl Week 4",
          next_week_name: null,
          round_name: "National Championship",
          playoff_games: [
            { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
          ],
        },
      ],
    };

    this.preseason_tasks = {
      user_cut_players: false,
      user_set_gameplan: false,
      user_set_depth_chart: false,
    };

    if (previous_season == undefined) {
      this.is_current_season = true;
      this.captains_per_team = init_obj.captains_per_team;
      this.players_per_team = init_obj.players_per_team;
      this.user_team_id = Math.ceil(Math.random() * init_obj.num_teams);
    } else {
      this.is_current_season = false;
      this.captains_per_team = previous_season.captains_per_team;
      this.players_per_team = previous_season.players_per_team;
      this.user_team_id = previous_season.user_team_id;
    }
  }
}

class team_season_stats {
  constructor(team_season_id) {
    this.team_season_id = team_season_id;
    this.season_stats = {
      team: {
        points: 0,
        time_of_possession: 0,
        possessions: 0,
        turnovers: 0,
        biggest_lead: 0,
        down_efficiency: {
          all: { success: 0, total: 0 },
          1: { success: 0, total: 0 },
          2: { success: 0, total: 0 },
          3: { success: 0, total: 0 },
        },
        field_position: {
          total_drives: 0,
          total_start_yard: 0,
        },
        drive_efficiency: {
          20: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
          40: {
            total_trips: 0,
            scores: 0,
            total_points: 0,
          },
        },
        downs: {
          first_downs: {
            total: 0,
            passing: 0,
            rushing: 0,
            penalty: 0,
          },
          third_downs: {
            attempts: 0,
            conversions: 0,
          },
          fourth_downs: {
            attempts: 0,
            conversions: 0,
          },
          two_points: {
            attempts: 0,
            conversions: 0,
          },
        },
      },
      games: {
        game_score: 0,
        games_played: 0,
        games_started: 0,
        plays_on_field: 0,
        team_games_played: 0,
        points: 0,
      },
      passing: {
        completions: 0,
        attempts: 0,
        yards: 0,
        tds: 0,
        ints: 0,
        sacks: 0,
        sack_yards: 0,
      },
      rushing: {
        carries: 0,
        yards: 0,
        tds: 0,
        over_20: 0,
        lng: 0,
        broken_tackles: 0,
        yards_after_contact: 0,
      },
      receiving: {
        yards: 0,
        targets: 0,
        receptions: 0,
        tds: 0,
        yards_after_catch: 0,
        drops: 0,
        lng: 0,
        yards: 0,
      },
      blocking: {
        sacks_allowed: 0,
        pancakes: 0,
        blocks: 0,
      },
      defense: {
        tackles: 0,
        solo_tackles: 0,
        sacks: 0,
        tackles_for_loss: 0,
        deflections: 0,
        qb_hits: 0,
        tds: 0,
        ints: 0,
        int_yards: 0,
        int_tds: 0,
        safeties: 0,
      },
      fumbles: {
        fumbles: 0,
        lost: 0,
        recovered: 0,
        forced: 0,
        return_yards: 0,
        return_tds: 0,
      },
      kicking: {
        fga: 0,
        fgm: 0,
        fga_29: 0,
        fgm_29: 0,
        fga_39: 0,
        fgm_39: 0,
        fga_49: 0,
        fgm_49: 0,
        fga_50: 0,
        fgm_50: 0,
        lng: 0,
        xpa: 0,
        xpm: 0,
        kickoffs: 0,
        touchbacks: 0,
      },
      punting: {
        punts: 0,
        yards: 0,
        touchbacks: 0,
        within_20: 0,
        lng: 0,
        net_yards: 0,
      },
      returning: {
        kr_returns: 0,
        kr_yards: 0,
        kr_tds: 0,
        kr_lng: 0,
        pr_returns: 0,
        pr_yards: 0,
        pr_tds: 0,
        pr_lng: 0,
      },
    };
    this.opponent_season_stats = deep_copy(this.season_stats);
  }

  get points_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.points / this.season_stats.games.games_played,
      1
    );
  }

  get kicking_field_goal_percentage() {
    if (this.season_stats.kicking.fga == 0) {
      return 0;
    }
    return round_decimal(
      (this.season_stats.kicking.fgm * 100) / this.season_stats.kicking.fga,
      1
    );
  }

  get kicking_extra_point_percentage() {
    if (this.season_stats.kicking.xpa == 0) {
      return 0;
    }
    return round_decimal(
      (this.season_stats.kicking.xpm * 100) / this.season_stats.kicking.xpa,
      1
    );
  }

  get punting_average_yards() {
    if (this.season_stats.punting.punts == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.punting.yards / this.season_stats.punting.punts,
      1
    );
  }

  get completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) /
          this.season_stats.passing.attempts,
        1
      );
    }
    return 0
  }

  get passing_completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) /
          this.season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get opponent_completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.opponent_season_stats.passing.completions * 100) /
          this.opponent_season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.passing.yards / this.season_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_completion() {
    if (this.season_stats.passing.completions == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.passing.yards / this.season_stats.passing.completions,
      1
    );
  }

  get opponent_passing_yards_per_attempt() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(
      this.opponent_season_stats.passing.yards /
        this.opponent_season_stats.passing.attempts,
      1
    );
  }

  get points_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.team.points /
        this.season_stats.games.games_played,
      1
    );
  }

  get point_differential_per_game() {
    return round_decimal(
      this.points_per_game - this.points_allowed_per_game,
      1
    );
  }

  get passer_rating() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.season_stats.passing.yards +
        330 * this.season_stats.passing.tds +
        100 * this.season_stats.passing.completions -
        200 * this.season_stats.passing.ints) /
        this.season_stats.passing.attempts,
      1
    );
  }

  get opponent_passer_rating() {
    if (this.opponent_season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.opponent_season_stats.passing.yards +
        330 * this.opponent_season_stats.passing.tds +
        100 * this.opponent_season_stats.passing.completions -
        200 * this.opponent_season_stats.passing.ints) /
        this.opponent_season_stats.passing.attempts,
      1
    );
  }

  get sack_dropback_percent(){
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.passing.sacks *100 /
        this.season_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.passing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.rushing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get rushing_carries_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.rushing.carries / this.season_stats.games.games_played,
      1
    );
  }

  get play_call_percent_rush(){
    if (this.plays == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.rushing.carries * 100 / this.plays,
       1
    );  }

    get play_call_percent_pass(){
      if (this.plays == 0) {
        return 0;
      }
  
      return round_decimal(
        this.season_stats.passing.attempts * 100 / this.plays,
         1
      );  }

  get receiving_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.receiving.yards / this.season_stats.games.games_played,
      1
    );
  }

  get receiving_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.receiving.yards / this.season_stats.games.games_played,
      1
    );
  }

  get receiving_yards_per_catch() {
    if (this.season_stats.receiving.receptions) {
      return round_decimal(
        this.season_stats.receiving.yards /
          this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.season_stats.receiving.receptions > 10) {
      return round_decimal(
        this.season_stats.receiving.yards /
          this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get rushing_yards_per_carry() {
    if (this.season_stats.rushing.carries) {
      return round_decimal(
        this.season_stats.rushing.yards / this.season_stats.rushing.carries,
        1
      );
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.season_stats.rushing.carries > 0 &&
      this.season_stats.rushing.carries / this.season_stats.games.games_played >
        10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get opponent_rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.rushing.yards /
        this.season_stats.games.games_played,
      1
    );
  }

  get opponent_receiving_yards_per_game() {
    if (this.opponent_season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.opponent_season_stats.receiving.yards /
        this.opponent_season_stats.games.games_played,
      1
    );
  }

  get opponent_receiving_yards_per_catch() {
    if (this.opponent_season_stats.receiving.receptions) {
      return round_decimal(
        this.opponent_season_stats.receiving.yards /
          this.opponent_season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get opponent_rushing_yards_per_carry() {
    if (this.opponent_season_stats.rushing.carries) {
      return round_decimal(
        this.opponent_season_stats.rushing.yards /
          this.opponent_season_stats.rushing.carries,
        1
      );
    }
    return 0;
  }

  get yards() {
    return this.season_stats.passing.yards + this.season_stats.rushing.yards;
  }

  get plays() {
    return this.season_stats.passing.attempts + this.season_stats.rushing.carries;
  }

  get yards_per_play() {
    if (this.plays == 0) {
      return 0;
    }
    return round_decimal(this.yards / this.plays,1);
  }

  get yards_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(this.yards / this.season_stats.team.field_position.total_drives,1);
  }

  get points_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(this.season_stats.team.points / this.season_stats.team.field_position.total_drives,1);
  }

  get drive_turnover_percent() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(this.turnovers * 100 / this.season_stats.team.field_position.total_drives,1);
  }

  get yards_per_game() {
    return round_decimal(
      this.passing_yards_per_game + this.rushing_yards_per_game,
      1
    );
  }

  get yards_allowed() {
    return (
      this.opponent_season_stats.passing.yards +
      this.opponent_season_stats.rushing.yards
    );
  }

  get yards_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.yards_allowed / this.season_stats.games.games_played,
      1
    );
  }

  get yards_per_game_diff() {
    return round_decimal(this.yards_per_game - this.yards_allowed_per_game, 1);
  }

  get third_down_conversion_percentage() {
    if (this.season_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.downs.third_downs.conversions * 100) /
        this.season_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get fourth_down_conversion_percentage() {
    if (this.season_stats.team.downs.fourth_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.downs.fourth_downs.conversions * 100) /
        this.season_stats.team.downs.fourth_downs.attempts,
      1
    );
  }

  get defensive_third_down_conversion_percentage() {
    if (this.opponent_season_stats.team.downs.third_downs.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.opponent_season_stats.team.downs.third_downs.conversions * 100) /
        this.opponent_season_stats.team.downs.third_downs.attempts,
      1
    );
  }

  get third_down_conversion_percentage_diff() {
    return round_decimal(
      this.third_down_conversion_percentage -
        this.defensive_third_down_conversion_percentage,
      1
    );
  }

  get takeaways() {
    return this.opponent_season_stats.team.turnovers;
  }
  get turnovers() {
    return this.season_stats.team.turnovers;
  }
  get turnover_diff() {
    return this.takeaways - this.turnovers;
  }

  get opponent_passing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.passing.yards /
        this.season_stats.games.games_played,
      1
    );
  }

  get opponent_rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.rushing.yards /
        this.season_stats.games.games_played,
      1
    );
  }

  get points_per_drive_within_40() {
    if (this.season_stats.team.drive_efficiency[40].total_trips == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[40].total_points /
        this.season_stats.team.drive_efficiency[40].total_trips,
      1
    );
  }

  get drives_within_40_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[40].total_trips /
        this.season_stats.games.games_played,
      1
    );
  }

  get drives_within_20_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[20].total_trips /
        this.season_stats.games.games_played,
      1
    );
  }

  get points_per_drive_within_20() {
    if (this.season_stats.team.drive_efficiency[20].total_trips == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.drive_efficiency[20].total_points /
        this.season_stats.team.drive_efficiency[20].total_trips,
      1
    );
  }

  get down_efficiency() {
    if (this.season_stats.team.down_efficiency.all.total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency.all.success * 100) /
        this.season_stats.team.down_efficiency.all.total,
      1
    );
  }

  get down_efficiency_3rd() {
    if (this.season_stats.team.down_efficiency[3].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[3].success * 100) /
        this.season_stats.team.down_efficiency[3].total,
      1
    );
  }

  get down_efficiency_2nd() {
    if (this.season_stats.team.down_efficiency[2].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[2].success * 100) /
        this.season_stats.team.down_efficiency[2].total,
      1
    );
  }

  get down_efficiency_1st() {
    if (this.season_stats.team.down_efficiency[1].total == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.team.down_efficiency[1].success * 100) /
        this.season_stats.team.down_efficiency[1].total,
      1
    );
  }

  get average_field_position() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }

    return round_decimal(
      this.season_stats.team.field_position.total_start_yard /
        this.season_stats.team.field_position.total_drives,
      1
    );
  }
}

class team_season {
  constructor(init_obj) {
    if (init_obj.team_id > 0) {
      this.record = {
        wins: 0,
        losses: 0,
        conference_wins: 0,
        conference_losses: 0,
        conference_net_wins: 0,
        games_played: 0,
        conference_gb: 0,
        win_streak: 0,
        defeated_teams: [],
      };
      this.rankings = {
        division_rank: [],
        national_rank: [],
        srs_ratings: [],
        national_rank_delta: 0,
        national_rank_delta_abs: 0,
        stat_rankings: { offense: [], defense: [], overall: [] },
      };
      this.games = [];
      this.playoff = {};
      this.broadcast = {
        national_broadcast: 0,
        regional_broadcast: 0,
      };
      this.results = {
        conference_champion: false,
        national_champion: false,
        final_four: false,
        bowl: null,
      };
      this.recruiting = {
        scholarships_to_offer: 25,
        recruiting_class_rank: 1,
        points_per_week: 100,
        class_points: 0,
        signed_player_stars: {
          stars_1: 0,
          stars_2: 0,
          stars_3: 0,
          stars_4: 0,
          stars_5: 0,
        },
        signed_player_team_season_ids: [],
      };
      this.headlines = [];
      this.top_stats = [];
    }

    for (const key in init_obj) {
      this[key] = init_obj[key];
    }
  }

  get team_season_href() {
    return `/World/${this.world_id}/Team/${this.team_id}/Season/${this.season}`;
  }

  get best_rank() {
    return Math.min(...this.rankings.national_rank);
  }

  get worst_rank() {
    return Math.max(...this.rankings.national_rank);
  }

  get first_rank() {
    return this.rankings.national_rank[this.rankings.national_rank.length - 1];
  }

  get weeks_ranked_1() {
    return this.rankings.national_rank.filter((rank) => rank == 1).length;
  }

  get weeks_ranked_top_5() {
    return this.rankings.national_rank.filter((rank) => rank <= 5).length;
  }

  get weeks_ranked_top_10() {
    return this.rankings.national_rank.filter((rank) => rank <= 10).length;
  }

  get weeks_ranked_top_25() {
    return this.rankings.national_rank.filter((rank) => rank <= 25).length;
  }

  get national_rank() {
    return this.rankings.national_rank[0];
  }

  get national_rank_display() {
    if (this.rankings.national_rank[0] <= 25) {
      return `(${this.rankings.national_rank[0]})`;
    }
    return "";
  }

  get record_display() {
    return `${this.record.wins} - ${this.record.losses}`;
  }

  get net_wins() {
    return this.record.wins - this.record.losses;
  }

  get conference_record_display() {
    return `${this.record.conference_wins} - ${this.record.conference_losses} `;
  }

  get win_streak_string() {
    if (this.record.win_streak > 0) {
      return `W${this.record.win_streak}`;
    } else if (this.record.win_streak < 0) {
      return `L${Math.abs(this.record.win_streak)}`;
    }
    return "-";
  }

  get win_streak_color() {
    if (this.record.win_streak > 0) {
      return `W`;
    } else if (this.record.win_streak < 0) {
      return `L`;
    }
    return "-";
  }

  get wins() {
    return this.record.wins;
  }
}

class coach {
  constructor(init_data) {
    this.coach_id = init_data.coach_id;
    this.player_id = init_data.player_id;
    this.name = init_data.name;
    this.world_id = init_data.world_id;
    this.hometown = init_data.hometown;
    this.coaching_position = init_data.coaching_position;
    this.ethnicity = init_data.ethnicity;
    this.body = init_data.body;
    this.team_id = init_data.team_id;
    this.alma_mater_team_id = init_data.alma_mater_team_id;

    let pass_tendency = round_decimal(normal_trunc(50, 50, 1, 100), 0);
    this.tendencies = {
      pass: pass_tendency,
      run: 100 - pass_tendency, 
      playclock_urgency: round_decimal(normal_trunc(4, 2, 1, 7), 0)
    }

    this.personality = {
      leadership: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      work_ethic: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      desire_for_winner: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      loyalty: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      desire_for_playtime: round_decimal(normal_trunc(10, 3, 1, 20), 0),
    };
  }

  get hometown_and_state() {
    return `${this.hometown.city}, ${this.hometown.state}`;
  }

  get full_name() {
    return `${this.name.first} ${this.name.last}`;
  }

  get coach_href() {
    return `/World/${this.world_id}/Coach/${this.coach_id}`;
  }
}

class coach_team_season {
  constructor(init_data) {
    this.coach_id = init_data.coach_id;
    this.coach_team_season_id = init_data.coach_team_season_id;
    this.post_season_movement = null; //[quit, retired, fired, new job]
    this.ratings = init_data.ratings;
    this.age = init_data.age;

    this.team_season_id = init_data.team_season_id;
    this.season = init_data.season;
    this.world_id = init_data.world_id;
    this.coaching_position = init_data.coaching_position;
  }
}

class player {
  constructor(init_data) {
    this.player_id = init_data.player_id;
    this.name = init_data.name;
    this.world_id = init_data.world_id;
    this.hometown = init_data.hometown;
    this.position = init_data.position;
    this.ethnicity = init_data.ethnicity;
    this.body = init_data.body;
    this.team_id = init_data.team_id;

    this.redshirt = { previous: false, current: false };
    this.jersey_number = 21;

    this.personality = {
      leadership: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      work_ethic: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      desire_for_winner: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      loyalty: round_decimal(normal_trunc(10, 3, 1, 20), 0),
      desire_for_playtime: round_decimal(normal_trunc(10, 3, 1, 20), 0),
    };
  }

  get full_name() {
    return `${this.name.first} ${this.name.last}`;
  }

  get player_href() {
    return `/World/${this.world_id}/Player/${this.player_id}`;
  }

  get hometown_and_state() {
    return `${this.hometown.city}, ${this.hometown.state}`;
  }

  get height_formatted() {
    const feet = parseInt(this.height / 12);
    const inches = this.height % 12;
    return `${feet}'${inches}"`;
  }

  get bmi() {
    return 703.0 * this.weight / (this.height ** 2);
  }

  get passer_rating() {
    if (this.career_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.career_stats.passing.yards +
        330 * this.career_stats.passing.tds +
        100 * this.career_stats.passing.completions -
        200 * this.career_stats.passing.ints) /
        this.career_stats.passing.attempts,
      1
    );
  }

  get rushing_yards_per_carry() {
    console.log({
      'this.career_stats': this.career_stats,
      'this.career_stats.rushing.carries': this.career_stats.rushing.carries
    })
    if (this.career_stats.rushing.carries) {
      return round_decimal(
        this.career_stats.rushing.yards / this.career_stats.rushing.carries,
        1
      );
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.career_stats.games.games_played > 0 &&
      this.career_stats.rushing.carries / this.career_stats.games.games_played >
        10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get yards_from_scrimmage() {
    return this.career_stats.receiving.yards + this.career_stats.rushing.yards;
  }

  get completion_percentage() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      (this.career_stats.passing.completions * 100) /
        this.career_stats.passing.attempts,
      1
    );
  }

  get passing_completion_percentage() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      (this.career_stats.passing.completions * 100) /
        this.career_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_attempt() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      this.career_stats.passing.yards / this.career_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_completion() {
    if (this.career_stats.passing.completions < 50) {
      return 0;
    }
    return round_decimal(
      this.career_stats.passing.yards / this.career_stats.passing.completions,
      1
    );
  }

  get passing_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.career_stats.passing.yards / this.career_stats.games.games_played,
      1
    );
  }

  get rushing_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.career_stats.rushing.yards / this.career_stats.games.games_played,
      1
    );
  }

  get receiving_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.career_stats.receiving.yards / this.career_stats.games.games_played,
      1
    );
  }

  get is_qualified_rusher() {
    if (
      this.career_stats.games.games_played > 0 &&
      this.career_stats.rushing.carries / this.career_stats.games.games_played >
        10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.career_stats.receiving.receptions > 10) {
      return round_decimal(
        this.career_stats.receiving.yards /
          this.career_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }
}

class player_team_season_stats {
  constructor(player_team_season_id) {
    this.player_team_season_id = player_team_season_id;
    this.games = {
      game_score: 0,
      weighted_game_score: 0,
      games_played: 0,
      games_started: 0,
      plays_on_field: 0,
      team_games_played: 0,
      points: 0,
    };
    this.top_stats = [];
    this.top_12_weighted_game_scores = [];
    this.passing = {
      completions: 0,
      attempts: 0,
      yards: 0,
      tds: 0,
      ints: 0,
      sacks: 0,
      sack_yards: 0,
    };
    this.rushing = {
      carries: 0,
      yards: 0,
      tds: 0,
      over_20: 0,
      lng: 0,
      broken_tackles: 0,
      yards_after_contact: 0,
    };

    this.receiving = {
      yards: 0,
      targets: 0,
      receptions: 0,
      tds: 0,
      yards_after_catch: 0,
      drops: 0,
      lng: 0,
      yards: 0,
    };
    this.blocking = {
      sacks_allowed: 0,
      pancakes: 0,
      blocks: 0,
    };
    this.defense = {
      tackles: 0,
      solo_tackles: 0,
      sacks: 0,
      tackles_for_loss: 0,
      deflections: 0,
      qb_hits: 0,
      tds: 0,
      ints: 0,
      int_yards: 0,
      int_tds: 0,
      safeties: 0,
    };
    this.fumbles = {
      fumbles: 0,
      lost: 0,
      recovered: 0,
      forced: 0,
      return_yards: 0,
      return_tds: 0,
    };
    this.kicking = {
      fga: 0,
      fgm: 0,
      fga_29: 0,
      fgm_29: 0,
      fga_39: 0,
      fgm_39: 0,
      fga_49: 0,
      fgm_49: 0,
      fga_50: 0,
      fgm_50: 0,
      lng: 0,
      xpa: 0,
      xpm: 0,
      kickoffs: 0,
      touchbacks: 0,
    };
    this.punting = {
      punts: 0,
      yards: 0,
      touchbacks: 0,
      within_20: 0,
    };
    this.returning = {
      kr_returns: 0,
      kr_yards: 0,
      kr_tds: 0,
      kr_lng: 0,
      pr_returns: 0,
      pr_yards: 0,
      pr_tds: 0,
      pr_lng: 0,
    };
  }

  get completion_percentage() {
    if (this.passing.attempts) {
      return round_decimal(
        (this.passing.completions * 100) / this.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.passing.attempts) {
      return round_decimal(
        (this.passing.completions * 100) / this.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passer_rating() {
    if (this.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (8.4 * this.passing.yards +
        330 * this.passing.tds +
        100 * this.passing.completions -
        200 * this.passing.ints) /
        this.passing.attempts,
      1
    );
  }

  get is_qualified_passer() {
    if (
      this.games.games_played > 0 &&
      this.passing.attempts / this.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get completion_percentage_qualified() {
    if (this.is_qualified_passer) {
      return this.completion_percentage;
    }
    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.passing.attempts == 0) {
      return 0;
    }
    return round_decimal(this.passing.yards / this.passing.attempts, 1);
  }

  get passing_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.passing.yards / this.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.rushing.yards / this.games.games_played, 1);
  }

  get receiving_yards_per_game() {
    if (this.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.receiving.yards / this.games.games_played, 1);
  }

  get rushing_yards_per_carry() {
    if (this.rushing.carries) {
      return round_decimal(this.rushing.yards / this.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.games.games_played > 0 &&
      this.rushing.carries / this.games.games_played > 10
    ) {
      return true;
    }
    return false;
  }

  get rushing_yards_per_carry_qualified() {
    if (this.is_qualified_rusher) {
      return this.rushing_yards_per_carry;
    }

    return 0;
  }

  get receiving_yards_per_catch() {
    if (this.receiving.receptions) {
      return round_decimal(this.receiving.yards / this.receiving.receptions, 1);
    }
    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.receiving.receptions > 10) {
      return this.receiving_yards_per_catch;
    }
    return 0;
  }

  get yards_from_scrimmage() {
    return this.receiving.yards + this.rushing.yards;
  }

  get average_weighted_game_score() {
    if (!this.games || this.top_12_weighted_game_scores.length == 0) {
      return 0;
    }
    return round_decimal(
      sum(this.top_12_weighted_game_scores.slice(0, 12)) / this.top_12_weighted_game_scores.slice(0, 12).length,
      1
    );
  }
}

class recruit_team_season {
  constructor(init_data) {
    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }
}

class player_team_season {
  constructor(init_data) {
    this.player_id = init_data.player_id;
    this.player_team_season_id = init_data.player_team_season_id;
    this.is_recruit = false;
    this.post_season_movement = null; //[quit, graduate, draft, transfer]
    this.top_stats = [];
    this.is_captain = false;
    this.ratings = init_data.ratings;

    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }

  get player_award_rating() {
    let position_overall_map = {
      QB: 0,
      RB: -.05,
      FB: -.5,
      WR: -.1,
      TE: -.2,
      OT: -.3,
      IOL: -.3,
      EDGE: -.2,
      DL: -.2,
      LB: -.25,
      CB: -.25,
      S: -.25,
      K: -.5,
      P: -.5,
    }
    return (
      ((10 * this.season_stats.average_weighted_game_score) +
      (1 * this.ratings.overall.overall) +      
      (0.5 * this.team_season.team.team_ratings.brand)) *
      ((1 / this.team_season.national_rank) ** .05) *
      ((1 / (this.team_season_average_weighted_game_score_rank || 1)) ** .1) *
      ((1 / (this.team_season_overall_rank || 1)) ** .05) *
      (1 + (position_overall_map[this.position]))
    );
  }
}

class game {
  get game_href() {
    return `/World/${this.world_id}/Game/${this.game_id}`;
  }

  get score_display() {
    var points = `${this.outcome.winning_team.points} - ${this.outcome.losing_team.points}`;
    return points;
  }
}

class conference_season{}

class conference {
  get conference_href() {
    return `/World/${this.world_id}/Conference/${this.conference_id}`;
  }

  get conference_logo() {
    var folder_prefix = "/static/img/conference_logos/";

    if (this.conference_id < 0) {
      var path = folder_prefix + "ncaa.png";
    } else {
      var path =
        folder_prefix +
        this.conference_name +
        ".png";
    }

    path = path
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("&", "_")
      .replaceAll("'", "")
      .replaceAll("-", "_");

    return path;
  }

  luma(color) {
    var R = color.slice(0, 2);
    var G = color.slice(2, 4);
    var B = color.slice(4, 6);

    const luma =
      (0.299 * parseInt(R, 16) ** 2 +
        0.587 * parseInt(G, 16) ** 2 +
        0.114 * parseInt(B, 16) ** 2) **
      0.5;
    return luma;
  }

  get secondary_color_display() {
    console.log({this: this, conference_color_secondary_hex: this.conference_color_secondary_hex})
    if (this.luma(this.conference_color_secondary_hex) < 230) {
      return this.conference_color_secondary_hex;
    }
    return "000000";
  }
}

const intersect = (a, b) => {
  var c = a.filter((a_val) => b.includes(a_val));
  return c;
};

const set_intersect = (a, b) => {
  return new Set([...a].filter((elem) => b.has(elem)));
};

const union = (a, b) => {
  var c = a.concat(b.filter((item) => a.indexOf(item) < 0));
  return c;
};

const set_union = (a, b) => {
  return new Set([...a, ...b]);
};

const except = (a, b) => {
  var c = a.filter((x) => !b.includes(x));
  return c;
};

const set_except = (a, b) => {
  return new Set([...a].filter((x) => !b.has(x)));
};

const team_header_links = async (params) => {
  const path = params.path;
  const season = params.season;
  const db = params.db;
  const team = params.team;

  const all_paths = [
    { href_extension: "", Display: "Overview" },
    { href_extension: "Roster", Display: "Roster" },
    { href_extension: "Gameplan", Display: "Gameplan" },
    { href_extension: "Schedule", Display: "Schedule" },
    { href_extension: "History", Display: "History" },
  ];

  const link_paths = all_paths.filter((link) => link.Display != path);

  for (let path_obj of all_paths){
    if (path_obj.Display == "History") {
      path_obj.href = team.team_href + '/' + path_obj.href_extension;
    } 
      else if (path_obj.Display == "Overview"){
        if (season){
          path_obj.href = team.team_href + `/Season/${season}/`;
        }
        else {
          path_obj.href = team.team_href;
        }
        }
      else {
      if (season){
        path_obj.href = team.team_href + '/' + path_obj.href_extension + `/Season/${season}/`;
      }
      else {
        path_obj.href = team.team_href + '/' + path_obj.href_extension;
      }
    }
  }

  let path_obj = all_paths.find((link) => link.Display == path);

  var seasons = await db.league_season.toArray();
  if (season != undefined) {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href:  team.team_href + '/' + path_obj.href_extension + `/Season/${ls.season}/`,
    }));
  } else {
    seasons = seasons.map((ls) => ({
      season: ls.season,
      season_href: `Season/${ls.season}/`,
    }));
  }
  console.log({season:season, seasons:seasons, path:path})


  var return_links = all_paths[0];
  for (let path_obj of all_paths){
    if (path_obj.Display == path) {
      return_links = {
        link_paths: link_paths,
        external_paths: path_obj,
        seasons: seasons,
      };
    }
  }
  console.log({return_links:return_links, all_paths:all_paths})

  return return_links;
};

const nav_bar_links = async (params) => {
  const path = params.path;
  const group_name = params.group_name;
  const db = params.db;

  const league_seasons = await db.league_season.toArray();
  const current_league_season = league_seasons.filter(
    (ls) => ls.is_current_season
  )[0];
  const season = current_league_season.season;
  const world_id = current_league_season.world_id;

  const phases = await db.phase.where({ season: season }).toArray();
  const phases_by_phase_id = index_group_sync(phases, "index", "phase_id");

  const weeks = await db.week.where({ season: season }).toArray();
  const current_week = weeks.filter((week) => week.is_current)[0];
  console.log({
    weeks: weeks,
    current_week: current_week,
    season: season,
    phases_by_phase_id: phases_by_phase_id,
  });
  current_week.phase = phases_by_phase_id[current_week.phase_id];
  current_week.league_season = current_league_season;

  const user_team = await db.team.get({
    team_id: current_league_season.user_team_id,
  });

  const team_id = user_team.team_id;
  const user_team_logo = user_team.team_logo;

  var can_sim = true,
    save_ls = true;

  var user_actions = [];

  var sim_action_week = {
    LinkDisplay: "Sim This Week",
    id: "SimThisWeek",
    Href: "#",
    ClassName: "sim-action",
  };
  var sim_action_phase = {
    LinkDisplay: "Sim This Phase",
    id: "SimThisPhase",
    Href: "#",
    ClassName: "sim-action",
  };

  if (current_week != null) {
    if (current_week.phase.phase_name == "Pre-Season") {
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
        sim_action_week.ClassName += " w3-disabled";
        sim_action_phase.ClassName += " w3-disabled";
      }

      if (save_ls) {
        db.league_season.put(current_league_season);
      }
    } else if (current_week.phase.phase_name == "Season Recap") {
      user_actions.push({
        LinkDisplay: "View Season Awards",
        Href: `/World/${world_id}/Awards`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Coach Carousel") {
      user_actions.push({
        LinkDisplay: "View Coach Carousel",
        Href: `/World/${world_id}/CoachCarousel`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Draft Departures") {
      user_actions.push({
        LinkDisplay: "View Player Departures",
        Href: `/World/${world_id}/PlayerDepartures`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "National Signing Day") {
      user_actions.push({
        LinkDisplay: "View Recruiting Board",
        Href: `/World/${world_id}/Recruiting`,
        ClassName: "",
      });
    } else if (current_week.phase.phase_name == "Prepare for Summer Camps") {
      user_actions.push({
        LinkDisplay: "Set Player Development",
        Href: `/World/${world_id}/PlayerDevelopment`,
        ClassName: "",
      });
    }

    sim_action_phase.LinkDisplay =
      "Sim to end of " + current_week.phase.phase_name;
    user_actions.unshift(sim_action_phase);

    if (current_week.user_recruiting_points_left_this_week > 0) {
      user_actions.push({
        LinkDisplay: `Weekly Recruiting ${current_week.user_recruiting_points_left_this_week}`,
        Href: `/World/${world_id}/Recruiting`,
        ClassName: "",
      });
    }

    if (!current_week.last_week_in_phase) {
      user_actions.unshift(sim_action_week);
    }

    const week_updates = current_week.week_updates;
    if (week_updates.length > 0) {
      user_actions.push({
        LinkDisplay: `Updates this week ${week_updates.length}`,
        id: "WeekUpdates",
        Href: "#",
        ClassName: "week-updates",
      });
    }

    const season_start_year = season;
  }

  can_sim = true; //TODO - Change back!!
  const sim_action_status = { CanSim: can_sim, LinkGroups: [] };
  const LinkGroups = [
    {
      GroupName: "Action",
      GroupDisplay: `${current_week.week_name}, ${season} TASKS`,
      GroupLinks: user_actions,
    },
    {
      GroupName: "World",
      GroupDisplay:
        '<img src="/static/img/team_logos/ncaa-text.png" class="" alt="">',
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

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const distance_from_home = (city_a, city_b, distance_tracking_map) => {
  var dist = distance_between_cities(city_a, city_b, distance_tracking_map);

  var distance_from_home_val = 1;

  if (dist < 50) {
    distance_from_home_val = 20;
  } else if (dist < 150) {
    distance_from_home_val = 15;
  } else if (dist < 400) {
    distance_from_home_val = 10;
  } else if (dist < 800) {
    distance_from_home_val = 6;
  } else if (dist < 2000) {
    distance_from_home_val = 3;
  }

  return distance_from_home_val;
};

const distance_between_cities = (city_a, city_b, distance_tracking_map) => {
  let city_a_str = `${Math.round(city_a.lat, 1)},${Math.round(city_a.long, 1)}`;
  let city_b_str = `${Math.round(city_b.lat, 1)},${Math.round(city_b.long, 1)}`;
  let city_arr = [city_a_str, city_b_str] ? city_a_str < city_b_str : [city_b_str, city_a_str];

  // Serialize the locations and short-circuit if we've already calculated the disance.
  if (distance_tracking_map[city_arr[0]] && distance_tracking_map[city_arr[0]][city_arr[1]]){
    return distance_tracking_map[city_arr[0]][city_arr[1]];
  }

  var earth_radius = 6371; // Radius of the earth in km
  var dLat = deg2rad(city_a.lat - city_b.lat); // deg2rad below
  var dLon = deg2rad(city_a.long - city_b.long);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(city_a.lat)) *
      Math.cos(deg2rad(city_b.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = earth_radius * c; // Distance in km
  d = d / 1.609344;

  if (!distance_tracking_map[city_arr[0]]){
    distance_tracking_map[city_arr[0]] = {}
  }
  distance_tracking_map[city_arr[0]][city_arr[1]] = d;
  return d;
};

const distance_between_coordinates = (coord_a, coord_b) => {
  var earth_radius = 6371; // Radius of the earth in km
  var dLat = deg2rad(coord_a[0] - coord_b[0]); // deg2rad below
  var dLon = deg2rad(coord_a[1] - coord_b[1]);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord_a[0])) *
      Math.cos(deg2rad(coord_b[0])) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = earth_radius * c; // Distance in km
  d = d / 1.609344;
  return d;
};

const pathToRegex = (path) =>
  new RegExp("^" + path.replace(/\//g, "\\/").replace(/:\w+/g, "(.+)") + "$");

const getParams = (match) => {
  const values = match.result.slice(1);
  const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(
    (result) => result[1]
  );

  return Object.fromEntries(
    keys.map((key, i) => {
      return [key, values[i]];
    })
  );
};

const initialize_new_season = async (this_week, common) => {
  const db = common.db;
  const current_season = this_week.season;
  var current_league_season = await db.league_season
    .get({ season: current_season });

  const new_season = current_season + 1;

  stopwatch(common, 'Init New Season - Starting');

  await db.team_season.where({ season: new_season }).delete();
  await db.league_season.where({ season: new_season }).delete();
  await db.conference_season.where({ season: new_season }).delete();
  await db.player_team_season.where({ season: new_season }).delete();
  common.season = new_season;
  const world_id = common.world_id;

  const teams = await db.team.where("team_id").above(0).toArray();

  const num_teams = teams.length;

  const new_season_data = {
    season: new_season,
    world_id: world_id,
    captains_per_team: 3,
    players_per_team: 75,
    num_teams: num_teams,
    league_style: "traditional", // traditional, regional
  };
  const new_season_obj = new league_season(
    new_season_data,
    current_league_season
  );

  await db.league_season.delete(new_season);
  await db.phase.where({season: new_season}).delete();
  await db.week.where({season: new_season}).delete();
  await db.team_season.where({season: new_season}).delete();
  await db.player_team_season.where({season: new_season}).delete();

  stopwatch(common, 'Init New Season - Deleted existing data');

  console.log({ new_season_obj: new_season_obj });
  await db.league_season.add(new_season_obj);
  // current_league_season.is_current_season = false;
  // await db.league_season.put(current_league_season);

  const phases_created = await create_phase(new_season, common);
  await create_week(phases_created, common, new_season);

  stopwatch(common, 'Init New Season - Created phases & weeks');

  var conferences = await db.conference.toArray();
  await common.create_conference_seasons({
    common: common,
    conferences: conferences,
    season: new_season,
    world_id: world_id,
  });
  var conference_seasons = index_group_sync(
    await db.conference_season.where({ season: new_season }).toArray(),
    "index",
    "conference_id"
  );

  conferences = nest_children(
    conferences,
    conference_seasons,
    "conference_id",
    "conference_season"
  );
  var conference_by_conference_name = index_group_sync(
    conferences,
    "index",
    "conference_name"
  );

  await create_team_season({
    common: common,
    season: new_season,
    world_id: world_id,
    conferences_by_conference_name: conference_by_conference_name,
  });

  stopwatch(common, 'Init New Season - Created conferences');

  const all_weeks = await db.week.where({ season: new_season }).toArray();
  const next_week = all_weeks[0];

  next_week.phase = await db.phase.get({ phase_id: this_week.phase_id });
  next_week.phase.season = new_season;

  console.log("this_week", next_week, all_weeks, common);

  var team_seasons = await db.team_season
    .where({ season: new_season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  const teams_by_team_id = await index_group(
    await db.team.where("team_id").above(0).toArray(),
    "index",
    "team_id"
  );

  stopwatch(common, 'Init New Season - Fetched TSs');

  var players = await db.player.toArray(); //TODO - I'll regret this once players graduate & start fresh
  let previous_team_seasons = await db.team_season
    .where({ season: current_season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  previous_team_seasons = nest_children(previous_team_seasons, teams_by_team_id, 'team_id', 'team');
  let previous_team_seasons_by_team_season_id = index_group_sync(
    previous_team_seasons,
    "index",
    "team_season_id"
  );

  let previous_player_team_seasons = await db.player_team_season
    .where({ season: current_season })
    .toArray();
  let previous_player_team_season_ids = previous_player_team_seasons.map(pts => pts.player_team_season_id);
  const previous_player_team_season_stats = await db.player_team_season_stats
  .where('player_team_season_id').anyOf(previous_player_team_season_ids)
  .toArray();

  let previous_player_team_season_stats_by_player_team_season_id = index_group_sync(previous_player_team_season_stats, 'index', 'player_team_season_id')
  previous_player_team_seasons = nest_children(previous_player_team_seasons, previous_player_team_season_stats_by_player_team_season_id, 'player_team_season_id', 'season_stats')
  previous_player_team_seasons = nest_children(previous_player_team_seasons, previous_team_seasons_by_team_season_id, 'team_season_id', 'team_season')
  
  const previous_player_team_seasons_by_player_id = index_group_sync(
    previous_player_team_seasons,
    "index",
    "player_id"
  );
  players = nest_children(
    players,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  players = players.filter(
    (p) =>
      p.previous_player_team_season != undefined &&
      p.previous_player_team_season.team_season_id > 0
  );

  stopwatch(common, 'Init New Season - Fetched Players');

  await create_new_player_team_seasons({
    common: common,
    players: players,
    previous_team_seasons: previous_team_seasons,
    team_seasons: team_seasons,
    world_id: world_id,
    season: new_season,
  });

  stopwatch(common, 'Init New Season - Created PTSs');

  var players = await db.player.toArray(); //TODO - I'll regret this once players graduate & start fresh
  let high_school_player_team_seasons = await db.player_team_season.where({season:current_season})
                        .and((ts) => ts.team_season_id == current_season * -1)
                        .toArray();
  const high_school_player_team_seasons_by_player_id = index_group_sync(
    high_school_player_team_seasons,
    "index",
    "player_id"
  );
  players = nest_children(
    players,
    high_school_player_team_seasons_by_player_id,
    "player_id",
    "high_school_player_team_season"
  );
  players = players.filter(
    (p) =>
      p.high_school_player_team_season != undefined
  );

  console.log({
    players:players,
    high_school_player_team_seasons_by_player_id:high_school_player_team_seasons_by_player_id,
    high_school_player_team_seasons:high_school_player_team_seasons,
  })
  debugger;

  await create_new_player_team_seasons_for_high_schoolers({
    common: common,
    players: players,
    team_seasons: team_seasons,
    world_id: world_id,
    season: new_season,
  });

  stopwatch(common, 'Init New Season - Created HS PTSs');
  
  let coaches = await db.coach.toArray(); //TODO - I'll regret this once players graduate & start fresh

  let previous_coach_team_seasons = await db.coach_team_season
    .where({ season: current_season })
    .toArray();
  let previous_coach_team_season_ids = previous_coach_team_seasons.map(cts => cts.coach_team_season_id);

  previous_coach_team_seasons = nest_children(previous_coach_team_seasons, previous_team_seasons_by_team_season_id, 'team_season_id', 'team_season')
  
  const previous_coach_team_seasons_by_player_id = index_group_sync(
    previous_coach_team_seasons,
    "index",
    "coach_id"
  );
  coaches = nest_children(
    coaches,
    previous_coach_team_seasons_by_player_id,
    "coach_id",
    "previous_coach_team_season"
  );
  coaches = coaches.filter(
    (c) =>
      c.previous_coach_team_season != undefined &&
      c.previous_coach_team_season.team_season_id > 0
  );

  await create_new_coach_team_seasons({
    common: common,
    coaches: coaches,
    previous_team_seasons: previous_team_seasons,
    team_seasons: team_seasons,
    world_id: world_id,
    season: new_season,
  });

  stopwatch(common, 'Init New Season - Created coaches');
  
  await populate_all_depth_charts(common);

  stopwatch(common, 'Init New Season - Created Depth Charts');

  await calculate_team_overalls(common);
  await calculate_national_rankings(next_week, all_weeks, common);
  await calculate_conference_rankings(next_week, all_weeks, common);
  await calculate_primetime_games(next_week, all_weeks, common);
  await calculate_team_needs(common);
  await choose_preseason_all_americans(common);

  stopwatch(common, 'Init New Season - Created other info');


  await create_schedule({
    common: common,
    season: new_season,
    world_id: world_id,
  });

  stopwatch(common, 'Init New Season - Created Schedule - DONE');
};

const create_team_season = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = common.season;

  let league_season = await db.league_season.where({season:season}).first();

  var teams = await db.team.toArray();
  var team_seasons_tocreate = [];
  var team_season_stats_tocreate = [];

  let previous_team_seasons = await db.team_season.where({season: season-1}).toArray();
  let previous_team_seasons_by_team_id = index_group_sync(previous_team_seasons, 'index', 'team_id');

  var last_team_season = await db.team_season
    .orderBy("team_season_id")
    .desc()
    .first();

  var last_team_season_id = 1;
  if (!(last_team_season === undefined)) {
    last_team_season_id = last_team_season.team_season_id + 1;
  }

  var team_count = 0;
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
        is_user_team: false
      });

      team_seasons_tocreate.push(new_team_season);
    } else {
      let division_name = data.conferences_by_conference_name[team.conference.conference_name]
      .conference_season.divisions.find(d => d.teams.includes(team.school_name)).division_name;

      let previous_team_season = previous_team_seasons_by_team_id[team.team_id] || {};

      let gameplan = team.starting_tendencies || 
                      previous_team_season.gameplan ||
                      {
                          offense: {
                            playbook: 'Spread',
                            pass_tendency: 51,
                            playcall_aggressiveness: 4,
                            playclock_urgency: 4
                          },
                          defense: {
                            playbook: '4-3',
                            blitz_tendency: 5,
                            man_coverage_tendency: 5,
                          }
                        }
                     

      var new_team_season = new team_season({
        team_season_id: team_season_id,
        team_id: team.team_id,
        world_id: data.world_id,
        season: data.season,
        conference_name: team.conference_name,
        conference_season_id:
          data.conferences_by_conference_name[team.conference.conference_name]
            .conference_season.conference_season_id,
        division_name: division_name,
        is_user_team: team.is_user_team || false,
        gameplan: gameplan
      });

      var new_team_season_stats = new team_season_stats(team_season_id);
      last_team_season_id += 1;

      team_seasons_tocreate.push(new_team_season);
      team_season_stats_tocreate.push(new_team_season_stats);
    }

    team_count += 1;
  });

  console.log({
    team_seasons_tocreate: team_seasons_tocreate,
    team_season_stats_tocreate: team_season_stats_tocreate,
  });

  await db.team_season.bulkPut(team_seasons_tocreate);
  await db.team_season_stats.bulkPut(team_season_stats_tocreate);

};

const populate_all_depth_charts = async (common, team_season_ids) => {
  const db = common.db;
  const season = common.season;

  let adjacent_positions = {
    QB: ['RB', 'S', 'WR', 'LB'],
    RB: ['FB', 'WR', 'LB'],
    FB: ['TE', 'RB'],
    WR: ['TE', 'RB', 'CB'],
    TE: ['WR', 'FB', 'OT'],
    OT: ['IOL', 'TE', 'DL', 'EDGE'],
    IOL: ['OT', 'DL', 'EDGE'],
    DL: ['EDGE', 'LB', 'IOL'],
    EDGE: ['DL', 'LB'],
    LB: ['EDGE', 'S'],
    CB: ['S', 'LB', 'WR'],
    S: ['CB', 'LB', 'RB', 'TE'],
    K: ['P', 'IOL', 'CB', 'S', 'DL', 'EDGE'],
    P: ['K', 'IOL', 'CB', 'S', 'DL', 'EDGE']
  }

  let position_minimum_count = {
    QB: 4,
    RB: 5,
    FB: 2,
    WR: 7,
    TE: 5,
    OT: 5,
    IOL: 6,
    DL: 6,
    EDGE: 6,
    LB: 6,
    CB: 6,
    S: 6,
    K: 2,
    P: 2
  }

  console.log({team_season_ids})
  if (team_season_ids) {
    team_season_ids = new Set(team_season_ids);
    var team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => team_season_ids.has(ts.team_season_id))
      .toArray();
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = await index_group(
      team_seasons,
      "index",
      "team_season_id"
    );
    var player_team_seasons = await db.player_team_season
      .where({ season: season })
      .and((pts) => team_season_ids.has(pts.team_season_id))
      .toArray();
    var player_team_seasons_by_team_season_id = await index_group(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  } else {
    var team_seasons = await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray();
    console.log({ season: season, db: db, team_seasons: team_seasons });

    var team_seasons_to_update = [];
    var team_seasons_by_team_season_id = await index_group(
      team_seasons,
      "index",
      "team_season_id"
    );
    var player_team_seasons = await db.player_team_season
      .where({ season: season })
      .and((pts) => pts.team_season_id > 0)
      .toArray();
    var player_team_seasons_by_team_season_id = await index_group(
      player_team_seasons,
      "group",
      "team_season_id"
    );
  }

  console.log({ season: season, db: db, player_team_seasons:player_team_seasons,team_seasons:team_seasons  });

  //TODO fix this shit
  var signed_recruit_team_seasons = []; //await db.recruit_team_season.filter(rts => rts.signed).toArray();
  var signed_recruits_player_team_season_ids = signed_recruit_team_seasons.map(
    (rts) => rts.player_team_season_id
  );
  var signed_recruits_player_team_seasons = await db.player_team_season.bulkGet(
    signed_recruits_player_team_season_ids
  );

  var signed_recruit_team_seasons_by_player_team_season_id = index_group_sync(
    signed_recruit_team_seasons,
    "index",
    "player_team_season_id"
  );

  signed_recruits_player_team_seasons = nest_children(
    signed_recruits_player_team_seasons,
    signed_recruit_team_seasons_by_player_team_season_id,
    "player_team_season_id",
    "recruit_team_season"
  );

  signed_recruits_player_team_seasons = signed_recruits_player_team_seasons.map(
    (pts) =>
      Object.assign(pts, {
        team_season_id: pts.recruit_team_season.team_season_id,
      })
  );

  var player_team_seasons_with_recruits = player_team_seasons.concat(
    signed_recruits_player_team_seasons
  );
  var player_team_seasons_with_recruits_by_team_season_id = await index_group(
    player_team_seasons_with_recruits,
    "group",
    "team_season_id"
  );

  var team_season = null;
  let player_team_seasons_to_update = [];

  for (var team_season_id in player_team_seasons_by_team_season_id) {
    var player_team_season_list =
      player_team_seasons_by_team_season_id[team_season_id];
    team_season = team_seasons_by_team_season_id[team_season_id];

    var player_team_season_list_with_recruits =
      player_team_seasons_with_recruits_by_team_season_id[team_season_id];

    player_team_season_list = player_team_season_list.sort(
      (pts_a, pts_b) =>
        pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );

    player_team_season_list_with_recruits =
      player_team_season_list_with_recruits.sort(
        (pts_a, pts_b) =>
          pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
      );

    team_season.depth_chart = {};
    team_season.depth_chart_with_recruits = {};

    var position_player_team_season_obj = index_group_sync(
      player_team_season_list,
      "group",
      "position"
    );
    Object.keys(position_minimum_count).forEach(function(pos){
      if(!(pos in position_player_team_season_obj)){
        position_player_team_season_obj[pos] = [];
      }
    })
    var position_player_team_season_with_recruits_obj = index_group_sync(
      player_team_season_list_with_recruits,
      "group",
      "position"
    );

    //TODO what if this is empty
    for (var position in position_player_team_season_obj) {
      var position_player_team_season_list =
        position_player_team_season_obj[position];

      if (position_player_team_season_list.length < position_minimum_count[position]){
        // console.log({
        //   'position_player_team_season_list': position_player_team_season_list,
        //   position:position, 
        //   'adjacent_positions[position]': adjacent_positions[position],
        // })
        adjacent_positions[position].forEach(function(pos){
          // console.log('Pos low for team',{
          //   position:position,
          //   replacement_pos:pos,
          //   team_season_id:team_season_id,
          //   position_player_team_season_list:position_player_team_season_list,
          //   'position_minimum_count[pos] + position_minimum_count[position] - position_player_team_season_list.length + 1': position_minimum_count[pos] + position_minimum_count[position] - position_player_team_season_list.length + 1,
          //   'position_minimum_count[pos]': position_minimum_count[pos],
          //   'position_player_team_season_obj[pos]': position_player_team_season_obj[pos],
          //   'position_player_team_season_obj[pos].slice(position_minimum_count[pos], 10)': position_player_team_season_obj[pos].slice(position_minimum_count[pos], 10)
          // })
          position_player_team_season_list = position_player_team_season_list.concat(position_player_team_season_obj[pos].slice(position_minimum_count[pos], position_minimum_count[pos] + position_minimum_count[position] - position_player_team_season_list.length + 1));
        })
      }

      position_player_team_season_list.forEach((pts, ind) => pts.depth_chart_rank = ind+1);
      player_team_seasons_to_update = player_team_seasons_to_update.concat(position_player_team_season_list)
      team_season.depth_chart[position] = position_player_team_season_list.map(
        (pts) => pts.player_team_season_id
      );
    }

    for (var position in position_player_team_season_with_recruits_obj) {
      var position_player_team_season_list =
        position_player_team_season_with_recruits_obj[position];
      team_season.depth_chart_with_recruits[position] =
        position_player_team_season_list.map(
          (pts) => pts.player_team_season_id
        );
    }

    team_seasons_to_update.push(team_season);
  }

  await db.team_season.bulkPut(team_seasons_to_update);
  console.log('Updating player_team_seasons in create_team_seasons', player_team_seasons_to_update)
  await db.player_team_season.bulkPut(player_team_seasons_to_update);
};

const create_conference_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  var last_conference_season = await db.conference_season.orderBy("conference_season_id").last();
  let conference_season_id = last_conference_season ? last_conference_season.conference_season_id : 0;

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

  const conference_seasons_added = await db.conference_season.bulkAdd(
    conference_seasons_to_create
  );
};

const zip = (a, b) => {
  var zipped = a.map((elem, ind) => [elem, b[ind]]);
  return zipped.filter((zip_set) => zip_set[0] && zip_set[1]);
};

const create_schedule = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = data.season;
  const world_id = data.world_id;

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var games_to_create = [],
    team_games_to_create = [],
    team_games_to_create_ids = [];
  var team_season_schedule_tracker = {};
  const games_per_team = 12;

  team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  const team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  const team_rivalries_by_team_season_id = index_group_sync(
    team_seasons.map(function (ts) {
      return {
        team_season_id: ts.team_season_id,
        rivals: teams_by_team_id[ts.team_id].rivals,
      };
    }),
    "index",
    "team_season_id"
  );
  const conferences_by_conference_id = index_group_sync(
    await db.conference.toArray(),
    "index",
    "conference_id"
  );
  const conference_seasons_by_conference_season_id = index_group_sync(
    await db.conference_season.where({ season: season }).toArray(),
    "index",
    "conference_season_id"
  );

  const phases = await index_group(
    await db.phase.where({ season: season }).toArray(),
    "index",
    "phase_id"
  );
  var weeks = await db.week.where({ season: season }).toArray();
  $.each(weeks, function (ind, week) {
    week.phase = phases[week.phase_id];
  });
  weeks = weeks.filter((week) => week.phase.phase_name == "Regular Season");
  all_week_ids = new Set(weeks.map((w) => w.week_id));
  all_weeks_by_week_id = index_group_sync(weeks, "index", "week_id");

  const weeks_by_week_name = index_group_sync(weeks, "index", "week_name");

  let num_teams = team_seasons.length;
  let team_quadrant_cutoffs = [1, 2, 3, 4].map((num) => ({
    quadrant: num,
    max_national_rank: Math.floor((num * num_teams) / 4.0),
  }));

  for (let team_season of team_seasons) {
    team_season_rivals =
      team_rivalries_by_team_season_id[team_season.team_season_id].rivals;
    for (let rival_obj of team_season_rivals) {
      rival_obj.preferred_week_id = undefined;
      if (rival_obj.preferred_week_number != null) {
        rival_obj.preferred_week_id =
          weeks_by_week_name["Week " + rival_obj.preferred_week_number].week_id;
      }

      console.log("rivals", {
        rival_obj: rival_obj,
        "rival_obj.preferred_week_id": rival_obj.preferred_week_id,
        "rival_obj.preferred_week_number": rival_obj.preferred_week_number,
        weeks_by_week_name: weeks_by_week_name,
      });

      rival_obj.opponent_team_season_id =
        team_seasons_by_team_id[
          rival_obj.opponent_team_id.toString()
        ].team_season_id;
    }
    team_conference =
      conferences_by_conference_id[
        conference_seasons_by_conference_season_id[
          team_season.conference_season_id
        ].conference_id
      ];

    team_season_schedule_tracker[team_season.team_season_id] = {
      conference: {
        games_to_schedule:
          team_conference.schedule_format.number_conference_games,
        games_scheduled: 0,
        home_games: 0,
        away_games: 0,
        net_home_games: 0,
      },
      non_conference: {
        games_to_schedule:
          games_per_team -
          team_conference.schedule_format.number_conference_games,
        games_scheduled: 0,
        home_games: 0,
        away_games: 0,
        net_home_games: 0,
      },
      weeks_scheduled: new Set(),
      available_week_ids: new Set(all_week_ids),
      opponents_scheduled: new Set(),
      conference_season_id: team_season.conference_season_id,
      division_name: team_season.division_name,
      rivals: team_season_rivals,
      team: teams_by_team_id[team_season.team_id],
      team_quadrant: team_quadrant_cutoffs.find(
        (quadrant) => team_season.national_rank <= quadrant.max_national_rank
      ).quadrant,
    };

    let games_per_quadrant = Math.ceil(
      team_season_schedule_tracker[team_season.team_season_id].non_conference
        .games_to_schedule / 4.0
    );

    team_season_schedule_tracker[
      team_season.team_season_id
    ].non_conference.schedule_team_quadrants = {
      1: games_per_quadrant,
      2: games_per_quadrant,
      3: games_per_quadrant,
      4: games_per_quadrant,
    };

    console.log({
      team_season: team_season,
      team_season_schedule_tracker: team_season_schedule_tracker,
      team_quadrant_cutoffs: team_quadrant_cutoffs,
    });
  }

  var scheduling_teams = true;
  var team_season_id_list = [],
    taken_weeks = [],
    available_weeks = [];
  var team_set_a = [],
    team_set_b = [],
    zipped_set = [],
    teams_to_schedule = [],
    games_to_create_ids = [];

  var week_counter = 0,
    week_id = 0,
    chosen_week = 0,
    game_type = "",
    game_scheduled = true;
  var last_game = await db.game.orderBy("game_id").last();
  var last_team_game = await db.team_game.orderBy("team_game_id").last();

  var next_game_id = 1;
  if (!(last_game === undefined)) {
    next_game_id = last_game.game_id + 1;
  }
  var next_team_game_id = 1;
  if (!(last_team_game === undefined)) {
    next_team_game_id = last_team_game.team_game_id + 1;
  }

  team_seasons = index_group_sync(
    await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray(),
    "index",
    "team_id"
  );
  team_seasons_by_conference_season_id = index_group_sync(
    await db.team_season
      .where({ season: season })
      .and((ts) => ts.team_id > 0)
      .toArray(),
    "group",
    "conference_season_id"
  );

  var scheduling_dict = {
    team_season_schedule_tracker: team_season_schedule_tracker,
    all_week_ids: all_week_ids,
    all_weeks_by_week_id: all_weeks_by_week_id,
    world_id: world_id,
    season: season,
    next_team_game_id: next_team_game_id,
    next_game_id: next_game_id,
    team_games_to_create_ids: team_games_to_create_ids,
    team_games_to_create: team_games_to_create,
    games_to_create_ids: games_to_create_ids,
    games_to_create: games_to_create,
  };

  var attempt_counter = 0;
  //Schedule rival games
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);

    zipped_set = [];
    $.each(team_season_id_list, function (ind, team_season_id) {
      rival_list = team_season_schedule_tracker[team_season_id].rivals;
      $.each(rival_list, function (ind, rival_obj) {
        zipped_set.push([
          team_season_id,
          team_seasons_by_team_id[
            rival_obj.opponent_team_id.toString()
          ].team_season_id.toString(),
          rival_obj,
        ]);
      });
    });

    console.log("zipped_set", zipped_set);
    zipped_set = zipped_set.sort(function (set_a, set_b) {
      if (set_a[2].preferred_week_id != undefined) {
        return -1;
      } else if (set_b[2].preferred_week_id != undefined) {
        return 1;
      }
      return 1;
    });

    $.each(zipped_set, function (ind, team_set) {
      //check if confernece, pass to next
      [team_a, team_b, rival_obj] = team_set;
      game_type = "non_conference";
      if (
        team_season_schedule_tracker[team_a].conference_season_id ==
        team_season_schedule_tracker[team_b].conference_season_id
      ) {
        game_type = "conference";
      }
      game_scheduled = common.schedule_game(
        common,
        scheduling_dict,
        team_set,
        game_type,
        rival_obj
      );
    });

    scheduling_teams = false;
  }

  attempt_counter = 0;
  scheduling_teams = true;
  //Schedule conference games
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);
    team_season_id_list = new Set(
      team_season_id_list.filter(
        (team_id) =>
          team_season_schedule_tracker[team_id].conference.games_to_schedule > 0
      )
    );

    $.each(
      team_seasons_by_conference_season_id,
      function (conference_season_id, team_seasons) {
        conference_team_season_id_list = team_seasons.map((ts) =>
          ts.team_season_id.toString()
        );
        conference_team_season_id_list = conference_team_season_id_list.filter(
          (ts) => team_season_id_list.has(ts)
        );
        conference_team_season_id_list = common.shuffle(
          conference_team_season_id_list
        );

        for (var team_id of conference_team_season_id_list) {
          team_season_schedule_tracker[team_id].first_available_week_id =
            Math.min(
              ...team_season_schedule_tracker[team_id].available_week_ids
            );
        }

        if (attempt_counter % 5 == 4) {
          //Just random shuffle
          conference_team_season_id_list = common.shuffle(
            conference_team_season_id_list
          );
        } else if (attempt_counter % 5 < 4) {
          //Sort by number of conference games needed
          conference_team_season_id_list = conference_team_season_id_list.sort(
            (team_a, team_b) =>
              team_season_schedule_tracker[team_a].conference
                .games_to_schedule -
                team_season_schedule_tracker[team_b].conference
                  .games_to_schedule ||
              team_season_schedule_tracker[team_a].first_available_week_id -
                team_season_schedule_tracker[team_b].first_available_week_id ||
              Math.random() > 0.5
          );
        }

        const half = Math.floor(conference_team_season_id_list.length / 2);
        team_set_a = conference_team_season_id_list.splice(0, half);
        team_set_b = conference_team_season_id_list.splice(-half);
        team_set_b = team_set_b.reverse();
        // if (attempt_counter % 2 == 0){
        // 	team_set_b = team_set_b.reverse();
        // }

        zipped_set = zip(team_set_a, team_set_b);
        //console.log('zipped_set', zipped_set)
        $.each(zipped_set, function (ind, team_set) {
          common.schedule_game(
            common,
            scheduling_dict,
            team_set,
            "conference",
            null
          );
        });
      }
    );

    team_season_id_list = [...team_season_id_list].filter(
      (team_id) =>
        team_season_schedule_tracker[team_id].conference.games_to_schedule > 0
    );

    scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 200;

    attempt_counter += 1;
    team_set_a = [];
    team_set_b = [];
  }

  $.each(team_season_schedule_tracker, function (team_id, team_obj) {
    if (team_obj.conference.games_to_schedule > 0) {
      console.log("Left over games", {
        "team_obj.conference.games_to_schedule":
          team_obj.conference.games_to_schedule,
        team_obj: team_obj,
      });
    }
    team_obj.non_conference.games_to_schedule +=
      team_obj.conference.games_to_schedule;
  });

  let quadrant_pairings = [
    [
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ],
    [
      [1, 3],
      [2, 4],
    ],
    [
      [1, 4],
      [2, 3],
    ],
    [
      [1, 2],
      [3, 4],
    ],
  ];
  let team_season_ids_by_quadrant = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  Object.entries(team_season_schedule_tracker).forEach(function ([
    team_season_id,
    tracker_obj,
  ]) {
    team_season_ids_by_quadrant[tracker_obj.team_quadrant].push(team_season_id);
    console.log({
      tracker_obj: tracker_obj,
      team_season_id: team_season_id,
      team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    });
  });

  console.log({
    team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    team_season_ids_by_quadrant: team_season_ids_by_quadrant,
    team_season_schedule_tracker: team_season_schedule_tracker,
  });

  //scheduling quadrants
  for (let quadrant_pairing of quadrant_pairings) {
    // team_season_id_list = Object.keys(team_season_schedule_tracker);
    // team_season_id_list = team_season_id_list.filter(
    //   (team_id) =>
    //     team_season_schedule_tracker[team_id].non_conference.games_to_schedule >
    //     0
    // );
    // var max_games_to_schedule =
    //   Math.max(
    //     ...team_season_id_list.map(
    //       (team_id) =>
    //         team_season_schedule_tracker[team_id].non_conference
    //           .games_to_schedule
    //     )
    //   ) - Math.floor(attempt_counter / 5);

    // max_games_to_schedule = Math.max(0, max_games_to_schedule);

    console.log({
      quadrant_pairing: quadrant_pairing,
      max_games_to_schedule: max_games_to_schedule,
      team_season_id_list: team_season_id_list,
    });

    for (let pair of quadrant_pairing) {
      for (let iter_ind = 0; iter_ind <= 10; iter_ind++) {
        let quadrant_a = pair[0];
        let quadrant_b = pair[1];
        console.log({
          pair: pair,
          quadrant_a: quadrant_a,
          quadrant_b: quadrant_b,
        });

        if (quadrant_a != quadrant_b) {
          var quadrant_a_teams = team_season_ids_by_quadrant[quadrant_a];
          var quadrant_b_teams = team_season_ids_by_quadrant[quadrant_b];

          quadrant_a_teams = quadrant_a_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference
                .schedule_team_quadrants[quadrant_b] > 0 && (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) || iter_ind > 3)
          );
          quadrant_b_teams = quadrant_b_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference
                .schedule_team_quadrants[quadrant_a] > 0 && (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) || iter_ind > 3)
          );

          quadrant_a_teams = common.shuffle(quadrant_a_teams);
          quadrant_b_teams = common.shuffle(quadrant_b_teams);
          console.log({
            quadrant_a_teams: quadrant_a_teams,
            quadrant_b_teams: quadrant_b_teams,
          });
        } else {
          let quadrant_all_teams = team_season_ids_by_quadrant[quadrant_a];
          quadrant_all_teams = common.shuffle(quadrant_all_teams);
          quadrant_all_teams = quadrant_all_teams.filter(
            (ts_id) =>
              team_season_schedule_tracker[ts_id].non_conference
                .schedule_team_quadrants[quadrant_a] > 0 //&& (team_season_schedule_tracker[ts_id].available_week_ids.has(all_week_ids[iter_ind]) || iter_ind > 3)
          );

          console.log({ quadrant_all_teams: quadrant_all_teams });
          var middle_index = Math.floor(quadrant_all_teams.length / 2);
          var quadrant_a_teams = quadrant_all_teams.slice(0, middle_index);
          var quadrant_b_teams = quadrant_all_teams.slice(middle_index);
        }

        console.log({
          quadrant_a_teams: quadrant_a_teams,
          quadrant_b_teams: quadrant_b_teams,
        });

        zipped_set = zip(quadrant_a_teams, quadrant_b_teams);
        console.log("zipped_set", zipped_set);
        debugger;

        $.each(zipped_set, function (ind, team_set) {
          common.schedule_game(
            common,
            scheduling_dict,
            team_set,
            "non_conference",
            null
          );
        });
      }
    }
  }

  scheduling_teams = true;
  attempt_counter = 1;
  //Scheduling non_conference
  while (scheduling_teams) {
    team_season_id_list = Object.keys(team_season_schedule_tracker);
    team_season_id_list = team_season_id_list.filter(
      (team_id) =>
        team_season_schedule_tracker[team_id].non_conference.games_to_schedule >
        0
    );
    var max_games_to_schedule =
      Math.max(
        ...team_season_id_list.map(
          (team_id) =>
            team_season_schedule_tracker[team_id].non_conference
              .games_to_schedule
        )
      ) - Math.floor(attempt_counter / 5);

    max_games_to_schedule = Math.max(0, max_games_to_schedule);

    for (var team_id of team_season_id_list) {
      team_season_schedule_tracker[team_id].first_available_week_id = Math.min(
        ...team_season_schedule_tracker[team_id].available_week_ids
      );
    }

    //One out of ten times, or any attempt past #50, just go wild & full random
    if (attempt_counter % 10 == 9 || attempt_counter > 50) {
      team_season_id_list = common.shuffle(team_season_id_list);
      $.each(team_season_id_list, function (ind, obj) {
        if (ind % 2 == 0) {
          team_set_a.push(obj);
        } else {
          team_set_b.push(obj);
        }
      });
    } else if (attempt_counter % 10 >= 7) {
      // 3 out of 10 times, sort by # of opps needed, but flip second half. Sort of a non-perfect match scenario
      team_season_id_list = team_season_id_list.sort(function (
        team_id_a,
        team_id_b
      ) {
        return (
          team_season_schedule_tracker[team_id_a].opponents_scheduled.size -
            team_season_schedule_tracker[team_id_b].opponents_scheduled.size ||
          Math.random() - 0.5
        );
      });

      var middle_index = Math.floor(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);
      team_set_b = team_set_b.reverse();
    } else if (attempt_counter % 10 >= 5) {
      // 2 out of 10 times, sort by max week scheduled?
      team_season_id_list = team_season_id_list.sort(function (
        team_id_a,
        team_id_b
      ) {
        return (
          Math.max(...team_season_schedule_tracker[team_id_a].weeks_scheduled) -
            Math.max(
              ...team_season_schedule_tracker[team_id_b].weeks_scheduled
            ) || Math.random() - 0.5
        );
      });

      var middle_index = Math.floor(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);
      team_set_b = team_set_b.reverse();
    } else {
      for (var team_id of team_season_id_list) {
        team_season_schedule_tracker[
          team_id
        ].opponent_avg_team_competitiveness =
          sum(
            [...team_season_schedule_tracker[team_id].opponents_scheduled].map(
              (team_id) =>
                team_season_schedule_tracker[team_id].team.team_ratings
                  .team_competitiveness
            )
          ) / team_season_schedule_tracker[team_id].opponents_scheduled.size;
      }

      team_season_id_list = team_season_id_list.sort(function (
        team_id_a,
        team_id_b
      ) {
        return (
          team_season_schedule_tracker[team_id_a]
            .opponent_avg_team_competitiveness -
            team_season_schedule_tracker[team_id_b]
              .opponent_avg_team_competitiveness || Math.random() - 0.5
        );
      });

      var middle_index = Math.ceil(team_season_id_list.length / 2);
      team_set_a = team_season_id_list.slice(0, middle_index);
      team_set_b = team_season_id_list.slice(middle_index);

      if (attempt_counter % 2 == 0) {
        team_set_b = team_set_b.reverse();
      }
    }

    console.log({ team_set_a: team_set_a, team_set_b: team_set_b });

    zipped_set = zip(team_set_a, team_set_b);
    console.log("zipped_set", zipped_set);
    $.each(zipped_set, function (ind, team_set) {
      if (
        team_season_schedule_tracker[team_set[0]].non_conference
          .games_to_schedule < max_games_to_schedule &&
        team_season_schedule_tracker[team_set[1]].non_conference
          .games_to_schedule < max_games_to_schedule
      ) {
        console.log("throwing out game", {
          team_set: team_set,
          "team_season_schedule_tracker[team_set[0]].non_conference.games_to_schedule":
            team_season_schedule_tracker[team_set[0]].non_conference
              .games_to_schedule,
          "team_season_schedule_tracker[team_set[1]].non_conference.games_to_schedule":
            team_season_schedule_tracker[team_set[1]].non_conference
              .games_to_schedule,
          max_games_to_schedule: max_games_to_schedule,
        });
        return true;
      }
      common.schedule_game(
        common,
        scheduling_dict,
        team_set,
        "non_conference",
        null
      );
    });

    team_season_id_list = Object.keys(team_season_schedule_tracker).filter(
      (team_id) =>
        team_season_schedule_tracker[team_id].non_conference.games_to_schedule >
        0
    );

    scheduling_teams = team_season_id_list.length > 1 && attempt_counter < 500;

    attempt_counter += 1;
    team_set_a = [];
    team_set_b = [];
  }

  console.log({
    scheduling_dict: scheduling_dict,
    team_season_schedule_tracker: team_season_schedule_tracker,
    games_to_create: games_to_create,
    team_games_to_create: team_games_to_create,
  });

  for (var team_season_obj of Object.values(team_season_schedule_tracker)) {
    if (team_season_obj.non_conference.games_to_schedule > 0) {
      console.log("couldnt schedule", { team_season_obj: team_season_obj });
    }
  }

  team_seasons_to_update = Object.values(team_seasons);

  //const games_created = await db.game.bulkAdd(games_to_create, games_to_create_ids);
  const games_created = await db.game.bulkAdd(games_to_create);
  const team_games_created = await db.team_game.bulkAdd(team_games_to_create);
};

const create_new_player_team_seasons_for_high_schoolers = async (data) => {
  console.log({ data: data });

  const common = data.common;
  const db = common.db;

  const team_seasons = data.team_seasons;
  const players = data.players;

  const team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var player_team_season_id_counter = 1;
  var player_team_seasons_tocreate = [];
  var player_team_season_stats_tocreate = [];
  const last_player_team_season = await db.player_team_season
    .orderBy("player_team_season_id")
    .last();

  if (last_player_team_season != undefined) {
    player_team_season_id_counter =
      last_player_team_season.player_team_season_id + 1;
  }

  for (const player of data.players) {

    var team_season_id = team_seasons[player_team_season_id_counter % team_seasons.length].team_season_id;

    var init_data = {
      player_id: player.player_id,
      player_team_season_id: player_team_season_id_counter,
      team_season_id: team_season_id,
      season: data.season,
      world_id: data.world_id,
      position: player.position,
      class: {
        class_name: 'FR',
        redshirted: false,
      },
      ratings: deep_copy(player.high_school_player_team_season.ratings),
    };

    var new_pts = new player_team_season(init_data);
    var new_player_team_season_stats = new player_team_season_stats(
      new_pts.player_team_season_id
    );

    player_team_seasons_tocreate.push(new_pts);
    player_team_season_stats_tocreate.push(new_player_team_season_stats);
    player_team_season_id_counter += 1;
  
  }


  console.log({
    player_team_seasons_tocreate:player_team_seasons_tocreate,
    player_team_season_stats_tocreate:player_team_season_stats_tocreate
  })
  debugger;

  await db.player_team_season.bulkPut(player_team_seasons_tocreate);
  await db.player_team_season_stats.bulkPut(player_team_season_stats_tocreate);

}

const create_new_player_team_seasons = async (data) => {
  console.log({ data: data });

  const common = data.common;
  const db = common.db;

  const team_seasons = data.team_seasons;
  const players = data.players;

  const team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const previous_team_seasons_by_team_season_id = index_group_sync(
    data.previous_team_seasons,
    "index",
    "team_season_id"
  );

  var player_team_season_id_counter = 1;
  var player_team_seasons_tocreate = [];
  var player_team_season_stats_tocreate = [];
  const last_player_team_season = await db.player_team_season
    .orderBy("player_team_season_id")
    .last();

  if (last_player_team_season != undefined) {
    player_team_season_id_counter =
      last_player_team_season.player_team_season_id + 1;
  }

  const next_class_map = {
    FR: "SO",
    SO: "JR",
    JR: "SR",
    SR: "GR",
  };

  var position_overall_max = {};
  var position_overall_min = {};

  for (const player of data.players) {
    var previous_team_season_id =
      player.previous_player_team_season.team_season_id;
    var team_season_id =
      team_seasons_by_team_id[
        previous_team_seasons_by_team_season_id[previous_team_season_id].team_id
      ].team_season_id;

    if (
      next_class_map[player.previous_player_team_season.class.class_name] in
      next_class_map
    ) {
      var init_data = {
        player_id: player.player_id,
        player_team_season_id: player_team_season_id_counter,
        team_season_id: team_season_id,
        season: data.season,
        world_id: data.world_id,
        position: player.position,
        class: {
          class_name:
            next_class_map[player.previous_player_team_season.class.class_name],
          redshirted: false,
        },
        ratings: deep_copy(player.previous_player_team_season.ratings),
      };

      if (!(player.position in position_overall_max)) {
        position_overall_max[player.position] =
          init_data.ratings.overall.overall;
        position_overall_min[player.position] =
          init_data.ratings.overall.overall;
      }

      position_overall_max[player.position] = Math.max(
        position_overall_max[player.position],
        init_data.ratings.overall.overall
      );
      position_overall_min[player.position] = Math.min(
        position_overall_min[player.position],
        init_data.ratings.overall.overall
      );

      var new_pts = new player_team_season(init_data);
      var new_player_team_season_stats = new player_team_season_stats(
        new_pts.player_team_season_id
      );

      player_team_seasons_tocreate.push(new_pts);
      player_team_season_stats_tocreate.push(new_player_team_season_stats);
      player_team_season_id_counter += 1;
    }
  }

  var goal_overall_max = 99;
  var goal_overall_min = 30;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const player_team_season of player_team_seasons_tocreate) {
    player_team_season.ratings.overall.overall = Math.floor(
      ((player_team_season.ratings.overall.overall -
        position_overall_min[player_team_season.position]) *
        goal_overall_range) /
        (position_overall_max[player_team_season.position] -
          position_overall_min[player_team_season.position]) +
        goal_overall_min
    );
  }

  console.log({
    last_player_team_season: last_player_team_season,
    player_team_seasons_tocreate: player_team_seasons_tocreate,
    player_team_season_stats_tocreate: player_team_season_stats_tocreate,
  });

  await db.player_team_season.bulkPut(player_team_seasons_tocreate);
  await db.player_team_season_stats.bulkPut(player_team_season_stats_tocreate);
};


const create_new_coach_team_seasons = async (data) => {
  console.log({ data: data });

  const common = data.common;
  const db = common.db;

  const team_seasons = data.team_seasons;
  const coaches = data.coaches;

  const team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  const previous_team_seasons_by_team_season_id = index_group_sync(
    data.previous_team_seasons,
    "index",
    "team_season_id"
  );

  var coach_team_season_id_counter = 1;
  var coach_team_seasons_tocreate = [];
  const last_coach_team_season = await db.coach_team_season
    .orderBy("coach_team_season_id")
    .last();

  if (last_coach_team_season != undefined) {
    coach_team_season_id_counter =
      last_coach_team_season.coach_team_season_id + 1;
  }

  for (const coach of data.coaches) {
    var previous_team_season_id =
      coach.previous_coach_team_season.team_season_id;
    var team_season_id =
      team_seasons_by_team_id[
        previous_team_seasons_by_team_season_id[previous_team_season_id].team_id
      ].team_season_id;
    var init_data = {
      coach_id: coach.coach_id,
      coach_team_season_id: coach_team_season_id_counter,
      team_season_id: team_season_id,
      season: data.season,
      world_id: data.world_id,
      coaching_position: coach.previous_coach_team_season.coaching_position,
      age: coach.previous_coach_team_season.age + 1
    };

    var new_cts = new coach_team_season(init_data);

    coach_team_seasons_tocreate.push(new_cts);
    coach_team_season_id_counter += 1;
  }

  var coach_team_seasons_tocreate_added = await db.coach_team_season.bulkPut(
    coach_team_seasons_tocreate
  );
};

const age_out_rating = (rating_group, rating, value, class_name) => {
  var classes = ["HS JR", "HS SR", "FR", "SO", "JR", "SR"];
  var class_index = classes.indexOf(class_name);
  var age_out_years = classes.length - class_index - 1;

  var rating_change_probability = 0;

  if (rating_group == "athleticism") {
    rating_change_probability = 0.05;
  } else if (rating_group == "passing") {
    rating_change_probability = 0.5;
  } else if (rating_group == "rushing") {
    rating_change_probability = 0.2;
  } else if (rating_group == "receiving") {
    rating_change_probability = 0.25;
  } else if (rating_group == "defense") {
    rating_change_probability = 0.2;
  } else if (rating_group == "blocking") {
    rating_change_probability = 0.4;
  } else {
    rating_change_probability = 0.1;
  }

  var severe_rating_change_probability = rating_change_probability / 10;

  for (var i = 0; i < age_out_years; i++) {
    var rand = Math.random();
    if (rand < severe_rating_change_probability) {
      value *= 0.94;
    } else if (rand < rating_change_probability) {
      value *= 0.97;
    }
  }

  if (value < 1) {
    return 1;
  }

  return round_decimal(value, 0);
};

const recruiting_pitch_value = (player_value, team_value) => {
  return Math.ceil((player_value ** 1.425 * (team_value - 4)) / 2.56);
};

const create_recruiting_class = async (common) => {
  console.log("In create recruiting_class", common);
  const db = common.db;
  const season = common.season;
  const recruiting_team_season_id = -1 * common.season;

  stopwatch(common, 'Stopwatch RTS - Starting creating recruiting class')

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );

  //const team_seasons_by_team_id = index_group_sync(team_seasons, 'index', 'team_id')
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  stopwatch(common, 'Stopwatch RTS - Fetched all team info')

  var player_team_seasons = await db.player_team_season
    .where({ team_season_id: recruiting_team_season_id })
    .toArray();
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  const player_ids = player_team_seasons.map((pts) => pts.player_id);

  const players = await db.player.bulkGet(player_ids);
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    team_seasons_by_team_season_id,
    "team_season_id",
    "team_season"
  );

  stopwatch(common, 'Stopwatch RTS - Fetched all player info')

  var position_star_weight_map = {
    QB: 0,
    RB: -1,
    FB: -10,
    WR: -1,
    TE: -4,
    OT: -1,
    IOL: -4,
    DL: 0,
    EDGE: 0,
    LB: -2,
    CB: -1,
    S: -5,
    K: -10,
    P: -10,
  };

  // TODO make the rankings fuzzy
  player_team_seasons = player_team_seasons.sort(
    (pts_a, pts_b) =>
      pts_b.ratings.overall.overall +
      position_star_weight_map[pts_b.position] -
      (pts_a.ratings.overall.overall + position_star_weight_map[pts_a.position])
  );

  stopwatch(common, 'Stopwatch RTS - Sorted players')


  let last_recruit_team_season = await db.recruit_team_season.orderBy('recruit_team_season_id').last();
  let recruit_team_season_id = 0;
  if (last_recruit_team_season){
    recruit_team_season_id = last_recruit_team_season.recruit_team_season_id;
  }

  stopwatch(common, 'Stopwatch RTS - First RTS')

  var players_to_update = [];

  console.log({ player_team_seasons: player_team_seasons });

  var player_count = 1;
  var total_players = player_team_seasons.length;
  var player_star_map = [
    { stars: 5, percent: 0.01 },
    { stars: 4, percent: 0.1 },
    { stars: 3, percent: 0.3 },
    { stars: 2, percent: 0.45 },
    { stars: 1, percent: 0.14 },
  ];
  var player_interest_cutoffs = [[6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1]];

  var player_star_tracker = 0;
  for (const star_obj of player_star_map) {
    star_obj.players_in_bucket = Math.ceil(total_players * star_obj.percent);
    player_star_tracker += star_obj.players_in_bucket;
    star_obj.players_in_bucket_cumulative = player_star_tracker;
  }

  var position_rank_map = {};
  var state_rank_map = {};

  var recruit_team_seasons_to_add_by_team_season_id = {};
  for (const team_season of team_seasons) {
    recruit_team_seasons_to_add_by_team_season_id[team_season.team_season_id] =
      [];
  }

  console.log({
    team_seasons: team_seasons,
    position_needs: team_seasons.map((ts) => ts.recruiting.position_needs),
  });

  var player_call_tracker = {};
  let location_tracker_map = {};

  let recruit_team_seasons_by_team_season_id = {};
  team_seasons.forEach(ts => recruit_team_seasons_by_team_season_id[ts.team_season_id] = [])

  stopwatch(common, 'Stopwatch RTS - Prepped all vars')

  for (const player_team_season of player_team_seasons) {
    var player = players_by_player_id[player_team_season.player_id];

    player_team_season.is_recruit = true;

    player_team_season.recruiting.stars = null;
    player_team_season.recruiting.stage = "Early";

    player_team_season.recruiting.player_interest_cutoff = deep_copy(
      player_interest_cutoffs[
        Math.floor(Math.random() * player_interest_cutoffs.length)
      ]
    );
    player_call_tracker[player_team_season.player_team_season_id] =
      player_team_season.recruiting.player_interest_cutoff;

    var player_state = player.hometown.state;
    var player_position = player.position;

    if (!(player_state in state_rank_map)) {
      state_rank_map[player_state] = 0;
    }
    state_rank_map[player_state] += 1;

    if (!(player_position in position_rank_map)) {
      position_rank_map[player_position] = 0;
    }
    position_rank_map[player_position] += 1;

    player_team_season.recruiting.rank.national = player_count;
    player_team_season.recruiting.rank.position_rank =
      position_rank_map[player_position];
    player_team_season.recruiting.rank.state = state_rank_map[player_state];

    player_team_season.recruiting.stars = player_star_map.find(star_obj => player_count <= star_obj.players_in_bucket_cumulative).stars;
    // for (const star_obj of player_star_map) {
    //   if (
    //     player_team_season.recruiting.stars == null &&
    //     player_count <= star_obj.players_in_bucket_cumulative
    //   ) {
    //     player_team_season.recruiting.stars = star_obj.stars;
    //   }
    // }

    for (const team_season of team_seasons) {
      let close_to_home_rating = distance_from_home(
                                    player.hometown,
                                    team_season.team.location,
                                    location_tracker_map
                                  )

      recruit_team_season_id += 1;
      let rts = new recruit_team_season({
        recruit_team_season_id: recruit_team_season_id,
        team_season_id: team_season.team_season_id,
        player_team_season_id: player_team_season.player_team_season_id,
        // scouted_ratings: deep_copy(player_team_season.ratings),
        scouted_ratings: player_team_season.ratings,
        //, distance: distance_between_cities(player.hometown, team_season.team.location)
        match_rating: 0,
        match_ratings: {
          location: {
            topic: "location",
            team: team_season.team.team_ratings.location,
            team_known: false,
          },
          fan_support: {
            topic: "fan_support",
            team: team_season.team.team_ratings.fan_support,
            team_known: false,
          },
          academic_quality: {
            topic: "academic_quality",
            team: team_season.team.team_ratings.academic_quality,
            team_known: false,
          },
          facilities: {
            topic: "facilities",
            team: team_season.team.team_ratings.facilities,
            team_known: false,
          },
          program_history: {
            topic: "program_history",
            team: team_season.team.team_ratings.program_history,
            team_known: false,
          },
          team_competitiveness: {
            topic: "team_competitiveness",
            team: team_season.team.team_ratings.team_competitiveness,
            team_known: false,
          },
          brand: {
            topic: "brand",
            team: team_season.team.team_ratings.brand,
            team_known: false,
          },
          pro_pipeline: {
            topic: "pro_pipeline",
            team: team_season.team.team_ratings.pro_pipeline,
            team_known: false,
          },

          program_stability: {
            topic: "program_stability",
            team: 10,
            team_known: false,
          },
          playing_time: { topic: "playing_time", team: 10, team_known: false },
          close_to_home: {
            topic: "close_to_home",
            team: close_to_home_rating,
            team_known: false,
          },
        },
      });

      rts.match_ratings.playing_time.team =
        team_season.recruiting.position_needs[player_team_season.position].find(
          (ovr_obj) =>
            ovr_obj.overall <=
            rts.scouted_ratings.overall.overall
        ).playing_time_val;

        rts.team_top_level_interest =
        Math.ceil(
          (rts.scouted_ratings.overall.overall - 60) / 5
        ) +
        rts.match_ratings.playing_time.team +
        (rts.match_ratings.close_to_home.team * 4) /
        rts.match_ratings.brand.team;

      player_team_season.recruiting.team_season_buckets.dream.add(1);
      recruit_team_seasons_by_team_season_id[team_season.team_season_id].push(rts)
    }

    player_count += 1;
  }

  stopwatch(common, `Stopwatch RTS - Processed ${players_to_update.length} players`)

  var team_season_calls_tracker = {};
  var team_seasons_call_order_prep = [];
  var team_seasons_call_order = [];

  for (const team_season_id in team_seasons_by_team_season_id) {
    var team_season = team_seasons_by_team_season_id[team_season_id];
    var prep_obj = {
      team_season_id: team_season_id,
      order_tracker: [],
      brand_odds: team_season.team.team_ratings.brand ** 3,
    };
    prep_obj.recruit_calls_remaining = Math.ceil(
      team_season.team.team_ratings.brand + 10
    );

    var players_to_call = recruit_team_seasons_by_team_season_id[team_season_id];
    players_to_call = players_to_call.sort(
      (rts_a, rts_b) =>
        rts_b.team_top_level_interest - rts_a.team_top_level_interest
    );
    team_season_calls_tracker[team_season_id] = {
      called_players: [],
      players_to_call: players_to_call,
    };
    team_seasons_call_order_prep.push(prep_obj);
  }

  stopwatch(common, `Stopwatch RTS - Prepped ${team_seasons_call_order_prep.length} teams`)

  var teams_waiting_to_call = team_seasons_call_order_prep.filter(
    (t_o) => t_o.recruit_calls_remaining > 0
  ).length;
  var loop_count = 0;
  // PERFTODO P * (N**2)
  // Find a way to change weighted_random_choice for this
  // Remove filter statements
  while (teams_waiting_to_call > 0) {
    var team_list = team_seasons_call_order_prep
      .filter((t_o) => t_o.recruit_calls_remaining > 0)
      .map((t_o) => [
        t_o.team_season_id,
        t_o.brand_odds + t_o.recruit_calls_remaining,
      ]);
    var chosen_team_season_id = weighted_random_choice(team_list);
    var chosen_team_obj = team_seasons_call_order_prep.find(
      (t_o) => t_o.team_season_id == chosen_team_season_id
    );

    chosen_team_obj.order_tracker.push(loop_count);
    loop_count += 1;

    chosen_team_obj.recruit_calls_remaining -= 1;
    team_seasons_call_order.push(parseInt(chosen_team_season_id));

    teams_waiting_to_call = team_seasons_call_order_prep.filter(
      (t_o) => t_o.recruit_calls_remaining > 0
    ).length;
  }

  stopwatch(common, `Stopwatch RTS - Teams did first calls`)

  console.log({
    team_seasons_call_order: team_seasons_call_order,
    team_seasons_call_order_prep: team_seasons_call_order_prep,
  });

  var player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  let recruit_team_seasons_to_save = [];

  for (const team_season_id of team_seasons_call_order) {
    let team_season_call_obj = team_season_calls_tracker[team_season_id];
    var team_season = team_seasons_by_team_season_id[team_season_id];

    let team_season_recruit_team_seasons_by_player_team_season_id = index_group_sync(recruit_team_seasons_by_team_season_id[team_season_id], 'index', 'player_team_season_id');

    var player_called = null;
    while (player_called == null) {
      player_called = team_season_call_obj.players_to_call.shift();
      if (player_called == undefined) {
        break;
      }

      var player_called_player_team_season =
        player_team_seasons_by_player_team_season_id[
          player_called.player_team_season_id
        ];
      var player_called_player_team_season_id =
        player_called_player_team_season.player_team_season_id;
      player_call_options =
        player_call_tracker[player_called_player_team_season_id];

      // console.log({
      //   player_called_player_team_season_id:
      //     player_called_player_team_season_id,
      //   player_called_player_team_season: player_called_player_team_season,
      //   player_called: player_called,
      //   player_call_options: player_call_options,
      // });

      if (player_call_options.length == 0) {
        player_called = null;
      } else {
        var call_time =
          player_call_tracker[player_called_player_team_season_id].shift();

        var sorted_call_topics = Object.values(
          player_called.match_ratings
        ).sort((mv_a, mv_b) => mv_b.team - mv_a.team);


        if (!(call_time > 0)){
          console.log({
            sorted_call_topics: sorted_call_topics,
            call_time: call_time,
            player_call_tracker:
              player_call_tracker[player_called_player_team_season_id],
              'team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id]': team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id],
              team_season_recruit_team_seasons_by_player_team_season_id:team_season_recruit_team_seasons_by_player_team_season_id,
              recruit_team_seasons_by_team_season_id:recruit_team_seasons_by_team_season_id
          });
        }

        for (const call_topic of sorted_call_topics.slice(0, call_time)) {
          let val = recruiting_pitch_value(
            player_called_player_team_season.recruiting.interests[
              call_topic.topic
            ],
            call_topic.team
          );
          console.log({
              val:val, 
              'team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id]': team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id],
              'team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id].match_rating':team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id].match_rating 
            })
          team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id]
            .match_rating += val
        }

      }
    }

    team_season_call_obj.players_to_call.slice(0,10).forEach(function(player_called){
      var player_called_player_team_season =
        player_team_seasons_by_player_team_season_id[
          player_called.player_team_season_id
        ];
      recruit_team_seasons_to_save.push(team_season_recruit_team_seasons_by_player_team_season_id[player_called_player_team_season.player_team_season_id])
    })
  }


  if (recruit_team_seasons_to_save.filter(rts => rts.match_rating > 0).length == 0){
    console.log('no match ratings', {
      recruit_team_seasons_to_save:recruit_team_seasons_to_save, 
      recruit_team_seasons_by_team_season_id:recruit_team_seasons_by_team_season_id
    })
    debugger;
  }
  
  stopwatch(common, `Stopwatch RTS - Teams did other? first calls`)

  console.log({team_seasons:team_seasons})
  for (team_season of team_seasons) {
    delete team_season.team;
    delete team_season.stats;
    delete team_season.team_games;
  }

  console.log({
    player_team_seasons: player_team_seasons,
    team_seasons: team_seasons,
    recruit_team_seasons_to_save:recruit_team_seasons_to_save
  });

  stopwatch(common, `Stopwatch RTS - Cleaning up data before saving`)

  await db.player_team_season.bulkPut(player_team_seasons);
  await db.team_season.bulkPut(team_seasons);
  await db.recruit_team_season.bulkPut(recruit_team_seasons_to_save);

  stopwatch(common, `Stopwatch RTS - Saved all RTSs`)
  debugger;
};

const class_is_in_college = (class_name) => {
  let class_map = {
    'HS JR': false,
    'HS SR': false,
    'FR': true,
    'SO': true,
    'JR': true,
    'SR': true,
    'GR': false,
  }

  return class_map[class_name] || false;
}

const assign_players_to_teams = async (common, world_id, season, team_seasons) => {
  const common = data.common;
  const db = common.db;
  const season = common.season;

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  

  let player_team_seasons = await db.player_team_season.where({season:season, team_season_id: 0})
        .filter(pts => class_is_in_college(pts.class.class_name)).toArray();

  const team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );

  const team_seasons_by_team_id = index_group_sync(
    team_seasons,
    "index",
    "team_id"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var player_team_season_id_counter = 1;
  var player_team_seasons_tocreate = [];
  var player_team_season_stats_tocreate = [];
  const last_player_team_season = await db.player_team_season
    .orderBy("player_team_season_id")
    .last();

  if (last_player_team_season != undefined) {
    player_team_season_id_counter =
      last_player_team_season.player_team_season_id + 1;
  }

  var team_position_options = [
    {
      QB: 6,
      RB: 5,
      FB: 1,
      WR: 8,
      TE: 4,
      OT: 5,
      IOL: 8,
      EDGE: 6,
      DL: 7,
      LB: 7,
      CB: 7,
      S: 4,
      K: 1,
      P: 2,
    },
    {
      QB: 4,
      RB: 5,
      FB: 1,
      WR: 8,
      TE: 4,
      OT: 4,
      IOL: 8,
      EDGE: 6,
      DL: 5,
      LB: 12,
      CB: 6,
      S: 5,
      K: 1,
      P: 2,
    },
    {
      QB: 4,
      RB: 5,
      FB: 1,
      WR: 9,
      TE: 3,
      OT: 5,
      IOL: 7,
      EDGE: 7,
      DL: 5,
      LB: 11,
      CB: 7,
      S: 4,
      K: 2,
      P: 1,
    },
    {
      QB: 3,
      RB: 8,
      FB: 1,
      WR: 7,
      TE: 5,
      OT: 5,
      IOL: 8,
      EDGE: 5,
      DL: 5,
      LB: 9,
      CB: 8,
      S: 4,
      K: 2,
      P: 1,
    },
    {
      QB: 5,
      RB: 6,
      FB: 1,
      WR: 10,
      TE: 4,
      OT: 4,
      IOL: 8,
      EDGE: 7,
      DL: 5,
      LB: 8,
      CB: 5,
      S: 5,
      K: 1,
      P: 2,
    },
  ];

  for (const team_season of team_seasons) {
    team_season.team_position_option = deep_copy(
      team_position_options[
        Math.floor(Math.random() * team_position_options.length)
      ]
    );
  }

  const player_team_seasons_by_position = index_group_sync(
    player_team_seasons_tocreate,
    "group",
    "position"
  );
  console.log({
    player_team_seasons_tocreate: player_team_seasons_tocreate,
    player_team_seasons_by_position: player_team_seasons_by_position,
  });
  player_team_seasons_tocreate = [];

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons = player_team_seasons_by_position[position];
    position_player_team_seasons = position_player_team_seasons.filter(
      (pts) => pts.class.class_name != "HS SR"
    );
    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) =>
        pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );

    position_team_season_ids = team_seasons
      .map((ts) =>
        Array(ts.team_position_option[position])
          .fill([ts.team_season_id])
          .flat()
      )
      .flat();

    position_team_season_ids = shuffle(position_team_season_ids);

    for (const team_season_id of position_team_season_ids) {
      var team_season = team_seasons_by_team_season_id[team_season_id];
      var team_prestige =
        (3 * team_season.team.team_ratings.program_history +
          3 * team_season.team.team_ratings.brand +
          3 * team_season.team.team_ratings.team_competitiveness +
          3 * team_season.team.team_ratings.pro_pipeline +
          team_season.team.team_ratings.location) /
        13;
      var prestige_lower_slice_ratio = 1 - team_prestige ** 0.15 / 20 ** 0.15;
      var prestige_upper_slice_ratio = 1 - team_prestige ** 2.5 / 20 ** 2.5;
      var prestige_slice_lower_bound =
        position_player_team_seasons.length * prestige_lower_slice_ratio;
      var prestige_slice_upper_bound =
        position_player_team_seasons.length * prestige_upper_slice_ratio;

      var prestige_slice_gap =
        prestige_slice_upper_bound - prestige_slice_lower_bound;
      var r = Math.random();
      var player_team_season_index = Math.floor(
        prestige_slice_lower_bound + r * prestige_slice_gap
      );

      // var available_player_team_seasons = player_team_seasons.splice(
      //   prestige_slice_lower_bound,
      //   prestige_slice_gap
      // )

      var chosen_player_team_season = position_player_team_seasons.splice(
        player_team_season_index,
        1
      );
      chosen_player_team_season = chosen_player_team_season[0];
      if (chosen_player_team_season != undefined) {
        chosen_player_team_season.team_season_id = team_season_id;

        player_team_seasons_tocreate.push(chosen_player_team_season);
      }
    }

    console.log({
      position: position,
      position_team_season_ids: position_team_season_ids,
      player_team_seasons: player_team_seasons,
    });
  }

  position_overall_max = {};
  position_overall_min = {};

  for (const player_team_season of player_team_seasons_tocreate) {
    var overall_impact = 0;
    player_team_season.ratings.overall.overall = 0;

    const position_archetype = deep_copy(
      position_archetypes[player_team_season.position]["Balanced"]
    );
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];

      for (const rating_key in rating_group) {
        var rating_overall_impact = rating_obj.overall_impact;

        var rating_value =
          player_team_season.ratings[rating_group_key][rating_key];

        rating_value = age_out_rating(
          rating_group_key,
          rating_key,
          rating_value,
          player_team_season.class.class_name
        );

        overall_impact += (rating_value - rating_mean) * rating_overall_impact;

        player_team_season.ratings[rating_group_key][rating_key] = rating_value;
      }
    }

    player_team_season.ratings.overall.overall = overall_impact;
    if (!(player_team_season.position in position_overall_max)) {
      position_overall_max[player_team_season.position] =
        player_team_season.ratings.overall.overall;
      position_overall_min[player_team_season.position] =
        player_team_season.ratings.overall.overall;
    }

    position_overall_max[player_team_season.position] = Math.max(
      position_overall_max[player_team_season.position],
      player_team_season.ratings.overall.overall
    );
    position_overall_min[player_team_season.position] = Math.min(
      position_overall_min[player_team_season.position],
      player_team_season.ratings.overall.overall
    );
  }

  for (const player_team_season of player_team_seasons_tocreate) {
    player_team_season.ratings.overall.overall = Math.floor(
      ((player_team_season.ratings.overall.overall -
        position_overall_min[player_team_season.position]) *
        goal_overall_range) /
        (position_overall_max[player_team_season.position] -
          position_overall_min[player_team_season.position]) +
        goal_overall_min
    );
  }

  console.log({ player_team_seasons_tocreate: player_team_seasons_tocreate });

  var player_team_seasons_tocreate_added = await db.player_team_season.bulkAdd(
    player_team_seasons_tocreate
  );
  var player_team_season_stats_tocreate_added =
    await db.player_team_season_stats.bulkAdd(
      player_team_season_stats_tocreate
    );
};

const create_coaches = async (data) => {
  const common = data.common;
  const db = common.db;
  var coaches_tocreate = [];
  var ethnicity_map = { white: 25, black: 25, hispanic: 25, asian: 25 };

  const positions = ["HC", "OC", "DC", "ST"];

  const num_coaches_to_create = positions.length * data.team_seasons.length;

  const coach_names = await common.random_name(ddb, num_coaches_to_create);
  const coach_cities = await common.random_city(ddb, num_coaches_to_create);

  const last_coach = await db.coach.orderBy("coach_id").last();

  var coach_counter = 0;

  let teams = await db.team.filter(t => t.team_id > 0).toArray();
  let team_brand_weights = teams.map(t => ([ t.team_id, Math.floor(t.team_ratings.program_history ** 0.5)]))

  var coach_id_counter = 1,
    coach_team = null;
  if (last_coach != undefined) {
    coach_id_counter = last_coach.coach_id + 1;
  }

  for (let team_season of data.team_seasons) {
    for (const coaching_position of positions) {
      body = common.body_from_position("coach");
      ethnicity = common.weighted_random_choice(ethnicity_map);
      let alma_mater_team_id = common.weighted_random_choice(team_brand_weights);
      var coach_obj = {
        coach_id: coach_id_counter,
        name: coach_names[coach_counter],
        world_id: data.world_id,
        coaching_position: coaching_position,
        hometown: coach_cities[coach_counter],
        ethnicity: ethnicity,
        body: body,
        alma_mater_team_id: parseInt(alma_mater_team_id)
      };

      coaches_tocreate.push(new coach(coach_obj));

      coach_counter += 1;
      coach_id_counter += 1;
    }
  }
  console.log({ coaches_tocreate: coaches_tocreate });
  var coaches_tocreate_added = await db.coach.bulkAdd(coaches_tocreate);
}

const create_coach_team_seasons = async (data) => {
  const common = data.common;
  const db = common.db;
  const season = common.season;

  const team_seasons = data.team_seasons;

  var coach_team_season_id_counter = 1;
  var coach_team_seasons_tocreate = [];
  const last_coach_team_season = await db.coach_team_season
    .orderBy("coach_team_season_id")
    .last();

  if (last_coach_team_season != undefined) {
    coach_team_season_id_counter =
      last_coach_team_season.coach_team_season_id + 1;
  }

  for (const coach of data.coaches) {
    var init_data = {
      coach_id: coach.coach_id,
      coach_team_season_id: coach_team_season_id_counter,
      team_season_id: -1,
      season: data.season,
      world_id: data.world_id,
      coaching_position: coach.coaching_position,
      age: Math.floor(Math.random() * 30) + 30
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
      coach_team_seasons_tocreate.push(chosen_coach_team_season);

      ind += 1;
    }
  }

  await db.coach_team_season.bulkAdd(coach_team_seasons_tocreate);
};

const generate_player_ratings = async(common, world_id, season) => {
  const db = common.db;

  let player_team_seasons = await db.player_team_season.where({season: season}).toArray();

  var url = "/static/data/import_json/player_archetype.json";
  var json_data = await fetch(url);
  var position_archetypes = await json_data.json();
  console.log({
    url: url,
    data: data,
    position_archetypes: position_archetypes,
  });

  var position_overall_max = {};
  var position_overall_min = {};

  for (let pts of player_team_seasons.filter(pts => !(pts.ratings))){
    let position_archetype = deep_copy(
      position_archetypes[pts.position]["Balanced"]
    );
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];

      pts.ratings[rating_group_key] = {};
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        var rating_mean = rating_obj.rating_mean / 5;

        var rating_value = round_decimal(
          normal_trunc(rating_mean, rating_mean / 10, 1, 20),
          0
        );

        pts.ratings[rating_group_key][rating_key] = rating_value;
      }
    }
  }


  for (let pts of player_team_seasons){

    let overall_impact = 0;
    let position_archetype = deep_copy(
      position_archetypes[pts.position]["Balanced"]
    );
    for (const rating_group_key in position_archetype) {
      var rating_group = position_archetype[rating_group_key];
      for (const rating_key in rating_group) {
        var rating_obj = rating_group[rating_key];
        var rating_mean = rating_obj.rating_mean;
        var rating_overall_impact = rating_obj.overall_impact;

        overall_impact +=
          (pts.ratings[rating_group_key][rating_key] - rating_mean) *
          rating_overall_impact;
      }
    }

    pts.ratings.overall.overall = overall_impact;
    if (!(pts.position in position_overall_max)) {
      position_overall_max[pts.position] = pts.ratings.overall.overall;
      position_overall_min[pts.position] = pts.ratings.overall.overall;
    }

    position_overall_max[pts.position] = Math.max(
      position_overall_max[pts.position],
      init_data.ratings.overall.overall
    );
    position_overall_min[pts.position] = Math.min(
      position_overall_min[pts.position],
      init_data.ratings.overall.overall
    );

  }  


  var goal_overall_max = 99;
  var goal_overall_min = 30;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const pts of player_team_seasons) {
    pts.ratings.overall.overall = Math.floor(
      ((pts.ratings.overall.overall -
        position_overall_min[pts.position]) *
        goal_overall_range) /
        (position_overall_max[pts.position] -
          position_overall_min[pts.position]) +
        goal_overall_min
    );
  }


  console.log('setting ratings', {player_team_seasons:player_team_seasons})
  await db.player_team_season.bulkPut(player_team_seasons);

}

const create_new_players_and_player_team_seasons = async (
  common,
  world_id,
  season,
  team_seasons,
  teams_by_team_id,
  classes
) => {
  const common = data.common;
  const db = common.db;

  const season = data.season;

  let players_tocreate = [];
  let player_team_seasons_tocreate = [];
  let player_team_season_stats_tocreate = [];

  const position_ethnicity =
    //numbers normalized from https://theundefeated.com/features/the-nfls-racial-divide/
    {
      QB: { white: 75, black: 15, hispanic: 5, asian: 5 },
      RB: { white: 15, black: 80, hispanic: 10, asian: 5 },
      FB: { white: 50, black: 50, hispanic: 15, asian: 2 },
      WR: { white: 10, black: 85, hispanic: 5, asian: 5 },
      TE: { white: 50, black: 50, hispanic: 15, asian: 2 },
      OT: { white: 45, black: 55, hispanic: 15, asian: 1 },
      IOL: { white: 40, black: 50, hispanic: 15, asian: 1 },
      EDGE: { white: 20, black: 80, hispanic: 10, asian: 1 },
      DL: { white: 10, black: 80, hispanic: 10, asian: 1 },
      LB: { white: 25, black: 75, hispanic: 10, asian: 1 },
      CB: { white: 2, black: 100, hispanic: 10, asian: 2 },
      S: { white: 15, black: 80, hispanic: 10, asian: 5 },
      K: { white: 70, black: 10, hispanic: 25, asian: 25 },
      P: { white: 70, black: 10, hispanic: 25, asian: 25 },
    };

  var team_position_counts = {
    QB: 1.25,
    RB: 1.5,
    FB: 0.5,
    WR: 2,
    TE: 1.25,
    OT: 1.25,
    IOL: 1.5,
    EDGE: 1.5,
    DL: 1.5,
    LB: 1.5,
    CB: 2,
    S: 1.25,
    K: 0.375,
    P: 0.375,
  };

  const num_players_per_team = sum(Object.values(team_position_counts));
  const num_players_to_create = num_players_per_team * data.team_seasons.length;

  const player_names = await common.random_name(ddb, num_players_to_create);
  const player_cities = await common.random_city(ddb, num_players_to_create);

  const last_player = await db.player.orderBy("player_id").last();
  const last_player_team_season = await db.player_team_season
    .orderBy("player_team_season_id")
    .last();

  var player_counter = 0;

  var player_id_counter = 1;
  var player_team_season_id_counter = 1;

  if (last_player != undefined) {
    player_id_counter = last_player.player_id + 1;
  }
  if (last_player_team_season != undefined) {
    player_team_season_id_counter = last_player_team_season.player_team_season_id + 1;
  }

  for (let team_count = 0; team_count < team_seasons.length; team_count++) {
    for (let position of team_position_counts) {
      let players_for_position = team_position_counts[position] * classes.length;

      for (let position_count = 0; position_count < players_for_position; position_count++) {
        let body = common.body_from_position(position);
        let ethnicity = common.weighted_random_choice(position_ethnicity[position]);
        let player_class = classes[Math.floor(Math.random() * classes.length)];
        let team_season_id = 0;
        if (player_class == "HS SR") {
          team_season_id = -1 * season;
        }
        else {
          var new_player_team_season_stats = new player_team_season_stats(
            player_team_season_id_counter
          );
          player_team_season_stats_tocreate.push(new_player_team_season_stats);
        }

    

        var player_obj = new player({
          player_id: player_id_counter,
          name: player_names[player_counter],
          world_id: world_id,
          hometown: player_cities[player_counter],
          ethnicity: ethnicity,
          body: body,
          world_id: world_id,
        });

        let player_team_season_obj = new player_team_season({
          world_id: world_id,
          player_id: player_id_counter,
          player_team_season_id: player_team_season_id_counter,
          season: season,
          class: {
            class_name: player_class,
            redshirted: false,
          },
          team_season_id: team_season_id,
          position: position,
        });

        players_tocreate.push(player_obj);
        player_team_seasons_tocreate.push(player_team_season_obj);

        player_counter += 1;
        player_id_counter += 1;
        player_team_season_id_counter += 1;
      }
    }
  }

  console.log({
    players_tocreate: players_tocreate,
    player_team_seasons_tocreate: player_team_seasons_tocreate,
  });
  await db.player.bulkAdd(players_tocreate);
  await db.player_team_season.bulkAdd(player_team_seasons_tocreate);
  await db.player_team_season_stats.bulkAdd(player_team_season_stats_tocreate);
};

const create_phase = async (season, common) => {
  const db = common.db;
  const phases_to_create = [
    { season: season, phase_name: "Pre-Season", is_current: true },
    { season: season, phase_name: "Regular Season", is_current: false },
    { season: season, phase_name: "End of Regular Season", is_current: false },
    { season: season, phase_name: "Bowl Season", is_current: false },
    { season: season, phase_name: "Season Recap", is_current: false },
    // { season: season, phase_name: "Departures", is_current: false },
    // { season: season, phase_name: "Off-Season Recruiting", is_current: false },
    { season: season, phase_name: "Summer Camp", is_current: false },
  ];

  let last_phase = await db.phase.orderBy('phase_id').last();
  let phase_id = last_phase ? last_phase.phase_id + 1 : 1;
  for (let phase of phases_to_create){
    phase.phase_id = phase_id;
    phase_id +=1;
  }
  const phases_to_create_added = await db.phase.bulkAdd(phases_to_create);
  const phases = index_group_sync(
    await db.phase.where({ season: season }).toArray(),
    "index",
    "phase_name"
  );
  return phases;
};

const create_week = async (phases, common, season) => {
  const db = common.db;

  var weeks_to_create = [
    // {week_name:'Summer Week 1', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 2', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 3', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},
    // {week_name:'Summer Week 4', is_current: false, phase_id: phases['Summer Camp']['phase_id'], schedule_week_number: null},

    {
      week_name: "Pre-Season",
      is_current: false,
      phase_id: phases["Pre-Season"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Week 1",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 1,
    },
    {
      week_name: "Week 2",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 2,
    },
    {
      week_name: "Week 3",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 3,
    },
    {
      week_name: "Week 4",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 4,
    },
    {
      week_name: "Week 5",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 5,
    },
    {
      week_name: "Week 6",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 6,
    },
    {
      week_name: "Week 7",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 7,
    },
    {
      week_name: "Week 8",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 8,
    },
    {
      week_name: "Week 9",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 9,
    },
    {
      week_name: "Week 10",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 10,
    },
    {
      week_name: "Week 11",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 11,
    },
    {
      week_name: "Week 12",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 12,
    },
    {
      week_name: "Week 13",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 13,
    },
    {
      week_name: "Week 14",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 14,
    },
    {
      week_name: "Week 15",
      is_current: false,
      phase_id: phases["Regular Season"]["phase_id"],
      schedule_week_number: 15,
    },

    {
      week_name: "Conference Championships",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Early Signing Day",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Prep",
      is_current: false,
      phase_id: phases["End of Regular Season"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Bowl Week 1",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 2",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 3",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },
    {
      week_name: "Bowl Week 4",
      is_current: false,
      phase_id: phases["Bowl Season"]["phase_id"],
      schedule_week_number: null,
    },

    {
      week_name: "Season Recap",
      is_current: false,
      phase_id: phases["Season Recap"]["phase_id"],
      schedule_week_number: null,
    },

    // {week_name:'Coach Carousel', is_current: false, phase_id: phases['Departures']['phase_id'], schedule_week_number: null},
    // {week_name:'Draft Departures', is_current: false, phase_id: phases['Departures']['phase_id'], schedule_week_number: null},
    // {week_name:'Transfer Announcements', is_current: false, phase_id: phases['Departures']['phase_id'], schedule_week_number: null},
    //
    // {week_name:'Recruiting Week 1', is_current: false, phase_id: phases['Off-Season Recruiting']['phase_id'], schedule_week_number: null},
    // {week_name:'Recruiting Week 2', is_current: false, phase_id: phases['Off-Season Recruiting']['phase_id'], schedule_week_number: null},
    // {week_name:'Recruiting Week 3', is_current: false, phase_id: phases['Off-Season Recruiting']['phase_id'], schedule_week_number: null},
    // {week_name:'Recruiting Week 4', is_current: false, phase_id: phases['Off-Season Recruiting']['phase_id'], schedule_week_number: null},
    // {week_name:'National Signing Day', is_current: false, phase_id: phases['Off-Season Recruiting']['phase_id'], schedule_week_number: null},
    //
    {
      week_name: "Plan for Season",
      is_current: false,
      phase_id: phases["Summer Camp"]["phase_id"],
      schedule_week_number: null,
    },
  ];

  let last_week = await db.week.orderBy('week_id').last();
  let week_id = last_week ? last_week.week_id + 1 : 1;

  for (let week of weeks_to_create){
    week.week_updates = [];
    week.season = season;
    week.week_id = week_id;
    week.user_actions = {
      recruiting_actions_used: 0,
    };

    week_id +=1;
  }

  if (season == 2022) {
    weeks_to_create[0].is_current = true;
  }
  var weeks_to_create_added = await db.week.bulkAdd(weeks_to_create);
  return await db.week.toArray();
};

const get_rivalries = async (teams) => {
  const team_names = teams.map((t) => t.school_name);

  var url = "/static/data/import_json/rivalries.json";
  var data = await fetch(url);
  var rival_dimension = await data.json();

  rival_dimension = rival_dimension.filter(
    (r) =>
      team_names.includes(r.team_name_1) && team_names.includes(r.team_name_2)
  );

  rival_dimension = shuffle(rival_dimension);
  rival_dimension = rival_dimension.sort(function (a, b) {
    if (a.preferred_week_id == undefined) return 1;
    if (b.preferred_week_id == undefined) return 0;
    if (a.preferred_week_id < b.preferred_week_id) return -1;
    if (a.preferred_week_id > b.preferred_week_id) return 1;
    return 0;
  });

  return rival_dimension;
};

const get_teams = async () => {
  var url = "/static/data/import_json/team.json";
  var data = await fetch(url);
  var teams = await data.json();

  return teams;
};

const get_conferences = async (conference_version) => {
  conference_version = conference_version || "";

  var url = `/static/data/import_json/conference${conference_version}.json`;
  console.log({url:url})
  var data = await fetch(url);
  var conferences = await data.json();
  console.log({conferences:conferences})

  return conferences;
};

const index_group_sync = (query_list, query_type, key) => {
  var dict = {};
  if (query_type == "many_to_one" || query_type == "group") {
    $.each(query_list, function (ind, obj) {
      if (!(get(obj, key) in dict)) {
        dict[get(obj, key)] = [];
      }

      dict[get(obj, key)].push(obj);
    });
  } else if (query_type == "one_to_one" || query_type == "index") {
    $.each(query_list, function (ind, obj) {
      dict[get(obj, key)] = obj;
    });
  }

  return dict;
};

const index_group = async (query_list, query_type, key) => {
  var dict = {};
  if (query_type == "many_to_one" || query_type == "group") {
    $.each(query_list, function (ind, obj) {
      if (!(obj[key] in dict)) {
        dict[obj[key]] = [];
      }
      dict[obj[key]].push(obj);
    });
  } else if (query_type == "one_to_one" || query_type == "index") {
    $.each(query_list, function (ind, obj) {
      dict[obj[key]] = obj;
    });
  }

  return dict;
};

const query_to_dict = async (query_list, query_type, key) => {
  return index_group_sync(query_list, query_type, key);
};

const populate_names = async (ddb) => {
  var url = "/static/data/import_json/names.json";
  var data = await fetch(url);
  var name_dimension = await data.json();

  await ddb.first_names.clear();
  await ddb.last_names.clear();

  var first_names_to_add = [],
    last_names_to_add = [],
    first_name_start = 0,
    last_name_start = 0;

  $.each(name_dimension, function (ind, name_obj) {
    if (name_obj.is_first_name) {
      first_names_to_add.push({
        stop: first_name_start + name_obj.occurance - 1,
        name: name_obj.name,
      });
      first_name_start += name_obj.occurance;
    } else if (name_obj.is_last_name) {
      last_names_to_add.push({
        stop: last_name_start + name_obj.occurance - 1,
        name: name_obj.name,
      });
      last_name_start += name_obj.occurance;
    }
  });

  await ddb.first_names.bulkAdd(first_names_to_add);
  await ddb.last_names.bulkAdd(last_names_to_add);
};

const populate_cities = async (ddb) => {
  var url = "/static/data/import_json/cities.json";
  var data = await fetch(url);
  const city_dimension = await data.json();

  var url = "/static/data/import_json/cities_2.json";
  var data = await fetch(url);
  const city_dimension_2 = await data.json();

  var url = "/static/data/import_json/states.json";
  var data = await fetch(url);
  const state_dimension = await data.json();

  const state_map = await index_group(
    state_dimension,
    "index",
    "state_abbreviation"
  );

  const states = {};
  const state_counts = {};

  $.each(city_dimension, function (ind, city) {
    if (!(city.state in states)) {
      states[city.state] = {};
    }
    if (city.city in states[city.state]) {
      console.log("duplicate of ", city);
    }
    states[city.state][city.city] = city;
  });

  var missing_cities = [];
  player_state_counts = { all_count: 0, match_count: 0 };

  $.each(city_dimension_2, function (ind, city) {
    //console.log('city', city)
    city.state_name = state_map[city.state_abbreviation].state_name;

    if (!(city.state_name in state_counts)) {
      state_counts[city.state_name] = { all_count: 0, match_count: 0 };
    }

    state_counts[city.state_name].all_count += city.player_count;
    player_state_counts.all_count += city.player_count;

    if (!(city.city_name in states[city.state_name])) {
      //console.log('DONT HAVE ', city.city_name, city.state_name, city)

      missing_cities.push({
        city: city.city_name,
        state: city.state_name,
        player_count: city.player_count,
        population: null,
        lat: null,
        long: null,
        timezone: null,
      });
    } else {
      player_state_counts.match_count += city.player_count;
      state_counts[city.state_name].match_count += city.player_count;
      states[city.state_name][city.city_name].player_count = city.player_count;
    }
  });

  missing_cities = missing_cities.sort(function (a, b) {
    if (a.player_count > b.player_count) return -1;
    return 1;
  });

  $.each(state_counts, function (ind, state) {
    state.all_count_ratio = Math.floor(
      (state.all_count / player_state_counts.all_count) * 9600
    );
    state.match_count_ratio = Math.floor(
      (state.match_count / player_state_counts.match_count) * 9600
    );
  });

  var cities_to_add = [],
    city_start = 0,
    new_city_obj = null;

  $.each(city_dimension, function (ind, city_obj) {
    //console.log('city_obj', city_obj)
    new_city_obj = states[city_obj.state][city_obj.city];
    if (!(new_city_obj.player_count == undefined)) {
      new_city_obj.occurance = new_city_obj.player_count;
      if (new_city_obj.occurance > 0){
        cities_to_add.push({
          city: new_city_obj.city,
          state: new_city_obj.state,
          lat: new_city_obj.lat,
          long: new_city_obj.long,
          occurance: new_city_obj.occurance,
        });
      }  
    }
  });

  await ddb.cities.bulkAdd(cities_to_add);
};

const populate_driver = async (ddb) => {
  const first_name_count = await ddb.first_names.count();
  const last_name_count = await ddb.last_names.count();
  const city_count = await ddb.cities.count();

  if (first_name_count == 0 || last_name_count == 0) {
    await populate_names(ddb);
  }

  if (city_count == 0) {
    await populate_cities(ddb);
  }
};

const random_name = async (ddb, num_names) => {
  var name_list = [];

  const first_name_list = await ddb.first_names.toArray();
  const last_name_list = await ddb.last_names.toArray();

  final_first_name_obj = first_name_list[first_name_list.length - 1];
  final_last_name_obj = last_name_list[last_name_list.length - 1];

  for (var i = 0; i <= num_names; i++) {
    const r_first = Math.floor(Math.random() * final_first_name_obj.stop);
    const r_last = Math.floor(Math.random() * final_last_name_obj.stop);

    const chosen_first = first_name_list.find(
      (name_obj) => name_obj.stop > r_first
    );
    const chosen_last = last_name_list.find(
      (name_obj) => name_obj.stop > r_last
    );

    name_list.push({ first: chosen_first.name, last: chosen_last.name });
  }
  return name_list;
};

const random_city = async (ddb, num_cities) => {
  let city_list = await ddb.cities.toArray();
  let chosen_city_list = []

  let total_occurance = sum(city_list.map(c => c.occurance));

  for (var i = 0; i <= num_cities; i++) {
    let r_city = Math.floor(Math.random() * total_occurance);
    let chosen_city = city_list.find(function(city_obj){
      r_city -= city_obj.occurance;
      return r_city <= 0;
    });
    chosen_city_list.push(chosen_city);
  }
  return chosen_city_list;
};

const driver_db = async () => {
  var dbname = "driver";

  ddb = await new Dexie(dbname);

  await ddb.version(8).stores({
    world: "++world_id",
    setting: "",
    first_names: "stop",
    last_names: "stop",
    cities: "[city+state]",
  });

  // Open the database
  await ddb.open().catch(function (e) {
    console.error("Open failed: " + e);
  });

  ddb = await ddb;

  await populate_driver(ddb);

  return ddb;
};

function hashCode(s) {
  let h;
  for(let i = 0; i < s.length; i++) 
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;

  return h;
}
window.table_key_list = [
  "award_group","award_team_set","award_group_type","award_timeframe","award_team","name",
  "first","last","hometown","city","state","long","occurance","coaching_position","ethnicity","body",
  "height_inches","weight","height","tendencies","pass","playclock_urgency","personality","leadership",
  "work_ethic","desire_for_winner","loyalty","desire_for_playtime","post_season_movement","ratings",
  "conference_abbreviation","prestige","is_independent","conference_logo_url","conference_color_primary_hex",
  "conference_color_secondary_hex","schedule_format","hold_conference_championship_game",
  "number_conference_games","round_robin_in_division","conference_championship_selection_method",
  "schedule_pattern","division","number_of_teams","cycle","teams_per_year","fixed_matchups","divisions",
  "conference_name","game_time","was_played","outcome","home_team_score","away_team_score","rivalry",
  "opponent_name","preferred_week_number","rivalry_name","bowl","is_conference_game","broadcast",
  "regional_broadcast","national_broadcast","headline_text","href","is_season_complete","playoffs",
  "playoffs_started","playoffs_complete","number_playoff_rounds","number_playoff_teams","playoff_rounds",
  "preseason_tasks","user_cut_players","user_set_gameplan","user_set_depth_chart","is_current_season",
  "captains_per_team","players_per_team","phase_name","is_current","position","redshirt","previous",
  "current","jersey_number","game_stats","games","game_score","weighted_game_score","games_played",
  "team_games_played","points","passing","rushing","carries","yards","receiving","targets","receptions",
  "blocking","defense","fumbles","kicking","punting","returning","top_stats","is_recruit","is_captain",
  "athleticism","strength","agility","speed","acceleration","stamina","jumping","injury","throwing_power",
  "short_throw_accuracy","medium_throw_accuracy","deep_throw_accuracy","throw_on_run","throw_under_pressure",
  "play_action","elusiveness","ball_carrier_vision","break_tackle","carrying","catching","catch_in_traffic",
  "route_running","release","hit_power","tackle","pass_rush","block_shedding","pursuit","play_recognition",
  "man_coverage","zone_coverage","press","pass_block","run_block","impact_block","kick_power","kick_accuracy",
  "overall","awareness","class","class_name","redshirted","depth_chart_rank","stars","signed","stage","rank",
  "national","position_rank","weeks","recruit_team_seasons","interests","location","fan_support",
  "academic_quality","facilities","program_history","team_competitiveness","brand","pro_pipeline",
  "program_stability","playing_time","close_to_home","games_started","plays_on_field",
  "top_12_weighted_game_scores","completions","attempts","ints","sacks","sack_yards","over_20",
  "broken_tackles","yards_after_contact","yards_after_catch","drops","sacks_allowed","pancakes","blocks",
  "lost","recovered","forced","return_yards","return_tds","fga_29","fgm_29","fga_39","fgm_39","fga_49",
  "fgm_49","fga_50","fgm_50","kickoffs","touchbacks","punts","within_20","kr_returns","kr_yards","kr_tds",
  "kr_lng","pr_returns","pr_yards","pr_tds","pr_lng","tackles","solo_tackles","tackles_for_loss","deflections",
  "qb_hits","int_yards","int_tds","safeties","school_name","team_name","team_abbreviation",
  "team_color_primary_hex","team_color_secondary_hex","rivals","jersey","invert","teamColors","team_ratings",
  "conference","is_home_team","is_winning_team","team","time_of_possession","possessions","turnovers",
  "biggest_lead","down_efficiency","total","field_position","total_drives","total_start_yard",
  "drive_efficiency","total_trips","scores","total_points","downs","first_downs","penalty","third_downs",
  "conversions","fourth_downs","two_points","net_yards","opponent_game_stats","record","wins","losses",
  "conference_wins","conference_losses","national_rank","is_user_team","scholarships_to_offer",
  "recruiting_class_rank","points_per_week","class_points","signed_player_stars","stars_1","stars_2","stars_3",
  "stars_4","stars_5","position_needs","EDGE","season_stats","opponent_season_stats","week_name",
  "schedule_week_number","week_updates","user_actions","recruiting_actions_used","phase", "lettering", 
  "lettering_color", "team_logo_url", "headlines", "depth_chart", "depth_chart_with_recruits", "division_name",
  "playoff", "rankings", "division_rank", "national_rank_delta", "national_rank_delta_abs", "stat_rankings",
  "offense", "defense", "results", "conference_champion", "final_four", "national_champion",
  "teams", "fixed", "winning_team", "losing_team", "is_primetime_game", "scoring",
  "drives", "final", "periods", "drive_end", "plays", "away_team_points", "drive_description", "home_team_points",
  "is_scoring_drive", "period", "play_description", "play_type", "seconds_in_to_game", "period_number", 
  "summed_national_rank", "player_face", "accessories", "ear", "eye", "eyeLine", "eyebrow", "facialHair",
  "fatness", "glasses", "hair", "color", "flip", "shave", "head", "miscLine", "mouth", "nose", "smileLine",
  "display", "abs_game_score_value", "game_score_value", "abs_season_score_value", "season_score_value",
  "game_outcome_letter", "success",  "conference_net_wins", "conference_gb", "defeated_teams", "net_wins",
  "win_streak", "division_champion", "by_position_group", "by_position", "by_position_unit", "playing_time_val",
]
window.table_key_map = null;
window.reverse_table_key_map = null;

function index_to_char(ind){
  let first_ind = Math.floor(ind / 26);
  let second_ind = ind % 26;
  let s = (first_ind + 10).toString(36) + (second_ind + 10).toString(36)
  if (s == 'id'){
    s = 'idid'
  }
  return s;
}

function serialize_key_map(){
  window.table_key_map = {};
  window.reverse_table_key_map = {};
  window.table_key_list.forEach(function(key, ind) { 
    let ind_char = index_to_char(ind)
    window.table_key_map[key] = ind_char
    window.reverse_table_key_map[ind_char] = key
  });

  console.log({
    'window.table_key_map': window.table_key_map,
    'window.reverse_table_key_map': window.reverse_table_key_map,
  })

  return window.table_key_map;
}

function compress_object(obj, dx_trans){

  window.table_key_map = window.table_key_map || serialize_key_map()
  obj = rename_keys(obj, window.table_key_map);
  return obj;
}

function uncompress_object(obj, dx_trans){

  let compressed_string = obj.data;
  let stringified_json = LZString.decompress(compressed_string);
  let data = JSON.parse(stringified_json);

  return data;

}

const rename_keys = (obj, key_map) => {

  for (let old_key in obj){
    if (old_key in key_map){
      let new_key = key_map[old_key];
      let val = obj[old_key];
      if (typeof val === 'object' && !(Array.isArray(val))){
        val = rename_keys(val, key_map);
      }
      else if (Array.isArray(val)){
        for (let iter_val of val){
          iter_val = rename_keys(iter_val, key_map )
        }
      }
      obj[new_key] = val;
      delete obj[old_key]
    }
  }

  return obj;
}

const get_db = async (world_obj) => {
  var dbname = "";
  if ("database_id" in world_obj) {
    dbname = "headfootballcoach" + world_obj.database_id.toString();
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "get_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  var new_db = await new Dexie(dbname);

  await new_db.version(20).stores({
    league_season: "season",
    team: "team_id",
    team_season: "team_season_id, team_id, season",
    team_season_stats: "team_season_id, team_id, season",
    coach: "coach_id",
    coach_team_season: "coach_team_season_id, coach_id, team_season_id, season",
    player: "player_id",
    player_team_season:
      "player_team_season_id, player_id, team_season_id, season",
    player_team_season_stats: "player_team_season_id",
    recruit_team_season: "recruit_team_season_id, player_team_season_id, team_season_id",
    conference: "conference_id",
    conference_season:
      "conference_season_id, conference_id, season, [conference_id+season]",
    phase: "phase_id, season",
    week: "week_id, season, [phase_id+season]",
    team_game: "team_game_id, game_id, team_season_id, week_id",
    player_team_game:
      "player_team_game_id, team_game_id, player_team_season_id",
    game: "game_id, week_id",
    award: "award_id, player_team_season_id, week_id, season",
    headline: "headline_id, week_id",
    world: "",
  });

  // Open the database
  await new_db.open().catch(function (e) {
    console.error("Open failed: " + e);
  });

  await new_db.team.mapToClass(team);

  await new_db.team_season.mapToClass(team_season);
  await new_db.team_season_stats.mapToClass(team_season_stats);

  await new_db.player_team_season.mapToClass(player_team_season);
  await new_db.player_team_season_stats.mapToClass(player_team_season_stats);

  await new_db.recruit_team_season.mapToClass(recruit_team_season);

  await new_db.player.mapToClass(player);
  await new_db.player_team_game.mapToClass(player_team_game);
  await new_db.game.mapToClass(game);
  await new_db.team_game.mapToClass(team_game);

  await new_db.coach.mapToClass(coach);
  await new_db.coach_team_season.mapToClass(coach_team_season);

  await new_db.award.mapToClass(award);
  await new_db.headline.mapToClass(headline);

  await new_db.conference.mapToClass(conference);
  await new_db.league_season.mapToClass(league_season);
  await new_db.week.mapToClass(week);
  await new_db.phase.mapToClass(phase);
  await new_db.world.mapToClass(world);
  await new_db.conference_season.mapToClass(conference_season);

  // for (let [table_name, table_obj] of Object.entries(new_db._allTables)){
  //   new_db[table_name].hook('creating', function serialize_creating_hook(primKey, obj, transaction) {
  //     window.table_key_map = window.table_key_map || serialize_key_map()
  //     obj = rename_keys(obj, window.table_key_map);
  //   });

  //   new_db[table_name].hook('reading', function serialize_reading_hook(obj) {
  //     window.table_key_map = window.table_key_map || serialize_key_map()
  //     let data = rename_keys(obj, window.reverse_table_key_map);
  //     var res = Object.create(table_obj.schema.mappedClass.prototype);
  //     for (var key in data){
  //       res[key] = data[key]
  //     }
  //     return res;
  //   });  
  // }

  return new_db;
};

const create_db = async (world_id) => {
  return get_db({ database_id: world_id });
};

const create_new_db = async () => {
  // const databases = await Dexie.getDatabaseNames();
  // var database_ids = databases.map(db => parseInt(db.replace('headfootballcoach', '')));
  // var new_world_id = database_ids.reduce(function(a, b) {
  //     return Math.max(a, b);
  // }) + 1;

  ddb = await driver_db();
  var world_res = await ddb.world.add({});
  const new_season_info = {
    world_id: world_res,
    database_name: "headfootballcoach" + world_res,
    date_created: Date.now(),
    date_last_updated: Date.now(),
    user_team: {
      team_name: null,
      school_name: null,
      team_logo_url: null,
      team_record: null,
    },
    current_season: 2022,
    current_week: "Week 1",
  };
  ddb.world.put(new_season_info);

  db = await create_db(world_res);
  return { db: db, new_season_info: new_season_info };
};

const get_databases_references = async () => {
  ddb = await driver_db();
  //const databases = await Dexie.getDatabaseNames();
  const databases = await ddb.world.toArray();
  var database_list = [];
  var db_obj = {};
  var world_id = 0;
  $.each(databases, function (ind, obj) {
    db_obj = obj;
    db_obj["db"] = get_db({ database_name: obj });
    database_list.push(db_obj);
  });
  return database_list;
};

const resolve_db = async (world_obj) => {
  var dbname = "";
  console.log('resolve_db', {world_obj:world_obj})
  if ("database_id" in world_obj && world_obj['database_id']) {
    dbname = "headfootballcoach" + world_obj.database_id;
  } else if ("database_name" in world_obj) {
    dbname = world_obj.database_name;
  } else {
    console.error(
      "resolve_db not called correctly. Include either database_name or database_id",
      world_obj
    );
    return null;
  }

  const databases = await Dexie.getDatabaseNames();

  if (databases.includes(dbname)) {
    return get_db({ database_name: dbname });
  } else {
    console.error("No database under this name", dbname);
    return null;
  }
};

const route_path = async (pathname, routes) => {
  var possible_matches = [];
  var vars, keys, part_count;

  var split_path = pathname.split("/").filter((str) => str.length > 0);

  $.each(routes, function (ind, route) {
    route.split_path = route.path.split("/").filter((str) => str.length > 0);
    route.vars = [];
    route.keys = [];

    route.possible_match = true;

    part_count = 0;
    $.each(route.split_path, function (ind, str) {
      if (str[0] == ":") {
        route.vars.push(str);
      } else if (str[0] != "/") {
        route.keys.push(str);
      }

      part_count += 1;
    });

    $.each(split_path, function (ind, str) {});
  });
};

const resolve_route_parameters = async (route_pattern) => {
  var pathname = location.pathname;

  const route_pattern_split = route_pattern
    .split("/")
    .filter((str) => str.length > 0);
  const route_params = pathname.split("/").filter((str) => str.length > 0);

  var params = {};
  var key = "";
  $.each(route_pattern_split, function (ind, val) {
    if (val.includes(":")) {
      key = val.replace(":", "");
      params[key] = route_params[ind];
      if (/^\d+$/.test(route_params[ind])) {
        params[key] = parseInt(route_params[ind]);
      }
    }
  });

  console.log({
    params: params,
    route_pattern_split: route_pattern_split,
    route_params: route_params,
    pathname: pathname,
    route_pattern: route_pattern,
  });
  return params;
};

const all_teams = async (common, link_suffix) => {
  const db = await common.db;
  var team_list = await db.team.where("team_id").above(0).toArray();
  team_list = team_list.sort(function (team_a, team_b) {
    if (team_a.school_name < team_b.school_name) return -1;
    if (team_a.school_name > team_b.school_name) return 1;
    return 0;
  });
  team_list = team_list.map((t) =>
    Object.assign(t, { conference_id: t.conference.conference_id })
  );

  var conferences = await db.conference.toArray();
  var conferences_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  team_list = nest_children(
    team_list,
    conferences_by_conference_id,
    "conference_id",
    "conference"
  );
  team_list = team_list.map((t) =>
    Object.assign(t, { adjusted_team_href: t.team_href + link_suffix })
  );

  var team_return_obj = { all_teams: team_list, conferences: conferences };
  return team_return_obj;
};

const all_seasons = async (common, link) => {
  const db = await common.db;
  var season_list = await db.league_season.toArray();

  season_list = season_list.map((s) =>
    Object.assign(s, { href: link + s.season })
  );
  console.log({ link: link, season_list: season_list });
  return season_list;
};

const common_functions = async (route_pattern) => {
  const params = await resolve_route_parameters(route_pattern);
  const world_id = params.world_id;

  var world_object = {};
  if (world_id != undefined) {
    const ddb = await driver_db();
    world_object = await ddb.world.get({ world_id: world_id });
  }

  console.log({
    world_object: world_object,
    params: params,
    route_pattern: route_pattern,
  });

  var db = await resolve_db({ database_id: world_id });
  window.db = db;

  return {
    create_new_db: create_new_db,
    get_db: get_db,
    get_teams: get_teams,
    get_rivalries: get_rivalries,
    get_conferences: get_conferences,
    get_databases_references: get_databases_references,
    driver_db: driver_db,
    nunjucks_env: get_nunjucks_env(),
    query_to_dict: query_to_dict,
    get_from_dict: get_from_dict,
    create_phase: create_phase,
    hashCode: hashCode,
    create_week: create_week,
    create_coaches:create_coaches,
    create_players: create_players,
    populate_all_depth_charts:populate_all_depth_charts,
    choose_preseason_all_americans: choose_preseason_all_americans,
    create_schedule: create_schedule,
    create_conference_seasons: create_conference_seasons,
    calculate_team_overalls: calculate_team_overalls,
    create_new_player_team_seasons: create_new_player_team_seasons,
    nav_bar_links: nav_bar_links,
    team_header_links: team_header_links,
    new_world_action:new_world_action,
    db: db,
    ddb: ddb,
    world_id: world_id,
    world_object: world_object,
    params: params,
    season: world_object.current_season,
    conference_standings: conference_standings,
    create_player_face: create_player_face,
    create_coach_face:create_coach_face,
    weighted_random_choice: weighted_random_choice,
    uniform_random_choice: uniform_random_choice,
    shuffle: shuffle,
    normal_trunc: normal_trunc,
    normal_trunc_bounce: normal_trunc_bounce,
    random_name: random_name,
    random_city: random_city,
    body_from_position: body_from_position,
    generate_face: generate_face,
    display_player_face: display_player_face,
    add_listeners: add_listeners,
    index_group: index_group,
    index_group_sync: index_group_sync,
    recent_games: recent_games,
    schedule_game: schedule_game,
    distinct: distinct,
    union: union,
    set_union: set_union,
    except: except,
    set_except: set_except,
    intersect: intersect,
    set_intersect: set_intersect,
    all_teams: all_teams,
    all_seasons: all_seasons,
    initialize_scoreboard: initialize_scoreboard,
    round_decimal: round_decimal,
    distance_between_cities:distance_between_cities,
    distance_between_coordinates:distance_between_coordinates,
    calculate_national_rankings: calculate_national_rankings,
    calculate_conference_rankings: calculate_conference_rankings,
    schedule_bowl_season: schedule_bowl_season,
    process_bowl_results: process_bowl_results,
    weekly_recruiting: weekly_recruiting,
    calculate_team_needs: calculate_team_needs,
    populate_player_modal: populate_player_modal,
    geo_marker_action: geo_marker_action,
    team_season: team_season,
    tier_placement: tier_placement,

    stopwatch: stopwatch,
    ordinal: ordinal,
    deep_copy: deep_copy,

    choose_all_americans: choose_all_americans,
    primary_color: '1763B2',
    secondary_color: '333333'
  };
};

const stopwatch = async (common, message) => {
  var currentTime = performance.now();
  common.lastStopwatch = common.lastStopwatch || common.startTime;
  console.log(
    `${message}- total time: ${parseInt(
      currentTime - common.startTime
    )} ms, since last: ${parseInt(currentTime - common.lastStopwatch)} ms`
  );
  common.lastStopwatch = currentTime;
};

const conference_standings = async (
  conference_season_id,
  relevant_team_season_ids,
  common
) => {
  const db = common.db;
  var conference_season = await db.conference_season.get({
    conference_season_id: conference_season_id,
  });
  const season = conference_season.season;
  var conference = await db.conference.get({
    conference_id: conference_season.conference_id,
  });

  var team_seasons_in_conference = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .and((ts) => ts.conference_season_id == conference_season_id)
    .toArray();

  const team_season_stats = await db.team_season_stats.where({season: season}).toArray();
  const team_season_stats_by_team_season_id = index_group_sync(
    team_season_stats,
    "index",
    "team_season_id"
  );

  const teams = await db.team.toArray();
  const teams_by_team_id = index_group_sync(teams, 'index', 'team_id');

  team_seasons_in_conference = nest_children(
    team_seasons_in_conference,
    team_season_stats_by_team_season_id,
    "team_season_id",
    "season_stats"
  );
  team_seasons_in_conference = nest_children(
    team_seasons_in_conference,
    teams_by_team_id,
    "team_id",
    "team"
  );

  team_seasons_in_conference.forEach(function(ts){
    if (relevant_team_season_ids.includes(ts.team_season_id)) {
      ts.bold = "bold";
    }
  })

  for(const division of conference_season.divisions){
    division.division_standings = team_seasons_in_conference
        .filter(ts => ts.division_name == division.division_name)
        .sort(function (teamA, teamB) {
          return teamA.rankings.division_rank[0] - teamB.rankings.division_rank[0];
        });
    console.log({division:division, team_seasons_in_conference:team_seasons_in_conference})
  }
  conference_season.conference = conference
  console.log({conference:conference, conference_season:conference_season})
  return conference_season;
};

function roughSizeOfObject(object) {
  var objectList = [];
  var stack = [object];
  var bytes = 0;

  while (stack.length) {
    var value = stack.pop();

    if (typeof value === "boolean") {
      bytes += 4;
    } else if (typeof value === "string") {
      bytes += value.length * 2;
    } else if (typeof value === "number") {
      bytes += 8;
    } else if (typeof value === "object" && objectList.indexOf(value) === -1) {
      objectList.push(value);

      for (var i in value) {
        stack.push(value[i]);
      }
    }
  }
  return bytes;
}

const recent_games = async (common) => {
  const season = common.season;
  const db = common.db;
  const all_weeks = await db.week.where({ season: season }).toArray();
  const current_week = all_weeks.filter((w) => w.is_current)[0];

  const all_weeks_by_week_id = await index_group(all_weeks, "index", "week_id");

  const previous_week = all_weeks_by_week_id[current_week.week_id - 1];

  if (previous_week == undefined) {
    return null;
  }

  var games_in_week = await db.game
    .where({ week_id: previous_week.week_id })
    .toArray();

  const team_seasons_b = await db.team_season
    .where({ season: season })
    .toArray();
  const team_seasons = team_seasons_b.filter((ts) => ts.team_id > 0);
  const team_seasons_by_team_season_id = await index_group(
    team_seasons,
    "index",
    "team_season_id"
  );

  const teams = await db.team.where("team_id").above(0).toArray();
  const teams_by_team_id = await index_group(teams, "index", "team_id");

  const team_games = await db.team_game
    .where({ week_id: previous_week.week_id })
    .toArray();
  for (var team_game of team_games) {
    team_game.team_season =
      team_seasons_by_team_season_id[team_game.team_season_id];
    team_game.team_season.team =
      teams_by_team_id[team_game.team_season.team_id];
  }

  const team_games_by_game_id = await index_group(
    team_games,
    "group",
    "game_id"
  );
  var min_national_rank = 0;
  for (var game of games_in_week) {
    game.team_games = team_games_by_game_id[game.game_id];

    max_national_rank = 0;

    if (game.team_games[0].is_winning_team) {
      max_national_rank =
        team_seasons_by_team_season_id[game.team_games[1].team_season_id]
          .national_rank;
    } else {
      max_national_rank =
        team_seasons_by_team_season_id[game.team_games[0].team_season_id]
          .national_rank;
    }

    game.summed_national_rank =
      team_seasons_by_team_season_id[game.team_games[0].team_season_id]
        .national_rank +
      team_seasons_by_team_season_id[game.team_games[1].team_season_id]
        .national_rank +
      max_national_rank;
  }

  games_in_week = games_in_week.sort(function (a, b) {
    if (a.summed_national_rank < b.summed_national_rank) return -1;
    if (a.summed_national_rank > b.summed_national_rank) return 1;
    return 0;
  });

  return games_in_week;
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

const load_player_table = async (Table_Team, Table_Player) => {
  const PlayerPositions = ["Off", "Def"];
  const PlayerOveralls = [];

  const TeamList = await Table_Team.find().exec();
  var player_id_counter = 1;

  var PlayersToCreate = [];
  var Obj_Player = {};

  $.each(TeamList, function (index, Obj_Team) {
    for (var i = 1; i < 46; i++) {
      Obj_Player = {
        player_id: player_id_counter,
        first_name: "Player Name",
        last_name: "Player Last Name",
        position: PlayerPositions[i % 2],
        overall_rating: getRandomInt(100),
      };
      PlayersToCreate.push(Obj_Player);

      player_id_counter += 1;
    }
  });

  const result = await Table_Player.bulkInsert(PlayersToCreate);
};

const pick_players_on_field = (
  depth_chart,
  player_team_seasons,
  players,
  player_team_games,
  side_of_ball,
  period,
  seconds_left_in_period,
  point_differential
) => {
  var player_list = { all_players: [], by_position: {}, bench_players: [] };
  var p = null;
  let players_on_field_set = new Set()

  let abs_point_differential = Math.abs(point_differential);
  if (point_differential < -8){
    abs_point_differential = Math.abs(point_differential + 10);
  }

  let depth_chart_skip = 0;
  if (abs_point_differential >= 45){
    depth_chart_skip = 2;
  }
  else if (abs_point_differential >= 37){
    depth_chart_skip = 1;
    if (period == 4){
      depth_chart_skip = 2;
    }
  }
  else if(abs_point_differential >= 29){
    // if(period == 4){
    //   depth_chart_skip = 2;
    // }
    // if (period == 3){
      depth_chart_skip = 1;
    // }
  }
  else if((period == 4) && (abs_point_differential >= 24) && (seconds_left_in_period < (5 * 60))){
    depth_chart_skip = 1;
  }

  if (point_differential < 0){
    depth_chart_skip = Math.min(1, depth_chart_skip)
  }

  if (side_of_ball == "offense") {
    var position_list = {
      QB: 1,
      RB: 1,
      WR: 3,
      TE: 1,
      OT: 2,
      IOL: 3,
      K: 1,
      P: 1,
    };
  } else if (side_of_ball == "defense") {
    var position_list = { EDGE: 2, DL: 2, LB: 3, CB: 2, S: 2 };
  } else if (side_of_ball == "kickoff kicking") {
    var position_list = { K: 1, TE: 2, LB: 4, CB: 2, S: 2 };
  } else if (side_of_ball == "kickoff receiving") {
    var position_list = { KR: 2, TE: 4, S: 2, LB: 3 };
  } else if (side_of_ball == "punt kicking") {
    var position_list = { P: 1, OT: 2, IOL: 3, TE: 2, CB: 2, LB: 1 };
  } else if (side_of_ball == "punt receiving") {
    var position_list = { KR: 1, S: 2, CB: 2, TE: 2, EDGE: 2, DL: 2 };
  } else {
    var position_list = {
      QB: 1,
      RB: 1,
      WR: 3,
      TE: 1,
      OT: 2,
      IOL: 3,
      EDGE: 2,
      DL: 2,
      LB: 3,
      CB: 2,
      S: 2,
      P: 1,
      K: 1,
    };
  }

  // console.log({
  //   position_list:position_list,
  //   depth_chart:depth_chart,
  //   player_team_seasons:player_team_seasons,
  //   players:players,
  //   player_team_games:player_team_games,
  //   side_of_ball:side_of_ball,
  //   period:period,
  //   seconds_left_in_period:seconds_left_in_period,
  //   point_differential:point_differential
  // })

  var player_obj = {};
  for (let pos in position_list){
    let count = position_list[pos];
    player_list.by_position[pos] = [];
    let ind = 0;
    let pos_depth_chart_skip = depth_chart_skip;
    if (depth_chart[pos].length > pos_depth_chart_skip){
      ind = pos_depth_chart_skip;
    }
    
    let energy_threshold = .7 - (.15 * pos_depth_chart_skip);
    while (player_list.by_position[pos].length < count){
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][ind];
      // console.log({'player_obj.player_team_season_id':player_obj.player_team_season_id, player_obj:player_obj, ind:ind, depth_chart:depth_chart, pos:pos})
      player_obj.player_team_season =
        player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game =
        player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      ind += 1;

      if (!(players_on_field_set.has(player_obj.player_team_season.player_id))){
        if (player_obj.player_team_game.game_attrs.energy >= energy_threshold){
          player_list.all_players.push(player_obj);
          player_list.by_position[pos].push(player_obj);    
  
          players_on_field_set.add(player_obj.player_team_season.player_id)
        }
        else {
          energy_threshold -= .15
        }
      }

      if (ind >= depth_chart[pos].length && player_list.by_position[pos].length < count){
        energy_threshold -= .1;
        pos_depth_chart_skip -= 1;
        pos_depth_chart_skip = Math.max(0, pos_depth_chart_skip)
        ind = pos_depth_chart_skip;
      }
    }
  }

  for (let pos in depth_chart){
    for (var i = 0; i < depth_chart[pos].length; i++){
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][i];
      player_obj.player_team_season =
        player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game =
        player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      if (!(players_on_field_set.has(player_obj.player_team_season.player_id))){
        player_list.bench_players.push(player_obj)
      }
    }
  }
  

  return player_list;
};

const average = (arr) => arr.reduce((acc, v) => acc + v) / arr.length;

const calculate_game_score = (
  player_team_game,
  player_team_season,
  team_game,
  team_season,
  opponent_team_game
) => {
  var game_score_map = [
    {
      stat_group: "rushing",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 10,
      display: " rush yards",
    },
    {
      stat_group: "rushing",
      stat: "carries",
      point_to_stat_ratio: -1.0 / 10,
      display: " carries",
    },
    {
      stat_group: "rushing",
      stat: "tds",
      point_to_stat_ratio: 6.0 / 1,
      display: " rush TDs",
    },

    {
      stat_group: "passing",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 15,
      display: " pass yards",
    },
    {
      stat_group: "passing",
      stat: "tds",
      point_to_stat_ratio: 4.0 / 1,
      display: " pass TDs",
    },
    {
      stat_group: "passing",
      stat: "completions",
      point_to_stat_ratio: 0.0 / 10,
      display: " comp",
    },
    {
      stat_group: "passing",
      stat: "attempts",
      point_to_stat_ratio: -1.0 / 5,
      display: " att",
    },
    {
      stat_group: "passing",
      stat: "ints",
      point_to_stat_ratio: -10.0 / 1,
      display: " picks",
    },
    {
      stat_group: "passing",
      stat: "sacks",
      point_to_stat_ratio: -1.0 / 5.0,
      display: " sacked",
    },

    {
      stat_group: "receiving",
      stat: "receptions",
      point_to_stat_ratio: 1.0 / 2,
      display: " rec.",
    },
    {
      stat_group: "receiving",
      stat: "yards",
      point_to_stat_ratio: 1.0 / 15,
      display: " rec. yards",
    },
    {
      stat_group: "receiving",
      stat: "tds",
      point_to_stat_ratio: 5.0 / 1,
      display: " rec. TDs",
    },

    {
      stat_group: "defense",
      stat: "sacks",
      point_to_stat_ratio: 4.5 / 1.0,
      display: " sacks",
    },
    {
      stat_group: "defense",
      stat: "tackles",
      point_to_stat_ratio: 1.0 / 2.0,
      display: " tackles",
    },
    {
      stat_group: "defense",
      stat: "tackles_for_loss",
      point_to_stat_ratio: 2.0 / 1.0,
      display: " TFLs",
    },
    {
      stat_group: "defense",
      stat: "deflections",
      point_to_stat_ratio: 2.5 / 1.0,
      display: " defl",
    },
    {
      stat_group: "defense",
      stat: "ints",
      point_to_stat_ratio: 6.0 / 1,
      display: " INTS",
    },
    {
      stat_group: "defense",
      stat: "tds",
      point_to_stat_ratio: 6.0 / 1,
      display: " def TDs",
    },

    {
      stat_group: "fumbles",
      stat: "fumbles",
      point_to_stat_ratio: -3.0 / 1,
      display: " fumbles",
    },
    {
      stat_group: "fumbles",
      stat: "forced",
      point_to_stat_ratio: 6.0 / 1,
      display: " fumb frcd",
    },
    {
      stat_group: "fumbles",
      stat: "recovered",
      point_to_stat_ratio: 1.0 / 1,
      display: " fumb rec.",
    },

    {
      stat_group: "blocking",
      stat: "sacks_allowed",
      point_to_stat_ratio: -3.0 / 1,
      display: " sacks alwd.",
    },
    {
      stat_group: "blocking",
      stat: "blocks",
      point_to_stat_ratio: 1.0 / 10,
      display: " blocks",
    },

    {
      stat_group: "kicking",
      stat: "fga",
      point_to_stat_ratio: -2.0 / 1,
      display: " FGA",
    },
    {
      stat_group: "kicking",
      stat: "fgm",
      point_to_stat_ratio: 5.0 / 1,
      display: " FGM",
    },
  ];

  var game_score_value = 0;
  var season_score_value = 0;
  var weighted_game_score_value = 0;
  player_team_season.top_stats = [];

  for (var stat_detail of game_score_map) {
    game_score_value = 0;
    season_score_value = 0;
    if (
      !player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat]
    ) {
    } else {
      game_score_value = round_decimal(
        player_team_game.game_stats[stat_detail.stat_group][stat_detail.stat] *
          stat_detail.point_to_stat_ratio,
        1
      );

      player_team_game.game_stats.games.game_score = round_decimal(
        player_team_game.game_stats.games.game_score + game_score_value,
        0
      );
      player_team_game.top_stats.push({
        display:
          player_team_game.game_stats[stat_detail.stat_group][
            stat_detail.stat
          ].toLocaleString("en-US") + stat_detail.display,
        game_score_value: game_score_value,
        abs_game_score_value: Math.abs(game_score_value),
      });
    }

    if (
     !player_team_season.season_stats[stat_detail.stat_group][
        stat_detail.stat
      ]
    ) {
    } else {
      season_score_value = round_decimal(
        player_team_season.season_stats[stat_detail.stat_group][
          stat_detail.stat
        ] * stat_detail.point_to_stat_ratio,
        1
      );

      player_team_season.season_stats.games.game_score = round_decimal(
        player_team_season.season_stats.games.game_score + game_score_value,
        0
      );
      player_team_season.top_stats.push({
        display:
          player_team_season.season_stats[stat_detail.stat_group][
            stat_detail.stat
          ].toLocaleString("en-US") + stat_detail.display,
        season_score_value: season_score_value,
        abs_season_score_value: Math.abs(season_score_value),
      });
      // console.log('player_team_season.top_stats', {
      //   player_team_season:player_team_season, 'player_team_season.top_stats': player_team_season.top_stats,
      //   season_score_value: season_score_value,
      //   abs_season_score_value: Math.abs(season_score_value), 'stat_detail.display': stat_detail.display,
      //   'stat_detail.stat_group': stat_detail.stat_group, 'stat_detail.stat': stat_detail.stat, 'player_team_season.season_stats[stat_detail.stat_group][stat_detail.stat]': player_team_season.season_stats[stat_detail.stat_group][
      //     stat_detail.stat
      //   ]
      // })
      // debugger;

    }
  }

  player_team_game.game_stats.games.weighted_game_score =
    player_team_game.game_stats.games.game_score;
  if (team_game.is_winning_team) {
    if (opponent_team_game.national_rank <= 5) {
      player_team_game.game_stats.games.weighted_game_score *= 1.45;
    } else if (opponent_team_game.national_rank <= 10) {
      player_team_game.game_stats.games.weighted_game_score *= 1.325;
    } else if (opponent_team_game.national_rank <= 15) {
      player_team_game.game_stats.games.weighted_game_score *= 1.25;
    } else if (opponent_team_game.national_rank <= 20) {
      player_team_game.game_stats.games.weighted_game_score *= 1.2;
    } else if (opponent_team_game.national_rank <= 30) {
      player_team_game.game_stats.games.weighted_game_score *= 1.15;
    } else if (opponent_team_game.national_rank <= 40) {
      player_team_game.game_stats.games.weighted_game_score *= 1.01;
    } else if (opponent_team_game.national_rank <= 50) {
      player_team_game.game_stats.games.weighted_game_score *= 1.075;
    } else if (opponent_team_game.national_rank <= 65) {
      player_team_game.game_stats.games.weighted_game_score *= 1.05;
    } else if (opponent_team_game.national_rank <= 85) {
      player_team_game.game_stats.games.weighted_game_score *= 1.025;
    } else if (opponent_team_game.national_rank <= 105) {
      player_team_game.game_stats.games.weighted_game_score *= 1.01;
    }
  } else {
    if (opponent_team_game.national_rank <= 5) {
      player_team_game.game_stats.games.weighted_game_score *= 1.1;
    } else if (opponent_team_game.national_rank <= 15) {
      player_team_game.game_stats.games.weighted_game_score *= 1;
    } else if (opponent_team_game.national_rank <= 25) {
      player_team_game.game_stats.games.weighted_game_score *= 0.95;
    } else if (opponent_team_game.national_rank <= 40) {
      player_team_game.game_stats.games.weighted_game_score *= 0.9;
    } else if (opponent_team_game.national_rank <= 65) {
      player_team_game.game_stats.games.weighted_game_score *= 0.75;
    } else {
      player_team_game.game_stats.games.weighted_game_score *= 0.6;
    }
  }

  player_team_season.season_stats.games.weighted_game_score +=
    player_team_game.game_stats.games.weighted_game_score;
  player_team_season.season_stats.top_12_weighted_game_scores.push(
    player_team_game.game_stats.games.weighted_game_score
  );
  player_team_season.season_stats.top_12_weighted_game_scores =
    player_team_season.season_stats.top_12_weighted_game_scores
      .sort((wgs_a, wgs_b) => wgs_b - wgs_a)
      .slice(0, 12);

  player_team_game.top_stats = player_team_game.top_stats
    .filter((s) => s.abs_game_score_value != 0)
    .sort(function (stat_a, stat_b) {
      return stat_b.abs_game_score_value - stat_a.abs_game_score_value;
    })
    .slice(0, 4);

  player_team_season.top_stats = player_team_season.top_stats.filter(
    (s) => s.abs_game_score_value != 0
  );
  player_team_season.top_stats = player_team_season.top_stats.sort(
    (stat_a, stat_b) =>
      stat_b.abs_season_score_value - stat_a.abs_season_score_value
  );

  player_team_season.top_stats = player_team_season.top_stats.slice(0, 4);
  player_team_season.top_stats = player_team_season.top_stats.sort(
    (stat_a, stat_b) => stat_b.season_score_value - stat_a.season_score_value
  );

  // player_team_season.top_stats.forEach(function(ts){
  //   delete ts.abs_season_score_value;
  //   delete ts.season_score_value;
  // })

  // player_team_game.top_stats.forEach(function(ts){
  //   delete ts.abs_game_score_value;
  //   delete ts.game_score_value;
  // })

  team_game.top_stats.push({
    player_team_game_id: player_team_game.player_team_game_id,
    game_score: player_team_game.game_stats.games.game_score,
    top_stats: player_team_game.top_stats,
  });
  team_game.top_stats = team_game.top_stats
    .sort(function (player_team_game_a, player_team_game_b) {
      return player_team_game_b.game_score - player_team_game_a.game_score;
    })
    .slice(0, 4);

  team_season.top_stats.push({
    player_team_season_id: player_team_season.player_team_season_id,
    game_score: player_team_season.season_stats.games.game_score,
    top_stats: player_team_season.top_stats,
  });
  team_season.top_stats = team_season.top_stats
    .sort(function (player_team_season_a, player_team_season_b) {
      return player_team_season_b.game_score - player_team_season_a.game_score;
    })
    .slice(0, 4);
};

const generate_ranking_headlines = async (common, team_seasons, this_week, headline_id_counter) => {
  let ranking_headlines = [];
  let conference_sums = {}
  for (let ts of team_seasons) {
    console.log({ts:ts, team_seasons:team_seasons})

    conference_sums[ts.conference_season.conference.conference_abbreviation] =  conference_sums[ts.conference_season.conference.conference_abbreviation] || {top_5:0, top_10:0, top_15:0, conference_season: ts.conference_season}

    if (ts.rankings.national_rank[0] < 15){
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_15 +=1;
    }
    if (ts.rankings.national_rank[0] < 10){
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_10 +=1;
    }
    if (ts.rankings.national_rank[0] < 5){
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_5 +=1;
    }

    let ts_headline_options = [];
    if (
      ts.rankings.national_rank[0] == 1 &&
      ts.rankings.national_rank[1] == 1
    ) {
      ts_headline_options.push({headline_relevance:3, text: '{{team_season.team.school_name}} remains at #1'})
    }
    
    if (ts.rankings.national_rank[0] == 1 &&
      ts.rankings.national_rank[1] > 1){
        ts_headline_options.push({headline_relevance:4, text: '{{team_season.team.school_name}} moves into #1 spot'})
    }
    
    if (ts.rankings.national_rank[0] <= 25 &&
      ts.rankings.national_rank[1] > 25){
        ts_headline_options.push({headline_relevance:4, text: '{{team_season.team.school_name}} cracks top 25'})
    }
    
    if (ts.rankings.national_rank[1] <= 25 &&
      ts.rankings.national_rank_delta < -6){
        ts_headline_options.push({headline_relevance:3, text: '{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}'})
    }

    if (ts.rankings.national_rank[1] <= 25 &&
      ts.rankings.national_rank_delta < -12){
        ts_headline_options.push({headline_relevance:4, text: '{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}'})
    }

    if (ts.rankings.national_rank[1] <= 25 &&
      ts.rankings.national_rank_delta < -18){
        ts_headline_options.push({headline_relevance:5, text: '{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}'})
    }

    if (ts_headline_options.length) {
      let max_headline_relevance = Math.max(...ts_headline_options.map(h => h.headline_relevance));
      ts_headline_options = ts_headline_options.filter(h => h.headline_relevance == max_headline_relevance);
      let ts_headline =
        ts_headline_options[
          Math.floor(Math.random() * ts_headline_options.length)
        ];

      var headline_text = common.nunjucks_env.renderString(ts_headline.text, {
        team_season: ts,
      });

      const headline_obj = new headline(
        headline_id_counter,
        this_week.week_id,
        headline_text,
        "ranking",
        ts_headline.headline_relevance
      );

      headline_obj.href = ts.team.team_href;
      headline_obj.team_season_ids = [
        ts.team_season_id,
      ];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  }

  Object.entries(conference_sums).forEach(function(conf_obj){
    let conference_name = conf_obj[0];
    let conference_obj = conf_obj[1];
    let headline_options = []

    if (conference_obj.top_5 >= 3){
      headline_options.push({headline_relevance:6, text: '{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_5}} of top 5 teams nationally'})
    }
    else if (conference_obj.top_10 >= 5){
      headline_options.push({headline_relevance:5, text: '{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_10}} of top 10 teams nationally'})
    }
    else if (conference_obj.top_15 >= 8){
      headline_options.push({headline_relevance:5, text: '{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_15}} of top 15 teams nationally'})
    }

    if (headline_options.length){
      let max_headline_relevance = Math.max(...headline_options.map(h => h.headline_relevance));
      headline_options = headline_options.filter(h => h.headline_relevance == max_headline_relevance);
      let conf_headline =
      headline_options[
        Math.floor(Math.random() * headline_options.length)
      ];

      var headline_text = common.nunjucks_env.renderString(conf_headline.text, {
        conference_obj:conference_obj
      });

      const headline_obj = new headline(
        headline_id_counter,
        this_week.week_id,
        headline_text,
        "ranking",
        conf_headline.headline_relevance
      );

      headline_obj.href = conference_obj.conference_season.conference.conference_href;
      headline_obj.team_season_ids = [
      ];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  })

  return ranking_headlines;
};

const generate_headlines = (game_dict, common) => {
  game_headlines = []

  let score_difference = Math.abs(game_dict.game.scoring.final[0] - game_dict.game.scoring.final[1])

  game_dict.winning_team = game_dict.teams[game_dict.winning_team_index];
  game_dict.losing_team = game_dict.teams[game_dict.losing_team_index];

  game_dict.winning_team_game =
    game_dict.team_games[game_dict.winning_team_index];
  game_dict.losing_team_game =
    game_dict.team_games[game_dict.losing_team_index];

  game_dict.winning_team_season =
    game_dict.team_seasons[game_dict.winning_team_index];
  game_dict.losing_team_season =
    game_dict.team_seasons[game_dict.losing_team_index];

  let base_headline_relevance = 0;
  if (game_dict.losing_team_season.national_rank < 10){
    base_headline_relevance = 10;
  }
  else if (game_dict.losing_team_season.national_rank < 20){
    base_headline_relevance = 8;
  }
  else if (game_dict.losing_team_season.national_rank < 40){
    base_headline_relevance = 6;
  }
  else if (game_dict.losing_team_season.national_rank < 80){
    base_headline_relevance = 4;
  }
  
  if (score_difference <= 4){
    game_headlines = game_headlines.concat([
      {text: "Time runs out for {{losing_team.school_name}}, falling to {{winning_team.school_name}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} sneaks by {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
    ])
  }
  else if (score_difference > 19){
    game_headlines = game_headlines.concat([
      {text: "{{winning_team.school_name}} blasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} OBLITERATES {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} cold clocks {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} banishes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} hammers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} brutalizes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} outmatches {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
    ])
  }
  else {
    game_headlines = game_headlines.concat([
      {text: "{{winning_team.school_name}} over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} overcomes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} beats {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} outlasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} overpowers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
    ])
  }

  if (game_dict.losing_team.location.unique_city_name && game_dict.losing_team_game.is_home_team){
    game_headlines = game_headlines.concat([
      {text: "{{winning_team.school_name}} wins in {{losing_team.location.city}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
      {text: "{{winning_team.school_name}} leaves {{losing_team.location.city}} with a win, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
    ])
  }

  if (game_dict.losing_team_game.is_home_team){
    game_headlines = game_headlines.concat([
      {text: "{{winning_team.school_name}} beats {{losing_team.school_name}} at home, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance},
    ])
  }

  if (
      (((game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank) > 25) && (game_dict.losing_team_season.national_rank <= 10))
      || 
      (((game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank) > 50) && (game_dict.losing_team_season.national_rank <= 20))
    ){
    game_headlines = game_headlines.concat([
      {text: "{{winning_team.school_name}} upset {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance + 2},
      {text: "{{winning_team.school_name}} pull off the upset over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance + 2},
      {text: "{{winning_team.team_name}} upset {{losing_team.team_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}", headline_relevance: base_headline_relevance + 2},
    ])
  }

  if (game_dict.game.bowl){
    if (game_dict.game.bowl.bowl_name == 'National Championship'){
      game_headlines = [
        {text: "{{winning_team.school_name}} crowned champions", headline_relevance: 20},
        {text: "{{winning_team.school_name}} claim {{winning_team_season.season}} championship", headline_relevance: 20},
      ]
    }
    else if(game_dict.game.bowl.bowl_name == 'National Semifinal'){
      if (game_dict.winning_team_season.playoff.seed >= 9){
        game_headlines = [
          {text: "Cinderella {{winning_team_season.national_rank_display}} {{winning_team.team_name}} to play for a shot at the title next week", headline_relevance: 10},
        ]
      }
      else {
        game_headlines = [
          {text: "{{winning_team.school_name}} advance to National Championship", headline_relevance: 9},
          {text: "{{winning_team.school_name}} takes down {{losing_team.school_name}} to play for championship", headline_relevance: 9},
        ]
      }
    }
  }

  let max_headline_relevance = Math.max(...game_headlines.map(h => h.headline_relevance));
  game_headlines = game_headlines.filter(h => h.headline_relevance == max_headline_relevance);
  game_headline =
    game_headlines[Math.floor(Math.random() * game_headlines.length)];

  var headline_text = common.nunjucks_env.renderString(
    game_headline.text,
    game_dict
  );

  const headline_obj = new headline(
    common.headline_id_counter,
    game_dict.game.week_id,
    headline_text,
    'game',
    game_headline.headline_relevance
  );

  headline_obj.href = game_dict.game.game_href;
  headline_obj.game_id = game_dict.game.game_id;
  headline_obj.team_season_ids = [
    game_dict.winning_team_season.team_season_id,
    game_dict.losing_team_season.team_season_id,
  ];

  game_dict.team_seasons[0].headlines.push(common.headline_id_counter);
  game_dict.team_seasons[1].headlines.push(common.headline_id_counter);

  common.headline_id_counter += 1;
  game_dict.headlines.push(headline_obj);
};

const quarter_seconds_to_time = (seconds) => {
  var seconds_in_quarter = 60 * 15;
  return seconds_to_time(seconds_in_quarter - (seconds % seconds_in_quarter));
};

const seconds_to_time = (seconds) => {
  var seconds_left = `${seconds % 60}`;
  if (seconds_left.length < 2) {
    seconds_left = "0" + seconds_left;
  }
  return `${Math.floor(seconds / 60)}:${seconds_left}`;
};

const game_sim_determine_go_for_two = (offensive_point_differential, period, seconds_left_in_period, coach) => {
  let aggression = coach.fourth_down_aggressiveness
  if (period <= 2){
    return Math.random() < (0 + aggression)
  }
  else if (offensive_point_differential > 20){
    return false;
  }
  else {
    if ([-18, -13, -10, -5, -2, 1, 4, 5, 12, 15, 19].includes(offensive_point_differential)){
      return true;
    }
    else if ([-22, -17, -15, -12, -9, -8, -7, -4, -1, 0, 2, 3, 6, 8, 9, 16].includes(offensive_point_differential)){
      return false;
    }
    else {
      return Math.random() < (0.1 + aggression);
    }
  }
}

const game_sim_play_call_options = (down, yards_to_go, ball_spot, period, offensive_point_differential, seconds_left_in_period, is_close_game, is_late_game, half_end_period, final_period) => {
    let playclock_urgency = 4
    let play_choice_options = {'run': 50,'pass': 50,'punt': 0,'field goal': 0}

    if (period == 4){
      if (offensive_point_differential > 0){
        playclock_urgency = 1;
      }
      else {
        playclock_urgency = 7;
      }
    }

    if (Math.abs(offensive_point_differential) >= 40){
      if (down == 4){
        return {'playclock_urgency': 1, 'play_choice_options': {'punt': 5}}
      }
      else if (down == 3){
        return {'playclock_urgency': 1, 'play_choice_options': {'pass': 30, 'run': 70}}
      }
      else {
        return {'playclock_urgency': 1, 'play_choice_options': {'run': 70}}
      }
    }

    if (down == 4){
      if (period <= 3) {
        //inside own 40
        if (ball_spot < 40){
          play_choice_options = {'punt': 100};
        }
        //outside opp. 40
        else if (ball_spot < 60){
          if (yards_to_go >= 3){
            play_choice_options = {'punt': 100};
          }
          else {
            play_choice_options = {'punt': 60, 'pass': 20, 'run': 20};
          }
        }
        // inside 30
        else if (ball_spot > 70){
          if (yards_to_go >= 8){
            play_choice_options = {'field goal': 100};
          }
          else if (yards_to_go >= 4){
            play_choice_options = {'field goal': 92, 'pass': 8};
          }
          else if (yards_to_go == 1){
            play_choice_options = {'field goal': 45, 'pass': 10, 'run': 45};
          }
          // 2 or 3 yards to go
          else {
            play_choice_options = {'field goal': 70, 'pass': 20, 'run': 10};
          }
        }
        //between 30 and 40
        else {
          if (yards_to_go >= 4){
            play_choice_options = {'field goal': 100};
          }
          else {
            play_choice_options = {'field goal': 60, 'pass': 20, 'run': 20};
          }
        }
      }
      else if (period == 4){
        //FG makes a difference
        if (ball_spot >= 70){
          if ([-19, -18, -17, -11, -10, -9].includes(offensive_point_differential) || offensive_point_differential >= -3){
            play_choice_options = {'field goal': 100};
          }
          else if ([-16, -15, -14, -13, -12, -8, -7, -6, -5, -4].includes(offensive_point_differential)){
            if (yards_to_go <= 3){
              play_choice_options = {'run': 70, 'pass': 30, };
            }
            else {
              play_choice_options = {'pass': 30, };
            }
          }
          else {
            if (yards_to_go <= 4) {
              play_choice_options = {'field goal': 50, 'pass': 50, 'run': 50};
            }
            else {
              play_choice_options = {'field goal': 50};
            }
          }
        }
        else if (ball_spot >= 40){
          play_choice_options = {'pass': 55, 'run': 45,};
        }
        else {
          if (down == 4){
            play_choice_options = {'punt': 2};
          }
          else {
            play_choice_options = {'pass': 50, 'run': 50,};
          }
        }
      }
      else {
        play_choice_options = {'pass': 50, 'run': 50,};
      }
    }
    else {
      play_choice_options = {'pass': 50, 'run': 50,};
    }

    return {'playclock_urgency': playclock_urgency, 'play_choice_options': play_choice_options}
}

const update_player_energy = (game_dict, players_on_field, bench_players, plays_since_last_sub, is_home_team) => {

  let position_fatigue_rate_map = {
    QB: .005,
    RB: .02,
    FB: .025,
    WR: .015,
    TE: .015,
    OT: .005,
    IOL: .005,
    DL: .015,
    EDGE: .02,
    LB: .015,
    CB: .01,
    S: .01,
    K: .001,
    P: .001
  }

  let home_field_advantage_modifier = game_dict.home_field_advantage_modifier;

  if (!(is_home_team)){
    home_field_advantage_modifier = 1 / home_field_advantage_modifier; 
  }


  for (let player_obj of players_on_field){
    player_obj.player_team_game.game_attrs.energy -= (position_fatigue_rate_map[player_obj.player.position] * plays_since_last_sub);
    player_obj.player_team_game.game_attrs.energy = Math.max(player_obj.player_team_game.game_attrs.energy, 0.0)

  }
  for (let player_obj of bench_players){
    player_obj.player_team_game.game_attrs.energy += (.01 * plays_since_last_sub);
    player_obj.player_team_game.game_attrs.energy = Math.min(player_obj.player_team_game.game_attrs.energy , 1.0)
  }

  players_on_field.forEach(player_obj => player_obj.player_team_game.game_attrs.adjusted_overall = ((player_obj.player_team_game.game_attrs.energy ** .25) * home_field_advantage_modifier * player_obj.player_team_season.ratings.overall.overall))
  bench_players.forEach(player_obj => player_obj.player_team_game.game_attrs.adjusted_overall = ((player_obj.player_team_game.game_attrs.energy ** .25) * home_field_advantage_modifier * player_obj.player_team_season.ratings.overall.overall))

  // console.log({bench_players:bench_players, players_on_field:players_on_field})
}

const sim_game = (game_dict, common) => {
  common.stopwatch(common, `Stopwatch game ${game_dict.game.game_id}`);
  //   console.log('Simming game', game_dict)
  var team_games = game_dict.game.team_games;

  if (game_dict.game.was_played) {
    return 0;
  }

  var scores = {},
    team_game_info = {};
  var game_info = [];
  $.each(game_dict.team_games, function (ind, team_game) {
    team_game_info = {};
    team_game_info.depth_chart = game_dict.team_seasons[ind].depth_chart;
    team_game_info.coaches = {};
    team_game_info.player_team_seasons = {};

    scores[team_game.team_game_id] = 0;

    game_info.push(team_game_info);
  });

  var possessions_left = 10;
  var scoring = {
    periods: [],
    final: [0, 0],
    drives: [],
  };

  var down_efficiency_map = {
    1: 0.5,
    2: 0.7,
    3: 1.0,
  };

  var offensive_team_index = 0,
    defensive_team_index = 1,
    points_this_drive = 0,
    scoring_period = {},
    possession_count = 0,
    adjusted_score_possibilities = {};

  game_dict.home_field_advantage_modifier = game_dict.game.is_neutral_site_game ? 1.0 : 1.03;
  if (game_dict.teams[1].school_name == 'SMU'){
    game_dict.home_field_advantage_modifier = 1.05
  }
  else if (game_dict.teams[0].school_name == 'SMU'){
    game_dict.home_field_advantage_modifier = 0.95
  }

  var drive_within_20 = false;
  var drive_within_40 = false;

  var seconds_per_period = 15 * 60;
  var seconds_left_in_period = seconds_per_period;
  var periods = [1, 2, 3, 4];
  var seconds_this_play = 60 * 3;
  var offense_point_differential = 0;
  var plays_since_last_sub = 0;
  var field_position = 20,
    first_down = true,
    drive_end = false,
    seconds_this_drive = 0,
    plays_this_drive = 0,
    yards_this_drive = 0,
    punt_distance = 0;
  var drive_summary = {
    drive_end: {
      period: null,
      seconds_in_to_game: null,
      home_team_points: null,
      away_team_points: null,
    },
    plays: [],
  };

  Object.entries(game_dict.player_team_games).forEach(([player_team_season_id, ptg]) => ptg.game_attrs = {energy: 1.0});

  home_team_players = pick_players_on_field(
    game_info[offensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,(60*15),0
  );
  away_team_players = pick_players_on_field(
    game_info[defensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,(60*15),0
  );

  var all_players_both_teams = home_team_players.all_players.concat(
    away_team_players.all_players
  );
  for (var player_obj of all_players_both_teams) {
    player_obj.player_team_game.game_stats.games.games_started = 1;
  }

  

  for (const period of periods) {
    scoring_period = { period_number: period, points: [0, 0]};

    // if (period == 1) {
    //   scoring_period.drives.push({
    //     drive_end: {
    //       play_type: "KICK",
    //       is_scoring_drive: false,
    //       drive_event_class: "DriveEndingEvent-All w3-hide",
    //       display_team_id: game_dict.teams[offensive_team_index].team_id,
    //       period: 1,
    //       seconds_in_to_game: 0,
    //       home_team_points: 0,
    //       away_team_points: 0,
    //     },
    //     plays: [],
    //   });
    // }

    seconds_left_in_period = seconds_per_period;

    while (seconds_left_in_period > 0) {
      if (first_down) {
        yards_to_go = 10;
        down = 1;

        offense_point_differential =
        scoring.final[offensive_team_index] -
        scoring.final[defensive_team_index];

        offensive_team_players = pick_players_on_field(
          game_info[offensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "offense", period, seconds_left_in_period, offense_point_differential
        );
        defensive_team_players = pick_players_on_field(
          game_info[defensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "defense", period, seconds_left_in_period, -1 * offense_point_differential
        );

        all_players_both_teams = offensive_team_players.all_players.concat(
          defensive_team_players.all_players
        );
        for (var player_obj of all_players_both_teams) {
          player_obj.player_team_game.game_stats.games.games_played = 1;
        }

        update_player_energy(game_dict, offensive_team_players.all_players, offensive_team_players.bench_players, plays_since_last_sub, offensive_team_index);
        update_player_energy(game_dict, defensive_team_players.all_players, defensive_team_players.bench_players, plays_since_last_sub, defensive_team_index);

        let qb_ovrs_to_add = [];
        for (let i = 0; i<=4; i++){
          qb_ovrs_to_add.push(offensive_team_players.by_position.QB[0].player_team_game.game_attrs.adjusted_overall)
        }
        let offense_players_ovrs = offensive_team_players.all_players.map(
          (player_obj) =>
            player_obj.player_team_game.game_attrs.adjusted_overall
        ).concat(
          qb_ovrs_to_add
        )

        offensive_player_average_overall = average(
          offense_players_ovrs
        );

        defensive_player_average_overall = average(
          defensive_team_players.all_players.map(
            (player_obj) =>
              player_obj.player_team_game.game_attrs.adjusted_overall
          )
        );

        offensive_player_average_overall_difference = Math.floor(
          offensive_player_average_overall - defensive_player_average_overall
        );

        plays_since_last_sub = 0;
      }


      first_down = false;
      clock_running = true;
      yards_this_play = 0;
      points_this_drive = 0;
      plays_since_last_sub += 1;
      play_details = { yards: null, description: null };
      playcall_obj = game_sim_play_call_options(down, yards_to_go, field_position, period, offense_point_differential, seconds_left_in_period, false, false, false, false)

      play_choice_options = playcall_obj.play_choice_options;
      play_choice_options.pass = parseInt((play_choice_options.pass || 0) * (game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency / 50.0));
      play_choice_options.run = parseInt((play_choice_options.run || 0) * ((100 - game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency) / 50.0));
      playclock_urgency = playcall_obj.playclock_urgency;
      play_choice = weighted_random_choice(play_choice_options);

      play_details.play_choice = play_choice;


      if (play_choice == "pass") {
        chosen_qb_index = 0;

        chosen_players = {
          QB: offensive_team_players.by_position["QB"][0],
          OT_List: offensive_team_players.by_position["OT"].concat(
            offensive_team_players.by_position["IOL"]
          ),
        };

        var valid_pass_catchers = offensive_team_players.by_position["WR"]
          .concat(offensive_team_players.by_position["TE"])
          .concat(offensive_team_players.by_position["RB"]);
        var valid_pass_catchers_weights = valid_pass_catchers.map(function (
          player_obj
        ) {
          var odds = player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
          if (player_obj.player_team_season.position == "TE") {
            odds *= 0.9;
          } else if (player_obj.player_team_season.position != "WR") {
            odds *= 0.4;
          }
          return [player_obj, odds];
        });
        chosen_players.Pass_Catcher = weighted_random_choice(
          valid_pass_catchers_weights
        );

        for (var PTS of chosen_players.OT_List) {
          PTS.player_team_game.game_stats.blocking.blocks += 1;
        }

        var r = -1;
        while (r < 0 || r > 1){
          r = Math.random() /
          ((offensive_player_average_overall /
            defensive_player_average_overall) **
            1.1);
        }

        if (r < 0.6) {
          //completion
          yards_this_play = Math.min((Math.floor(Math.random() * 20)), 100 - field_position);

          if (r < 0.03){
            yards_this_play = 100 - field_position;
          }

          chosen_players.QB.player_team_game.game_stats.passing.attempts += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.targets += 1;

          chosen_players.QB.player_team_game.game_stats.passing.completions += 1;
          chosen_players.QB.player_team_game.game_stats.passing.yards +=
            yards_this_play;

          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.receptions += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.yards +=
            yards_this_play;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.lng =
            Math.max(
              chosen_players.Pass_Catcher.player_team_game.game_stats.receiving
                .lng,
              yards_this_play
            );
        } else if (r < 0.9) {
          //incomplete
          // console.log({chosen_players:chosen_players, valid_pass_catchers:valid_pass_catchers, valid_pass_catchers_weights: valid_pass_catchers_weights, offensive_team_players:offensive_team_players})
          chosen_players.QB.player_team_game.game_stats.passing.attempts += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.targets += 1;

          yards_this_play = 0;
          clock_running = false;
        } else if (r < 0.96) {
          //sack
          chosen_players.QB.player_team_game.game_stats.passing.sacks += 1;

          chosen_players.OL_Sack_Allowed =
            chosen_players.OT_List[
              Math.floor(Math.random() * chosen_players.OT_List.length)
            ];
          chosen_players.OL_Sack_Allowed.player_team_game.game_stats.blocking.sacks_allowed += 1;

          yards_this_play = Math.floor(Math.random() * 7) - 8;
        } else {
          //interception
          chosen_players.QB.player_team_game.game_stats.passing.ints += 1;

          var valid_interceptor = defensive_team_players.by_position["CB"]
            .concat(defensive_team_players.by_position["S"])
            .concat(defensive_team_players.by_position["LB"]);
          var valid_interceptor_weights = valid_interceptor.map(function (
            player_obj
          ) {
            var odds =
              player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
            if (player_obj.player_team_season.position == "S") {
              odds *= 0.8;
            } else if (player_obj.player_team_season.position != "CB") {
              odds *= 0.4;
            }
            return [player_obj, odds];
          });
          chosen_players.Interceptor = weighted_random_choice(
            valid_interceptor_weights
          );

          chosen_players.Interceptor.player_team_game.game_stats.defense.ints += 1;

          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.turnovers += 1;

          play_details.yards = 0;
          play_details.play_player_ids = [chosen_players.QB.player.player_id, chosen_players.Interceptor.player.player_id]
          //play_details.description = `<a href="${chosen_players.QB.player.player_href}">${chosen_players.QB.player.full_name}</a> intercepted by <a href="${chosen_players.Interceptor.player.player_href}">${chosen_players.Interceptor.player.full_name}</a>`;

          drive_summary.drive_end.play_type = "INT";
          drive_summary.drive_end.play_description = `{player_0} intercepted by {player_1}`;
          drive_summary.drive_end.play_player_ids = [chosen_players.QB.player.player_id, chosen_players.Interceptor.player.player_id]

          drive_end = true;
          yards_this_play = 0;
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [chosen_players.QB.player.player_id, chosen_players.Pass_Catcher.player.player_id]
        play_details.description = `{player_0} ${yards_this_play} yard pass to {player_1}`;
      } else if (play_choice == "run") {

        offensive_front_7_average_overall = average(
          offensive_team_players.by_position["OT"].concat(offensive_team_players.by_position["IOL"]).concat(offensive_team_players.by_position["RB"]).concat(offensive_team_players.by_position["TE"]).map(
            (player_obj) =>
              player_obj.player_team_game.game_attrs.adjusted_overall
          )
        );
        defensive_front_7_average_overall = average(
          defensive_team_players.by_position["DL"].concat(defensive_team_players.by_position["EDGE"]).concat(defensive_team_players.by_position["LB"]).map(
            (player_obj) =>
              player_obj.player_team_game.game_attrs.adjusted_overall
          )
        );

        yards_this_play =
          Math.min(Math.floor(
            Math.random() *
              (12.5 *
                ((offensive_front_7_average_overall /
                defensive_front_7_average_overall) **
                  1.4))
          ) - 2, 100 - field_position);

        let runner_random = Math.random();

        if (runner_random < 0.92) {
          chosen_players = {
            Runner: offensive_team_players.by_position["RB"][0],
          };
        } else if (runner_random < 0.97) {
          chosen_players = {
            Runner: offensive_team_players.by_position["QB"][0],
          };
        } else {
          chosen_wr_index = Math.floor(
            Math.random() * offensive_team_players.by_position["WR"].length
          );
          chosen_players = {
            Runner: offensive_team_players.by_position["WR"][chosen_wr_index],
          };
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [chosen_players.Runner.player.player_id]
        play_details.description = `{player_0} ${yards_this_play} yard run`;

        chosen_players.Runner.player_team_game.game_attrs.energy -= .015;

        chosen_players.Runner.player_team_game.game_stats.rushing.carries += 1;
        chosen_players.Runner.player_team_game.game_stats.rushing.yards +=
          yards_this_play;
        //console.log('Lng run', {'chosen_players.Runner.player_team_game.game_stats.rushing.lng': chosen_players.Runner.player_team_game.game_stats.rushing.lng, 'yards_this_play': yards_this_play, 'Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)': Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)})
        chosen_players.Runner.player_team_game.game_stats.rushing.lng =
          Math.max(
            chosen_players.Runner.player_team_game.game_stats.rushing.lng,
            yards_this_play
          );
      } else if (play_choice == "field goal") {
        drive_end = true;
        kick_distance = 117 - field_position;

        var chosen_k_index = 0;
        chosen_players = {
          K: offensive_team_players.by_position["K"][0],
        };

        var distance_key = "";

        if (kick_distance > 50) {
          distance_key = "50";
        } else if (kick_distance > 39) {
          distance_key = "49";
        } else if (kick_distance > 29) {
          distance_key = "39";
        } else {
          distance_key = "29";
        }

        kick_odds = 0.9;
        if (kick_distance > 60) {
          kick_odds -= 0.899;
        } else if (kick_distance > 55) {
          kick_odds -= 0.875;
        } else if (kick_distance > 45) {
          kick_odds -= 0.65;
        } else if (kick_distance > 35) {
          kick_odds -= 0.325;
        } else if (kick_distance > 25) {
          kick_odds -= 0.1;
        }

        chosen_players.K.player_team_game.game_stats.kicking.fga += 1;
        chosen_players.K.player_team_game.game_stats.kicking[
          `fga_${distance_key}`
        ] += 1;

        play_details.yards = 0;
        play_details.description = `${kick_distance} yard field goal MISSED`;

        drive_summary.drive_end.play_type = "FG MISS";
        drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id]
        drive_summary.drive_end.play_description = `{player_0} MISSED ${kick_distance} yard field goal`;

        kick_made = false;
        if (Math.random() < kick_odds) {
          kick_made = true;
          points_this_drive = 3;

          play_details.description = `${kick_distance} yard field goal MADE`;

          drive_summary.drive_end.play_type = "FG MADE";
          drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id]
          drive_summary.drive_end.play_description = `{player_0} MADE ${kick_distance} yard field goal`;

          chosen_players.K.player_team_game.game_stats.kicking.fgm += 1;
          chosen_players.K.player_team_game.game_stats.kicking[
            `fgm_${distance_key}`
          ] += 1;
          chosen_players.K.player_team_game.game_stats.kicking.lng = Math.max(
            chosen_players.K.player_team_game.game_stats.kicking.lng,
            kick_distance
          );
          chosen_players.K.player_team_game.game_stats.games.points += 3;
        }
      } else if (play_choice == "punt") {
        drive_end = true;
        yards_this_play = 0;

        punt_distance = Math.min(Math.floor(Math.random() * 40) + 20, 99 - field_position);

        var chosen_p_index = 0;
        chosen_players = {
          P: offensive_team_players.by_position["P"][0],
        };

        chosen_players.P.player_team_game.game_stats.punting.punts += 1;
        chosen_players.P.player_team_game.game_stats.punting.yards +=
          punt_distance;
        chosen_players.P.player_team_game.game_stats.punting.lng = Math.max(
          chosen_players.P.player_team_game.game_stats.punting.lng,
          punt_distance
        );

        play_details.yards = 0;
        play_details.description = `${punt_distance} yard punt`;

        drive_summary.drive_end.play_type = "PUNT";
        drive_summary.drive_end.play_player_ids = [chosen_players.P.player.player_id]
        drive_summary.drive_end.play_description = `{player_0} ${punt_distance} yard punt`;
      }

      if (down <= 3) {
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.down_efficiency[down].total += 1;
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.down_efficiency.all.total += 1;
        if (yards_this_play >= down_efficiency_map[down] * yards_to_go) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.down_efficiency[down].success += 1;
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.down_efficiency.all.success += 1;
        }
      }

      field_position += yards_this_play;
      yards_this_drive += yards_this_play;
      yards_to_go -= yards_this_play;
      plays_this_drive += 1;

      if (field_position >= 60) {
        drive_within_40 = true;
        if (field_position >= 80) {
          drive_within_20 = true;
        }
      }

      if (yards_to_go <= 0) {
        first_down = true;

        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.downs.first_downs.total += 1;

        if (play_choice == "pass") {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.first_downs.passing += 1;
        } else if (play_choice == "run") {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.first_downs.rushing += 1;
        }
      }

      if (field_position >= 100) {
        drive_end = true;
        points_this_drive = 7;

        chosen_players.K = offensive_team_players.by_position["K"][0];
        chosen_players.K.player_team_game.game_stats.games.points += 1;
        chosen_players.K.player_team_game.game_stats.kicking.xpa += 1;
        chosen_players.K.player_team_game.game_stats.kicking.xpm += 1;

        if (play_choice == "pass") {
          chosen_players.QB.player_team_game.game_stats.passing.tds += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.tds += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.games.points += 6;
        } else if (play_choice == "run") {
          chosen_players.Runner.player_team_game.game_stats.rushing.tds += 1;
          chosen_players.Runner.player_team_game.game_stats.games.points += 6;
        }
      } else {
        if (play_choice == "pass" || play_choice == "run") {
          var chosen_tackler_player_team_season =
            defensive_team_players.all_players[
              Math.floor(
                Math.random() * defensive_team_players.all_players.length
              )
            ];

          chosen_players = {
            Tackler: {
              player:
                game_dict.players[chosen_tackler_player_team_season.player_id],
              player_team_game:
                game_dict.player_team_games[
                  chosen_tackler_player_team_season.player_team_season_id
                ],
              player_team_season: chosen_tackler_player_team_season,
            },
          };

          chosen_players.Tackler.player_team_game.game_stats.defense.tackles += 1;

          if (yards_this_play < 0) {
            chosen_players.Tackler.player_team_game.game_stats.defense.tackles_for_loss += 1;

            if (play_choice == "pass") {
              chosen_players.Tackler.player_team_game.game_stats.defense.sacks += 1;
            }
          }
        }
      }

      if (down == 3) {
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.downs.third_downs.attempts += 1;
        if (first_down) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.third_downs.conversions += 1;
        }
      } else if (down == 4 && ("pass" == play_choice || "run" == play_choice)) {
        //alert('went for it on fourth!!')
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.downs.fourth_downs.attempts += 1;
        if (first_down) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.fourth_downs.conversions += 1;
        }
      }

      play_details.down = down;
      down += 1;

      if (down > 4 && !first_down) {
        drive_end = true;

        if ("pass" == play_choice || "run" == play_choice) {
          drive_summary.drive_end.play_type = "TO-D";
          drive_summary.drive_end.drive_description = "Turnover on downs";

          drive_summary.drive_end.play_description = "Turnover on downs";
        }
      }

      if (clock_running) {
        seconds_this_play = Math.floor(Math.random() * 10) + (33 - (playclock_urgency * 4));
      } else {
        seconds_this_play = Math.floor(Math.random() * 4) + 1;
      }

      seconds_this_play = Math.min(seconds_this_play, seconds_left_in_period);

      seconds_left_in_period = seconds_left_in_period - seconds_this_play;
      seconds_this_drive += seconds_this_play;
      game_dict.team_games[
        offensive_team_index
      ].game_stats.team.time_of_possession += seconds_this_play;

      //drive_summary.plays.push(play_details);

      if (drive_end) {
        scoring_period.points[offensive_team_index] += points_this_drive;
        scoring.final[offensive_team_index] += points_this_drive;
        seconds_in_to_game =
          (period - 1) * seconds_per_period +
          (seconds_per_period - seconds_left_in_period);

        if (points_this_drive > 0) {
          drive_summary.drive_end.is_scoring_drive = true;

          if (offensive_team_index == 0) {
            drive_summary.drive_end.away_team_bold = "bold";
          } else {
            drive_summary.drive_end.home_team_bold = "bold";
          }

          drive_summary.drive_end.drive_description = `${plays_this_drive} plays, ${yards_this_drive} yards, ${seconds_to_time(
            seconds_this_drive
          )}`;

          if (points_this_drive == 3) {
            drive_summary.drive_end.play_type = "FG";
            drive_summary.drive_end.play_description = `{player_0} makes ${kick_distance} yard field goal`;
            drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
          } else {
            drive_summary.drive_end.play_type = "TD";
            drive_summary.drive_end.drive_description += " - Extra point good";
            drive_summary.drive_end.play_description =
              play_details.description + " for a TD";
            drive_summary.drive_end.play_player_ids = play_details.play_player_ids;
          }

          field_position = 20;
        } else {
          drive_summary.drive_end.is_scoring_drive = false;

          drive_summary.drive_end.drive_description = `${plays_this_drive} plays, ${yards_this_drive} yards, ${seconds_to_time(
            seconds_this_drive
          )}`;

          if (play_choice == "punt") {
            field_position += punt_distance;

            if (field_position >= 98) {
              field_position = 90;
            }
          }
          field_position = 100 - field_position;
        }

        drive_summary.drive_end.period = period;
        drive_summary.drive_end.seconds_in_to_game = seconds_in_to_game;
        drive_summary.drive_end.home_team_points = scoring.final[1];
        drive_summary.drive_end.away_team_points = scoring.final[0];
        drive_summary.drive_end.display_team_id =
          game_dict.teams[offensive_team_index].team_id;

        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[offensive_team_index].game_stats.team
            .biggest_lead,
          scoring.final[offensive_team_index] -
            scoring.final[defensive_team_index]
        );
        game_dict.team_games[
          defensive_team_index
        ].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[defensive_team_index].game_stats.team
            .biggest_lead,
          scoring.final[defensive_team_index] -
            scoring.final[offensive_team_index]
        );

        //scoring_period.drives.push(drive_summary);
        scoring.drives.push(drive_summary);

        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.possessions += 1;
        game_dict.team_games[offensive_team_index].game_stats.team.points =
          scoring.final[offensive_team_index];

        if (drive_end && points_this_drive > 0 && period > 4) {
          seconds_left_in_period = 0;
        }

        if (drive_within_20) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.drive_efficiency[20].total_trips += 1;
          if (points_this_drive > 0) {
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[20].scores += 1;
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[20].total_points += points_this_drive;
          }
        }
        if (drive_within_40) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.drive_efficiency[40].total_trips += 1;
          if (points_this_drive > 0) {
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[40].scores += 1;
            game_dict.team_games[
              offensive_team_index
            ].game_stats.team.drive_efficiency[40].total_points += points_this_drive;
          }
        }

        offensive_team_index = (offensive_team_index + 1) % 2;
        defensive_team_index = (defensive_team_index + 1) % 2;

        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.field_position.total_drives += 1;
        game_dict.team_games[
          offensive_team_index
        ].game_stats.team.field_position.total_start_yard += field_position;

        first_down = true;

        points_this_drive = 0;
        yards_this_drive = 0;
        seconds_this_drive = 0;
        plays_this_drive = 0;
        drive_end = false;
        drive_within_20 = false;
        drive_within_40 = false;

        drive_summary = { drive_end: {} };
      }
    }

    if (
      period == Math.max(...periods) &&
      scoring.final[0] == scoring.final[1]
    ) {
      periods.push(period + 1);
    } else if (period == Math.max(...periods)) {
      var drive = {
        drive_end: {
          play_type: "FINAL",
          drive_description: "Game Over",
          is_scoring_drive: false,
          display_team_id: game_dict.teams[offensive_team_index].team_id,
          period: period,
          seconds_in_to_game: period * seconds_per_period,
          home_team_points: scoring.final[1],
          away_team_points: scoring.final[0],
        },
        plays: [],
      };
      //scoring_period.drives.push(drive);
      scoring.drives.push(drive);
    }

    scoring.periods.push(scoring_period);
  }

  //   console.log('Done simming!',scoring, `${game_dict.teams[offensive_team_index].school_name} vs ${game_dict.teams[defensive_team_index].school_name}`)

  game_dict.game.was_played = true;
  game_dict.game.scoring = scoring;

  game_dict.team_games[0].points = scoring.final[0];
  game_dict.team_games[1].points = scoring.final[1];

  game_dict.team_games[0].national_rank =
    game_dict.team_seasons[0].rankings.national_rank[0];
  game_dict.team_games[1].national_rank =
    game_dict.team_seasons[1].rankings.national_rank[0];

  const is_conference_game =
    game_dict.team_seasons[0].conference_season_id ==
    game_dict.team_seasons[1].conference_season_id;

  var winning_team_index = -1,
    losing_team_index = -1;
  if (scoring.final[0] > scoring.final[1]) {
    winning_team_index = 0;
    losing_team_index = 1;
  } else {
    winning_team_index = 1;
    losing_team_index = 0;
  }

  game_dict.winning_team_index = winning_team_index;
  game_dict.losing_team_index = losing_team_index;

  generate_headlines(game_dict, common);

  game_dict.team_games[winning_team_index].is_winning_team = true;
  game_dict.team_games[losing_team_index].is_winning_team = false;

  game_dict.team_games[winning_team_index].game_outcome_letter = "W";
  game_dict.team_games[losing_team_index].game_outcome_letter = "L";

  game_dict.team_seasons[winning_team_index].record.wins += 1;
  game_dict.team_seasons[losing_team_index].record.losses += 1;

  if (game_dict.team_seasons[winning_team_index].record.win_streak >= 0) {
    game_dict.team_seasons[winning_team_index].record.win_streak += 1;
  } else {
    game_dict.team_seasons[winning_team_index].record.win_streak = 1;
  }

  if (game_dict.team_seasons[losing_team_index].record.win_streak > 0) {
    game_dict.team_seasons[losing_team_index].record.win_streak = -1;
  } else {
    game_dict.team_seasons[losing_team_index].record.win_streak -= 1;
  }

  game_dict.team_seasons[winning_team_index].record.defeated_teams.push(
    game_dict.team_seasons[losing_team_index].team_season_id
  );

  if (is_conference_game) {
    game_dict.team_seasons[winning_team_index].record.conference_wins += 1;
    game_dict.team_seasons[losing_team_index].record.conference_losses += 1;
  }

  game_dict.game.outcome = {
    winning_team: {
      team_id: game_dict.teams[winning_team_index].team_id,
      team_season_id: game_dict.team_seasons[winning_team_index].team_season_id,
      team_game_id: game_dict.team_games[winning_team_index].team_game_id,
      points: scoring.final[winning_team_index],
    },
    losing_team: {
      team_id: game_dict.teams[losing_team_index].team_id,
      team_season_id: game_dict.team_seasons[losing_team_index].team_season_id,
      team_game_id: game_dict.team_games[losing_team_index].team_game_id,
      points: scoring.final[losing_team_index],
    },
  };

  game_dict.team_seasons[0].record.conference_net_wins =
    game_dict.team_seasons[0].record.conference_wins -
    game_dict.team_seasons[0].record.conference_losses;
  game_dict.team_seasons[1].record.conference_net_wins =
    game_dict.team_seasons[1].record.conference_wins -
    game_dict.team_seasons[1].record.conference_losses;

  game_dict.team_seasons[0].record.net_wins =
    game_dict.team_seasons[0].record.wins -
    game_dict.team_seasons[0].record.losses;
  game_dict.team_seasons[1].record.net_wins =
    game_dict.team_seasons[1].record.wins -
    game_dict.team_seasons[1].record.losses;

  game_dict.team_seasons[0].record.games_played += 1;
  game_dict.team_seasons[1].record.games_played += 1;

  game_dict.team_games[0].record = game_dict.team_seasons[0].record;
  game_dict.team_games[1].record = game_dict.team_seasons[1].record;

  game_dict.team_seasons[0].top_stats = [];
  game_dict.team_seasons[1].top_stats = [];

  for (var player_team_season_id in game_dict.player_team_games) {
    let pts = game_dict.player_team_seasons[player_team_season_id];
    let ptg = game_dict.player_team_games[player_team_season_id];

    let player_team_index = 1;
    if (
      pts.team_season_id ==
      game_dict.team_seasons[0].team_season_id
    ) {
      player_team_index = 0;
    }

    let ts = game_dict.team_seasons[player_team_index];
    let tg = game_dict.team_games[player_team_index];
    let opponent_team_game = game_dict.team_games[(player_team_index + 1) % 2];

    for (var stat_group in ptg.game_stats) {
      if (stat_group == "top_stats") {
        continue;
      }

      for (var stat in ptg.game_stats[stat_group]) {
        var stat_value = ptg.game_stats[stat_group][stat];
        if (stat_value != 0) {
          if (stat == "lng") {
            tg.game_stats[stat_group][stat] = Math.max(
              tg.game_stats[stat_group][stat],
              stat_value
            );
            pts.season_stats[stat_group][stat] = Math.max(
              pts.season_stats[stat_group][stat],
              stat_value
            );
          } else {
            tg.game_stats[stat_group][stat] = (tg.game_stats[stat_group][stat] || 0) + (stat_value || 0);
            pts.season_stats[stat_group][stat] = (pts.season_stats[stat_group][stat] || 0) + (stat_value || 0);
          }
        }
      }
    }

    calculate_game_score(
      ptg,
      pts,
      tg,
      ts,
      opponent_team_game
    );
  }

  for (const team_index of [0, 1]) {
    var team_game = game_dict.team_games[team_index];
    var team_season = game_dict.team_seasons[team_index];

    var opponent_team_index = (team_index + 1) % 2;
    opponent_team_game = game_dict.team_games[opponent_team_index];
    opponent_team_season = game_dict.team_seasons[opponent_team_index];

    opponent_team_game.opponent_game_stats = deep_copy(team_game.game_stats);

    // console.log({'team_game': team_game, 'team_season': team_season})
    // console.log({'team_game.game_stats': team_game.game_stats, 'team_season.stats.season_stats': team_season.stats.season_stats})
    increment_parent(team_game.game_stats, team_season.stats.season_stats);
    increment_parent(
      team_game.game_stats,
      opponent_team_season.stats.opponent_season_stats
    );
  }

  game_dict.team_seasons[0].top_stats =
    game_dict.team_seasons[0].top_stats.slice(0, 4);
  game_dict.team_seasons[1].top_stats =
    game_dict.team_seasons[1].top_stats.slice(0, 4);

  game_dict.team_games[0].top_stats = game_dict.team_games[0].top_stats.slice(
    0,
    4
  );
  game_dict.team_games[1].top_stats = game_dict.team_games[1].top_stats.slice(
    0,
    4
  );

  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-final-span`).text('Final')
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-home-score`).text(scoring.final[1])
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-away-score`).text(scoring.final[0])

  let modal_winning_team_suffix = game_dict.team_games[winning_team_index].is_home_team ? 'home' : 'away';

  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-team-name`).addClass('bold');
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-score`).addClass('bold');

  return game_dict;
};

const sim_week_games = async (this_week, common) => {
  $('.modal-body').empty();
  $('.modal-body').append(`<div class='width100 left-text'>Simulating <span class=''>${this_week.week_name}</span></div>`);

  var url = "/static/html_templates/common_templates/sim_game_modal_result_table.njk";
  var html = await fetch(url);
  html = await html.text();

  const db = await common.db;
  var startTime = performance.now();
  common.startTime = startTime;

  var team_games_this_week = await db.team_game
    .where({ week_id: this_week.week_id })
    .toArray();
  team_games_by_game_id = index_group_sync(
    team_games_this_week,
    "group",
    "game_id"
  );

  var team_season_ids_playing_this_week = team_games_this_week.map(
    (tg) => tg.team_season_id
  );
  var team_seasons = await db.team_season.bulkGet(
    team_season_ids_playing_this_week
  );

  var team_season_stats = await db.team_season_stats.bulkGet(
    team_season_ids_playing_this_week
  );
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

  var team_seasons_by_team_season_id = await index_group(
    team_seasons,
    "index",
    "team_season_id"
  );
  var teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var player_team_seasons = await db.player_team_season
    .where("team_season_id")
    .anyOf(team_season_ids_playing_this_week)
    .toArray();
  var player_team_seasons_by_team_season_id = await index_group(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  var player_ids = player_team_seasons.map((pts) => pts.player_id);
  var player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );

  const player_team_season_stats = await db.player_team_season_stats.bulkGet(
    player_team_season_ids
  );
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

  const players_by_player_id = index_group_sync(
    await db.player.bulkGet(player_ids),
    "index",
    "player_id"
  );

  games_this_week = await db.game
    .where({ week_id: this_week.week_id })
    .toArray();
  games_this_week = games_this_week.filter((g) => g.was_played == false);
  games_this_week = games_this_week.sort((g_a, g_b) => g_a.summed_national_rank - g_b.summed_national_rank);
  //games_this_week = games_this_week.filter((g) => g.home_team_season_id > 0 && g.away_team_season_id > 0);
  //games_this_week = games_this_week.filter(g => g.was_played == false);

  console.log({
    games_this_week: games_this_week,
    team_games_this_week: team_games_this_week,
  });

  //   games_this_week = games_this_week.sort(function (game_a, game_b) {
  //     var game_a_total_rank =
  //       team_seasons_by_team_season_id[game_a.home_team_season_id].rankings.national_rank[0] +
  //       team_seasons_by_team_season_id[game_a.away_team_season_id].rankings.national_rank[0] +
  //       Math.min(
  //         team_seasons_by_team_season_id[game_a.home_team_season_id].rankings.national_rank[0],
  //         team_seasons_by_team_season_id[game_a.away_team_season_id].rankings.national_rank[0]
  //       );
  //     var game_b_total_rank =
  //       team_seasons_by_team_season_id[game_b.home_team_season_id].rankings.national_rank[0] +
  //       team_seasons_by_team_season_id[game_b.away_team_season_id].rankings.national_rank[0] +
  //       Math.min(
  //         team_seasons_by_team_season_id[game_b.home_team_season_id].rankings.national_rank[0],
  //         team_seasons_by_team_season_id[game_b.away_team_season_id].rankings.national_rank[0]
  //       );
  // 	//   console.log({game_a:game_a, game_b:game_b, team_seasons_by_team_season_id:team_seasons_by_team_season_id, game_a_total_rank:game_a_total_rank, game_b_total_rank:game_b_total_rank})
  //     return game_a_total_rank - game_b_total_rank;
  //   });

  console.log({
    games_this_week: games_this_week,
    team_seasons_by_team_season_id: team_seasons_by_team_season_id,
  });

  var game_dicts_this_week = [];

  const last_player_team_game = await db.player_team_game
    .orderBy("player_team_game_id")
    .last();

  var player_team_game_id_counter = 1;
  if (last_player_team_game != undefined) {
    player_team_game_id_counter = last_player_team_game.player_team_game_id + 1;
  }

  const last_headline = await db.headline.orderBy("headline_id").last();

  var headline_id_counter = 1;
  if (last_headline != undefined) {
    headline_id_counter = last_headline.headline_id + 1;
  }

  common.headline_id_counter = headline_id_counter;

  for (const game of games_this_week) {
    game_dict = { game: game };
    team_games = team_games_by_game_id[game.game_id].sort(function (a, b) {
      if (a.is_home_team) return 1;
      if (b.is_home_team) return -1;
      return 0;
    });

    team_seasons = [];
    teams = [];
    var player_team_seasons = [];
    var players = [],
      players_list = [],
      player_team_games = {};

    for (let tg of team_games) {
      team_seasons.push(team_seasons_by_team_season_id[tg.team_season_id]);
    }

    for (let ts of team_seasons) {
      teams.push(teams_by_team_id[ts.team_id]);
    }

    var ind = 0;
    for (let team_season of team_seasons) {
      var player_team_seasons_to_add = index_group_sync(
        player_team_seasons_by_team_season_id[team_season.team_season_id],
        "index",
        "player_team_season_id"
      );
      player_team_seasons = {
        ...player_team_seasons,
        ...player_team_seasons_to_add,
      };

      for (let player_team_season_id in player_team_seasons_to_add) {
        pts = player_team_seasons_to_add[player_team_season_id];
        pts.games_played += 1;
        pts.team_games_played += 1;
        let new_player_team_game = new player_team_game(
          player_team_game_id_counter,
          team_games[ind].team_game_id,
          pts.player_team_season_id
        );

        player_team_games[player_team_season_id] = new_player_team_game;

        player_team_game_id_counter += 1;
      }

      players_list = player_team_seasons_by_team_season_id[
        team_season.team_season_id
      ].map((pts) => players_by_player_id[pts.player_id]);

      var players_to_add = index_group_sync(players_list, "index", "player_id");
      players = { ...players, ...players_to_add };
      ind += 1;
    }

    game_dict.team_games = team_games;
    game_dict.team_seasons = team_seasons;
    game_dict.teams = teams;
    game_dict.player_team_seasons = player_team_seasons;
    game_dict.players = players;
    game_dict.player_team_games = player_team_games;
    game_dict.headlines = [];

    game_dicts_this_week.push(game_dict);

    console.log({game_dict:game_dict})

    let renderedHtml = common.nunjucks_env.renderString(html, game_dict);
    $(".modal-body").append(renderedHtml);
  
  }

  var completed_games = [],
    completed_game = undefined;

  for (const game_dict of game_dicts_this_week) {
    console.log({game_dict:game_dict})
    completed_game = sim_game(game_dict, common);
    completed_games.push(completed_game);
  }

  common.stopwatch(common, "Done simming games");

  var game_ids_to_save = [];
  var games_to_save = [];

  var team_game_ids_to_save = [];
  var team_games_to_save = [];

  var team_seasons_to_save = [];
  var team_season_stats_to_save = [];
  var player_team_games_to_save = [];
  var player_team_seasons_to_save = [];
  var player_team_season_stats_to_save = [];
  var headlines_to_save = [];

  for (completed_game of completed_games) {
    game_ids_to_save.push(completed_game.game_id);

    delete completed_game.game.home_team_season;
    delete completed_game.game.away_team_season;

    games_to_save.push(completed_game.game);

    for (let tg of completed_game.team_games) {
      team_game_ids_to_save.push(tg.team_game_id);
      for (let [game_stat_group_name, game_stat_group] of Object.entries(tg.game_stats)){
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)){
          if (!stat_value){
            delete tg.game_stats[game_stat_group_name][stat_name];
          }
        }
      }
      for (let [game_stat_group_name, game_stat_group] of Object.entries(tg.opponent_game_stats)){
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)){
          if (!stat_value){
            delete tg.opponent_game_stats[game_stat_group_name][stat_name];
          }
        }
      }
      team_games_to_save.push(tg);
    }

    for (let ts of completed_game.team_seasons) {
      team_season_stats_to_save.push(ts.stats);
      delete ts.stats;
      delete ts.team_games;
      team_seasons_to_save.push(ts);
    }

    for ([player_team_game_id, ptg] of Object.entries(
      completed_game.player_team_games
    )) {
      if (ptg.game_stats.games.games_played > 0) {
        delete ptg.game_attrs;
        for (let [game_stat_group_name, game_stat_group] of Object.entries(ptg.game_stats)){
          for (let [stat_name, stat_value] of Object.entries(game_stat_group)){
            if (!stat_value){
              // console.log({
              //   game_stat_group_name:game_stat_group_name, stat_name:stat_name, ptg:ptg, 'ptg.game_stats': ptg.game_stats
              // })
              delete ptg.game_stats[game_stat_group_name][stat_name];
            }
          }
        }
        player_team_games_to_save.push(ptg);
      }
    }

    for ([player_team_season_id, pts] of Object.entries(
      completed_game.player_team_seasons
    )) {
      for (let [game_stat_group_name, game_stat_group] of Object.entries(pts.season_stats)){
        for (let [stat_name, stat_value] of Object.entries(game_stat_group)){
          if (!stat_value){
            delete pts.season_stats[game_stat_group_name][stat_name];
          }
        }
      }

      player_team_season_stats_to_save.push(pts.season_stats);
      delete pts.season_stats;
      player_team_seasons_to_save.push(pts);
    }

    for (hdl of completed_game.headlines) {
      headlines_to_save.push(hdl);
    }
  }

  common.stopwatch(common, "Done compiling stats");

  const updated_games = await db.game.bulkPut(games_to_save);
  const updated_team_games = await db.team_game.bulkPut(team_games_to_save);
  const updated_team_seasons = await db.team_season.bulkPut(
    team_seasons_to_save
  );
  const updated_team_season_stats = await db.team_season_stats.bulkPut(
    team_season_stats_to_save
  );
  const updated_player_team_season_stats =
    await db.player_team_season_stats.bulkPut(player_team_season_stats_to_save);
    console.log('Updating player_team_seasons in sim_week_games', player_team_seasons_to_save)
    const updated_player_team_seasons = await db.player_team_season.bulkPut(
    player_team_seasons_to_save
  );
  const saved_player_team_games = await db.player_team_game.bulkAdd(
    player_team_games_to_save
  );
  const saved_headlines = await db.headline.bulkAdd(headlines_to_save);

  console.log({ updated_games: updated_games });

  common.stopwatch(common, "Done compiling stats");

  var endTime = performance.now();
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms`);
};

const calculate_team_needs = async (common) => {
  var startTime = performance.now();

  const db = await common.db;
  const season = common.season;
  let team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  const player_team_seasons = await db.player_team_season
    .where({ season: season })
    .toArray();
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
    OT: [1, 1, 0.2],
    IOL: [1, 1, 1, 0.2],
    EDGE: [1, 1, 0.5, 0.25],
    DL: [1, 0.9, 0.4, 0.25],
    LB: [1, 1, 1, 0.75, 0.25],
    CB: [1, 1, 0.6, 0.25],
    S: [1, 1, 0.4],
    K: [1],
    P: [1],
  };

  const overall_list = [99, 95, 90, 85, 80, 75, 70, 65, 60, 55, 45, 0];

  const class_map = {
    SR: 0,
    JR: 1,
    SO: 2,
    FR: 3,
    "HS SR": 4,
  };

  for (const team_season of team_seasons) {
    team_season.recruiting.position_needs = {};
    for (const [position, player_team_season_ids] of Object.entries(
      team_season.depth_chart_with_recruits
    )) {
      team_season.recruiting.position_needs[position] = [];
      let position_player_overalls = player_team_season_ids.map((pts_id) => ({
        class_val:
          class_map[
            player_team_seasons_by_player_team_season_id[pts_id].class
              .class_name
          ],
        class:
          player_team_seasons_by_player_team_season_id[pts_id].class.class_name,
        overall:
          player_team_seasons_by_player_team_season_id[pts_id].ratings.overall
            .overall,
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
          let overall_playtime_modifier =
            position_starters_map[position][overall_index] || 0;
          overall_obj.playing_time_val += overall_playtime_modifier;
        }
        overall_obj.playing_time_val = Math.ceil(
          overall_obj.playing_time_val * 5
        );
        team_season.recruiting.position_needs[position].push(overall_obj);
      }
    }
  }

  // team_seasons.forEach((ts) => delete ts.recruiting);

  await db.team_season.bulkPut(team_seasons);

  var endTime = performance.now();
  console.log(
    `Time taken to calculate_team_needs: ${parseInt(endTime - startTime)} ms`
  );
};

const calculate_team_overalls = async (common) => {
  const db = await common.db;
  const season = common.season;
  const team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const position_map = {
    QB: { group: "Offense", unit: "QB", typical_starters: 1 },
    RB: { group: "Offense", unit: "RB", typical_starters: 1 },
    FB: { group: "Offense", unit: "FB", typical_starters: 1 },
    WR: { group: "Offense", unit: "REC", typical_starters: 2 },
    TE: { group: "Offense", unit: "REC", typical_starters: 1 },
    OT: { group: "Offense", unit: "OL", typical_starters: 2 },
    IOL: { group: "Offense", unit: "OL", typical_starters: 3 },

    EDGE: { group: "Defense", unit: "DL", typical_starters: 2 },
    DL: { group: "Defense", unit: "DL", typical_starters: 2 },
    LB: { group: "Defense", unit: "LB", typical_starters: 3 },
    CB: { group: "Defense", unit: "DB", typical_starters: 2 },
    S: { group: "Defense", unit: "DB", typical_starters: 2 },

    K: { group: "Special Teams", unit: "ST", typical_starters: 1 },
    P: { group: "Special Teams", unit: "ST", typical_starters: 1 },
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

  console.log({team_seasons:team_seasons})
  var player_team_season_ids = team_seasons
    .map((ts) =>
      Object.entries(ts.depth_chart)
        .map((pos_obj) =>
          pos_obj[1].slice(0, position_map[pos_obj[0]].typical_starters)
        )
        .flat()
    )
    .flat();
  const player_team_seasons = await db.player_team_season.bulkGet(
    player_team_season_ids
  );
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
          (pts_id) =>
            player_team_seasons_by_player_team_season_id[pts_id].ratings.overall
              .overall
        )
        .reduce((acc, val) => acc + val, 0);

      team_season.rating.overall.count +=
        position_map[position].typical_starters;
      team_season.rating.by_position[position].count +=
        position_map[position].typical_starters;
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

    rating_min_max.overall.max = Math.max(
      rating_min_max.overall.max,
      team_season.rating.overall
    );
    rating_min_max.overall.min = Math.min(
      rating_min_max.overall.min,
      team_season.rating.overall
    );

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
  var goal_overall_min = 60;
  var goal_overall_range = goal_overall_max - goal_overall_min;

  for (const team_season of team_seasons) {
    team_season.rating.overall = Math.floor(
      ((team_season.rating.overall - rating_min_max.overall.min) *
        goal_overall_range) /
        (rating_min_max.overall.max - rating_min_max.overall.min) +
        goal_overall_min
    );

    for (const position in team_season.rating.by_position) {
      team_season.rating.by_position[position] = Math.floor(
        ((team_season.rating.by_position[position] -
          rating_min_max.by_position[position].min) *
          goal_overall_range) /
          (rating_min_max.by_position[position].max -
            rating_min_max.by_position[position].min) +
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

  await db.team_season.bulkPut(team_seasons);
};

const calculate_primetime_games = async (this_week, all_weeks, common) => {
  const db = common.db;
  const season = common.season;

  let teams = await db.team.toArray();
  let teams_by_team_id = index_group_sync(teams, 'index', 'team_id')

  let team_seasons = await db.team_season.where({season:season}).toArray();
  team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team');

  let team_seasons_by_team_season_id = index_group_sync(team_seasons, 'index', 'team_season_id');

  let next_week = await db.week.get({week_id: this_week.week_id + 1})

  let games = await db.game.where({week_id: next_week.week_id}).toArray()

  games.filter(g => g.home_team_season_id > 0).forEach(function(g){
    g.home_team_season = team_seasons_by_team_season_id[g.home_team_season_id]
    g.away_team_season = team_seasons_by_team_season_id[g.away_team_season_id]

    let min_national_rank = Math.min(g.home_team_season.national_rank, g.away_team_season.national_rank)
    g.summed_national_rank = g.home_team_season.national_rank + g.away_team_season.national_rank;

    g.summed_national_rank -= Math.floor(g.home_team_season.team.team_ratings.brand / 4);
    g.summed_national_rank -= Math.floor(g.away_team_season.team.team_ratings.brand / 4);

    if ((g.home_team_season.conference_season_id == g.away_team_season.conference_season_id)){
      if (next_week.schedule_week_number >= 13 ){
        if (g.home_team_season.record.conference_gb <= 0.5 && g.away_team_season.record.conference_gb <= 0.5){
          g.summed_national_rank -= 14;
        }
        else if (g.home_team_season.record.conference_gb <= 1.5 && g.away_team_season.record.conference_gb <= 1.5){
          g.summed_national_rank -= 7;
        }
      }
      else if (next_week.schedule_week_number >= 8 ){
        if (g.home_team_season.record.conference_gb <= 0.5 && g.away_team_season.record.conference_gb <= 0.5){
          g.summed_national_rank -= 7;
        }
        else if (g.home_team_season.record.conference_gb <= 1.5 && g.away_team_season.record.conference_gb <= 1.5){
          g.summed_national_rank -= 3;
        }
      }

      delete g.home_team_season;
      delete g.away_team_season;
    }

    if (g.rivalry_game){
      g.summed_national_rank -= min_national_rank;
    }
  })

  games = games.sort((g_a, g_b) => g_a.summed_national_rank - g_b.summed_national_rank);
  let primetime_games = games.slice(0,5);

  console.log({games:games, primetime_games:primetime_games})
  if (primetime_games.length){
    console.log({'primetime_games[0]': primetime_games[0]})
    primetime_games.forEach(g => g.is_primetime_game = true);
    primetime_games[0].is_game_of_the_week = true;
  }

  await db.game.bulkPut(games);
}

const calculate_national_rankings = async (this_week, all_weeks, common) => {
  const db = common.db;

  let ls = await db.league_season.get({season: common.season});
  let teams = await db.team.toArray();
  let team_seasons = await db.team_season
    .where({ season: common.season })
    .filter(ts => ts.team_id > 0)
    .toArray();
  let team_season_ids = team_seasons.map((ts) => ts.team_season_id);

  let conferences = await db.conference.toArray();
  let conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

  let conference_seasons = await db.conference_season.where({season: common.season}).toArray();
  conference_seasons = nest_children(conference_seasons,conferences_by_conference_id, 'conference_id', 'conference' );
  let conference_seasons_by_conference_season_id = index_group_sync(conference_seasons, 'index', 'conference_season_id');
  
  team_seasons = nest_children(team_seasons, conference_seasons_by_conference_season_id, 'conference_season_id', 'conference_season')

  let weeks = await db.week.where('season').between(common.season-1, common.season+1, true, true).toArray();
  let weeks_by_week_id = index_group_sync(weeks, 'index', 'week_id');
  let current_week = weeks.find(w => w.is_current);

  console.log({weeks: weeks, current_week:current_week})

  let team_season_stats = await db.team_season_stats.bulkGet(team_season_ids);
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

  let team_games = await db.team_game
    .where("team_season_id")
    .anyOf(team_season_ids)
    .toArray();
  let game_ids = team_games.map((tg) => tg.game_id);
  let games = await db.game.bulkGet(game_ids);
  games = nest_children(games, weeks_by_week_id, 'week_id', 'week')

  let games_by_game_id = index_group_sync(games, "index", "game_id");

  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  //team_games = team_games.filter((tg) => tg.game.was_played);
  // team_games = team_games.filter((tg) => (tg.game.week.schedule_week_number || 2000) <= 1999);
  let team_games_by_team_season_id = index_group_sync(
    team_games,
    "group",
    "team_season_id"
  );

  let teams_by_team_id = index_group_sync(teams, "index", "team_id");
  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  team_seasons = nest_children(
    team_seasons,
    team_games_by_team_season_id,
    "team_season_id",
    "team_games"
  );
  team_seasons = team_seasons.filter((ts) => ts.team_id > 0);
  console.log({ team_seasons: team_seasons });

  let overall_power_modifier = 1;
  if (current_week.week_name == 'Pre-Season'){
    overall_power_modifier = 5;
  }
  if (current_week.schedule_week_number){
    overall_power_modifier = 3 - (current_week.schedule_week_number * .15)
  }


  for (let ts of team_seasons) {
    ts.srs = {
      loops: 0,
      overall_rating: Math.ceil((ts.rating.overall ** overall_power_modifier)  / (99 ** (overall_power_modifier - 1))),
      brand: Math.ceil((ts.team.team_ratings.brand ** overall_power_modifier) / (20 ** (overall_power_modifier - 1))),
      wins:0,
      losses:0,
      games_played:0,
      fractional_wins:0,
      fractional_losses:0,
      fractional_games_played:0
    };

    ts.team_games = ts.team_games || []

    ts.srs.all_team_season_ids = ts.team_games.map(tg => tg.opponent_team_season_id);
    ts.srs.played_team_season_ids = ts.team_games.filter(tg => tg.game.was_played).map(tg => tg.opponent_team_season_id);
    ts.srs.unplayed_team_season_ids = ts.team_games.filter(tg => !tg.game.was_played).map(tg => tg.opponent_team_season_id);
    
    ts.played_team_games = ts.team_games.filter(tg => tg.game.was_played).sort((tg_a, tg_b) => tg_a.game.week_id - tg_b.game.week_id);
    ts.srs.games_played = ts.played_team_games.length;

    let game_index = 0;
    for (let tg of ts.played_team_games) {
      ts.srs.wins += (tg.is_winning_team ? 1 : 0);
      ts.srs.losses += (tg.is_winning_team ? 0 : 1);

      tg.game_fractional_share = ((1.0 / (ts.srs.games_played - game_index)) ** .2)
      
      ts.srs.fractional_wins += ((tg.is_winning_team ? 1.0 : 0) * tg.game_fractional_share);
      ts.srs.fractional_losses += ((tg.is_winning_team ? 0 : 1.0) * tg.game_fractional_share);

      ts.srs.fractional_games_played += tg.game_fractional_share
      game_index += 1;
    }
    ts.srs.net_win_count = ts.srs.wins - ts.srs.losses;
    ts.srs.fractional_net_win_count = ts.srs.fractional_wins - ts.srs.fractional_losses;
    ts.srs.rating = ts.srs.overall_rating + ts.srs.brand + ts.srs.fractional_net_win_count;
    ts.srs.original_rating = ts.srs.rating;
    ts.srs.rating_list = [ts.srs.rating];
  }

  let overall_list = team_seasons.map(ts => ts.srs.rating);
  let average_overall = Math.ceil(average(overall_list))

  let team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  console.log({ team_seasons: team_seasons, average_overall:average_overall, overall_list:overall_list });

  for (let iter_ind = 1; iter_ind <= 3; iter_ind++) {
    for (let ts of Object.values(team_seasons_by_team_season_id)) {
      let total_opponent_rating = 0;
      let fractional_opponent_rating = 0;
      for (let tg of ts.played_team_games) {
        total_opponent_rating +=
          team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating;
        fractional_opponent_rating +=
          (team_seasons_by_team_season_id[tg.opponent_team_season_id].srs.rating * tg.game_fractional_share);

      }
      ts.srs.schedule_factor = Math.round(
        (fractional_opponent_rating + (ts.srs.fractional_net_win_count * (average_overall))) / (ts.srs.fractional_games_played || 1)
      );

    }

    for (let ts of Object.values(team_seasons_by_team_season_id)) {
        // ts.srs.rating = (ts.srs.original_rating + ts.srs.schedule_factor) / 2;
        ts.srs.rating = ((ts.srs.rating * iter_ind) + ts.srs.schedule_factor) / (iter_ind + 1);
        ts.srs.rating_list.unshift(ts.srs.rating)
    }
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    // ts.srs.rating = Math.round(((ts.srs.rating * 1) + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
    if (ts.srs.games_played <= 2){
      ts.srs.rating *= ts.srs.games_played;
      ts.srs.rating += ((2 - ts.srs.games_played) * ts.srs.original_rating);
      ts.srs.rating /= 2;
    }
    ts.srs.rating = Math.round(((ts.srs.rating * 9) + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 10);
  }

  for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
    ts.srs.sos = ts.srs.sos || {}
    let count = 0;
    let summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.all_team_season_ids){
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count +=1;
    }

    if (count){
      ts.srs.sos.sos_all_opponents = summed_srs / count;
    }
    else {
      ts.srs.sos.all_opponents = 0;
    }

     count = 0;
     summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.played_team_season_ids){
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count +=1;
    }

    if (count){
      ts.srs.sos.sos_played_opponents = summed_srs / count;
    }
    else {
      ts.srs.sos.played_opponents = 0;
    }

    count = 0;
    summed_srs = 0;
    for (let opponent_team_season_id of ts.srs.unplayed_team_season_ids){
      summed_srs += team_seasons_by_team_season_id[opponent_team_season_id].srs.rating;
      count +=1;
    }

    if (count){
      ts.srs.sos.sos_unplayed_opponents = summed_srs * 1.0 / count;
    }
    else {
      ts.srs.sos.unplayed_opponents = 0;
    }

    console.log({
      summed_srs:summed_srs, count:count, 'ts.srs.unplayed_team_season_ids': ts.srs.unplayed_team_season_ids, 'ts.srs.sos.sos_unplayed_opponents': ts.srs.sos.sos_unplayed_opponents, ts:ts
    })
  }

  console.log({team_seasons_by_team_season_id:team_seasons_by_team_season_id})

  team_seasons = team_seasons.sort(function(ts_a, ts_b){
    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;
    return 0;
  })

  // for (let [team_season_id, ts] of Object.entries(team_seasons_by_team_season_id)) {
  //   ts.srs.rating = Math.round((ts.srs.rating + ((ts.rankings.srs_ratings[0] || ts.srs.rating) * 1)) / 2);
  // }

  let sorted_team_seasons = team_seasons.sort(function(ts_a, ts_b){
    
    if (ts_a.results.national_champion) return -1;
    if (ts_b.results.national_champion) return 1;

    if (ls.playoffs.playoffs_started && !ls.playoffs.playoffs_complete){
      if ((ts_a.playoff.seed || 200) < (ts_b.playoff.seed || 200)) return -1;
      if ((ts_a.playoff.seed || 200) > (ts_b.playoff.seed || 200)) return 1;
    }

    if (ts_a.srs.rating < ts_b.srs.rating) return 1;
    if (ts_a.srs.rating > ts_b.srs.rating) return -1;

    if (ts_a.record.defeated_teams.includes(ts_b.team_season_id) && !ts_b.record.defeated_teams.includes(ts_a.team_season_id)) return -1;
    if (ts_b.record.defeated_teams.includes(ts_a.team_season_id)) return 1;

    if (ts_a.record.losses < ts_b.record.losses) return -1;
    if (ts_a.record.losses > ts_b.record.losses) return 1;

    if (ts_a.record.net_wins > ts_b.record.net_wins) return -1;
    if (ts_a.record.net_wins < ts_b.record.net_wins) return 1;

    if (
      ts_a.team.team_ratings.program_history >
      ts_b.team.team_ratings.program_history
    )
      return -1;
    if (
      ts_b.team.team_ratings.program_history <
      ts_a.team.team_ratings.program_history
    )
      return 1;

    return 0;
  });

  rank_counter = 1;

  for (var team_season of sorted_team_seasons) {
    team_season.rankings.national_rank.unshift(rank_counter);
    team_season.rankings.srs_ratings.unshift(team_season.srs.rating)
    team_season.rankings.sos = team_season.rankings.sos || {
      all_opponents_sos:[],played_opponents_sos:[],unplayed_opponents_sos:[],
      all_opponents_sos_ranking:[],played_opponents_sos_ranking:[],unplayed_opponents_sos_ranking:[],
    };
    team_season.rankings.sos.all_opponents_sos.unshift(team_season.srs.sos.sos_all_opponents)
    team_season.rankings.sos.played_opponents_sos.unshift(team_season.srs.sos.sos_played_opponents)
    team_season.rankings.sos.unplayed_opponents_sos.unshift(team_season.srs.sos.sos_unplayed_opponents)
    rank_counter += 1;


    if (team_season.rankings.national_rank.length > 1) {
      team_season.rankings.national_rank_delta =
        team_season.rankings.national_rank[1] -
        team_season.rankings.national_rank[0];
      team_season.rankings.national_rank_delta_abs = Math.abs(
        team_season.rankings.national_rank_delta
      );
    } else {
      team_season.rankings.national_rank_delta = 0;
      team_season.rankings.national_rank_delta_abs = 0;
    }
  }

  console.log({sorted_team_seasons:sorted_team_seasons})
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
    return ts_b.rankings.sos.unplayed_opponents_sos[0] - ts_a.rankings.sos.unplayed_opponents_sos[0];
  });
  rank_counter = 1;
  for (var team_season of sorted_team_seasons) {
    team_season.rankings.sos.unplayed_opponents_sos_ranking.unshift(rank_counter);
    rank_counter += 1;
  }

  let last_headline = await db.headline.orderBy('headline_id').last();
  let headline_id = last_headline ? last_headline.headline_id + 1 : 1;
  let ranking_headlines = await generate_ranking_headlines(common, sorted_team_seasons, current_week, headline_id);

  console.log({ sorted_team_seasons: sorted_team_seasons, ranking_headlines:ranking_headlines });
  for (team_season of sorted_team_seasons) {
    delete team_season.team;
    delete team_season.season_stats;
    delete team_season.team_games;
    delete team_season.srs;
    delete team_season.conference_season;
  }
  await db.team_season.bulkPut(sorted_team_seasons);
  await db.headline.bulkPut(ranking_headlines);
};

const calculate_conference_rankings = async (this_week, all_weeks, common) => {
  const db = await common.db;
  const all_weeks_by_week_id = index_group_sync(all_weeks, "index", "week_id");

  next_week = all_weeks_by_week_id[this_week.week_id + 1];
  const conference_seasons = await db.conference_season.where({season: common.season}).toArray();

  const team_seasons = await db.team_season
                                  .where({ season: this_week.phase.season })
                                  .and((ts) => ts.team_id > 0)
                                  .toArray();

  const team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var rank_counter = 0,
    sorted_team_seasons = [],
    team_seasons_to_save = [];

  for (var conference_season of conference_seasons) {
    var conference_team_seasons =
        team_seasons_by_conference_season_id[conference_season.conference_season_id];
    
    console.log({conference_seasons:conference_seasons, conference_season:conference_season, team_seasons_by_conference_season_id:team_seasons_by_conference_season_id})

    for (let division of conference_season.divisions) {
      let division_team_seasons = conference_team_seasons.filter(ts => ts.division_name == division.division_name);

      sorted_team_seasons = division_team_seasons.sort(function (a, b) {
        if (a.results.conference_champion) return -1;
        if (b.results.conference_champion) return 1;

        if (a.record.conference_net_wins > b.record.conference_net_wins)
          return -1;
        if (a.record.conference_net_wins < b.record.conference_net_wins) return 1;

        if (a.record.defeated_teams.includes(b.team_season_id)) return -1;
        if (b.record.defeated_teams.includes(a.team_season_id)) return 1;

        if (a.record.conference_losses > b.record.conference_losses) return 1;
        if (a.record.conference_losses < b.record.conference_losses) return -1;

        if (a.rankings.national_rank[0] > b.rankings.national_rank[0]) return 1;
        if (a.rankings.national_rank[0] < b.rankings.national_rank[0]) return -1;

        return 0;
      });

      rank_counter = 1;
      top_conference_net_wins = sorted_team_seasons[0].record.conference_net_wins;
      for (var team_season of sorted_team_seasons) {
        team_season.record.conference_gb =
          (top_conference_net_wins - team_season.record.conference_net_wins) / 2;
        team_season.rankings.division_rank.unshift(rank_counter);
        rank_counter += 1;

        team_seasons_to_save.push(team_season);
      }
    }
  }

  await db.team_season.bulkPut(team_seasons_to_save);
};

const weekly_recruiting = async (common) => {
  var startTime = performance.now();

  const db = common.db;
  const season = common.season;
  const this_week = await db.week
    .where({ season: season })
    .and((w) => w.is_current)
    .first();

  console.log({ this_week: this_week, season: season, db: db });

  var this_week_id = this_week.week_id;

  const teams = await db.team.where("team_id").above(0).toArray();
  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  const team_season_ids = team_seasons.map((ts) => ts.team_season_id);
  const team_season_recruitings = await db.team_season_recruiting.bulkGet(
    team_season_ids
  );
  const team_season_recruitings_by_team_season_id = index_group_sync(
    team_season_recruitings,
    "index",
    "team_season_id"
  );

  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  team_seasons = nest_children(
    team_seasons,
    team_season_recruitings_by_team_season_id,
    "team_season_id",
    "recruiting"
  );

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) => ts_b.team.team_ratings.brand - ts_a.team.team_ratings.brand
  );

  for (const team_season of team_seasons) {
    if (!("weeks" in team_season.recruiting)) {
      team_season.recruiting.weeks = {};
    }
    team_season.recruiting.weeks[this_week_id] = [];
  }

  var player_team_seasons = await db.player_team_season
    .where({ season: season })
    .and((pts) => pts.team_season_id < -1)
    .toArray();
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  const player_team_season_recruitings =
    await db.player_team_season_recruiting.bulkGet(player_team_season_ids);
  const player_team_season_recruitings_by_player_team_season_id =
    index_group_sync(
      player_team_season_recruitings,
      "index",
      "player_team_season_id"
    );

  var player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.where("player_id").anyOf(player_ids).toArray();
  var players_by_player_id = index_group_sync(players, "index", "player_id");

  player_team_seasons = nest_children(
    player_team_seasons,
    player_team_season_recruitings_by_player_team_season_id,
    "player_team_season_id",
    "recruiting"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    players_by_player_id,
    "player_id",
    "player"
  );
  player_team_seasons = player_team_seasons.filter(
    (pts) => !(pts.recruiting.signed == true)
  );

  var player_tracker = {};

  for (const player_team_season of player_team_seasons) {
    if (!("weeks" in player_team_season.recruiting)) {
      player_team_season.recruiting.weeks = {};
    }
    player_team_season.recruiting.weeks[this_week_id] = [];
    player_tracker[player_team_season.player_team_season_id] = {
      recruit_calls_remaining: [6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1],
    };
  }

  var player_team_seasons_by_player_team_season_id = index_group_sync(
    player_team_seasons,
    "index",
    "player_team_season_id"
  );

  var all_recruit_team_seasons = [];
  var updated_recruit_team_seasons = [];

  console.log({
    team_seasons: team_seasons,
    player_tracker: player_tracker,
    player_team_seasons: player_team_seasons,
  });

  var team_season_calls_tracker = {};
  var team_seasons_call_order_prep = [];
  var team_seasons_call_order = [];

  for (const team_season of team_seasons) {
    var team_season_id = team_season.team_season_id;
    var prep_obj = {
      team_season_id: team_season_id,
      order_tracker: [],
      brand_odds: team_season.team.team_ratings.brand ** 3,
    };
    prep_obj.recruit_calls_remaining = Math.ceil(
      team_season.team.team_ratings.brand + 20
    );

    var players_to_call = Object.values(
      team_season.recruiting.recruit_team_seasons
    );
    players_to_call = players_to_call.sort(
      (rts_a, rts_b) =>
        rts_b.team_top_level_interest - rts_a.team_top_level_interest
    );
    team_season_calls_tracker[team_season_id] = {
      called_players: [],
      time_remaining: 60,
      players_to_call: players_to_call,
    };
    team_seasons_call_order_prep.push(prep_obj);
  }

  var teams_waiting_to_call = team_seasons_call_order_prep.filter(
    (t_o) => t_o.recruit_calls_remaining > 0
  ).length;
  var loop_count = 0;
  while (teams_waiting_to_call > 0) {
    var team_list = team_seasons_call_order_prep
      .filter((t_o) => t_o.recruit_calls_remaining > 0)
      .map((t_o) => [
        t_o.team_season_id,
        t_o.brand_odds + t_o.recruit_calls_remaining,
      ]);
    var chosen_team_season_id = weighted_random_choice(team_list);
    var chosen_team_obj = team_seasons_call_order_prep.find(
      (t_o) => t_o.team_season_id == chosen_team_season_id
    );

    chosen_team_obj.order_tracker.push(loop_count);
    loop_count += 1;

    chosen_team_obj.recruit_calls_remaining -= 1;
    team_seasons_call_order.push(parseInt(chosen_team_season_id));

    teams_waiting_to_call = team_seasons_call_order_prep.filter(
      (t_o) => t_o.recruit_calls_remaining > 0
    ).length;
  }

  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  console.log({
    team_season_calls_tracker: team_season_calls_tracker,
    player_tracker: player_tracker,
    teams_waiting_to_call: teams_waiting_to_call,
    team_seasons_call_order: team_seasons_call_order,
    team_seasons_call_order_prep: team_seasons_call_order_prep,
  });

  for (const team_season_id of team_seasons_call_order) {
    var team_season_tracker = team_season_calls_tracker[team_season_id];
    var team_season = team_seasons_by_team_season_id[team_season_id];
    var recruit_team_seasons_for_team = team_season_tracker.players_to_call;

    var time_remaining = team_season_tracker.time_remaining;

    // console.log({team_season_id:team_season_id, recruit_team_seasons_for_team:recruit_team_seasons_for_team, team_season:team_season, team_season_tracker:team_season_tracker, time_remaining:time_remaining})

    var loop_count = 0;
    var waiting_for_player = true;
    while (waiting_for_player) {
      if (time_remaining == 0 || recruit_team_seasons_for_team.length == 0) {
        waiting_for_player = false;
        continue;
      }

      var potential_player = recruit_team_seasons_for_team.shift();

      var time_used = 0;
      console.log({
        potential_player: potential_player,
        time_remaining: time_remaining,
        team_season: team_season,
        recruit_team_seasons_for_team: recruit_team_seasons_for_team,
        player_tracker: player_tracker,
        "player_tracker[potential_player.player_team_season_id]":
          player_tracker[potential_player.player_team_season_id],
      });
      if (
        potential_player == undefined ||
        !(potential_player.player_team_season_id in player_tracker)
      ) {
        waiting_for_player = true;
      } else if (
        player_tracker[potential_player.player_team_season_id]
          .recruit_calls_remaining.length > 0
      ) {
        waiting_for_player = false;
        //calls player

        var call_time =
          player_tracker[
            potential_player.player_team_season_id
          ].recruit_calls_remaining.shift();

        call_time = Math.min(call_time, time_remaining);

        team_season_tracker.time_remaining =
          team_season_tracker.time_remaining - call_time;

        // console.log({team_season_id:team_season_id, 'team_season_tracker.time_remaining ': team_season_tracker.time_remaining ,call_time:call_time,  player_tracker:player_tracker, 'player_tracker[potential_player.player_team_season_id]': player_tracker[potential_player.player_team_season_id]})

        //TODO - make this smarter. base off if team knows or not
        var sorted_call_topics = Object.values(
          potential_player.match_ratings
        ).sort((mv_a, mv_b) => mv_b.team - mv_a.team);

        var added_match_rating = 0;
        var added_team_top_level_interest = 0;
        for (const call_topic of sorted_call_topics.slice(0, call_time)) {
          added_match_rating += recruiting_pitch_value(
            player_team_seasons_by_player_team_season_id[
              potential_player.player_team_season_id
            ].recruiting.interests[call_topic.topic],
            call_topic.team
          );
          console.log({
            "player_team_seasons_by_player_team_season_id[potential_player.player_team_season_id]":
              player_team_seasons_by_player_team_season_id[
                potential_player.player_team_season_id
              ],
            call_topic: call_topic,
            added_match_rating: added_match_rating,
            "call_topic.player": call_topic.player,
            "call_topic.team": call_topic.team,
          });
          added_team_top_level_interest += 1;
        }

        console.log({
          added_team_top_level_interest: added_team_top_level_interest,
          added_team_top_level_interest: added_team_top_level_interest,
        });

        player_team_seasons_by_player_team_season_id[
          potential_player.player_team_season_id
        ].recruiting.recruit_team_seasons[
          potential_player.team_season_id
        ].match_rating += added_match_rating;
        team_seasons_by_team_season_id[
          potential_player.team_season_id
        ].recruiting.recruit_team_seasons[
          potential_player.player_team_season_id
        ].team_top_level_interest += added_team_top_level_interest;

        player_team_seasons_by_player_team_season_id[
          potential_player.player_team_season_id
        ].recruiting.weeks[this_week_id].push({
          team_season_id: potential_player.team_season_id,
          call_time: call_time,
          added_match_rating: added_match_rating,
        });
        team_seasons_by_team_season_id[
          potential_player.team_season_id
        ].recruiting.weeks[this_week_id].push({
          player_team_season_id: potential_player.player_team_season_id,
          team_season_id: potential_player.team_season_id,
          call_time: call_time,
          added_match_rating: added_match_rating,
        });
      }

      loop_count += 1;
    }
  }

  // console.log({recruit_team_seasons_by_recruit_team_season_id:recruit_team_seasons_by_recruit_team_season_id, all_recruit_team_seasons:all_recruit_team_seasons, recruit_team_seasons_by_player_team_season_id:recruit_team_seasons_by_player_team_season_id})
  //GROUP RTSs BY PLAYER

  for (const player_team_season_id in player_team_seasons_by_player_team_season_id) {
    var player_team_season =
      player_team_seasons_by_player_team_season_id[player_team_season_id];
    var recruit_team_seasons = Object.values(
      player_team_season.recruiting.recruit_team_seasons
    );
    console.log({
      recruit_team_seasons: recruit_team_seasons,
      player_team_season: player_team_season,
      player_team_season_id: player_team_season_id,
      player_team_seasons_by_player_team_season_id:
        player_team_seasons_by_player_team_season_id,
    });
    recruit_team_seasons = recruit_team_seasons.sort(
      (rts_a, rts_b) => rts_b.match_rating - rts_a.match_rating
    );

    var cutoff = 1;
    if (
      this_week.week_name == "Early Signing Day" &&
      recruit_team_seasons[0].match_rating > 100
    ) {
      cutoff = recruit_team_seasons[0].match_rating * 0.99;
    } else if (recruit_team_seasons[0].match_rating > 1750) {
      cutoff = recruit_team_seasons[0].match_rating * 0.95;
    } else if (recruit_team_seasons[0].match_rating > 2000) {
      cutoff = recruit_team_seasons[0].match_rating * 0.85;
    } else if (recruit_team_seasons[0].match_rating > 1500) {
      cutoff = recruit_team_seasons[0].match_rating * 0.66;
    } else if (recruit_team_seasons[0].match_rating > 1000) {
      cutoff = recruit_team_seasons[0].match_rating * 0.5;
    } else if (
      recruit_team_seasons[0].match_rating > 300 &&
      this_week.schedule_week_number >= 12
    ) {
      cutoff = recruit_team_seasons[0].match_rating * 0.75;
    } else if (
      recruit_team_seasons[0].match_rating > 500 &&
      this_week.schedule_week_number >= 10
    ) {
      cutoff = recruit_team_seasons[0].match_rating * 0.5;
    }

    var recruit_team_seasons_below_cutoff = recruit_team_seasons.filter(
      (rts) => rts.match_rating < cutoff
    );
    var recruit_team_seasons_above_cutoff = recruit_team_seasons.filter(
      (rts) => rts.match_rating >= cutoff
    );

    if (
      recruit_team_seasons[1].match_rating < cutoff &&
      (recruit_team_seasons[0].match_rating > 300 ||
        (recruit_team_seasons[0].match_rating > 100 &&
          this_week.schedule_week_number >= 12))
    ) {
      var signed_recruit_team_season = recruit_team_seasons[0];
      var signed_team_season =
        team_seasons_by_team_season_id[
          signed_recruit_team_season.team_season_id
        ];

      if (signed_team_season.recruiting.scholarships_to_offer > 0) {
        player_team_season.recruiting.signed = true;
        player_team_season.recruiting.signed_team_season_id =
          signed_recruit_team_season.team_season_id;
        player_team_season.recruiting.stage = "Signed";

        var player_stars = player_team_season.recruiting.stars;

        signed_team_season.recruiting.scholarships_to_offer -= 1;

        signed_team_season.recruiting.signed_player_stars[
          "stars_" + player_stars
        ] += 1;

        for (const team_season_id of recruit_team_seasons_below_cutoff) {
          team_seasons_by_team_season_id[
            signed_recruit_team_season.team_season_id
          ].recruiting.recruit_team_seasons[
            player_team_season_id
          ].team_top_level_interest = -1;
        }
      } else {
        signed_team_season.recruiting.recruit_team_seasons[
          player_team_season_id
        ].team_top_level_interest = 0;
      }
    } else {
      //TODO fix this
      console.log("something here");
      // for (const recruit_team_season of recruit_team_seasons_below_cutoff){
      // 	recruit_team_season.team_top_level_interest = recruit_team_season.team_top_level_interest / 2;
      // 	updated_recruit_team_seasons.push(recruit_team_season);
      // }
      // for (const recruit_team_season of recruit_team_seasons_above_cutoff){
      // 	recruit_team_season.team_top_level_interest += parseInt(recruit_team_seasons_below_cutoff.length / 10);
      // 	updated_recruit_team_seasons.push(recruit_team_season);
      // }
    }
  }

  var team_seasons = Object.values(team_seasons_by_team_season_id);

  team_seasons = team_seasons.map(function (ts) {
    ts.recruiting.signed_player_stars["total"] =
      ts.recruiting.signed_player_stars["stars_5"] +
      ts.recruiting.signed_player_stars["stars_4"] +
      ts.recruiting.signed_player_stars["stars_3"] +
      ts.recruiting.signed_player_stars["stars_2"] +
      ts.recruiting.signed_player_stars["stars_1"];
    ts.recruiting.class_points =
      5 * ts.recruiting.signed_player_stars["stars_5"] +
      4 * ts.recruiting.signed_player_stars["stars_4"] +
      3 * ts.recruiting.signed_player_stars["stars_3"] +
      2 * ts.recruiting.signed_player_stars["stars_2"] +
      1 * ts.recruiting.signed_player_stars["stars_1"];
    return ts;
  });

  team_seasons = team_seasons.sort(
    (ts_a, ts_b) => ts_b.recruiting.class_points - ts_a.recruiting.class_points
  );

  var loop_count = 1;
  for (const team_season of team_seasons) {
    team_season.recruiting.recruiting_class_rank = loop_count;
    loop_count += 1;
  }

  player_team_seasons = Object.values(
    player_team_seasons_by_player_team_season_id
  );

  const player_team_season_recruitings_to_put = player_team_seasons.map(
    (pts) => pts.recruiting
  );
  player_team_seasons.forEach((pts) => delete pts.recruiting);
  player_team_seasons.forEach((pts) => delete pts.player);

  console.log('Updating player_team_seasons in weekly_recruiting', player_team_seasons)
  await db.player_team_season.bulkPut(player_team_seasons);
  await db.player_team_season_recruiting.bulkPut(
    player_team_season_recruitings_to_put
  );

  const team_season_recruitings_to_put = team_seasons.map(
    (ts) => ts.recruiting
  );
  for (team_season of team_seasons) {
    delete team_season.team;
    delete team_season.stats;
    delete team_season.team_games;
    delete team_season.recruiting;
  }

  console.log({
    team_season_recruitings_to_put: team_season_recruitings_to_put,
  });
  await db.team_season.bulkPut(team_seasons);
  await db.team_season_recruiting.bulkPut(team_season_recruitings_to_put);
  console.log("Done putting on 5789");

  var endTime = performance.now();
  console.log(
    `Time taken to do weekly recruiting: ${parseInt(endTime - startTime)} ms`
  );
};

const choose_players_of_the_week = async (this_week, common) => {
  const db = common.db;

  const position_group_map = {
    QB: "Offense",
    RB: "Offense",
    FB: "Offense",
    WR: "Offense",
    TE: "Offense",
    OT: "Offense",
    IOL: "Offense",

    EDGE: "Defense",
    DL: "Defense",
    LB: "Defense",
    CB: "Defense",
    S: "Defense",

    K: "Special Teams",
    P: "Special Teams",
  };

  const games = await db.game.where({ week_id: this_week.week_id }).toArray();
  const game_ids = games.map((g) => g.game_id);
  const games_by_game_id = index_group_sync(games, "index", "game_id");

  var team_games = await db.team_game
    .where("game_id")
    .anyOf(game_ids)
    .toArray();
  const team_game_ids = team_games.map((tg) => tg.team_game_id);
  team_games = nest_children(team_games, games_by_game_id, "game_id", "game");
  const team_games_by_team_game_id = index_group_sync(
    team_games,
    "index",
    "team_game_id"
  );

  var player_team_games = await db.player_team_game
    .where("team_game_id")
    .anyOf(team_game_ids)
    .toArray();

  const player_team_season_ids = player_team_games.map(
    (ptg) => ptg.player_team_season_id
  );
  var player_team_seasons = await db.player_team_season.bulkGet(
    player_team_season_ids
  );

  player_team_seasons = player_team_seasons.map(function (pts) {
    pts.position_group = position_group_map[pts.position];
    return pts;
  });

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.bulkGet(player_ids);
  console.log({
    players: players,
    player_ids: player_ids,
    player_team_seasons: player_team_seasons,
    player_team_season_ids: player_team_season_ids,
    player_team_games: player_team_games,
  });
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  const team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

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
      ptg_b.game_stats.games.weighted_game_score -
      ptg_a.game_stats.games.weighted_game_score
  );
  player_team_games = nest_children(
    player_team_games,
    team_games_by_team_game_id,
    "team_game_id",
    "team_game"
  );

  console.log({ player_team_games: player_team_games });
  const conference_season_ids = player_team_games.map((ptg) =>
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

  let last_award = await db.award.orderBy('award_id').last();
  let award_id = last_award ? last_award.award_id + 1 : 1;

  for (const position_group in player_team_games_by_position_group) {
    var position_group_player_team_games =
      player_team_games_by_position_group[position_group];
    var ptg = position_group_player_team_games[0];
    var a = new award(
      award_id,
      ptg.player_team_season_id,
      ptg.player_team_game_id,
      this_week.week_id,
      this_week.season,
      "position_group",
      position_group,
      "national",
      "week",
      null
    );
    awards_to_save.push(a);
    award_id +=1;
  }

  for (const conference_season_id in player_team_games_by_conference_season_id) {
    player_team_games =
      player_team_games_by_conference_season_id[conference_season_id];

    var player_team_games_by_position_group = index_group_sync(
      player_team_games,
      "group",
      "player_team_season.position_group"
    );

    for (const position_group in player_team_games_by_position_group) {
      position_group_player_team_games =
        player_team_games_by_position_group[position_group];
      var ptg = position_group_player_team_games[0];
      var a = new award(
        award_id,
        ptg.player_team_season_id,
        ptg.player_team_game_id,
        this_week.week_id,
        this_week.season,
        "position_group",
        position_group,
        "conference",
        "week",
        conference_season_id
      );
      awards_to_save.push(a);
      award_id +=1;
    }
  }

  await db.award.bulkAdd(awards_to_save);

  console.log({
    player_team_games: player_team_games,
    player_team_games_by_conference_season_id:
      player_team_games_by_conference_season_id,
    player_team_games_by_position_group: player_team_games_by_position_group,
  });
};

const close_out_season = async (this_week, common) => {
  const db = common.db;

  const league_season = await db.league_season.get(this_week.season);

  league_season.is_season_complete = true;

  await db.league_season.put(league_season);
};

const choose_preseason_all_americans = async (common) => {
  const db = common.db;
  const all_weeks = await db.week.toArray();
  const this_week = all_weeks.filter((w) => w.is_current)[0];
  console.log({ this_week: this_week });

  const position_count_map = {
    QB: 1,
    RB: 2,
    FB: 0,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 3,

    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,

    K: 1,
    P: 1,
  };


  let team_seasons = await db.team_season.where({season: common.season}).toArray();
  let previous_team_seasons = await db.team_season.where({season: common.season - 1}).toArray();

  let teams = await db.team.toArray();
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  team_seasons = nest_children(team_seasons, teams_by_team_id, 'team_id', 'team')
  previous_team_seasons = nest_children(previous_team_seasons, teams_by_team_id, 'team_id', 'team')

  let previous_team_seasons_by_team_season_id = index_group_sync(previous_team_seasons, 'index', 'team_season_id')

  let player_team_seasons = await db.player_team_season
    .where({ season: common.season })
    .and((pts) => pts.team_season_id > 0)
    .toArray();
  let previous_player_team_seasons = await db.player_team_season
    .where({ season: common.season - 1 })
    .and((pts) => pts.team_season_id > 0)
    .toArray();

  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  let players = await db.player.bulkGet(player_ids);
  const players_by_player_id = index_group_sync(players, "index", "player_id");
  
  let previous_player_team_season_ids = previous_player_team_seasons.map(pts => pts.player_team_season_id);
  const previous_player_team_season_stats = await db.player_team_season_stats
    .where('player_team_season_id').anyOf(previous_player_team_season_ids)
    .toArray();

  let previous_player_team_season_stats_by_player_team_season_id = index_group_sync(previous_player_team_season_stats, 'index', 'player_team_season_id')
  previous_player_team_seasons = nest_children(previous_player_team_seasons, previous_player_team_season_stats_by_player_team_season_id, 'player_team_season_id', 'season_stats')
  previous_player_team_seasons = nest_children(previous_player_team_seasons, previous_team_seasons_by_team_season_id, 'team_season_id', 'team_season')
  
  var previous_player_team_seasons_by_player_id = index_group_sync(
    previous_player_team_seasons,
    "index",
    "player_id"
  );
  player_team_seasons = nest_children(
    player_team_seasons,
    previous_player_team_seasons_by_player_id,
    "player_id",
    "previous_player_team_season"
  );
  //player_team_seasons = player_team_seasons.sort((pts_a, pts_b) => pts_b.games.weighted_game_score - pts_a.games.weighted_game_score)


  let last_award = await db.award.orderBy('award_id').last()
  let award_id = last_award ? last_award.award_id + 1 : 1;

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

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

  const conference_season_ids = player_team_seasons.map((pts) =>
    get(pts, "team_season.conference_season_id")
  );

  const player_team_seasons_by_conference_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season.conference_season_id"
  );
  var player_team_seasons_by_position = index_group_sync(
    player_team_seasons,
    "group",
    "position"
  );

  let player_team_seasons_by_team_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season_id"
  );

  for (let [team_season_id, ts_player_team_seasons] of Object.entries(player_team_seasons_by_team_season_id)){
    ts_player_team_seasons = ts_player_team_seasons.sort((pts_a, pts_b) => pts_b.average_weighted_game_score - pts_a.average_weighted_game_score);
    ts_player_team_seasons.forEach((pts, ind) => pts.team_season_average_weighted_game_score_rank = (ind + 1));

    ts_player_team_seasons = ts_player_team_seasons.sort((pts_a, pts_b) => pts_b.ratings.overall - pts_a.ratings.overall);
    ts_player_team_seasons.forEach((pts, ind) => pts.team_season_overall_rank = (ind + 1));
  }
  

  var awards_to_save = [];

  for (const position in player_team_seasons_by_position) {
    var position_player_team_seasons =
      player_team_seasons_by_position[position];
    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) =>
        pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
    );
    position_player_team_seasons = position_player_team_seasons.map(
      (pts, ind) => Object.assign(pts, { overall_rating_rank: ind })
    );

    position_player_team_seasons = position_player_team_seasons.sort(function (
      pts_a,
      pts_b
    ) {
      if (
        pts_b.previous_player_team_season == undefined &&
        pts_a.previous_player_team_season == undefined
      ) {
        return 0;
      } else if (pts_b.previous_player_team_season == undefined) {
        return 100000 - pts_a.previous_player_team_season.player_award_rating;
      } else if (pts_a.previous_player_team_season == undefined) {
        return pts_b.previous_player_team_season.player_award_rating - 100000;
      }
      return (
        pts_b.previous_player_team_season.player_award_rating -
        pts_a.previous_player_team_season.player_award_rating
      );
    });
    position_player_team_seasons = position_player_team_seasons.map(
      (pts, ind) => Object.assign(pts, { previous_game_score_rank: ind })
    );

    position_player_team_seasons = position_player_team_seasons.map(
      (pts, ind) =>
        Object.assign(pts, {
          award_rank:
            pts.overall_rating_rank + 3 * pts.previous_game_score_rank,
        })
    );

    position_player_team_seasons = position_player_team_seasons.sort(
      (pts_a, pts_b) => pts_a.award_rank - pts_b.award_rank
    );

    for (var i = 0; i < position_count_map[position]; i++) {
      player_team_season = position_player_team_seasons[i];
      var a = new award(
        award_id,
        player_team_season.player_team_season_id,
        null,
        this_week.week_id,
        common.season,
        "position",
        position,
        "national",
        "pre-season",
        null,
        "First"
      );
      awards_to_save.push(a);
      award_id +=1;
    }
  }

  for (const conference_season_id in player_team_seasons_by_conference_season_id) {
    player_team_seasons =
      player_team_seasons_by_conference_season_id[conference_season_id];

    var player_team_seasons_by_position = index_group_sync(
      player_team_seasons,
      "group",
      "position"
    );

    for (const position in player_team_seasons_by_position) {
      var position_player_team_seasons =
        player_team_seasons_by_position[position];

      position_player_team_seasons = position_player_team_seasons.sort(
        (pts_a, pts_b) =>
          pts_b.ratings.overall.overall - pts_a.ratings.overall.overall
      );
      position_player_team_seasons = position_player_team_seasons.map(
        (pts, ind) => Object.assign(pts, { overall_rating_rank: ind })
      );

      position_player_team_seasons = position_player_team_seasons.sort(
        function (pts_a, pts_b) {
          if (
            pts_b.previous_player_team_season == undefined &&
            pts_a.previous_player_team_season == undefined
          ) {
            return 0;
          } else if (pts_b.previous_player_team_season == undefined) {
            return (
              100000 - pts_a.previous_player_team_season.player_award_rating
            );
          } else if (pts_a.previous_player_team_season == undefined) {
            return (
              pts_b.previous_player_team_season.player_award_rating - 100000
            );
          }
          return (
            pts_b.previous_player_team_season.player_award_rating -
            pts_a.previous_player_team_season.player_award_rating
          );
        }
      );
      position_player_team_seasons = position_player_team_seasons.map(
        (pts, ind) => Object.assign(pts, { previous_game_score_rank: ind })
      );

      position_player_team_seasons = position_player_team_seasons.map(
        (pts, ind) =>
          Object.assign(pts, {
            award_rank:
              pts.overall_rating_rank + 4 * pts.previous_game_score_rank,
          })
      );

      position_player_team_seasons = position_player_team_seasons.sort(
        (pts_a, pts_b) => pts_a.award_rank - pts_b.award_rank
      );

      for (var i = 0; i < position_count_map[position]; i++) {
        player_team_season = position_player_team_seasons[i];
        var a = new award(
          award_id,
          player_team_season.player_team_season_id,
          null,
          this_week.week_id,
          common.season,
          "position",
          position,
          "conference",
          "pre-season",
          parseInt(conference_season_id),
          "First"
        );

        awards_to_save.push(a);
        award_id +=1;
      }
    }
  }

  await db.award.bulkAdd(awards_to_save);
};

const choose_all_americans = async (this_week, common) => {
  const db = common.db;

  stopwatch(common, 'Starting choose_all_americans');

  const position_count_map = {
    QB: 1,
    RB: 2,
    FB: 0,
    WR: 3,
    TE: 1,
    OT: 2,
    IOL: 3,

    EDGE: 2,
    DL: 2,
    LB: 3,
    CB: 2,
    S: 2,

    K: 1,
    P: 1,
  };

  var player_team_seasons = await db.player_team_season
    .where({ season: common.season })
    .and((pts) => pts.team_season_id > 0)
    .toArray();
  const player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  const player_team_season_stats = await db.player_team_season_stats.bulkGet(
    player_team_season_ids
  );
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
  stopwatch(common, 'Fetched PTSs');


  const player_ids = player_team_seasons.map((pts) => pts.player_id);
  var players = await db.player.bulkGet(player_ids);
  const players_by_player_id = index_group_sync(players, "index", "player_id");

  stopwatch(common, 'Fetched Players');

  const team_season_ids = distinct(player_team_seasons.map((pts) => pts.team_season_id));
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  const team_ids = team_seasons.map((ts) => ts.team_id);
  var teams = await db.team.bulkGet(team_ids);
  const teams_by_team_id = index_group_sync(teams, "index", "team_id");

  stopwatch(common, 'Fetched TSs and Teams');

  let last_award = await db.award.orderBy("award_id").last();
  let award_id = last_award ? last_award.award_id + 1 : 1;

  team_seasons = nest_children(
    team_seasons,
    teams_by_team_id,
    "team_id",
    "team"
  );
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

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

  stopwatch(common, 'Fetched Indexed data');

  for (let [team_season_id, ts_player_team_seasons] of Object.entries(player_team_seasons_by_team_season_id)){
    ts_player_team_seasons = ts_player_team_seasons.sort((pts_a, pts_b) => pts_b.average_weighted_game_score - pts_a.average_weighted_game_score);
    ts_player_team_seasons.forEach((pts, ind) => pts.team_season_average_weighted_game_score_rank = (ind + 1));
  }

  player_team_seasons = player_team_seasons.sort(
    (pts_a, pts_b) => pts_b.player_award_rating - pts_a.player_award_rating
  );
  console.log({ player_team_seasons: player_team_seasons });
  const conference_season_ids = player_team_seasons.map((pts) =>
    get(pts, "team_season.conference_season_id")
  );

  const player_team_seasons_by_conference_season_id = index_group_sync(
    player_team_seasons,
    "group",
    "team_season.conference_season_id"
  );
  var player_team_seasons_by_position = index_group_sync(
    player_team_seasons,
    "group",
    "position"
  );

  var awards_to_save = [];

  stopwatch(common, 'Sorted data');

  const heisman_player_team_season = player_team_seasons[0];
  var a = new award(
    award_id,
    heisman_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
  const maxwell_player_team_season =
    player_team_seasons[maxwell_player_team_season_index];
  var a = new award(
    award_id,
    maxwell_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
  const camp_player_team_season =
    player_team_seasons[camp_player_team_season_index];
  var a = new award(
    award_id,
    camp_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Camp",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const rimington_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "IOL"
  );
  const rimington_player_team_season = rimington_player_team_seasons[0];
  var a = new award(
    award_id,
    rimington_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
    (pts) => pts.position == "IOL" || pts.position == "DL"
  );
  const outland_player_team_season = outland_player_team_seasons[0];
  var a = new award(
    award_id,
    outland_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
    this_week.week_id,
    this_week.season,
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
  // var a = new award(guy_player_team_season.player_team_season_id, null, this_week.week_id, this_week.season, 'individual', 'Ray Guy', 'national', 'regular season', null, 'National');
  // awards_to_save.push(a)

  const groza_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "K"
  );
  const groza_player_team_season = groza_player_team_seasons[0];
  var a = new award(
    award_id,
    groza_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Lou Groza",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const mackey_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "TE"
  );
  const mackey_player_team_season = mackey_player_team_seasons[0];
  var a = new award(
    award_id,
    mackey_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Mackey",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const biletnikoff_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "WR"
  );
  const biletnikoff_player_team_season = biletnikoff_player_team_seasons[0];
  var a = new award(
    award_id,
    biletnikoff_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Biletnikoff",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const walker_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "RB"
  );
  const walker_player_team_season = walker_player_team_seasons[0];
  var a = new award(
    award_id,
    walker_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Doak Walker",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const butkus_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "LB"
  );
  const butkus_player_team_season = butkus_player_team_seasons[0];
  var a = new award(
    award_id,
    butkus_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Butkus",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  const obrien_player_team_seasons = player_team_seasons.filter(
    (pts) => pts.position == "QB"
  );
  const obrien_player_team_season = obrien_player_team_seasons[0];
  var a = new award(
    award_id,
    obrien_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
  const nagurski_player_team_season =
    nagurski_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    nagurski_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
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
  const bednarik_player_team_season =
    bednarik_player_team_seasons[Math.floor(4 * r)];
  var a = new award(
    award_id,
    bednarik_player_team_season.player_team_season_id,
    null,
    this_week.week_id,
    this_week.season,
    "individual",
    "Bednarik",
    "national",
    "regular season",
    null,
    "National"
  );
  awards_to_save.push(a);
  award_id += 1;

  stopwatch(common, 'Top Individual awards chosen');

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
    var position_player_team_seasons =
      player_team_seasons_by_position[position];
    for (var i = 0; i < position_count_map[position]; i++) {
      player_team_season = position_player_team_seasons[i];
      var a = new award(
        award_id,
        player_team_season.player_team_season_id,
        null,
        this_week.week_id,
        this_week.season,
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

    for (
      var i = position_count_map[position];
      i < position_count_map[position] * 2;
      i++
    ) {
      player_team_season = position_player_team_seasons[i];
      var a = new award(
        award_id,
        player_team_season.player_team_season_id,
        null,
        this_week.week_id,
        this_week.season,
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
      player_team_season = position_player_team_seasons[i];
      if (player_team_season) {
        var a = new award(
          award_id,
          player_team_season.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
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

  stopwatch(common, 'Position awards chosed');


  for (const conference_season_id in player_team_seasons_by_conference_season_id) {
    player_team_seasons =
      player_team_seasons_by_conference_season_id[conference_season_id];

    let conference_player_team_season_of_the_year = player_team_seasons[0];

    var a = new award(
      award_id,
      conference_player_team_season_of_the_year.player_team_season_id,
      null,
      this_week.week_id,
      this_week.season,
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
      var position_player_team_seasons =
        player_team_seasons_by_position[position];
      for (var i = 0; i < position_count_map[position]; i++) {
        player_team_season = position_player_team_seasons[i];
        var a = new award(
          award_id,
          player_team_season.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
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

      for (
        var i = position_count_map[position];
        i < position_count_map[position] * 2;
        i++
      ) {
        player_team_season = position_player_team_seasons[i];
        var a = new award(
          award_id,
          player_team_season.player_team_season_id,
          null,
          this_week.week_id,
          this_week.season,
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
        player_team_season = position_player_team_seasons[i];
        console.log({
          position: position,
          position_player_team_seasons: position_player_team_seasons,
          i: i,
          player_team_season: player_team_season,
          conference_season_id: conference_season_id,
        });
        if (player_team_season) {
          var a = new award(
            award_id,
            player_team_season.player_team_season_id,
            null,
            this_week.week_id,
            this_week.season,
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

  stopwatch(common, 'Conference awards chosed');

  await db.award.bulkAdd(awards_to_save);

  console.log({
    awards_to_save: awards_to_save,
    player_team_seasons: player_team_seasons,
    player_team_seasons_by_conference_season_id:
      player_team_seasons_by_conference_season_id,
    player_team_seasons_by_position: player_team_seasons_by_position,
  });
};

const advance_to_next_week = async (this_week, common) => {
  const db = await common.db;
  const ddb = await common.driver_db();
  const world = await ddb.world.get({ world_id: common.world_id });
  const all_weeks = await db.week
    .where("season")
    .aboveOrEqual(common.season)
    .toArray();
  const all_weeks_by_week_id = index_group_sync(all_weeks, "index", "week_id");

  console.log({ all_weeks: all_weeks });

  next_week = all_weeks_by_week_id[this_week.week_id + 1];

  console.log({
    all_weeks_by_week_id: all_weeks_by_week_id,
    this_week: this_week,
    next_week: next_week,
    // this_week_s: this_week.season,
    // next_week_s: next_week.season,
    season: common.season,
  });
  this_week.is_current = false;
  next_week.is_current = true;

  if (this_week.season != next_week.season) {
    alert("different season!!");
    const league_seasons = await db.league_season.toArray();

    const current_league_season = league_seasons.filter(
      (ls) => ls.season == this_week.season
    )[0];
    const next_league_season = league_seasons.filter(
      (ls) => ls.season == next_week.season
    )[0];

    current_league_season.is_current_season = false;
    next_league_season.is_current_season = true;

    await db.league_season.put(current_league_season);
    await db.league_season.put(next_league_season);

    console.log({
      next_league_season: next_league_season,
      current_league_season: current_league_season,
      league_seasons: league_seasons,
    });

    world.current_season = next_week.season;
  } else {
    console.log("did not find different seasons");
  }

  const updated_weeks = await db.week.bulkPut([this_week, next_week]);

  const current_team_season = await db.team_season.get({
    team_id: world.user_team.team_id,
    season: common.season,
  });
  world.current_week = next_week.week_name;
  world.user_team.team_record = current_team_season.record_display;

  await ddb.world.put(world);
};

const refresh_page = () => {
  window.onbeforeunload = function() {};
  window.location.reload();
};

const sim_action = async (duration, common) => {
  window.onbeforeunload = function() {
    return "Week is currently simming. Realoading may PERMANENTLY corrupt your save. Are you sure?";
  };

  const db = common.db;

  const season = common.world_object.current_season;
  const world_id = common.world_id;

  const all_weeks = await db.week
    .where("season")
    .aboveOrEqual(season)
    .toArray();

  const all_phases_by_phase_id = index_group_sync(
    await db.phase.where("season").aboveOrEqual(season).toArray(),
    "index",
    "phase_id"
  );
  console.log({
    all_phases_by_phase_id: all_phases_by_phase_id,
    all_weeks: all_weeks,
    season: season,
  });
  $.each(all_weeks, function (ind, week) {
    week.phase = all_phases_by_phase_id[week.phase_id];
    week.phase.season = season;
  });

  const current_week = all_weeks.filter((w) => w.is_current)[0];
  const next_week = all_weeks.filter(
    (w) => w.week_id == current_week.week_id + 1
  )[0];

  var redirect_href = "";

  var sim_week_list = [];

  if (duration == "SimWeek") {
    sim_week_list = [current_week];
  } else if (duration == "SimPhase") {
    sim_week_list = all_weeks.filter(
      (w) =>
        w.week_id >= current_week.week_id && w.phase_id == current_week.phase_id
    );
  } else {
    sim_week_list = [current_week];
  }

  var games_this_week = [],
    team_seasons = [],
    teams = [];
  for (var this_week of sim_week_list) {
    console.log({ team_game: team_game });
    await sim_week_games(this_week, common);

    console.log({ team_game: team_game });

    if (this_week.week_name == "Conference Championships") {
      alert("assign_conference_champions", assign_conference_champions);
      await assign_conference_champions(this_week, common);
    }

    if (this_week.phase.phase_name == "Bowl Season") {
      await process_bowl_results(common);
    }

    await calculate_conference_rankings(this_week, all_weeks, common);

    if (
      this_week.week_name != "Bowl Week 1" &&
      this_week.week_name != "Bowl Week 2" &&
      this_week.week_name != "Bowl Week 3"
    ) {
      await calculate_national_rankings(this_week, all_weeks, common);
    }

    if (this_week.week_name == "Bowl Week 4") {
      await choose_all_americans(this_week, common);
      await close_out_season(this_week, common);
    }

    if (this_week.week_name == "Week 15") {
      await schedule_conference_championships(this_week, common);
    }

    if (this_week.week_name == "Early Signing Day") {
      await schedule_bowl_season(all_weeks, common);
      //await choose_all_americans
    }

    if (this_week.week_name == "Plan for Season") {
      await initialize_new_season(this_week, common);
    }

    // if (this_week.week_name == "Season Recap") {
    //   await initialize_new_season(this_week, common);
    // }

    await choose_players_of_the_week(this_week, common);
    await calculate_primetime_games(this_week, all_weeks, common);
    //await weekly_recruiting(common);
    //await populate_all_depth_charts(common);
    //await calculate_team_needs(common);

    await advance_to_next_week(this_week, common);
    console.log("Ready to refresh_page");
    
  }

  await refresh_page();
};

const search_input_action = () => {
  var val = $("#nav-search-input").val();
  val = val.trim();
  if (val.length > 0) {
    var world_id = $("#nav-search-input").attr("worldid");
    window.location = `/World/${world_id}/Search/${val}`;
  }
  console.log({ this: this, val: val });
};

const populate_player_modal = async (common, target) => {
  var db = common.db;
  var player_id = parseInt($(target).closest("*[player_id]").attr("player_id"));
  console.log({
    player_id: player_id,
    target: target,
    p: $(target).closest("*[player_id]"),
  });
  var season = common.season;

  var player = await db.player.get({ player_id: player_id });
  var player_team_seasons = await db.player_team_season
    .where({ player_id: player_id })
    .toArray();
  var player_team_season_ids = player_team_seasons.map(
    (pts) => pts.player_team_season_id
  );
  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter(
    (pts) => pts.season == season
  )[0];

  var team_season_ids = player_team_seasons.map((pts) => pts.team_season_id);
  var team_seasons = await db.team_season.bulkGet(team_season_ids);

  var player_team_ids = team_seasons.map((ts) => ts.team_id);
  var player_teams = await db.team.bulkGet(player_team_ids);

  var c = 0;
  $.each(player_team_seasons, function (ind, pts) {
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c += 1;
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player.player_team_seasons.filter(
    (pts) => pts.season == season
  )[0];
  var current_team = player.current_player_team_season.team_season.team;

  page = {
    PrimaryColor: current_team.team_color_primary_hex,
    SecondaryColor: current_team.secondary_color_display,
  };
  console.log({ player: player, target: target, player_id: player_id });

  var modal_url = "/static/html_templates/common_templates/player_info_modal_template.njk";
  var html = await fetch(modal_url);
  html = await html.text();
  var renderedHtml = await common.nunjucks_env.renderString(html, {
    page: page,
    player: player,
  });
  console.log({ renderedHtml: renderedHtml });
  $("#player-info-modal").html(renderedHtml);
  $("#player-info-modal").addClass("shown");

  $(window).on("click", function (event) {
    if ($(event.target)[0] == $("#player-info-modal")[0]) {
      $("#player-info-modal").removeClass("shown");
      $(window).unbind();
    }
  });

  if (player.player_face == undefined) {
    player.player_face = await common.create_player_face(
      "single",
      player.player_id,
      db
    );
  }

  common.display_player_face(
    player.player_face,
    {
      jersey: player.current_player_team_season.team_season.team.jersey,
      teamColors:
        player.current_player_team_season.team_season.team.jersey.teamColors,
    },
    "player-modal-player-face"
  );
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
    SimThisWeek: "SimWeek",
    SimThisPhase: "SimPhase",
  };

  $("#SimDayModalCloseButton").on("click", function () {
    console.log("Clicked on indexCreateWorldModalCloseButton!!", this);
    $("#SimDayModal").css({ display: "none" });
    $(window).unbind();
  });

  $(".sim-action:not(.w3-disabled)").click(async function (e) {
    $("#SimDayModal").css({ display: "block" });

    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#SimDayModal")[0]) {
        $("#SimDayModal").css({ display: "none" });
        $(window).unbind();
      }
    });

    var sim_duration = SimMap[$(this).attr("id")];
    //console.log($(this), sim_duration);

    await sim_action(sim_duration, common);

    //TODO add notifications
    // $.notify(
    //   res.status,
    //   { globalPosition:"right bottom", className: 'error' }
    // );
  });

  $(".nav-tab-button").on("click", function (event, target) {
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
    $(ClickedTab).css(
      "background-color",
      "#" + common.render_content.page.SecondaryColor
    );

    var NewTabContent = $("#" + $(this).attr("id").replace("-tab", ""))[0];

    $.each($(".tab-content"), function (index, OldTabContent) {
      $(OldTabContent).css("display", "none");
    });

    $(NewTabContent).css("display", "block");
  });

  $("#nav-team-dropdown-container .conference-button").on(
    "click",
    function (event, target) {
      var conference_selected = $(event.currentTarget).attr(
        "conference-button-val"
      );
      console.log({
        conference_selected: conference_selected,
        event: event,
        target: event.currentTarget,
        teams: $(
          '#nav-team-dropdown-container .team-link[conference-button-val="' +
            conference_selected +
            '"]'
        ),
      });
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
    }
  );
};

const assign_conference_champions = async (this_week, common) => {
  const db = await common.db;
  const season = common.season;
  const index_group = common.index_group;

  let conferences = await db.conference.toArray();
  let conferences_by_conference_id = index_group_sync(
    conferences,
    "index",
    "conference_id"
  );

  let conference_seasons = await db.conference_season
    .where({ season: season })
    .toArray();

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

  let team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  const team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );
  const team_games_this_week = await db.team_game
    .where({ week_id: this_week.week_id })
    .toArray();

  const winning_team_seasons = team_games_this_week
    .filter((tg) => tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);

  const losing_team_seasons = team_games_this_week
    .filter((tg) => !tg.is_winning_team)
    .map((tg) => team_seasons_by_team_season_id[tg.team_season_id]);
  //winning_team_seasons = winning_team_seasons;

  let conference_seasons_to_put = []
  winning_team_seasons.forEach(function (ts) {
    ts.results.conference_champion = true;

    let conference_season =
      conference_seasons_by_conference_season_id[ts.conference_season_id];
    conference_season.conference_champion_team_season_id = ts.team_season_id;

    conference_seasons_to_put.push(conference_season);

    if (conference_season.conference.divisions.length == 2){
      ts.results.division_champion = true;
    }
    else if (conference_season.conference.divisions.length == 1 && ts.rankings.division_rank[0] == 1){
      ts.results.division_champion = true;
    }
  });

  losing_team_seasons.forEach(function (ts) {
    let conference_season =
      conference_seasons_by_conference_season_id[ts.conference_season_id];
    // conference_season.conference_champion_team_season_id = ts.team_season_id;

    if (conference_season.conference.divisions.length == 2){
      ts.results.division_champion = true;
    }
  });

  let championship_gameless_team_season_champs = [];
  let conference_seasons_without_championship_game = conference_seasons.filter(cs => (!cs.conference.schedule_format.hold_conference_championship_game) && !(cs.conference.is_independent));
  conference_seasons_without_championship_game.forEach(function(cs){
    let cs_team_seasons = team_seasons.filter(ts => ts.conference_season_id == cs.conference_season_id);
    let champ_ts = cs_team_seasons.find(ts => ts.rankings.division_rank[0] == 1);

    champ_ts.results.conference_champion = true;
    championship_gameless_team_season_champs.push(champ_ts)

    cs.conference_champion_team_season_id = champ_ts.team_season_id;
    conference_seasons_to_put.push(cs)
  });

  conference_seasons.forEach(cs => delete cs.conference);

  await db.team_season.bulkPut(winning_team_seasons);
  await db.team_season.bulkPut(losing_team_seasons);
  await db.team_season.bulkPut(championship_gameless_team_season_champs);
  await db.conference_season.bulkPut(conference_seasons_to_put);
};

const schedule_conference_championships = async (
  this_week,
  common
) => {
  console.log({ team_game: team_game });
  const db = await common.db;

  let conferences = await db.conference.toArray();
  let conferences_by_conference_id = index_group_sync(conferences, 'index', 'conference_id');

  let next_week = await db.week.get({week_id: this_week.week_id + 1});

  var conference_seasons = await db.conference_season
    .where({ season: this_week.phase.season })
    .toArray();
  
  conference_seasons = nest_children(conference_seasons, conferences_by_conference_id, 'conference_id', 'conference')
  
  conference_seasons = conference_seasons.filter(cs => cs.conference.schedule_format.hold_conference_championship_game);

  var team_seasons = await db.team_season
    .where({ season: this_week.phase.season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  team_seasons = team_seasons.filter((ts) => ts.rankings.division_rank[0] <= 2);
  var team_seasons_by_conference_season_id = index_group_sync(
    team_seasons,
    "group",
    "conference_season_id"
  );

  var last_game = await db.game.orderBy("game_id").desc().first();
  var last_team_game = await db.team_game
    .orderBy("team_game_id")
    .desc()
    .first();

  var next_game_id = 1;
  if (!(last_game === undefined)) {
    next_game_id = last_game.game_id + 1;
  }
  var next_team_game_id = 1;
  if (!(last_team_game === undefined)) {
    next_team_game_id = last_team_game.team_game_id + 1;
  }

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    team_games_to_create_ids = [],
    games_to_create = [],
    games_to_create_ids = [];

  $.each(conference_seasons, function (ind, conference_season) {
    var championship_teams =
      team_seasons_by_conference_season_id[
        conference_season.conference_season_id
      ];

    if (conference_season.conference.schedule_format.conference_championship_selection_method == 'top 2'){
      championship_teams = championship_teams.sort((ts_a, ts_b) => ts_a.rankings.division_rank[0] - ts_b.rankings.division_rank[0])
      championship_teams = championship_teams.slice(0,2)
    }
    else if (conference_season.conference.schedule_format.conference_championship_selection_method == 'division winners'){
      championship_teams = championship_teams.filter(ts => ts.rankings.division_rank[0] == 1);
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
      week_id: next_week.week_id,
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
      week_id: next_week.week_id,
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
      week_id: next_week.week_id,
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

  const games_created = await db.game.bulkAdd(games_to_create);
  const team_games_created = await db.team_game.bulkAdd(team_games_to_create);
};

const process_bowl_results = async (common) => {
  const db = common.db;
  const season = common.season;

  var phases = await db.phase.where({ season: season }).toArray();
  var phases_by_phase_id = index_group_sync(phases, "index", "phase_id");
  var weeks = await db.week.where({ season: season }).toArray();
  weeks = nest_children(weeks, phases_by_phase_id, "phase_id", "phase");

  console.log({ weeks: weeks });

  var this_week = weeks.find((w) => w.is_current);

  var bowl_weeks = index_group_sync(
    weeks.filter((w) => w.phase.phase_name == "Bowl Season"),
    "index",
    "week_name"
  );

  var current_league_season = await db.league_season
    .where({ season: season })
    .first();

  var current_playoff_round_index =
    current_league_season.playoffs.playoff_rounds.findIndex(
      (pr) => pr.week_name == this_week.week_name
    );

  var teams = await db.team.where("team_id").above(0).toArray();
  var teams_by_team_id = index_group_sync(teams, "index", "team_id");

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  var team_seasons_by_team_season_id = index_group_sync(
    team_seasons,
    "index",
    "team_season_id"
  );

  var games_this_week = await db.game
    .where({ week_id: this_week.week_id })
    .toArray();
  var team_games_by_game_id = index_group_sync(
    await db.team_game.where({ week_id: this_week.week_id }).toArray(),
    "group",
    "game_id"
  );

  var team_seasons_to_save = [],
    playoff_teams_advancing = [];

  $.each(games_this_week, function (ind, game) {
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

    winning_team_season.results.bowl.opposing_team_season_id =
      losing_team_season.team_season_id;
    losing_team_season.results.bowl.opposing_team_season_id =
      winning_team_season.team_season_id;

    if (game.bowl.bowl_name == "National Championship") {
      winning_team_season.results.national_champion = true;
      current_league_season.playoffs.playoffs_complete = true;
    }

    team_seasons_to_save.push(winning_team_season);
    team_seasons_to_save.push(losing_team_season);
    console.log({
      winning_team_season:winning_team_season, losing_team_season:losing_team_season,
      team_seasons_to_save:team_seasons_to_save, game:game, bowl: game.bowl
    })
  });

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    team_games_to_create_ids = [],
    games_to_create = [],
    games_to_create_ids = [],
    team_ids = [];

  console.log({
    current_playoff_round_index: current_playoff_round_index,
    "current_league_season.playoffs": current_league_season.playoffs,
  });

  if (
    current_playoff_round_index >= 0 &&
    current_playoff_round_index <
      current_league_season.playoffs.playoff_rounds.length - 1
  ) {
    var current_playoff_round =
      current_league_season.playoffs.playoff_rounds[
        current_playoff_round_index
      ];
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index
    ].is_current_round = false;
    current_league_season.playoffs.playoff_rounds[
      current_playoff_round_index + 1
    ].is_current_round = true;
    var next_playoff_round =
      current_league_season.playoffs.playoff_rounds[
        current_playoff_round_index + 1
      ];
    var next_playoff_round_week = bowl_weeks[next_playoff_round.week_name];

    var team_seasons_advancing = [];

    for (const playoff_game of current_playoff_round.playoff_games) {
      if (playoff_game.bye_game) {
        team_seasons_advancing.push({
          seed: playoff_game.team_objs[0].seed,
          team_season:
            team_seasons_by_team_season_id[
              playoff_game.team_objs[0].team_season_id
            ],
        });
      } else {
        var playoff_team_games = team_games_by_game_id[playoff_game.game_id];
        var winning_team_game = playoff_team_games.find(
          (tg) => tg.is_winning_team
        );
        var winning_team_season_id = winning_team_game.team_season_id;

        team_seasons_advancing.push({
          seed: playoff_game.team_objs.find(
            (to) => to.team_season_id == winning_team_season_id
          ).seed,
          team_season: team_seasons_by_team_season_id[winning_team_season_id],
        });
      }
    }

    team_seasons_advancing = team_seasons_advancing.sort(
      (ts_a, ts_b) =>
        ts_b.team_season.playoff.seed -
        ts_a.team_season.playoff.seed
    );

    console.log({ team_seasons_advancing: team_seasons_advancing });

    if (team_seasons_advancing.length > 0) {
      var last_game = await db.game.orderBy("game_id").desc().first();
      var last_team_game = await db.team_game
        .orderBy("team_game_id")
        .desc()
        .first();

      var next_game_id = 1;
      if (!(last_game === undefined)) {
        next_game_id = last_game.game_id + 1;
      }
      var next_team_game_id = 1;
      if (!(last_team_game === undefined)) {
        next_team_game_id = last_team_game.team_game_id + 1;
      }

      var week_id = next_playoff_round_week.week_id;
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
          week_id: week_id,
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
          week_id: week_id,
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
          week_id: week_id,
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

  await db.game.bulkAdd(games_to_create);
  await db.team_game.bulkAdd(team_games_to_create);
  await db.team_season.bulkPut(team_seasons_to_save);
  await db.league_season.put(current_league_season);
};

const schedule_bowl_season = async (all_weeks, common) => {
  alert("scheduling bowls");

  var bowls = [
    {
      bowl_name: "Rose Bowl",
      bowl_prestige: 10,
      bowl_week_name: "Bowl Week 3",
    },
    {
      bowl_name: "Sugar Bowl",
      bowl_prestige: 9,
      bowl_week_name: "Bowl Week 3",
    },
    {
      bowl_name: "Fiesta Bowl",
      bowl_prestige: 9,
      bowl_week_name: "Bowl Week 3",
    },
    {
      bowl_name: "Orange Bowl",
      bowl_prestige: 9,
      bowl_week_name: "Bowl Week 3",
    },
    {
      bowl_name: "Cotton Bowl",
      bowl_prestige: 9,
      bowl_week_name: "Bowl Week 2",
    },
    {
      bowl_name: "Peach Bowl",
      bowl_prestige: 8,
      bowl_week_name: "Bowl Week 2",
    },
    {
      bowl_name: "Alamo Bowl",
      bowl_prestige: 6,
      bowl_week_name: "Bowl Week 2",
    },
    {
      bowl_name: "Citrus Bowl",
      bowl_prestige: 6,
      bowl_week_name: "Bowl Week 2",
    },
    {
      bowl_name: "Gasparilla Bowl",
      bowl_prestige: 5,
      bowl_week_name: "Bowl Week 2",
    },
    { bowl_name: "Sun Bowl", bowl_prestige: 5, bowl_week_name: "Bowl Week 2" },
    {
      bowl_name: "Texas Bowl",
      bowl_prestige: 5,
      bowl_week_name: "Bowl Week 2",
    },
    {
      bowl_name: "Las Vegas Bowl",
      bowl_prestige: 5,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Liberty Bowl",
      bowl_prestige: 4,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Independence Bowl",
      bowl_prestige: 4,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Hawaii Bowl",
      bowl_prestige: 4,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Gator Bowl",
      bowl_prestige: 4,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "First Responder Bowl",
      bowl_prestige: 3,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Myrtle Beach Bowl",
      bowl_prestige: 2,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Birmingham Bowl",
      bowl_prestige: 1,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Arizona Bowl",
      bowl_prestige: 1,
      bowl_week_name: "Bowl Week 1",
    },
    {
      bowl_name: "Frisco Bowl",
      bowl_prestige: 1,
      bowl_week_name: "Bowl Week 1",
    },
  ];
  const db = await common.db;

  var current_league_season = await db.league_season
    .where({ season: common.season })
    .toArray();
  current_league_season = current_league_season[0];

  var number_playoff_teams =
    current_league_season.playoffs.number_playoff_teams;

  var team_seasons = await db.team_season
    .where({ season: common.season })
    .and((ts) => ts.team_id > 0)
    .toArray();
  var teams_by_team_id = index_group_sync(
    await db.team.where("team_id").above(0).toArray(),
    "index",
    "team_id"
  );

  var num_teams = await db.team.where("team_id").above(0).count();

  var max_bowl_bound_teams = num_teams - number_playoff_teams;
  var max_bowls = Math.floor(max_bowl_bound_teams / 2);

  bowls = bowls.slice(0, max_bowls);

  team_seasons = team_seasons.sort(function (team_season_a, team_season_b) {
    if (
      team_season_a.rankings.national_rank[0] <
      team_season_b.rankings.national_rank[0]
    )
      return -1;
    if (
      team_season_a.rankings.national_rank[0] >
      team_season_b.rankings.national_rank[0]
    )
      return 1;
    return 0;
  });

  

  let number_guaranteed_conference_champions_in_playoff = 6;
  let top_playoff_seeds_saved_for_conference_champions = 4;
  let conference_champions_in_playoff = team_seasons.filter((ts) => ts.results.conference_champion).slice(0,number_guaranteed_conference_champions_in_playoff);
  let top_seeded_conference_champions_in_playoff = conference_champions_in_playoff.slice(0,top_playoff_seeds_saved_for_conference_champions);
  
  let playoff_team_season_ids = new Set(conference_champions_in_playoff.map(ts => ts.team_season_id));
  let top_seeded_playoff_team_season_ids = new Set(top_seeded_conference_champions_in_playoff.map(ts => ts.team_season_id));

  let ts_ind = 0;
  while (playoff_team_season_ids.size < number_playoff_teams){
    let ts = team_seasons[ts_ind];
    if (!(playoff_team_season_ids.has(ts.team_season_id))){
      playoff_team_season_ids.add(ts.team_season_id)
    }
    ts_ind +=1;
  }

  var playoff_bound_team_seasons = top_seeded_conference_champions_in_playoff.concat(
    team_seasons.filter(
      (ts) => !(top_seeded_playoff_team_season_ids.has(ts.team_season_id)) && (playoff_team_season_ids.has(ts.team_season_id))
    )
  )
  playoff_bound_team_seasons.forEach((ts, ind) => ts.playoff.seed = (ind + 1));

  
  console.log({playoff_bound_team_seasons:playoff_bound_team_seasons})

  var bowl_bound_team_seasons = team_seasons.filter(
    (ts) =>
      !(playoff_team_season_ids.has(ts.team_season_id)) &&
      ts.rankings.national_rank[0] <= ((bowls.length * 2) + number_playoff_teams)
  );

  var bowl_weeks = index_group_sync(
    all_weeks.filter((w) => w.phase.phase_name == "Bowl Season"),
    "index",
    "week_name"
  );

  var playoff_matchups = [],
    taken_team_season_ids = [],
    possible_team_seasons = [],
    chosen_team_season = null;

  $.each(bowls, function (ind, bowl) {
    possible_team_seasons = bowl_bound_team_seasons
      .filter((ts) => !taken_team_season_ids.includes(ts.team_season_id))
      .slice(0, 5);
    bowl.teams = [];
    chosen_team_season =
      possible_team_seasons[
        Math.floor(Math.random() * possible_team_seasons.length)
      ];
    bowl.teams.push(chosen_team_season);

    taken_team_season_ids.push(chosen_team_season.team_season_id);

    (chosen_team_season = null), (loop_count = 0);
    possible_team_seasons = possible_team_seasons.filter(
      (ts) => !taken_team_season_ids.includes(ts.team_season_id)
    );

    while (
      (chosen_team_season == null ||
        chosen_team_season.conference_season_id ==
          bowl.teams[0].conference_season_id ||
        chosen_team_season.record.defeated_teams.includes(
          bowl.teams[0].team_season_id
        ) ||
        bowl.teams[0].record.defeated_teams.includes(
          chosen_team_season.team_season_id
        )) &&
      loop_count < 100
    ) {
      chosen_team_season =
        possible_team_seasons[
          Math.floor(Math.random() * possible_team_seasons.length)
        ];
      loop_count += 1;
    }

    if (chosen_team_season != undefined) {
      bowl.teams.push(chosen_team_season);
      taken_team_season_ids.push(chosen_team_season.team_season_id);
    }
  });

  var last_game = await db.game.orderBy("game_id").desc().first();
  var last_team_game = await db.team_game
    .orderBy("team_game_id")
    .desc()
    .first();

  var next_game_id = 1;
  if (!(last_game === undefined)) {
    next_game_id = last_game.game_id + 1;
  }
  var next_team_game_id = 1;
  if (!(last_team_game === undefined)) {
    next_team_game_id = last_team_game.team_game_id + 1;
  }

  var team_a = 0,
    team_b = 0,
    team_games_to_create = [],
    team_games_to_create_ids = [],
    games_to_create = [],
    games_to_create_ids = [],
    team_ids = [];

  const playoff_round = current_league_season.playoffs.playoff_rounds[0];
  const playoff_week_id = bowl_weeks[playoff_round.week_name].week_id;

  for (const playoff_game of playoff_round.playoff_games) {
    team_ids = [];
    for (const team_obj of playoff_game.team_objs) {
      team_obj.team_season_id =
        playoff_bound_team_seasons[team_obj.seed - 1].team_season_id;
    }

    console.log({ playoff_game: playoff_game });

    if (playoff_game.bye_game) {
      playoff_game.game_id = null;
    } else {
      [team_season_id_a, team_season_id_b] = playoff_game.team_objs.map(
        (to) => to.team_season_id
      );

      var team_game_a = new team_game({
        world_id: common.world_id,
        season: common.season,
        team_game_id: next_team_game_id,
        is_home_team: true,
        opponent_team_game_id: next_team_game_id + 1,
        week_id: playoff_week_id,
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
        week_id: playoff_week_id,
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
        week_id: playoff_week_id,
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

    week_id = bowl_weeks[bowl.bowl_week_name].week_id;

    var team_game_a = new team_game({
      world_id: common.world_id,
      season: common.season,
      team_game_id: next_team_game_id,
      is_home_team: true,
      opponent_team_game_id: next_team_game_id + 1,
      week_id: week_id,
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
      week_id: week_id,
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
      week_id: week_id,
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

  const games_created = await db.game.bulkAdd(games_to_create);
  const team_games_created = await db.team_game.bulkAdd(team_games_to_create);
  await db.league_season.put(current_league_season);
  await db.team_season.bulkPut(playoff_bound_team_seasons);

};

const schedule_game = (
  common,
  scheduling_dict,
  team_set,
  game_type,
  rival_obj
) => {
  var team_a = team_set[0],
    team_b = team_set[1];
  if (team_b == undefined) {
    return "No team b";
  }

  if (Math.random() < 0.5) {
    [team_a, team_b] = [team_b, team_a];
  }

  var is_conference_game =
    scheduling_dict.team_season_schedule_tracker[team_a].conference_season_id ==
    scheduling_dict.team_season_schedule_tracker[team_b].conference_season_id;

  var keep_game =
    !scheduling_dict.team_season_schedule_tracker[
      team_b
    ].opponents_scheduled.has(team_a);

  var schedule_trend_modifier = 1;
  if (game_type == "conference") {
    is_conference_game = true;
    keep_game = keep_game && is_conference_game;
  } else if (game_type == "non_conference") {
    keep_game = keep_game && !is_conference_game;
    schedule_trend_modifier = -16;
  } else {
    alert("some fuck up in scheduling");
  }

  if (
    keep_game &&
    is_conference_game &&
    scheduling_dict.team_season_schedule_tracker[team_a]["conference"]
      .games_to_schedule > 0 &&
    scheduling_dict.team_season_schedule_tracker[team_b]["conference"]
      .games_to_schedule > 0
  ) {
    keep_game = true;
  } else if (
    keep_game &&
    !is_conference_game &&
    scheduling_dict.team_season_schedule_tracker[team_a]["non_conference"]
      .games_to_schedule > 0 &&
    scheduling_dict.team_season_schedule_tracker[team_b]["non_conference"]
      .games_to_schedule > 0
  ) {
    keep_game = true;
  } else {
    keep_game = false;
  }

  if (keep_game) {
    var available_weeks = common.set_intersect(
      scheduling_dict.team_season_schedule_tracker[team_a].available_week_ids,
      scheduling_dict.team_season_schedule_tracker[team_b].available_week_ids
    );
    available_weeks = [...available_weeks];
    if (available_weeks.length > 0) {
      if (is_conference_game) {
        if (
          scheduling_dict.team_season_schedule_tracker[team_b]["conference"]
            .net_home_games <
          scheduling_dict.team_season_schedule_tracker[team_a]["conference"]
            .net_home_games
        ) {
          [team_a, team_b] = [team_b, team_a];
        }
      } else {
        dict_for_random = [team_a, team_b].map(function (team_id) {
          return [
            team_id,
            scheduling_dict.team_season_schedule_tracker[team_id].team
              .team_ratings.program_history ** 2,
          ];
        });
        dict_for_random = Object.fromEntries(dict_for_random);
        chosen_home_team = common.weighted_random_choice(dict_for_random);
        chosen_away_team = [team_a, team_b].find(
          (team_id) => team_id != chosen_home_team
        );

        team_a = chosen_home_team;
        team_b = chosen_away_team;
      }

      available_weeks = available_weeks.map(function (week_id) {
        let additional_modifier = 1;
        for (let team_ind of [team_a, team_b]){
          for (let adj_ind of [-1, 1]){
            if (scheduling_dict.team_season_schedule_tracker[team_ind].available_week_ids.has(week_id + adj_ind) || (week_id == scheduling_dict.all_week_ids[0] || week_id == scheduling_dict.all_week_ids[scheduling_dict.all_week_ids.length - 1])){
              additional_modifier += 1;
            }
          }
        }
        
        return [
          week_id,
          Math.abs((
            scheduling_dict.all_weeks_by_week_id[week_id].schedule_week_number +
              schedule_trend_modifier
          ) ** (1 * additional_modifier)),
        ];
      });
      available_weeks = Object.fromEntries(available_weeks);
      var chosen_week_id = parseInt(
        common.weighted_random_choice(available_weeks)
      );

      if (rival_obj != null) {
        if (rival_obj.preferred_week_id != undefined) {
          if (rival_obj.preferred_week_id in available_weeks) {
            chosen_week_id = rival_obj.preferred_week_id;
          }
        }
      }

      scheduling_dict.team_season_schedule_tracker[team_a][
        game_type
      ].games_to_schedule -= 1;
      scheduling_dict.team_season_schedule_tracker[team_a][
        game_type
      ].games_scheduled += 1;
      scheduling_dict.team_season_schedule_tracker[team_a][
        game_type
      ].home_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_a][
        game_type
      ].net_home_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_a].weeks_scheduled.add(
        chosen_week_id
      );
      scheduling_dict.team_season_schedule_tracker[
        team_a
      ].available_week_ids.delete(chosen_week_id);
      scheduling_dict.team_season_schedule_tracker[
        team_a
      ].opponents_scheduled.add(team_b);

      scheduling_dict.team_season_schedule_tracker[team_b][
        game_type
      ].games_to_schedule -= 1;
      scheduling_dict.team_season_schedule_tracker[team_b][
        game_type
      ].games_scheduled += 1;
      scheduling_dict.team_season_schedule_tracker[team_b][
        game_type
      ].away_games += 1;
      scheduling_dict.team_season_schedule_tracker[team_b][
        game_type
      ].net_home_games -= 1;
      scheduling_dict.team_season_schedule_tracker[team_b].weeks_scheduled.add(
        chosen_week_id
      );
      scheduling_dict.team_season_schedule_tracker[
        team_b
      ].available_week_ids.delete(chosen_week_id);
      scheduling_dict.team_season_schedule_tracker[
        team_b
      ].opponents_scheduled.add(team_a);

      if (!is_conference_game){
        scheduling_dict.team_season_schedule_tracker[team_b].non_conference.schedule_team_quadrants[scheduling_dict.team_season_schedule_tracker[team_a].team_quadrant] -= 1;
        scheduling_dict.team_season_schedule_tracker[team_a].non_conference.schedule_team_quadrants[scheduling_dict.team_season_schedule_tracker[team_b].team_quadrant] -= 1;
        // console.log({scheduling_dict:scheduling_dict, team_a:team_a, team_b:team_b, 'scheduling_dict.team_season_schedule_tracker[team_b]': scheduling_dict.team_season_schedule_tracker[team_b]})
      }

      // console.log({scheduling_dict:scheduling_dict, team_a:team_a, team_b:team_b, 'scheduling_dict.team_season_schedule_tracker[team_b]': scheduling_dict.team_season_schedule_tracker[team_b]})

      var team_game_a = new team_game({
        world_id: scheduling_dict.world_id,
        season: scheduling_dict.season,
        team_game_id: scheduling_dict.next_team_game_id,
        is_home_team: true,
        opponent_team_game_id: scheduling_dict.next_team_game_id + 1,
        week_id: chosen_week_id,
        game_id: scheduling_dict.next_game_id,
        is_conference_game: is_conference_game,
        team_season_id: parseInt(team_a),
        opponent_team_season_id: parseInt(team_b),
      });
      var team_game_b = new team_game({
        world_id: scheduling_dict.world_id,
        season: scheduling_dict.season,
        team_game_id: scheduling_dict.next_team_game_id + 1,
        is_home_team: false,
        opponent_team_game_id: scheduling_dict.next_team_game_id,
        week_id: chosen_week_id,
        game_id: scheduling_dict.next_game_id,
        is_conference_game: is_conference_game,
        team_season_id: parseInt(team_b),
        opponent_team_season_id: parseInt(team_a),
      });

      scheduling_dict.team_games_to_create.push(team_game_a);
      scheduling_dict.team_games_to_create.push(team_game_b);

      scheduling_dict.team_games_to_create_ids.push(
        scheduling_dict.next_team_game_id
      );
      scheduling_dict.team_games_to_create_ids.push(
        scheduling_dict.next_team_game_id + 1
      );

      scheduling_dict.games_to_create.push({
        game_id: scheduling_dict.next_game_id,
        season: scheduling_dict.season,
        home_team_season_id: parseInt(team_a),
        away_team_season_id: parseInt(team_b),
        home_team_game_id: scheduling_dict.next_team_game_id,
        away_team_game_id: scheduling_dict.next_team_game_id + 1,
        week_id: chosen_week_id,
        game_time: "7:05PM",
        was_played: false,
        outcome: {
          home_team_score: null,
          away_team_score: null,
          winning_team_season_id: null,
          losing_team_season_id: null,
        },
        rivalry: rival_obj,
        bowl: null,
        broadcast: { regional_broadcast: false, national_broadcast: false },
        world_id: scheduling_dict.world_id,
        is_conference_game: is_conference_game,
      });

      scheduling_dict.games_to_create_ids.push(scheduling_dict.next_game_id);

      scheduling_dict.next_game_id += 1;
      scheduling_dict.next_team_game_id += 2;

      return "Scheduled";
    } else {
      return "No available weeks";
    }
  } else {
    console.log("Issue with teams already playing", {
      scheduling_dict: scheduling_dict,
      team_set: team_set,
      game_type: game_type,
      rival_obj: rival_obj,
    });
    return "Issue with teams already playing";
  }
};

const shuffle = (a) => {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};

const uniform_random_choice = (options) => {
  return options[Math.floor(Math.random() * options.length)];
};

const weighted_random_choice = (options) => {
  var total = 0;

  if (Array.isArray(options)) {
    $.each(options, function (ind, obj) {
      var odds = obj[1];
      total += odds;
    });
    var r = Math.floor(Math.random() * total);

    var chosen_val = undefined;
    $.each(options, function (ind, obj) {
      var value = obj[0];
      var odds = obj[1];
      r -= odds;
      if (r < 0) {
        chosen_val = value;
        return false;
      }
    });
  } else {
    $.each(options, function (value, odds) {
      total += odds;
    });
    var r = Math.floor(Math.random() * total);

    var chosen_val = undefined;
    $.each(options, function (value, odds) {
      r -= odds;
      if (r < 0) {
        chosen_val = value;
        return false;
      }
    });
  }

  return chosen_val;
};

const random_facial_feature = (feature) => {
  const features = {
    eye: {
      eye1: 0.75,
      eye2: 1,
      eye3: 1,
      eye4: 1,
      eye5: 1,
      eye6: 1,
      eye7: 1,
      eye8: 1,
      eye9: 1,
      eye10: 1,
      eye11: 1,
      eye12: 0.1,
      eye13: 1,
      eye14: 1,
      eye15: 1,
      eye16: 1,
      eye17: 1,
      eye18: 1,
      eye19: 1,
    },
    body: { body: 1 },
    ear: { ear1: 1, ear2: 1, ear3: 1 },
    head: {
      head1: 1,
      head2: 1,
      head3: 1,
      head4: 1,
      head5: 1,
      head6: 1,
      head7: 1,
      head8: 1,
      head9: 1,
      head10: 1,
      head12: 1,
      head12: 1,
      head13: 1,
      head14: 1,
      head15: 1,
      head16: 1,
      head17: 1,
      head18: 0.1,
    },
    mouth: {
      straight: 1,
      angry: 1,
      closed: 1,
      mouth: 1,
      mouth2: 1,
      mouth3: 1,
      mouth4: 1,
      mouth5: 1,
      mouth6: 1,
      mouth7: 1,
      mouth8: 1,
      "smile-closed": 1,
      smile: 1,
      smile2: 1,
      smile3: 1,
    },
    nose: {
      nose1: 1,
      nose2: 0.65,
      nose3: 1,
      nose4: 2,
      nose5: 1,
      nose6: 0.3,
      nose7: 0.2,
      nose8: 0.2,
      nose9: 2,
      nose10: 1,
      nose11: 1,
      nose12: 1,
      nose13: 1,
      nose14: 1,
      honker: 1,
      pinocchio: 0.1,
    },
    eyebrow: {
      eyebrow1: 1,
      eyebrow2: 1,
      eyebrow3: 1,
      eyebrow4: 1,
      eyebrow5: 1,
      eyebrow6: 1,
      eyebrow7: 1,
      eyebrow8: 1,
      eyebrow9: 1,
      eyebrow10: 1,
      eyebrow11: 1,
      eyebrow12: 1,
      eyebrow13: 1,
      eyebrow14: 1,
      eyebrow15: 1,
      eyebrow16: 1,
      eyebrow17: 1,
      eyebrow18: 1,
      eyebrow19: 1,
      eyebrow20: 1,
    },
    hair: {
      afro: 5,
      afro2: 15,
      bald: 10,
      blowoutFade: 15,
      cornrows: 7,
      cropfade: 13,
      cropfade2: 10,
      crop: 7,
      curly: 10,
      curly2: 13,
      curly3: 15,
      curlyFade1: 7,
      curlyFade2: 7,
      dreads: 12,
      emo: 1,
      "faux-hawk": 5,
      "fauxhawk-fade": 7,
      hair: 3,
      high: 10,
      juice: 15,
      "messy-short": 15,
      messy: 15,
      "middle-part": 12,
      parted: 10,
      shaggy1: 3,
      crop: 7,
      "short-fade": 20,
      crop: 7,
      short3: 25,
      crop: 7,
      spike2: 10,
      spike4: 10,
      "tall-fade": 20,
    },
    accessories: { none: 80, headband: 10, "headband-high": 10 },
    glasses: { none: 95, "glasses1-primary": 7, "glasses1-secondary": 3 },
    eyeLine: { none: 80, line1: 15, line2: 5 },
    smileLine: { none: 85, line1: 5, line4: 10 },
    miscLine: {
      none: 85,
      chin2: 3,
      forehead2: 3,
      forehead3: 3,
      forehead4: 3,
      freckles1: 1,
      freckles2: 1,
    },
    facialHair: {
      none: 60,
      "beard-point": 2,
      beard1: 2,
      beard2: 2,
      beard3: 1,
      beard4: 1,
      beard5: 1,
      beard6: 1,
      "chin-strap": 2,
      "chin-strapStache": 3,
      fullgoatee: 0.5,
      fullgoatee2: 0.5,
      fullgoatee3: 0.5,
      fullgoatee4: 0.5,
      fullgoatee5: 0.5,
      fullgoatee6: 0.5,
      "goatee1-stache": 3,
      goatee1: 0.1,
      goatee2: 0.1,
      goatee3: 0.1,
      goatee4: 0.1,
      goatee5: 0.1,
      goatee6: 0.1,
      goatee7: 0.1,
      goatee8: 0.1,
      goatee9: 0.1,
      goatee10: 0.1,
      goatee11: 0.1,
      goatee12: 0.1,
      goatee13: 0.1,
      goatee14: 0.1,
      goatee15: 0.1,
      goatee16: 0.1,
      goatee17: 0.1,
      goatee18: 0.1,
      goatee19: 0.1,
      "honest-abe": 3,
      "honest-abe-stache": 1,
      mustache1: 4,
      "mustache-thin": 3,
      soul: 5,
    },
  };

  return weighted_random_choice(features[feature]);
};

const round_decimal = (val, places) => {
  var factor = 10 ** places;
  return Math.round(val * 1.0 * factor) / factor;
};

const generate_face = (ethnicity, weight) => {
  const colors = {
    white: {
      skin: ["#f2d6cb", "#ddb7a0"],
      hair: [
        "#272421",
        "#3D2314",
        "#5A3825",
        "#CC9966",
        "#2C1608",
        "#B55239",
        "#e9c67b",
        "#D7BF91",
      ],
    },
    asian: {
      skin: ["#f5dbad"],
      hair: ["#272421", "#0f0902"],
    },
    hispanic: {
      skin: ["#bb876f", "#aa816f", "#a67358"],
      hair: ["#272421", "#1c1008"],
    },
    black: { skin: ["#ad6453", "#74453d", "#5c3937"], hair: ["#272421"] },
  };

  const defaultTeamColors = ["#89bfd3", "#7a1319", "#07364f"];

  const eyeAngle = Math.round(Math.random() * 25 - 10);

  const palette = colors[ethnicity];
  const skinColor =
    palette.skin[Math.floor(Math.random() * palette.skin.length)];
  const hairColor =
    palette.hair[Math.floor(Math.random() * palette.hair.length)];
  const isFlipped = Math.random() < 0.5;

  const face = {
    fatness: round_decimal(normal_trunc((weight - 180) / 180, 0.2, 0, 1), 2),
    teamColors: defaultTeamColors,
    body: {
      id: random_facial_feature("body"),
      color: skinColor,
    },
    jersey: {
      id: random_facial_feature("jersey"),
    },
    ear: {
      id: random_facial_feature("ear"),
      size: round_decimal(0.5 + Math.random(), 2),
    },
    head: {
      id: random_facial_feature("head"),
      shave: `rgba(0,0,0,${
        Math.random() < 0.25 ? round_decimal(Math.random() / 5, 2) : 0
      })`,
    },
    eyeLine: {
      id: random_facial_feature("eyeLine"),
    },
    smileLine: {
      id: random_facial_feature("smileLine"),
      size: round_decimal(0.25 + 2 * Math.random(), 2),
    },
    miscLine: {
      id: random_facial_feature("miscLine"),
    },
    facialHair: {
      id: random_facial_feature("facialHair"),
    },
    eye: { id: random_facial_feature("eye"), angle: eyeAngle },
    eyebrow: {
      id: random_facial_feature("eyebrow"),
      angle: Math.round(Math.random() * 35 - 15),
    },
    hair: {
      id: random_facial_feature("hair"),
      color: hairColor,
      flip: isFlipped,
    },
    mouth: {
      id: random_facial_feature("mouth"),
      flip: isFlipped,
    },
    nose: {
      id: random_facial_feature("nose"),
      flip: isFlipped,
      size: round_decimal(0.5 + Math.random() * 0.75, 2),
    },
    glasses: {
      id: random_facial_feature("glasses"),
    },
    accessories: {
      id: random_facial_feature("accessories"),
    },
  };

  return face;
};

const create_player_face = async (many_or_single, player_ids, db) => {
  if (many_or_single == "many") {
    const players = await db.player.bulkGet(player_ids);

    for (const player of players) {
      player.player_face = generate_face(player.ethnicity, player.body.weight);
    }

    await db.player.bulkPut(players);

    return players;
  } else {
    const player_id = player_ids;

    const player = await db.player.get({ player_id: player_id });

    player.player_face = generate_face(player.ethnicity, player.body.weight);

    await db.player.put(player, player.player_id);

    return player.player_face;
  }
};

const create_coach_face = async (many_or_single, coach_ids, db) => {
  if (many_or_single == "many") {
    const coaches = await db.coach.bulkGet(coach_ids);

    for (const coach of coaches) {
      coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);
    }

    await db.coach.bulkPut(coaches);

    return coaches;
  } else {
    const coach_id = coach_ids;

    const coach = await db.coach.get({ coach_id: coach_id });

    coach.coach_face = generate_face(coach.ethnicity, coach.body.weight);

    await db.coach.put(coach, coach.coach_id);

    return coach.coach_face;
  }
};

const addWrapper = (svgString) => {
  return `<g>${svgString}</g>`;
};

const addTransform = (element, newTransform) => {
  const oldTransform = $(element).attr("transform");
  element.setAttribute(
    "transform",
    `${oldTransform ? `${oldTransform} ` : ""}${newTransform}`
  );
};

const rotateCentered = (element, angle) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  addTransform(element, `rotate(${angle} ${cx} ${cy})`);
};

const scaleStrokeWidthAndChildren = (element, factor) => {
  const strokeWidth = $(element).attr("stroke-width");
  if (strokeWidth) {
    element.setAttribute(
      "stroke-width",
      String(parseFloat(strokeWidth) / factor)
    );
  }
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    scaleStrokeWidthAndChildren(children[i], factor);
  }
};

// Scale relative to the center of bounding box of element e, like in Raphael.
// Set x and y to 1 and this does nothing. Higher = bigger, lower = smaller.
const scaleCentered = (element, x, y) => {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const tx = (cx * (1 - x)) / x;
  const ty = (cy * (1 - y)) / y;

  addTransform(element, `scale(${x} ${y}) translate(${tx} ${ty})`);

  // Keep apparent stroke width constant, similar to how Raphael does it (I think)
  if (
    Math.abs(x) !== 1 ||
    Math.abs(y) !== 1 ||
    Math.abs(x) + Math.abs(y) !== 2
  ) {
    const factor = (Math.abs(x) + Math.abs(y)) / 2;
    scaleStrokeWidthAndChildren(element, factor);
  }
};

// Translate element such that its center is at (x, y). Specifying xAlign and yAlign can instead make (x, y) the left/right and top/bottom.
const translate = (element, x, y, xAlign = "center", yAlign = "center") => {
  const bbox = element.getBBox();
  var cx;
  var cy;
  if (xAlign === "left") {
    cx = bbox.x;
  } else if (xAlign === "right") {
    cx = bbox.x + bbox.width;
  } else {
    cx = bbox.x + bbox.width / 2;
  }
  if (yAlign === "top") {
    cy = bbox.y;
  } else if (yAlign === "bottom") {
    cy = bbox.y + bbox.height;
  } else {
    cy = bbox.y + bbox.height / 2;
  }

  addTransform(element, `translate(${x - cx} ${y - cy})`);
};

// Defines the range of fat/skinny, relative to the original width of the default head.
const fatScale = (fatness) => 0.8 + 0.2 * fatness;

const svgs = {
  eye: {
    eye1: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 56" width="66" height="56">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye1">\t\t<path id="Shape 7" class="eye-shp0-$[player_id]" d="M63 43C63 43 58 53 28 53C-2 53 3 43 3 43C3 43 3 3 33 3C63 3 63 43 63 43Z" />\t\t<path id="Shape 7" class="shp1-$[player_id]" d="M33 38C23 38 23 18 33 18C43 18 43 38 33 38Z" />\t</g></svg>',
    eye2: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="60" height="40">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye2">\t\t<path id="Shape 10" class="eye-shp0-$[player_id]" d="M55.37 34.72C55.37 34.72 58.4 2.3 28.53 5.07C-1.35 7.83 7.21 35.16 7.21 35.16" />\t\t<path id="Shape 10" class="shp1-$[player_id]" d="M30.74 28.97C27.43 29.27 24.52 26.85 24.21 23.54C23.9 20.24 26.33 17.32 29.63 17.02C32.94 16.71 35.85 19.13 36.16 22.44C36.46 25.74 34.04 28.66 30.74 28.97Z" />\t</g></svg>',
    eye3: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: none;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #ffffff;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp2-$[player_id] { fill: #000000;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 4 } \t</style>\t<g id="eye3">\t\t<path id="Shape 7" class="eye-shp0-$[player_id]" d="M265 360C251.17 360 240 348.82 240 335C240 321.17 251.17 310 265 310C278.82 310 290 321.17 290 335C290 348.82 278.82 360 265 360Z" />\t\t<path id="Shape 7" class="shp1-$[player_id]" d="M265 360C251.17 360 240 348.82 240 335C240 330 240 330 240 330L290 330C290 330 290 330 290 335C290 348.82 278.82 360 265 360Z" />\t\t<path id="Shape 7" class="shp1-$[player_id]" d="" />\t\t<path id="Shape 7" class="shp2-$[player_id]" d="M265 330C255 330 255 345 265 345C275 345 275 330 265 330Z" />\t</g></svg>',
    eye4: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 4 } \t</style>\t<g id="eye4">\t\t<path id="Shape 9" class="eye-shp0-$[player_id]" d="M68.08 23.19C68.08 23.19 69.97 38.07 40.21 41.86C15.41 45.02 6.66 15.89 6.03 10.93C25.87 8.4 65.55 3.35 68.08 23.19Z" />\t\t<path id="Shape 7 copy" class="shp1-$[player_id]" d="M39.04 16.81C48.96 15.54 50.85 30.42 40.93 31.69C31.01 32.95 29.12 18.07 39.04 16.81Z" />\t</g></svg>',
    eye5: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 50" width="85" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff } \t\t.shp1-$[player_id] { fill: #000000 } \t\t.shp2-$[player_id] { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye5">\t\t<path id="White" class="eye-shp0-$[player_id]" d="M73.67 39.73C77.59 29.26 76.02 14.35 76.02 14.35C76.02 14.35 40.16 8.08 30.22 9.13C20.27 10.17 5.88 16.72 5.88 16.72C5.88 16.72 4.44 26.93 13.48 41.06L73.67 39.73Z" />\t\t<path id="Shape 9" class="shp1-$[player_id]" d="M45.8 37.65C41.67 38.08 37.63 31.77 36.76 23.52C35.89 15.27 38.52 8.25 42.65 7.81C46.77 7.38 50.81 13.69 51.68 21.94C52.55 30.19 49.92 37.21 45.8 37.65Z" />\t\t<path id="Outline" class="shp2-$[player_id]" d="M73.67 39.73C78.12 34.24 76.02 14.35 76.02 14.35C76.02 14.35 40.16 8.08 30.22 9.13C20.27 10.17 5.88 16.72 5.88 16.72C5.88 16.72 7.45 31.64 13.48 41.06" />\t</g></svg>',
    eye10:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="eye10.svg"   id="svg1258"   version="1.1"   height="600"   width="400"   viewBox="0 0 400 600">  <metadata     id="metadata1264">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs1262" />  <sodipodi:namedview     inkscape:current-layer="eye3"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="340.67238"     inkscape:cx="269.13445"     inkscape:zoom="10.917729"     showgrid="false"     id="namedview1260"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <style     id="style1248">\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: none;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #ffffff;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp2-$[player_id] { fill: #000000;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 4 } \t</style>  <g     id="eye3">    <path       sodipodi:nodetypes="sccs"       d="m 259.00957,349.53965 c -13.86594,-0.39802 -24.70891,-6.08865 -24.70891,-19.04974 10.69975,-18.06303 40.38566,-18.35838 51.24971,-0.27478 4.41424,12.20745 -11.60754,19.75317 -26.5408,19.32452 z"       class="shp1-$[player_id]"       id="path1251" />    <path       d=""       class="shp1-$[player_id]"       id="path1253" />    <path       d="m 259.55151,325.17695 c -10,0 -10,15 0,15 10,0 10,-15 0,-15 z"       class="shp2-$[player_id]"       id="path1255" />  </g></svg>',
    eye11:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   viewBox="0 0 400 600"   width="400"   height="600"   version="1.1"   id="svg1258"   sodipodi:docname="eye14.svg"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)">  <metadata     id="metadata1264">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs1262" />  <sodipodi:namedview     inkscape:document-rotation="0"     pagecolor="#ffffff"     bordercolor="#666666"     borderopacity="1"     objecttolerance="10"     gridtolerance="10"     guidetolerance="10"     inkscape:pageopacity="0"     inkscape:pageshadow="2"     inkscape:window-width="2560"     inkscape:window-height="1417"     id="namedview1260"     showgrid="false"     inkscape:zoom="15.44"     inkscape:cx="281.00606"     inkscape:cy="331.97568"     inkscape:window-x="1912"     inkscape:window-y="-8"     inkscape:window-maximized="1"     inkscape:current-layer="eye3" />  <style     id="style1248">\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: none;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #ffffff;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 5 } \t\t.shp2-$[player_id] { fill: #000000;stroke: #000000;stroke-linecap:round;stroke-linejoin:round;stroke-width: 4 } \t</style>  <g     id="eye3">    <path       id="path1251"       class="shp1-$[player_id]"       d="m 259.00957,349.53965 c -13.86594,-0.39802 -24.57938,-15.35031 -24.57938,-28.3114 14.97436,0.007 34.49188,0.10017 51.24971,-0.27478 0.2044,12.79035 -11.73707,29.01483 -26.67033,28.58618 z"       sodipodi:nodetypes="sccs" />    <path       id="path1253"       class="shp1-$[player_id]"       d="" />    <path       id="path1255"       class="shp2-$[player_id]"       d="m 259.55151,325.17695 c -10,0 -10,15 0,15 10,0 10,-15 0,-15 z" />  </g></svg>',
    eye6: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40" width="80" height="40">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff } \t\t.shp1-$[player_id] { fill: #000000 } \t\t.shp2-$[player_id] { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye6">\t\t<path id="Shape 9" class="eye-shp0-$[player_id]" d="M73.63 30.14C73.63 30.14 62.25 5.74 32.3 7.42C12.33 8.54 7.9 18.8 7.9 18.8L13.73 33.5C43.96 36.81 73.63 30.14 73.63 30.14Z" />\t\t<path id="Shape 9" class="shp1-$[player_id]" d="M40.63 30.99C46.15 30.68 50.36 25.97 50.05 20.44C49.74 14.92 45.03 10.71 39.51 11.02C33.99 11.33 29.78 16.04 30.08 21.56C30.39 27.08 35.11 31.3 40.63 30.99Z" />\t\t<path id="Outline" class="shp2-$[player_id]" d="M73.63 30.14C73.63 30.14 72.51 10.17 32.3 7.42C12.33 8.54 7.9 18.8 7.9 18.8L13.73 33.5" />\t</g></svg>',
    eye7: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 21" width="78" height="21">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye7">\t\t<path id="White" class="eye-shp0-$[player_id]" d="M74 18L69 3L4 3L9 18L74 18Z" />\t\t<path id="Shape 9" class="shp1-$[player_id]" d="M38.5 18C34.35 18 31 14.65 31 10.5C31 6.35 34.35 3 38.5 3C42.65 3 46 6.35 46 10.5C46 14.65 42.65 18 38.5 18Z" />\t</g></svg>',
    eye12:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t</style>\t<g id="eye">\t\t<path id="Shape 1" class="white" d="M5.55 33.46C5.55 33.46 17.01 4.81 39.93 4.81C62.85 4.81 68.58 33.46 68.58 33.46C68.58 33.46 62.85 44.92 39.93 44.92C17.01 44.92 5.55 33.46 5.55 33.46Z" />\t\t<path id="Layer 2" class="black" d="M5.55 33.46C2.68 30.6 17.08 4.1 40 4.1C62.92 4.1 71.44 30.6 68.58 33.46C65.71 36.33 62.85 16.27 39.93 16.27C17.01 16.27 8.41 36.33 5.55 33.46Z" />\t\t<path id="Shape 2" class="black" d="M39.93 38.04C33.59 38.04 28.47 32.92 28.47 26.58C28.47 20.25 33.59 15.12 39.93 15.12C46.27 15.12 51.39 20.25 51.39 26.58C51.39 32.92 46.27 38.04 39.93 38.04Z" />\t\t<path id="Shape 3" class="black" d="" />\t</g></svg>',
    eye13:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t</style>\t<g id="eye">\t\t<path id="Shape 1" class="white" d="M5.55 28.46C5.55 28.46 17.08 11.77 40 11.77C62.92 11.77 68.58 28.46 68.58 28.46C68.58 28.46 62.85 39.92 39.93 39.92C17.01 39.92 5.55 28.46 5.55 28.46Z" />\t\t<path id="Layer 2" class="black" d="M5.55 28.46C2.68 25.6 17.08 9.77 40 9.77C62.92 9.77 71.44 25.6 68.58 28.46C65.71 31.33 62.92 16.27 40 16.27C17.08 16.27 8.41 31.33 5.55 28.46Z" />\t\t<path id="Shape 2" class="black" d="M39.93 33.04C33.59 33.04 28.47 27.92 28.47 21.58C28.47 15.25 33.59 10.12 39.93 10.12C46.27 10.12 51.39 15.25 51.39 21.58C51.39 27.92 46.27 33.04 39.93 33.04Z" />\t\t<path id="Shape 3" class="black" d="" />\t</g></svg>',
    eye14:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.shp1-$[player_id] { fill: #000000 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M5 20C5 20 17.08 11.77 40 11.77C62.92 11.77 70 30 70 30C70 30 62.85 39.92 39.93 39.92C17.01 39.92 5 20 5 20Z" />\t\t<path id="black" class="black" d="M5 20C2.13 17.13 17.2 10.45 40 8.1C70 5 72.87 27.13 70 30C67.13 32.87 62.92 16.27 40 16.27C17.08 16.27 7.87 22.87 5 20Z" />\t\t<path id="black" class="black" d="M39.93 33.04C33.59 33.04 28.47 27.92 28.47 21.58C28.47 15.25 33.59 10.12 39.93 10.12C46.27 10.12 51.39 15.25 51.39 21.58C51.39 27.92 46.27 33.04 39.93 33.04Z" />\t</g></svg>',
    eye8: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 46" width="70" height="46">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye8">\t\t<path id="Shape 10" class="eye-shp0-$[player_id]" d="M67 35C67 31 73 3 43 3C13 3 3 15 3 23C3 31 15 43 27 43C39 43 67 39 67 35Z" />\t\t<path id="Shape 10" class="shp1-$[player_id]" d="M39 29C35.68 29 33 26.32 33 23C33 19.68 35.68 17 39 17C42.32 17 45 19.68 45 23C45 26.32 42.32 29 39 29Z" />\t</g></svg>',
    eye9: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.eye-shp0-$[player_id] { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t\t.shp1-$[player_id] { fill: #000000;stroke: #000000;stroke-width: 5 } \t</style>\t<g id="eye9">\t\t<path id="Shape 10" class="eye-shp0-$[player_id]" d="M240 340C240 336 234 320 264 320C284 320 300 328 300 332C300 336 288 344 280 344C276 344 240 344 240 340Z" />\t\t<path id="Shape 10" class="shp1-$[player_id]" d="M268 340C264.68 340 262 336.42 262 332C262 327.58 264.68 324 268 324C271.32 324 274 327.58 274 332C274 336.42 271.32 340 268 340Z" />\t</g></svg>',
    eye15:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M5 35C5 35 17.08 5 40 5C62.92 5 70 35 70 35C70 35 62.85 42.92 39.93 42.92C17.01 42.92 5 35 5 35Z" />\t\t<path id="black" class="black" d="M5 35.6C2.13 32.73 17.08 1.88 40 1.88C62.92 1.88 72.87 32.13 70 35C67.13 37.87 62.92 6.73 40 6.73C17.08 6.73 7.87 38.46 5 35.6Z" />\t\t<path id="black" class="black" d="M39.93 33.78C35.4 33.78 31.73 30.12 31.73 25.58C31.73 21.05 35.4 17.39 39.93 17.39C44.46 17.39 48.12 21.05 48.12 25.58C48.12 30.12 44.46 33.78 39.93 33.78Z" />\t\t<path id="Shape 1" class="shp1-$[player_id]" d="" />\t</g></svg>',
    eye16:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t\t.blackLine { fill: none;stroke: #000000;stroke-width: 6 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M5 35L10 20C10 20 14.24 15 29.3 15C59.3 15 65 20 65 20L70 35C70 35 62.92 35 40 35C17.08 35 5 35 5 35Z" />\t\t<path id="black" class="black" d="M37.93 33.78C33.4 33.78 29.73 30.12 29.73 25.58C29.73 21.05 33.4 17.39 37.93 17.39C42.46 17.39 46.12 21.05 46.12 25.58C46.12 30.12 42.46 33.78 37.93 33.78Z" />\t\t<path id="Shape 1" class="blackLine" d="M5 35C5 35 5 25 10 20C15 15 65 20 65 20L70 35" />\t</g></svg>',
    eye17:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t\t.blackLine { fill: none;stroke: #000000;stroke-width: 6 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M6.19 40.49L5.36 18.42C5.36 18.42 7.63 14.55 22.45 18.64C52.38 26.9 64.9 23.11 64.9 23.11L70.94 34.83C70.94 34.83 63.89 35.44 41.06 37.44C18.22 39.44 6.19 40.49 6.19 40.49Z" />\t\t<path id="black" class="black" d="M38.86 36.14C34.35 36.53 30.31 32.4 29.83 26.89C29.35 21.38 32.66 19.81 37.17 19.41C41.69 19.02 45.68 19.95 46.16 25.46C46.64 30.97 43.38 35.74 38.86 36.14Z" />\t\t<path id="Shape 1" class="blackLine" d="M6.19 40.49C6.19 40.49 2.41 12.46 9.05 15.75C19.54 20.95 64.9 23.11 64.9 23.11L70.94 34.83" />\t</g></svg>',
    eye18:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t\t.blackLine { fill: none;stroke: #000000;stroke-width: 6 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M10 35L5 20C5 20 20 10 35 10C50 10 70 25 70 25L65 35C65 35 62.92 35 40 35C17.08 35 10 35 10 35Z" />\t\t<path id="black" class="black" d="M37.93 32.78C33.4 32.78 29.73 29.12 29.73 24.58C29.73 20.05 33.4 16.39 37.93 16.39C42.46 16.39 46.12 20.05 46.12 24.58C46.12 29.12 42.46 32.78 37.93 32.78Z" />\t\t<path id="blackLine" class="blackLine" d="M10 35L5 20.72C5 20.72 25 10 35 10C45 10 70 25 70 25L65 35" />\t</g></svg>',
    eye19:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 50" width="75" height="50">\t<style>\t\ttspan { white-space:pre }\t\t.white { fill: #f5f3ee } \t\t.black { fill: #000000 } \t\t.blackLine { fill: none;stroke: #000000;stroke-width: 6 } \t</style>\t<g id="eye">\t\t<path id="white" class="white" d="M10 35L5 20C5 20 20 15 35 15C50 15 70 25 70 25L65 35C65 35 62.92 35 40 35C17.08 35 10 35 10 35Z" />\t\t<path id="black" class="black" d="M37.93 32.78C33.4 32.78 29.73 29.12 29.73 24.58C29.73 20.05 33.4 16.39 37.93 16.39C42.46 16.39 46.12 20.05 46.12 24.58C46.12 29.12 42.46 32.78 37.93 32.78Z" />\t\t<path id="blackLine" class="blackLine" d="M10 35L5 20.72C5 20.72 25 15 35 15C45 15 70 25 70 25L65 35" />\t</g></svg>',
  },
  body: {
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Body">\t\t<path id="Body" class="body" d="M10 600C10 600 10 550 70 530C130 510 140 480 140 480L200 300L260 480C260 480 270 510 330 530C390 550 390 600 390 600" fill="$[skinColor]" stroke="#000" stroke-width="6"/>\t</g></svg>',
    body2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Body">\t\t<path id="Body" class="body" d="M10 600C10 600 0 535 60 535C65 535 85 520 130 500L200 300L270 500C315 520 335 535 340 535C400 535 390 600 390 600" fill="$[skinColor]" stroke="#000" stroke-width="6"/>\t</g></svg>',
    body4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Body">\t\t<path id="Body" class="body" d="M20 600C20 600 15 540 60 530C75 530 105 515 150 495L200 300L250 495C295 515 325 530 340 530C385 540 385 600 385 600" fill="$[skinColor]" stroke="#000" stroke-width="6"/>\t</g></svg>',
    body5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Body">\t\t<path id="Body" class="body" d="M5 600C5 600 0 540 40 530C40 530 80 530 130 500L200 300L270 500C320 530 360 530 360 530C400 540 395 600 395 600" fill="$[skinColor]" stroke="#000" stroke-width="6"/>\t</g></svg>',
    body3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Body">\t\t<path id="Body" class="body" d="M10 600C10 600 0 530 60 530C70 530 60 520 120 510C120 510 170 300 200 300C230 300 280 510 280 510C340 520 330 530 340 530C400 530 390 600 390 600" fill="$[skinColor]" stroke="#000" stroke-width="6"/>\t</g></svg>',
  },
  ear: {
    ear1: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 69" width="46" height="69">\t<path id="ear1" d="M43 13C43 13 23 3 13 3C3 3 3 23 3 33C3 43 6 53 16 63C26 73 43 53 43 53L43 13Z" fill="$[skinColor]" stroke="#000" stroke-width="6"/></svg>',
    ear2: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 68" width="43" height="68">\t<path id="ear2" d="M40 14C40 14 10 -1 5 4C0 9 5 34 10 44C15 54 5 69 40 64L40 14Z" fill="$[skinColor]" stroke="#000" stroke-width="6"/></svg>',
    ear3: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 63" width="46" height="63">\t<path id="ear3" d="M43 8C43 8 3 -12 3 28C3 73 43 58 43 58L43 8Z" fill="$[skinColor]" stroke="#000" stroke-width="6"/></svg>',
  },
  head: {
    head1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 1" class="head" d="M200 100C300 100 350 160 350 300C350 370 300 500 200 500C100 500 50 370 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 370 300 500 200 500C100 500 50 370 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 2" class="head" d="M200 100C300 100 350 160 350 300C350 370 320 420 310 430C300 440 250 490 250 490C250 490 230 500 200 500C170 500 150 490 150 490C150 490 100 440 90 430C80 420 50 370 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 370 320 420 310 430C300 440 250 490 250 490C250 490 230 500 200 500C170 500 150 490 150 490C150 490 100 440 90 430C80 420 50 370 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 3" d="M200 100C300 100 350 160 350 300C350 320 330 430 330 430L250 480C230 500 210 500 200 500C190 500 170 500 150 480L70 430C70 430 50 320 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 320 330 430 330 430L250 480C230 500 210 500 200 500C190 500 170 500 150 480L70 430C70 430 50 320 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 4" class="head" d="M200 100C300 100 350 160 350 300C350 370 340 390 320 430C310 450 260 480 250 490C230 510 230 500 200 500C170 500 170 510 150 490C140 480 90 450 80 430C60 390 50 370 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 370 340 390 320 430C310 450 260 480 250 490C230 510 230 500 200 500C170 500 170 510 150 490C140 480 90 450 80 430C60 390 50 370 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head9:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 9" class="head" d="M200 100C300 100 350 160 350 300C350 460 270 470 250 490C240 500 220 510 200 500C180 510.9 160 500 150 490C130 470 50 460 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z"  fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 460 270 470 250 490C240 500 220 510 200 500C180 510 160 500 150 490C130 470 50 460 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head10:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 10" class="head" d="M200 100C300 100 350 160 350 300C340 460 350 410 250 490C240 500 220 510 200 500C180 510.9 160 500 150 490C50 410 60 460 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C340 460 350 410 250 490C240 500 220 510 200 500C180 510 161.04 498.83 150 490C50 410 60 460 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]" />\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]" /></svg>',
    head14:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 14" class="head" d="M200 100C300 100 350 160 350 300C350 450 270 460 240 490C230 500 220 500 200 500C180 500 170 500 160 490C130 460 50 450 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 450 270 460 240 490C230 500 220 500 200 500C180 500 170.12 499.88 160 490C130 460.69 50 450 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head15:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 15" class="head" d="M200 100C300 100 350 160 350 300C330 480 340 440 260 480C230 490 220 500 200 500C180 500 170 490 140 480C60 440 70 480 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C330 480.69 340 440 260 480C230 490 220 500 200 500C180 500 170 490 140 480C60 440 70 480 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head16:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 16" class="head" d="M200 100C300 100 350 160 350 300C350 300 330 405 330 435C330 465 220 500 200 500C180 500 70 465 70 435C70 405 50 300 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 300 330 405 330 435C330 465 220 500 200 500C180 500 70 465 70 435C70 405 50 300 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head18:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 18" class="head" d="M200 100C300 100 350 160 350 300C350 300 330 405 330 435C330 465 270 480 250 490C230 500 240 505 200 495C160 505 170 500 150 490C130 480 70 465 70 435C70 405 50 300 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 300 330 405 330 435C330 465 270 480 250 490C230 500 240 505 200 495C160 505 170 500 150 490C130 480 70 465 70 435C70 405 50 300 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 5" class="head" d="M200 100C300 100 350 160 350 300C350 350 349.49 371.54 340 400C330 430 260 470 250 480C240 490 230 500 200 500C170 500 160 490 150 480C140 470 70 430 60 400C50.51 371.54 50 350 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 350 349.49 371.54 340 400C330 430 260 470 250 480C240 490 230 500 200 500C170 500 160 490 150 480C140 470 70 430 60 400C50.51 371.54 50 350 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 6" class="head" d="M200 100C300 100 350 160 350 300C350 370 320 450 310 460C300 470 250 500 200 500C150 500 100 470 90 460C80 450 50 370 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 370 320 450 310 460C300 470 250 500 200 500C150 500 100 470 90 460C80 450 50 370 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head7:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Head 7" class="head" d="M200 100C300 100 350 160 350 300C350 320 330 420 325 430C320.53 438.94 220 500 220 500C220 500 215 500 200 500C185 500 180 500 180 500C180 500 81.71 443.42 75 430C70 420 50 320 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 320 330 420 325 430C320.53 438.94 220 500 220 500C220 500 215 500 200 500C185 500 180 500 180 500C180 500 81.71 443.42 75 430C70 420 50 320 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head8:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 8" class="head" d="M200 100C300 100 350 160 350 300C350 320 345 400 325 430C315 450 280 480 240 485C235 490 225 500 200 500C175 500 165 490 160 485C125 480 85 450 75 430C55 400 50 320 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 320 345 400 325 430C315 450 280 480 240 485C235 490 225 500 200 500C175 500 165 490 160 485C125 480 85 450 75 430C55 400 50 320 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z" fill="$[faceShave]"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/></svg>',
    head12:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 12" class="head" d="M200 100C300 100 350 160 350 300C350 420 350 440 250 480C240 490 220 500 200 500C180 500 160 490 150 480C50 440 50 420 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 420 350 440 250 480C236.87 485.25 220 500 200 500C180 500 163.13 485.25 150 480C50 440 50 420 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head13:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 13" class="head" d="M200 100C300 100 350 160 350 300C350 420 340 450 240 490C240 490 220 500 200 500C180 500 160 490 160 490C60 450 50 420 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 420 340 450 240 490C240 490 220 500 200 500C180 500 160 490 160 490C60 450 50 420 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
    head17:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="head 17" class="head" d="M200 100C300 100 350 160 350 300C350 300 344.85 410.6 340 430C335 450 280 500 200 500C120 500 65 450 60 430C55.15 410.6 50 300 50 300C50 160 100 100 200 100Z" fill="$[skinColor]" stroke="#000000" stroke-width="6"/>\t<path id="headShave" class="headShave" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" fill="$[headShave]"/>\t<path id="faceShave" class="faceShave" d="M200 410C230 410 250 420 250 420C280 420 340 405 340 300L350 300C350 300 350 380 340 430C335 450 280 500 200 500C120 500 65 450 60 430C50 380 50 300 50 300L60 300C60 405 120 420 150 420C150 420 170 410 200 410Z"  fill="$[faceShave]"/></svg>',
  },
  mouth: {
    mouth3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 28" width="70" height="28">\t<style>\t\ttspan { white-space:pre }\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.teeth { fill: #ffffff } \t\t.mouth-03-stroke { fill: none;stroke: #000000;stroke-width: 4 } \t</style>\t<g id="lips">\t\t<path id="lips" class="lips" d="M1 3C1 3 12 1.14 35 1C51.67 0.9 69 3 69 3C69 3 57.67 26.31 35 27C12.68 27.68 1 3 1 3Z" />\t\t<path id="teeth" class="teeth" d="M11 5C11 5 25 6.71 35 6.71C45 6.71 59 5 59 5C59 5 51 15 35 15C19 15 11 5 11 5Z" />\t\t<path id="mouth-03-stroke" class="mouth-03-stroke" d="M11 5C11 5 25 6.71 35 6.71C45 6.71 59 5 59 5C59 5 51 15 35 15C19 15 11 5 11 5ZM1 3C1 3 6 6.19 11 5M69 3C69 3 64 6.19 59 5M20.71 23.69C35.86 27.83 37 27.55 49.86 23.12" />\t</g></svg>',
    mouth4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.teeth { fill: #ffffff } \t\t.mouth-05-stroke { fill: none;stroke: #000000;stroke-width: 3 } \t</style>\t<g id="lips copy">\t\t<path id="lips" class="lips" d="M168 384C168 384 177 370.23 200 369.97C217.4 369.77 232 383.17 232 383.17C232 383.17 227.71 406.41 200 406.98C172.71 407.54 168 384 168 384Z" />\t\t<path id="teeth" class="teeth" d="M168 384C180 380 216 380 232 384C212 388 222 388 200 388C180 388 184 388 168 384Z" />\t\t<path id="mouth-05-stroke" class="mouth-05-stroke" d="M168 384C180 380 216 380 232 384C212 388 222 388 200 388C180 388 184 388 168 384ZM181.71 402.12C196.23 407.78 206.43 407.83 219.43 401.41M220.29 374.88C205.77 369.22 193 368.54 180 374.97" />\t</g></svg>',
    straight:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.straight { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="straight" class="straight" d="M180 430L220 430" /></svg>',
    angry:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 29" width="80" height="29">\t<style>\t\ttspan { white-space:pre }\t\t.angry { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="angry" class="angry" d="M40 9C50 9 65 -1 70 4C75 9 80 19 75 24C70 29 50 24 40 24C30 24 10 29 5 24C0 19 5 9 10 4C15 -1 30 9 40 9Z" /></svg>',
    closed:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.closed { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="closed" class="closed" d="M170 440L180 430L220 430L230 440" /></svg>',
    mouth:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 23" width="64" height="23">\t<style>\t\ttspan { white-space:pre }\t\t.mouth { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="mouth" class="mouth" d="M32 3C42 3 47 3 57 8C62 13 62 13 57 18C52 23 42 18 32 18C22 18 12 23 7 18C2 13 2 13 7 8C17 3 22 3 32 3Z" /></svg>',
    mouth2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t<!-- opacity: 0.2 for lip color -->\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.teeth { fill: #ffffff } \t\t.stroke { fill: none;stroke: #000000;stroke-width: 4 } \t\t.thin-stroke { fill: none;stroke: #000000;stroke-width: 1 } \t</style>\t<g id="mouth-02">\t\t<path id="color" class="lips" d="M167 382C167 382 177 373.14 200 373C216.67 372.9 234 382 234 382C234 382 222.67 403.31 200 404C177.68 404.68 167 382 167 382Z" />\t\t<path id="teeth" class="teeth" d="M176 384C176 384 190 380 200 380C210 380 224 384 224 384C224 384 216 392 200 392C184 392 176 384 176 384Z" />\t\t<path id="stroke" class="stroke" d="M176 384C176 384 190 380 200 380C210 380 224 384 224 384C224 384 216 392 200 392C184 392 176 384 176 384Z" />\t\t<path id="Shape 1" class="thin-stroke" d="M180 376C196 372 204 372 220 376" />\t\t<path id="Shape 2" class="stroke" d="M166 382C166 382 171 385.19 176 384M234 382C234 382 229 385.19 224 384" />\t\t<path id="Shape 3" class="thin-stroke" d="M185.71 400.69C200.86 404.83 202 404.55 214.86 400.12" />\t</g></svg>',
    mouth5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.mouth-06-stroke { fill: none;stroke: #000000;stroke-width: 4 } \t</style>\t<g id="lips copy">\t\t<path id="Shape 4 copy" class="lips" d="M168 384C168 384 177 370.23 200 369.97C217.4 369.77 232 383.17 232 383.17C232 383.17 227.71 406.41 200 406.98C172.71 407.54 168 384 168 384Z" />\t\t<path id="mouth-06-stroke" class="mouth-06-stroke" d="M181.71 402.12C196.23 407.78 206.43 407.83 219.43 401.41M220.29 374.88C205.77 369.22 193 368.54 180 374.97M176 384C184 381.83 192 384 200 384C208 384 216 381.83 224 384M236 380C236 380 236 384 224 384M164 380C164 380 164 384 176 384" />\t</g></svg>',
    mouth6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.lip-color { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.mouth-07-lip-stroke { fill: none;stroke: #000000;stroke-width: 2 } \t\t.mouth-07-thin-stroke { fill: none;stroke: #000000;stroke-width: 4 } \t</style>\t<g id="lips copy">\t\t<path id="lip-color" class="lip-color" d="M168 384C168 384 177 370.23 200 369.97C217.4 369.77 232 383.17 232 383.17C232 383.17 227.71 406.41 200 406.98C172.71 407.54 168 384 168 384Z" />\t\t<path id="lip-stroke" class="mouth-07-lip-stroke" d="M181.71 402.12C196.23 407.78 206.43 407.83 219.43 401.41M220.29 374.88C205.77 369.22 193 368.54 180 374.97" />\t\t<path id="thin-stroke" class="mouth-07-thin-stroke" d="M165 390C165 390 185 385 200 385C215 385 235 389 235 389" />\t</g></svg>',
    mouth7:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t<!-- opacity: 0.2 for lip color -->\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.mouth-14 { fill: #000000;stroke: #000000 } \t\t.teeth { fill: #ffffff } \t\t.mouth-14-stroke { fill: none;stroke: #000000;stroke-width: 4 } \t</style>\t<g id="lips copy">\t\t<path id="lips" class="lips" d="M168 384C168 384 177 370.23 200 369.97C217.4 369.77 232 383.17 232 383.17C232 383.17 227.71 411.43 200 412C172.71 412.56 168 384 168 384Z" />\t\t<path id="mouth" class="mouth-14" d="M168 384C180 380 216 380 232 384C224 392 222 400 200 400C180 400 176 392 168 384Z" />\t\t<path id="teeth" class="teeth" d="M168 384C180 380 216 380 232 384C212 388 222 388 200 388C180 388 184 388 168 384ZM180 396C180 396 194 395 200 395C206 395 220 396 220 396C220 396 216 400 200 400C188 400 180 396 180 396Z" />\t\t<path id="mouth-14-stroke" class="mouth-14-stroke" d="M168 384C180 380 216 380 232 384C224 392 222 400 200 400C180 400 176 392 168 384ZM184 408C196 414 204 414 216 408M220.29 374.88C205.77 369.22 193 368.54 180 374.97" />\t</g></svg>',
    mouth8:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t<!-- opacity: 0.2 for lip color -->\t\t.lips { opacity: 0.05;mix-blend-mode: multiply;fill: #501414 } \t\t.mouth { fill: #000000;stroke: #000000 } \t\t.teeth { fill: #ffffff } \t\t.mouth-15-stroke { fill: none;stroke: #000000;stroke-width: 4 } \t</style>\t<g id="lips copy">\t\t<path id="lips" class="lips" d="M168 384C168 384 177 370.23 200 369.97C217.4 369.77 232 383.17 232 383.17C232 383.17 227.71 411.43 200 412C172.71 412.56 168 384 168 384Z" />\t\t<path id="mouth" class="mouth" d="M168 384C180 380 216 380 232 384C224 392 222 400 200 400C180 400 176 392 168 384Z" />\t\t<path id="teeth" class="teeth" d="M168 384C182.08 378.27 221.75 380.27 232.25 384.6C212.25 389.27 201.75 386.6 201.75 386.6L201.92 381.43L197.25 381.1L197.42 386.27C197.42 386.27 184 388 168 384ZM172.42 390.6C172.42 390.6 194 393.77 200 393.77C206 393.77 226.92 390.77 226.92 390.77C226.92 390.77 216 400 200 400C188 400 172.42 390.6 172.42 390.6Z" />\t\t<path id="mouth-15-stroke" class="mouth-15-stroke" d="M168 384C180 380 216 380 232 384C224 392 222 400 200 400C180 400 176 392 168 384ZM184 408C196 414 204 414 216 408" />\t</g></svg>',
    "smile-closed":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.smile-closed { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="smile-closed" class="smile-closed" d="M170 430C170 430 180 440 200 440C220 440 230 430 230 430" /></svg>',
    smile:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.smile { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="smile" class="smile" d="M170 430C170 430 180 450 200 450C220 450 230 430 230 430L170 430Z" /></svg>',
    smile2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 62 31" width="62" height="31">\t<style>\t\ttspan { white-space:pre }\t\t.smile2 { fill: #ffffff;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="smile2" class="smile2" d="M11 8C11 8 4.33 28 31 28C57.67 28 51 8 51 8C51 8 41 4.37 31 4.37C21 4.37 11 8 11 8ZM61 3L51 8M1 3L11 8" /></svg>',
    smile3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 26" width="90" height="26">    <style>        tspan { white-space:pre }        .smile3 { fill: #ffffff;stroke: #000000;stroke-width: 5 }     </style>    <path id="smile3" class="smile3" d="M5 3C5 3 18.33 23 45 23C71.67 23 85 3 85 3C85 3 65 5.22 45 5.22C25 5.22 5 3 5 3Z" /></svg>',
  },
  nose: {
    nose3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Nose">\t\t<path id="Nose 3" class="nose" d="M175 380L200 400L225 380" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Nose">\t\t<path id="Nose 1" d="M170 390C170 390 180 380 190 390C200 400 200 400 210 390C220 380 230 390 230 390" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 51 69" width="51" height="69">\t<g id="Nose">\t\t<path id="Nose 2" class="nose" d="M28 1L48 46C48 46 43 66 23 66C3 66 3 46 3 46" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 54" width="26" height="54">\t<g id="Nose">\t\t<path id="Nose 4" class="nose" d="M11 1C11 1 6 31 21 41L1 51" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Nose">\t\t<path id="Nose 5" class="nose" d="M175 370C155 370 170 395 180 385C185 380 195 395 200 395C205 395 215 380 220 385C230 395 245 370 225 370" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Nose">\t\t<path id="Nose 6" class="nose" d="M190 325C190 325 185 345 185 370C165 365 170 385 170 390C190 390 185 400 200 400C215 400 210 390 230 390C230 385 235 365 215 370C215 345 210 325 210 325" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose7:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Nose">\t\t<path id="Nose 7" class="nose" d="M180 380C180 380 190 375 200 375C210 375 220 380 220 380M200 375L200 335" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t</g></svg>',
    nose8:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Nose8" class="nose" d="M186.89 385.17C186.89 385.17 182.18 371.06 201 371.06C219.82 371.06 215.11 385.17 215.11 385.17M201 371.06L201 352.24" fill="$[skinColor]" stroke="#000" stroke-width="5"/></svg>',
    nose9:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="nose10.svg"   id="svg92"   version="1.1"   height="69"   width="51"   viewBox="0 0 51 69">  <metadata     id="metadata98">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs96" />  <sodipodi:namedview     inkscape:current-layer="svg92"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="34.5"     inkscape:cx="25.5"     inkscape:zoom="14.608696"     showgrid="false"     id="namedview94"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <g     transform="matrix(1,0,-0.07193383,1,2.9423484,0.27380949)"     id="Nose">    <path       sodipodi:nodetypes="ccsc"       stroke-width="5"       stroke="#000000"       fill="$[skinColor]"       d="m 28,1 16.043163,32.815476 c 0,0 0.750314,10.847575 -18.228056,10.416667 -4.731343,-0.107426 -4.6241,0.43579 -6.245675,-0.08036"       class="nose"       id="Nose 2" />  </g></svg>',
    nose12:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\t.nosePlacement { fill: none } \t</style>\t<path id="Nose8" class="nose" d="M36.03 47C16.78 47.25 9.46 79.37 31.66 74.13C40.66 72 39.91 78.25 49.78 78.5C59.28 78.74 55.53 72.38 66.16 75.25C88.17 81.21 84.91 47.25 65.95 47.23M50 55.6C50 55.6 51.25 45 51.25 35C51.25 25 50 5 50 5" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t<path id="nose-placement" class="nosePlacement" d="M40 95L60 95L60 100L40 100L40 95Z" /></svg>',
    nose10:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="nose10.svg"   id="svg236"   version="1.2">  <metadata     id="metadata242">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs240" />  <sodipodi:namedview     inkscape:current-layer="svg236"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="103.28504"     inkscape:cx="71.998442"     inkscape:zoom="27.973333"     showgrid="false"     id="namedview238"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <path     sodipodi:nodetypes="ccc"     id="path234"     stroke-width="5"     stroke="#000000"     fill="$[skinColor]"     d="m 40.299605,99.803713 c 2.561055,5.426257 7.286464,9.340487 15.292217,10.444987 8.532343,-1.47505 12.386309,-4.54764 15.285031,-10.377522" /></svg>',
    nose11:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="Nose8" class="nose" d="M33.39 35.68C33.39 35.68 10.59 58.48 33.39 58.48C44.8 58.48 35.62 65.32 51.64 65.32C67.66 65.32 56.2 58.48 67.61 58.48C90.41 58.48 67.61 35.68 67.61 35.68" fill="$[skinColor]" stroke="#000" stroke-width="5"/></svg>',
    nose13:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\t.nosePlacement { fill: none } \t</style>\t<path id="Nose8" class="nose" d="M58 18C58 18 43 28.72 38 33C33.83 36.57 28 43 28 63C28 73 43 83 53 83C63 83 73 78 73 68" fill="$[skinColor]" stroke="#000" stroke-width="5"/>\t<path id="nose-placement" class="nosePlacement" d="M84.99 55.01L89.99 54.99L90.01 59.99L85.01 60.01L84.99 55.01Z" /></svg>',
    nose14:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="nose14" class="nose" d="M190 300C185 285 195 285 200 285C205 285 215 285 210 300" fill="$[skinColor]" stroke="#000" stroke-width="5"/></svg>',
    honker:
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny">    <path d="M 50,50 c 0,0 -20,60 9,55 c 0,0 29,5 9,-55" fill="$[skinColor]" stroke="#000" stroke-width="5" /></svg>',
    pinocchio:
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" version="1.2" baseProfile="tiny">    <path d="M 40,40 c 0,0 50,-30 0,30" fill="$[skinColor]" stroke="#000" stroke-width="5" /></svg>',
  },
  eyebrow: {
    eyebrow1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 25" width="85" height="25">\t<path id="eyebrow1" d="M83 13C83 3 73 3 73 3C48 -2 17.46 8.36 3 18C43 13 53 23 78 23C78 23 83 23 83 13Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Eyebrows">\t\t<path id="eyebrow2" d="M235 280L300 285L295 272.55L240 275L235 280Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t</g></svg>',
    eyebrow3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 17" width="78" height="17"><path id="eyebrow3" d="M73 13C77.85 11.79 73 3 63 3C53 3 3 8 3 8C3 8 53 18 73 13Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 62 17" width="62" height="17">\t<path id="eyebrow4" d="M61 16L61 6L31 1L1 6L1 16L31 11L61 16Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 23" width="68" height="23">\t<path id="eyebrow5" d="M65 16C68 13 65 6 65 6C65 6 45 1 35 1C25 1 3 11 3 11C3 11 0 18 3 21C6 24 25 13 35 13C45 13 62 19 65 16Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 20" width="70" height="20">\t<path id="eyebrow6" d="M67 17C70 14 67 5 67 5C67 5 49 5 39 5C29 5 3 1 3 1C3 1 0 14 3 17C6 20 29 17 39 17C49 17 64 20 67 17Z"  fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow7:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 23" width="76" height="23">\t<path id="eyebrow7" d="M71 21C79 13 71 9 71 9C71 9 43 5 35 5C25 5 7 1 7 1C7 1 -5 5 7 17C23 21 15 17 35 17C67 17 68 24 71 21Z"  fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow8:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 29" width="76" height="29">\t<path id="eyebrow8" d="M71 25C79 17 71 9 71 9C71 9 43 1 35 1C25 1 7 5 7 5C7 5 -5 13 7 25C23 33 23 21 43 21C63 21 67 29 71 25Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow9:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 23" width="78" height="23">\t<path id="eyebrow9" d="M73 21C81 13 73 5 73 5C73 5 45 1 37 1C27 1 1 17 1 17C1 17 21 13 41 13C53 13 69 25 73 21Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow10:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76 26" width="76" height="26">\t<path id="eyebrow10" d="M71 17C79 9 71 5 71 5C71 5 43 9 35 9C25 9 7 1 7 1C7 1 -5 5 7 17C15 25 15 25 35 25C55 25 68 20 71 17Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow11:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 78 18" width="78" height="18">\t<path id="eyebrow11" d="M73 13C81 5 73 1 73 1C73 1 45 5 37 5C27 5 1 5 1 5C1 5 21 17 41 17C53 17 69 17 73 13Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow12:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<path id="eyebrow12" d="M66 13C70 9 66 5 66 5C66 5 38 5 30 5C14 5 2 1 2 1C2 1 -2 1 10 13L6 21C6 21 18 21 38 21C58 21 62 17 66 13Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow13:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="eyebrow13.svg"   id="svg3"   version="1.1"   height="23"   width="78"   viewBox="0 0 78 23">  <metadata     id="metadata9">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs7" />  <sodipodi:namedview     inkscape:current-layer="svg3"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="12.818481"     inkscape:cx="42.029822"     inkscape:zoom="26.897436"     showgrid="false"     id="namedview5"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <path     sodipodi:nodetypes="scscss"     stroke-width="1"     stroke="#000000"     fill="$[hairColor]"     d="m 72.888465,12.597712 c 5.270626,-4.0160124 2.5653,-8.2669208 2.5653,-8.2669208 C 74.435622,3.4711726 48.446581,4.9938248 39.639657,5.0896091 30.55296,5.1884362 4.4885019,14.790557 1.4461392,17.929457 c -0.010846,2.629467 27.6981998,-1.31733 40.1487128,-1.732126 9.802172,-0.326564 26.40592,0.124613 31.293613,-3.599619 z"     id="eyebrow9" /></svg>',
    eyebrow14:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<path id="eyebrow12" d="M12.93 8.33C11.42 9.56 8.75 12.57 6.99 15C5.23 17.43 3.61 20.16 3.38 21.06C3.16 21.97 3.22 22.83 3.51 22.98C3.81 23.12 7.95 22.47 12.72 21.52C17.49 20.57 24.3 19.56 27.85 19.29C31.4 19.01 39.48 18.77 45.79 18.76C52.11 18.74 60.35 18.98 64.11 19.29C67.86 19.6 72.5 19.76 74.4 19.65C76.31 19.54 78.96 19.15 80.29 18.78C82.38 18.19 82.62 17.81 82.13 15.87C81.71 14.21 80.39 13.02 76.95 11.21C74.41 9.87 69.09 8.03 65.12 7.12C61.15 6.2 54.13 4.91 49.52 4.25C44.9 3.59 37.61 2.92 33.3 2.76C27.17 2.55 24.39 2.88 20.57 4.28C17.88 5.27 14.44 7.09 12.93 8.33Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow15:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<path id="eyebrow12" d="M12.93 15.05C11.42 15.72 8.75 17.34 6.99 18.66C5.23 19.98 3.61 21.46 3.38 21.95C3.16 22.44 3.22 22.91 3.51 22.99C3.81 23.07 7.95 22.71 12.72 22.2C17.49 21.68 24.3 21.14 27.85 20.99C31.4 20.84 39.48 20.71 45.79 20.7C52.11 20.69 60.35 20.82 64.11 20.99C67.86 21.16 72.5 21.24 74.4 21.18C76.31 21.13 78.96 20.91 80.29 20.71C82.38 20.39 82.62 20.18 82.13 19.14C81.71 18.23 80.39 17.59 76.95 16.61C74.41 15.88 69.09 14.89 65.12 14.39C61.15 13.9 54.13 13.2 49.52 12.84C44.9 12.48 37.61 12.12 33.3 12.03C27.17 11.92 24.39 12.09 20.57 12.86C17.88 13.39 14.44 14.38 12.93 15.05Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    eyebrow16:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<style>\t\t\t.eyebrowPlacement { fill: none } \t</style>\t<path id="eyebrow12" d="M25.63 10.05C24.44 10.72 22.34 12.34 20.95 13.66C19.56 14.98 18.29 16.46 18.11 16.95C17.93 17.44 17.98 17.91 18.21 17.99C18.44 18.07 21.71 17.71 25.47 17.2C29.23 16.68 34.6 16.14 37.39 15.99C40.19 15.84 46.56 15.71 51.53 15.7C56.51 15.69 63.01 15.82 65.97 15.99C68.93 16.16 72.58 16.24 74.09 16.18C75.59 16.13 77.68 15.91 78.72 15.71C80.37 15.39 80.57 15.18 80.18 14.14C79.85 13.23 78.8 12.59 76.09 11.61C74.09 10.88 69.9 9.89 66.77 9.39C63.64 8.9 58.1 8.2 54.47 7.84C50.83 7.48 45.08 7.12 41.69 7.03C36.86 6.92 34.67 7.09 31.65 7.86C29.53 8.39 26.82 9.38 25.63 10.05Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="placement" class="eyebrowPlacement" d="M0 10L5 10L5 15L0 15L0 10Z" /></svg>',
    eyebrow17:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<style>\t\t\t.eyebrowPlacement { fill: none } \t</style>\t<path id="eyebrow12" d="M22.1 6.48C21.14 7.22 19.39 8.81 18.2 9.98C16.97 11.15 15.73 12.61 15.5 13.11C15.27 13.63 15.24 14.07 15.45 14.07C15.65 14.07 18.51 13.02 21.46 12.42C24.18 12.31 27.88 12.69 29.76 13.08C31.63 13.51 35.83 14.75 39.11 15.85C42.5 16.93 47.05 18.35 49.17 19.04C51.4 19.65 54.47 20.06 55.87 20.03C57.3 19.97 59.4 19.68 60.49 19.42C62.17 19.01 62.39 18.8 62.21 17.77C62.09 16.86 61.36 16.14 59.45 14.87C58.09 13.87 55.15 12.21 52.89 11.15C50.63 10.02 46.56 8.05 43.86 6.8C41.15 5.49 36.84 3.78 34.29 3.07C30.69 2.26 29.05 2.42 26.76 3.58C25.15 4.35 23.05 5.67 22.1 6.48Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="placement" class="eyebrowPlacement" d="M0 10L5 10L5 15L0 15L0 10Z" /></svg>',
    eyebrow18:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<style>\t\t\t.eyebrowPlacement { fill: none } \t</style>\t<path id="eyebrow12" d="M79 12.9C79 6.79 71.5 6.79 71.5 6.79C52.75 3.74 29.85 10.07 19 15.95C49 12.9 56.5 19 75.25 19C75.25 19 79 19 79 12.9Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="placement" class="eyebrowPlacement" d="M0 10L5 10L5 15L0 15L0 10Z" /></svg>',
    eyebrow19:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<style>\t\t\t.eyebrowPlacement { fill: none } \t</style>\t<path id="eyebrow12" d="M76.4 16.1C79.25 13.86 76.35 9.74 76.35 9.74C76.35 9.74 59.49 10.28 50.08 9.72C40.59 9.12 14.75 8.86 14.75 8.86C14.75 8.86 12.55 15.51 15.32 16.48C18 17.09 39.86 15.03 49.41 15.59C59.01 16.18 73.45 17.75 76.4 16.1Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="placement" class="eyebrowPlacement" d="M0 10L5 10L5 15L0 15L0 10Z" /></svg>',
    eyebrow20:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 69 22" width="69" height="22">\t<style>\t\t\t.eyebrowPlacement { fill: none } \t</style>\t<path id="eyebrow12" d="M74.17 18.39C79.48 14.52 72.51 11.12 72.51 11.12C72.51 11.12 51.85 8.34 45.95 8.02C38.39 7.3 23.19 6.92 23.19 6.92C23.19 6.92 10.98 10 18.3 16.95C28.89 19.91 33.01 15.63 49.49 16.04C66.34 16.32 71.23 20.41 74.17 18.39Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="placement" class="eyebrowPlacement" d="M0 10L5 10L5 15L0 15L0 10Z" /></svg>',
  },
  hair: {
    bald: "",
    afro2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="grd1" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.3)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.cornrows { fill: url(#grd1);stroke: none} \t</style>\t\t<path id="hair" class="afro2" d="M198.27 56.61C197.27 57.92 196.86 59.93 196.92 63.29C196.98 66.94 197.58 69.16 199.48 72.64C200.85 75.15 201.72 77.39 201.41 77.62C201.11 77.85 199.9 78.03 198.72 78.01C197.54 78 195.36 77.06 193.88 75.93C192.4 74.81 190.72 74.14 190.15 74.45C189.58 74.76 187.69 76.16 185.95 77.56C183.28 79.7 182.66 79.9 182.02 78.85C181.6 78.17 181.25 76.4 181.24 74.91L181.23 72.22C170.92 71.05 169.92 70.64 168.44 68.6C167.49 67.3 165.22 65.47 163.4 64.53C161.57 63.59 159.05 62.04 157.79 61.08L155.5 59.34C146.39 63.84 143.41 65.61 142.99 66.18C142.48 66.88 144.64 71.5 149.7 80.49C153.8 87.8 156.97 93.96 156.74 94.19C156.51 94.41 152.5 92.41 147.83 89.73C143.15 87.05 137.83 84.4 136.01 83.84C134.18 83.28 132.22 83.05 131.65 83.31C131.08 83.58 130.6 84.27 130.59 84.84C130.57 85.41 131.87 87.55 133.48 89.61C135.09 91.66 136.4 93.53 136.41 93.76C136.41 93.99 132.4 94.17 127.5 94.17C119.26 94.16 118.1 94.37 112.35 96.86C108.93 98.34 105.38 99.56 104.47 99.56C103.56 99.56 101.61 100.03 100.14 100.59C97.75 101.51 97.2 101.42 94.96 99.75C93.57 98.72 91.79 97.9 90.99 97.91C90.19 97.93 87.48 99.73 84.97 101.92C82.46 104.1 79.94 106.13 79.37 106.44C78.8 106.75 75.16 105.87 71.28 104.5C67.41 103.13 62.93 102.01 61.33 102.01C59.73 102.01 58.43 102.19 58.43 102.42C58.43 102.65 59.01 104.24 59.72 105.95C60.44 107.66 63.41 112.24 66.33 116.12C69.24 120 71.64 123.82 71.66 124.62C71.68 125.91 70.73 126.07 62.97 126.07L54.26 126.06C28.21 139.7 18.6 144.96 16.09 146.55C13.58 148.14 10.49 150.43 9.22 151.64C7.96 152.84 6.93 154.11 6.94 154.45C6.95 154.79 8.17 155.06 9.65 155.04C11.14 155.03 15.15 153.92 18.57 152.59C22 151.26 24.87 150.24 24.97 150.34C25.06 150.44 23.28 153.22 21.02 156.53C18.76 159.84 16.9 163.2 16.9 164C16.89 165.31 17.52 165.39 23.53 164.83C27.19 164.49 30.2 164.49 30.21 164.83C30.23 165.18 28.65 166.96 26.69 168.8C24.73 170.64 19.39 174.71 14.82 177.85C10.26 180.99 4.94 184.8 3 186.32C0.74 188.09 -0.54 189.75 -0.55 190.95C-0.57 191.97 0.27 193.65 1.31 194.66C2.35 195.68 3.85 196.52 4.65 196.53C5.45 196.54 8.71 194.87 11.91 192.82C15.11 190.77 17.89 189.19 18.1 189.3C18.3 189.41 18.72 190.63 19.02 192C19.55 194.43 19.35 194.62 9.3 200.85C3.66 204.34 -2.55 208.35 -4.49 209.76C-7.28 211.78 -8.01 212.82 -8.01 214.79C-8.02 216.54 -7.34 217.79 -5.74 219C-4.48 219.94 -2.62 220.87 -1.59 221.07C-0.56 221.27 1.12 221.62 2.14 221.86C3.17 222.09 5.22 223.39 6.71 224.76L9.4 227.25C5.22 230.73 2.24 233.44 0.09 235.51C-2.8 238.29 -3.84 239.92 -3.88 241.76C-3.92 243.13 -3.18 245.28 -2.26 246.53C-1.29 247.83 0.23 248.82 1.3 248.83C2.32 248.84 3.65 249.12 4.25 249.45C5.05 249.91 4.51 251.13 2.11 254.21C0.33 256.49 -1.56 259.19 -2.09 260.22C-2.63 261.25 -3.07 262.65 -3.07 263.33C-3.07 264.32 -1.87 264.58 2.74 264.58C5.93 264.58 8.53 264.86 8.52 265.2C8.5 265.55 7.77 267.88 6.88 270.39C6 272.9 5.26 275.6 5.25 276.4C5.23 277.2 6.15 278.23 7.29 278.69C8.43 279.14 9.37 279.8 9.38 280.14C9.38 280.48 8.83 282.63 8.14 284.91C7.45 287.19 6.89 289.71 6.88 290.51C6.87 291.36 7.49 291.96 8.36 291.96C9.19 291.96 10.31 291.49 10.87 290.92C11.67 290.1 11.87 290.23 11.83 291.55C11.81 292.46 12.55 294.23 13.48 295.49C14.44 296.79 15.97 297.78 17.03 297.79C18.06 297.79 19.38 298.07 19.98 298.41C20.79 298.86 20.24 300.08 17.84 303.17C16.06 305.45 14.17 308.15 13.64 309.18C13.1 310.2 12.67 311.6 12.67 312.29C12.66 313.28 13.91 313.53 18.89 313.54L25.11 313.54L21.78 323.08C25.32 326.65 26.9 327.67 27.59 327.66C28.27 327.65 32.57 323.95 37.13 319.45C42.34 314.32 46.52 310.92 48.34 310.33C49.94 309.81 53.02 309.39 55.19 309.4L59.13 309.41C59.1 286.62 59.1 286.59 62 280.79C63.59 277.6 67.03 272.19 69.64 268.77C72.25 265.35 74.9 261.06 75.54 259.23C76.17 257.41 77.61 249.38 78.74 241.4C79.86 233.41 81.72 223.15 82.86 218.58C84 214.02 85.77 208.63 86.79 206.6C87.81 204.57 89.76 202.24 91.13 201.42C92.5 200.61 96.42 199.31 99.85 198.53C105.51 197.25 114.5 197.13 199.82 197.19C271.8 197.24 294.91 197.5 299.37 198.31C302.57 198.89 306.65 200.17 308.45 201.16C310.59 202.34 312.37 204.25 313.63 206.7C314.69 208.75 316.47 214.17 317.6 218.73C318.72 223.29 320.56 233.56 321.67 241.55C322.79 249.53 324.22 257.56 324.85 259.39C325.48 261.21 328.13 265.51 330.73 268.93C333.34 272.36 336.77 277.77 338.36 280.97C341.25 286.77 341.26 286.79 341.23 298.18L341.2 309.59C348.27 309.59 351.16 310.03 352.19 310.56C353.22 311.09 357.97 315.2 362.76 319.69C367.55 324.18 372.12 327.86 372.92 327.86C373.72 327.86 375.34 327.02 376.53 326L378.68 324.13C376.62 317.06 376.03 314.72 376.03 314.38C376.04 314.04 378.65 313.76 381.85 313.76C386.46 313.77 387.66 313.51 387.66 312.52C387.66 311.84 387.22 310.44 386.69 309.41C386.15 308.38 384.27 305.68 382.49 303.39C380.1 300.31 379.55 299.09 380.36 298.63C380.95 298.3 382.28 298.02 383.31 298.01C384.37 298.01 385.9 297.02 386.87 295.72C387.79 294.47 388.54 292.97 388.53 292.4C388.51 291.66 389.22 291.55 391.01 291.99C393.17 292.53 393.51 292.39 393.49 290.96C393.47 290.04 392.94 287.43 392.31 285.15C391.68 282.87 391.41 280.6 391.7 280.11C392 279.62 392.89 278.97 393.69 278.66C394.49 278.35 395.15 277.44 395.16 276.65C395.16 275.85 394.41 272.95 393.49 270.21C392.56 267.48 391.81 265.14 391.82 265.03C391.83 264.91 394.45 264.82 397.64 264.82C402.25 264.83 403.45 264.57 403.45 263.58C403.45 262.9 403.01 261.5 402.48 260.47C401.95 259.45 400.06 256.74 398.29 254.46C395.89 251.37 395.34 250.15 396.15 249.7C396.75 249.36 398.08 249.08 399.1 249.08C400.17 249.07 401.7 248.08 402.66 246.78C403.59 245.53 404.34 243.66 404.32 242.64C404.31 241.61 403.92 240.02 403.46 239.11C403.01 238.2 400.02 235.21 396.83 232.47L391.03 227.49C396.59 222.88 398.96 221.67 400.16 221.69C401.3 221.71 403.54 220.87 405.14 219.82C407.33 218.37 408.09 217.25 408.25 215.23C408.43 212.94 407.96 212.2 404.93 210.01C403 208.61 396.8 204.59 391.16 201.08C381.11 194.84 380.91 194.66 381.45 192.22C381.75 190.85 382.17 189.64 382.38 189.53C382.59 189.41 385.37 191 388.56 193.06C391.75 195.11 395.02 196.8 395.82 196.82C396.62 196.83 398.1 195.99 399.12 194.95C400.14 193.91 400.98 192.22 400.99 191.2C401 189.98 399.79 188.38 397.48 186.57C395.54 185.05 390.23 181.23 385.67 178.08C381.1 174.94 375.77 170.86 373.81 169.02C371.86 167.17 370.27 165.39 370.29 165.05C370.31 164.7 373.32 164.71 376.97 165.05C382.98 165.62 383.61 165.54 383.61 164.22C383.6 163.43 381.74 159.97 379.46 156.55L375.31 150.32C385.6 154.19 389.7 155.31 391.07 155.31C392.44 155.31 393.58 155.03 393.6 154.69C393.62 154.35 392.22 152.74 390.49 151.12C388.76 149.51 384.73 146.7 381.54 144.9C378.35 143.09 369.58 138.42 362.05 134.53C349.52 128.04 348.39 127.27 348.62 125.39C348.76 124.27 351.25 120.17 354.17 116.29C357.08 112.42 360.05 107.85 360.77 106.14C361.48 104.43 362.07 102.84 362.07 102.61C362.07 102.38 360.76 102.2 359.16 102.19C357.57 102.19 353.09 103.31 349.21 104.68C345.33 106.04 341.69 106.91 341.12 106.6C340.55 106.3 338.03 104.26 335.52 102.07C333.01 99.89 330.31 98.08 329.51 98.06C328.71 98.04 326.91 98.87 325.5 99.89C323.95 101.03 321.91 101.7 320.31 101.61C318.87 101.54 314.88 100.16 311.46 98.57C308.04 96.97 303.38 95.2 301.1 94.63C298.44 93.97 294.64 93.8 290.52 94.14C286.98 94.44 284.09 94.4 284.1 94.06C284.1 93.72 285.43 91.76 287.04 89.7C288.66 87.65 289.86 85.41 289.71 84.73C289.56 84 288.59 83.52 287.39 83.56C286.26 83.6 284.31 83.88 283.06 84.18C281.02 84.66 280.82 84.52 281.14 82.86C281.35 81.83 281.72 79.59 281.98 77.88C282.3 75.7 282.13 74.76 281.4 74.75C280.83 74.74 279.38 75.77 278.18 77.03C276.98 78.29 275.44 80.45 274.77 81.82C274.09 83.18 273.02 84.53 272.39 84.8C271.75 85.08 268.62 84.68 265.43 83.92L259.62 82.55C240.97 88.72 234.9 90.51 234.11 90.51C233.3 90.5 230.81 88.1 228.51 85.11C225.04 80.59 223.96 79.71 221.88 79.71C220.51 79.71 218.55 79.33 217.52 78.86C216.49 78.4 214.16 76.08 212.34 73.71C210.52 71.33 207.35 66.23 205.29 62.36C203.24 58.49 201.15 55.19 200.63 55.02C200.12 54.86 199.06 55.57 198.27 56.61Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    blowoutFade:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="shortfade" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.5)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,.25)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.blowout-fade { fill: url(#shortfade);stroke: none} \t</style>\t<path id="Short Fade" class="blowout-fade" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t<path id="blowout-fade" d="M198.45 65.22C197.55 66.44 196.87 68.81 196.95 70.47C197.02 72.14 197.77 75.3 198.61 77.5C199.45 79.7 200.33 82.29 200.57 83.25C200.85 84.41 200.41 85.01 199.25 85.02C198.29 85.03 196.6 84.37 195.5 83.55C194.4 82.73 192.82 82.03 192 82C191.18 81.96 189.6 82.86 188.5 84C187.4 85.14 185.94 86.05 185.25 86.03C184.56 86.01 183.89 84.55 183.75 82.77C183.52 79.78 183.17 79.49 179 78.76C176.51 78.33 173.38 76.92 172 75.61C170.63 74.31 167.58 71.96 165.23 70.38C161.39 67.79 160.69 67.63 158.23 68.77C156.73 69.46 154.21 71.04 152.64 72.27L149.78 74.5C159.25 93.49 161.55 99 161 99C160.45 99 156.29 96.98 151.75 94.52C147.21 92.06 142.71 90.03 141.75 90.02C140.79 90.01 139.79 90.34 139.54 90.75C139.29 91.16 140.19 93.19 141.54 95.25C142.89 97.31 144 99.22 144 99.5C144 99.78 140.85 100 137 100C132.21 100 128.34 100.67 124.75 102.1C121.86 103.26 117.47 104.82 115 105.57C111.13 106.74 110.19 106.73 108.25 105.47C107.01 104.66 105.44 104.01 104.75 104.02C104.06 104.03 101.36 105.83 98.75 108.02L94 112C85.09 108.88 81.04 107.98 79.25 107.98L76 108C78.91 113.81 81.6 118.42 83.86 122C86.12 125.58 87.75 128.84 87.48 129.25C87.22 129.66 83.74 130.01 79.75 130.02L72.5 130.05C46.31 145.12 36.86 151.17 34.6 153.21L30.5 156.92C34.76 156.98 38.25 156.1 41 155C43.75 153.9 46 153.45 46 154C46 154.55 44.64 157.14 42.99 159.75C41.33 162.36 39.98 165.06 39.99 165.75C40 166.66 41.5 166.86 45.5 166.5C48.52 166.22 51.02 166.34 51.04 166.75C51.06 167.16 49.13 169.3 46.74 171.5C44.34 173.7 38.48 178.54 33.69 182.25C27.92 186.74 25 189.67 25 191C25 192.1 25.68 193.68 26.5 194.5C27.32 195.32 28.56 196.01 29.25 196.01C29.94 196.02 32.64 194.67 35.25 193.01C37.86 191.36 40.45 190 41 190C41.55 190 42.01 190.79 42.03 191.75C42.04 192.71 41.03 194.44 39.78 195.6C38.52 196.75 33.31 200.57 28.19 204.1C23.07 207.62 18.68 211.29 18.44 212.25C18.2 213.21 18.45 214.9 19 216C19.57 217.14 22.05 218.63 24.75 219.46C27.36 220.27 30.4 221.86 31.5 223L33.5 225.07C23.56 234.96 22.02 237.24 22.01 239.25C22 241.1 22.9 242.67 24.75 244.04C26.26 245.16 27.95 246.2 28.5 246.36C29.05 246.51 28.05 248.86 26.27 251.57C24.5 254.28 23.04 257.29 23.02 258.25C23 259.66 23.87 260 27.5 260C30.83 260 32 260.39 32 261.5C32 262.32 31.44 265.01 30.75 267.48C29.6 271.59 29.66 272.07 31.5 273.38C33.33 274.68 33.4 275.21 32.34 279.65C31.7 282.32 31.36 284.84 31.59 285.25C31.81 285.66 32.9 285.77 34 285.5C35.52 285.12 36.12 285.6 36.5 287.5C36.83 289.17 50 290 50 290C50 290 50 260 70 240C80 230 83.87 219.57 84.92 216C86 212.35 88.08 208.13 89.67 206.38C91.39 204.48 94.66 202.56 98 201.49C103.08 199.85 110.59 199.7 195.5 199.48C246.3 199.34 290.64 199.64 294.5 200.14C298.35 200.64 303.52 202.05 305.98 203.27C308.45 204.5 311.24 206.85 312.2 208.5C313.15 210.15 314.85 215.1 315.98 219.5C317.1 223.9 320 230 330 240C350 260 349.45 291.1 350 290C350.55 288.9 365.9 286 367 286C368.84 286 368.95 285.54 368.38 280.25C367.89 275.63 368.09 274.25 369.38 273.25C370.86 272.11 370.87 271.55 369.44 266.75C368.16 262.46 368.11 261.37 369.19 260.77C369.91 260.36 372.19 260.02 374.25 260.02C377.66 260 377.94 259.79 377.36 257.75C377.01 256.51 375.44 253.59 373.86 251.25C372.29 248.91 371.11 246.87 371.25 246.7C371.39 246.54 372.74 245.86 374.25 245.2C375.76 244.54 377.38 242.99 377.85 241.75C378.32 240.51 378.46 238.6 378.17 237.5C377.87 236.4 375.24 233.14 372.31 230.25L367 225C372.04 221.25 374.63 219.9 376 219.58C377.38 219.26 379.31 218.22 380.29 217.25C381.29 216.27 381.95 214.41 381.79 213.03C381.57 211.15 378.89 208.76 370.5 202.96C361.56 196.78 359.45 194.85 359.25 192.68C359.11 191.21 359.34 190.01 359.75 190.02C360.16 190.04 362.64 191.39 365.25 193.02C367.86 194.66 370.73 195.89 371.63 195.75C372.53 195.61 373.87 194.6 374.62 193.5C375.75 191.83 375.75 191.17 374.64 189.5C373.91 188.4 368.63 183.85 362.91 179.39C357.18 174.93 351.6 170.3 350.5 169.11L348.5 166.93C359.08 166.99 360 166.72 359.97 165.25C359.96 164.29 358.61 161.36 356.97 158.75C355.34 156.14 354.34 153.99 354.75 153.98C355.16 153.98 358.2 154.88 361.5 155.99C364.8 157.1 367.86 157.67 368.31 157.25C368.76 156.84 367.12 154.7 364.67 152.5C362.22 150.3 354.22 145.13 346.89 141C339.57 136.88 332.66 132.76 331.54 131.85C329.57 130.25 329.56 130.09 331.23 126.85C332.18 125.01 334.78 120.58 337 117C339.22 113.42 341.03 109.94 341.02 109.25C341.01 108.56 339.99 108 338.75 107.99C337.51 107.99 333.57 108.92 330 110.08L323.5 112.17C316.14 105.84 313.55 104 313 104C312.45 104 310.81 104.79 309.36 105.75C307.13 107.23 306.16 107.32 303.11 106.35C301.12 105.72 296.8 104.04 293.5 102.63C289.06 100.72 285.75 100.04 280.75 100.02C277.04 100.01 274.01 99.66 274.02 99.25C274.03 98.84 274.92 97.38 276 96C277.08 94.63 277.97 92.71 277.98 91.75C278 90.28 277.39 90.1 274.25 90.61L270.5 91.22C271.66 84.07 271.66 81.99 271.25 81.97C270.84 81.96 269.54 82.97 268.37 84.22C267.21 85.48 265.74 87.51 265.12 88.75C264.37 90.26 263.1 91 261.25 91C259.74 91 257.15 90.59 255.5 90.08C253.06 89.33 250.4 89.89 241.25 93.08C235.06 95.24 229.55 96.78 229 96.5C228.45 96.22 226.54 93.98 224.75 91.52C222.35 88.21 220.65 86.9 218.25 86.52C216.14 86.18 214.03 84.8 212.25 82.59C210.74 80.71 207.68 75.53 205.45 71.09C203.23 66.64 201.11 63 200.75 63C200.39 63 199.36 64 198.45 65.22Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    afro: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="afro" d="M60 310L50 310C50 310 10 310 10 260C10 120 80 70 200 70C320 70 390 120 390 260C390 310 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 315 220 310 210C303.68 197.35 250 200 200 200C150 200 96.32 197.35 90 210C85 220 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310ZM200 70" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    "crop-fade":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="shortfade" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.25)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.short_fade { fill: url(#shortfade);stroke: none} \t</style>\t<g id="short fade">\t\t<path id="Short Fade" class="short_fade" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t</g>\t<path id="crop" d="M200 95C320 95 340 185 340 210C320 210 320 215 315 210C310 205 300 195 265 195C250 195 225 200 200 200C175 200 150 195 135 195C100 195 90 205 85 210C80 215 80 210 60 210C60 185 85 95 200 95Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    "crop-fade2":
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="crop-fade2.svg"   id="svg130"   version="1.1"   height="600"   width="400"   viewBox="0 0 400 600">  <metadata     id="metadata134">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <sodipodi:namedview     inkscape:current-layer="svg130"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="323.80952"     inkscape:cx="85.416667"     inkscape:zoom="1.8"     showgrid="false"     id="namedview132"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <defs     id="defs123">    <linearGradient       y2="310"       x2="200"       y1="100"       x1="200"       gradientUnits="userSpaceOnUse"       id="shortfade">      <stop         id="stop118"         stop-color="rgba(0,0,0,.25)"         offset="0" />      <stop         id="stop120"         stop-color="rgba(0,0,0,0)"         offset="1" />    </linearGradient>  </defs>  <style     id="style125">\t\ttspan { white-space:pre }\t\t.short_fade { fill: url(#shortfade);stroke: none} \t</style>  <g     style="opacity:1;stroke-width:1;stroke-miterlimit:4;stroke-dasharray:none"     id="short fade">    <path       style="stroke-width:1;stroke-miterlimit:4;stroke-dasharray:none"       sodipodi:nodetypes="ccsssccsssssssc"       d="M 60,310 H 50 v -10 c 0,-140 50,-200 150,-200 100,0 150,60 150,200 v 10 h -10 v -20 c 0,-5 -10,-20 -15,-25 -5,-5 -5,-55 -15,-65 C 270,160 253.57143,161.90476 203.57143,161.90476 153.57143,161.90476 130,160 90,200 c -10,10 -10,60 -15,65 -5,5 -15,20 -15,25 z"       class="short_fade"       id="Short Fade" />  </g>  <path     sodipodi:nodetypes="scssssscs"     stroke-width="3.99999"     stroke="#000000"     fill="$[hairColor]"     d="m 200,94.999995 c 120,0 140,89.999625 140,114.999515 -20,0 -20,4.99998 -25,0 -5,-4.99998 -14.44444,-11.11105 -49.44444,-11.11105 -15,0 -39.96032,-0.31746 -64.96032,-0.31746 -25,0 -50.03968,0.31746 -65.03967,0.31746 -35,0 -45.555566,6.11107 -50.555571,11.11105 -5.000001,4.99998 -5.000001,0 -25.000004,0 C 59.999995,184.99962 84.999999,94.999995 200,94.999995 Z"     id="crop" /></svg>',
    cornrows:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="grd1" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.3)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.cornrows { fill: url(#grd1);stroke: none} \t</style>\t<g id="cornrows">\t\t<path id="Short Fade" class="cornrows" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 220 310 210C300 200 250 210 200 210C150 210 100 200 90 210C80 220 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t\t<path id="cornrows" d="M195 200L185 200L185 100L195 100L195 200ZM205 200L215 200L215 100L205 100L205 200M225 200L235 200L235 100L225 100L225 200M245 200L255 200L255 105L245 105L245 200ZM265 195L275 195L275 110L265 110L265 195ZM285 195L295 195L295 120L285 120L285 195ZM305 190L315 190L315 140L305 140L305 190ZM325 195L335 195L335 175L325 175L325 195M175 200L165 200L165 100L175 100L175 200ZM155 200L145 200L145 104.87L155 104.87L155 200ZM135 195L135 109.85L125 109.85L125 195L135 195ZM115 195L115 120L105 120L105 195L115 195ZM95 190L85 190L85 140L95 140L95 190ZM75 195L65 195L65 175L75 175L75 195Z"  fill="$[hairColor]" stroke="#000" stroke-width="4"/>\t</g></svg>',
    curly3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="curly-02" fill-rule="nonzero" d="M180.58 65.5C180.26 66.33 177.53 68.13 174.5 69.5C171.47 70.88 167.37 72 165.37 72C162.55 72 160.95 72.79 158.24 75.5C155.47 78.27 153.95 79 150.94 79C148.85 79 146.44 79.67 145.57 80.5C144.17 81.84 143.78 81.78 142 80C140.9 78.9 139.32 78 138.5 78C137.68 78 136.72 78.4 136.38 78.88C136.03 79.37 133.67 79.76 131.13 79.76C128.58 79.75 124.7 80.53 122.5 81.48L118.5 83.2L120 94C109.98 93.52 109.48 93.71 108.29 96.25C107.41 98.13 106.61 98.73 105.75 98.14C105.06 97.66 103.26 96.99 101.75 96.64C100.24 96.29 99 95.33 99 94.5C99 93.67 98.31 92.66 97.47 92.25C96.48 91.76 95.45 92.19 94.5 93.5C93.71 94.6 93.27 96.06 93.53 96.75C93.79 97.44 93.55 98.22 93 98.5C92.45 98.78 92.01 100.01 92.03 101.25C92.05 102.49 91.4 104.85 90.58 106.5C89.77 108.15 89.31 109.84 89.55 110.25C89.8 110.66 89.44 111.03 88.75 111.06C88.06 111.09 85.7 111.32 83.5 111.56C81.3 111.81 78.49 112.68 77.25 113.51C76.01 114.33 75 115.67 75 116.5C75 117.33 73.54 118.96 71.75 120.14C69.36 121.71 67.7 122.1 65.5 121.61C63.3 121.12 61.31 121.59 58 123.38C55.52 124.72 52.94 126.54 52.25 127.41C51.24 128.7 51.28 129.28 52.5 130.5C53.83 131.83 53.83 132.19 52.49 133.75C51.66 134.71 51.24 136.18 51.55 137C51.96 138.05 50.55 139.35 46.81 141.35C43.89 142.92 39.78 145.84 37.69 147.85C35.59 149.86 33.05 152.85 32.05 154.5C31.04 156.15 29.05 157.84 27.61 158.25C26.17 158.66 25 159.68 25 160.5C25 161.32 25.39 162.79 25.87 163.75C26.35 164.71 27.02 167.19 27.37 169.25C27.97 172.84 27.89 172.98 25.5 172.5C23.35 172.07 22.73 172.59 21.03 176.25C19.12 180.39 19.11 180.57 20.91 183C21.92 184.38 23.48 186.06 24.37 186.75C25.82 187.86 25.83 188.17 24.5 189.5C23.68 190.32 23 191.68 23 192.5C23 193.32 23.9 194.22 25 194.5C26.52 194.88 27 195.83 27 198.5C27 200.43 26.55 202 26 202C25.45 202 24.5 203.01 23.9 204.25C23.08 205.91 23.1 207.02 23.98 208.5C24.94 210.14 24.69 211.62 22.58 216.75C20.21 222.49 20.12 223.2 21.5 225.5C22.32 226.88 24.09 228.56 25.43 229.25C27.76 230.45 27.79 230.59 26.18 232.84C25.03 234.44 24.85 235.38 25.6 235.84C26.2 236.2 26.65 237.29 26.6 238.25C26.54 239.21 25.94 240 25.25 240C24.45 240 24.26 240.63 24.72 241.75C25.3 243.14 25.1 243.35 23.72 242.75C22.51 242.22 21.7 242.6 21 244C20.33 245.33 20.33 247.83 21 251.5C21.7 255.37 22.67 257.45 24.25 258.51C25.49 259.34 27.51 260.01 28.75 260.01C29.99 260 31.23 260.45 31.5 261C31.77 261.55 31.55 262.23 31 262.5C30.45 262.77 30 265.02 30 267.5C30 271.8 30.12 271.99 32.75 271.75C35.14 271.53 35.47 271.83 35.26 274C35.12 275.38 35.67 277.18 36.48 278C37.71 279.25 37.75 280.05 36.73 282.76C36.05 284.55 34.94 286.01 34.25 286.01C33.56 286 32.74 287.24 32.42 288.75C32.06 290.47 32.44 292.35 33.42 293.75C34.29 294.99 36.24 296.57 37.75 297.26C39.48 298.05 40.61 299.44 40.81 301.01C41.03 302.78 40.33 304.08 38.4 305.5C36.82 306.66 35.96 308.02 36.34 308.75C36.81 309.64 40.32 310 48.5 310L60 310C60 289.08 60.18 288.16 63.25 282.18C65.04 278.7 68.17 273.75 70.21 271.18C72.26 268.6 74.58 265.38 75.38 264C76.17 262.63 78.23 252.05 79.94 240.5C81.65 228.95 83.38 218.13 83.78 216.45C84.17 214.78 86.3 211.8 88.5 209.83C90.7 207.87 94.86 205.08 97.75 203.63C100.64 202.18 105.81 200.32 109.25 199.5C112.69 198.67 120.22 197.71 126 197.37C133.69 196.91 142.53 197.37 159 199.07C173.91 200.62 187.74 201.4 200 201.4C212.26 201.4 226.09 200.62 241 199.07C257.47 197.37 266.31 196.91 274 197.37C279.77 197.71 287.31 198.67 290.75 199.5C294.19 200.32 299.36 202.19 302.25 203.65C305.14 205.11 309.4 207.92 311.72 209.9C315.7 213.29 316.03 213.99 317.47 222C318.3 226.68 319.89 237.36 320.99 245.75C322.1 254.14 323.69 262.24 324.54 263.75C325.38 265.26 327.86 268.75 330.06 271.5C332.25 274.25 335.27 278.98 336.77 282C339.19 286.87 339.53 288.8 339.75 298.75L340 310L360.5 309.5C360.22 305.63 359.89 303.26 359.57 301.75C359.08 299.36 359.53 298.67 363 296.5C365.2 295.13 367.23 293.1 367.5 292C367.77 290.9 367.77 289.1 367.5 288C367.23 286.9 366.44 286 365.75 286.01C365.06 286.01 363.95 284.55 363.27 282.76C362.25 280.04 362.29 279.25 363.55 278C364.6 276.95 364.84 275.6 364.34 273.5C363.63 270.55 363.67 270.51 366.81 271.25L370 272C370 265.02 369.55 262.77 369 262.5C368.45 262.23 368.23 261.55 368.5 261C368.77 260.45 370.01 260 371.25 260.01C372.49 260.01 374.51 259.34 375.75 258.51C377.33 257.45 378.3 255.37 379 251.5C379.67 247.83 379.67 245.33 379 244C378.3 242.6 377.49 242.22 376.28 242.75C374.9 243.35 374.7 243.14 375.28 241.75C375.78 240.54 375.54 240 374.5 240C373.68 240 372.99 239.66 372.98 239.25C372.97 238.84 373.54 237.95 374.23 237.28C375.03 236.51 376.56 236.33 378.37 236.78C381.02 237.44 381.21 237.3 380.87 235C380.57 232.98 379.92 232.49 377.5 232.46C375.85 232.44 373.82 232.06 373 231.6C371.81 230.95 372.17 230.39 374.75 228.89C376.54 227.85 378.45 226.1 379 225C379.76 223.48 379.38 221.49 377.42 216.75C375.31 211.62 375.06 210.14 376.02 208.5C376.9 207.02 376.92 205.91 376.1 204.25C375.5 203.01 374.55 202 374 202C373.45 202 373 200.43 373 198.5C373 195.83 373.48 194.88 375 194.5C376.1 194.22 377 193.32 377 192.5C377 191.68 376.32 190.32 375.5 189.5C374.17 188.17 374.18 187.86 375.63 186.75C376.52 186.06 378.1 184.26 379.13 182.75C380.92 180.11 380.93 179.87 379.25 176.95C378.25 175.2 376.31 173.6 374.73 173.2C372.18 172.56 372.01 172.22 372.61 169C372.97 167.07 373.65 164.71 374.13 163.75C374.61 162.79 375 161.32 375 160.5C375 159.68 373.83 158.66 372.39 158.25C370.95 157.84 368.96 156.15 367.95 154.5C366.95 152.85 364.41 149.86 362.31 147.85C360.22 145.84 356.14 143.03 353.25 141.6C348.64 139.32 348.06 138.7 348.5 136.5C348.86 134.72 348.57 134 347.5 134C346.68 134 345.71 133.44 345.35 132.75C344.99 132.06 345.55 130.93 346.6 130.22C348.02 129.26 348.25 128.55 347.5 127.35C346.95 126.47 344.38 124.57 341.79 123.13C337.78 120.89 336.78 120.69 335.04 121.75C333.36 122.78 332.35 122.69 329.25 121.25C327.19 120.29 325.2 119.05 324.84 118.5C324.47 117.95 324.36 116.94 324.59 116.25C324.81 115.56 323.76 114.25 322.25 113.33C320.28 112.13 318.44 111.84 315.75 112.33C312.23 112.96 311.88 112.78 310 109.5C308.37 106.65 308.09 104.79 308.5 99.5L309 93C302.59 93.4 300.99 94 301 94.75C301 95.44 299.76 96.29 298.25 96.64C296.74 96.99 294.94 97.66 294.25 98.14C293.39 98.73 292.6 98.13 291.72 96.25C290.91 94.53 289.7 93.54 288.47 93.61C287.38 93.67 285.15 93.9 283.5 94.11L280.5 94.5L281.04 83.5C274.17 80.26 270.95 79.59 268.28 79.75C265.93 79.89 263.77 79.55 263.5 79C263.23 78.45 262.32 78 261.5 78C260.68 78 259.1 78.9 258 80C256.19 81.81 255.83 81.85 254.25 80.48C252.85 79.26 251.23 79.11 246.24 79.73L239.97 80.5C240 75.21 239.73 75.02 236.37 75.25C234.23 75.4 232.51 76.12 232.19 77C231.89 77.83 231.16 78.83 230.57 79.23C229.98 79.64 228.94 79.98 228.25 79.98C227.56 79.99 226.1 78.2 225 76C223.9 73.8 223 71.33 223 70.5C223 69.67 222.32 67.88 221.5 66.5C220.68 65.13 219.32 64 218.5 64C217.68 64 216.21 64.9 215.25 66.01C214.29 67.11 213.05 68.01 212.5 68.01C211.95 68 210.94 68.89 210.25 70C209.56 71.1 208.32 72 207.5 72C206.68 72 206 71.55 206 71C206 70.45 204.17 69.07 201.92 67.94C199.24 66.58 196.93 66.09 195.17 66.5C193.28 66.95 192.28 66.68 191.75 65.57C191.22 64.46 189.56 64 186.08 64C182.64 64 180.99 64.45 180.58 65.5Z"  fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    crop: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="crop" d="M200 95C320 95 340 185 340 210C320 210 320 215 315 210C310 205 300 195 265 195C250 195 225 200 200 200C175 200 150 195 135 195C100 195 90 205 85 210C80 215 80 210 60 210C60 185 85 95 200 95Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    curly:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="curly-02" fill-rule="nonzero" d="M182.42 68.88C182.12 69.9 181.7 72.18 181.48 73.94C181.08 77.05 180.97 77.11 175.35 76.84C172.2 76.69 168.75 77.04 167.68 77.62C166.62 78.2 165.79 79.37 165.84 80.24C165.89 81.11 167.31 83.1 168.99 84.67C170.67 86.24 172.9 89.15 173.96 91.13C175.01 93.1 175.9 95.4 175.95 96.24C176 97.22 174.85 97.87 172.75 98.06C170.95 98.23 168.94 98.92 168.27 99.57C167.6 100.24 166.81 100.44 166.52 100.02C166.22 99.61 166.37 97.79 166.83 95.97C167.28 94.15 167.58 91.62 167.49 90.35C167.41 89.07 166.27 87.36 164.97 86.53C162.91 85.21 162.37 85.21 160.69 86.53C159.63 87.35 158.31 88.02 157.75 88.02C157.2 88.01 156.23 86.98 155.6 85.72C154.84 84.16 153.13 83.14 150.39 82.57C146.68 81.81 146.1 82.01 143.72 84.84C141.43 87.55 140.58 87.87 137.03 87.4C134.2 87.02 132.98 87.25 133 88.15C133.01 88.86 134 90.71 135.2 92.26C136.39 93.8 137.41 95.42 137.45 95.83C137.48 96.25 136.61 97.5 135.5 98.61C134.38 99.71 133.74 101.18 134.07 101.88C134.41 102.57 133.67 103.81 132.44 104.64C131.21 105.46 129.63 106.11 128.92 106.11C128.22 106.09 127.85 105.42 128.1 104.59C128.36 103.76 127.94 101.71 127.17 100.01C126.07 97.52 125.35 97.02 123.52 97.45C121.83 97.85 121.11 97.47 120.68 95.96C120.34 94.77 119.26 93.92 118.07 93.9C116.96 93.89 115.16 94.79 114.08 95.89C112.67 97.32 111.31 97.71 109.3 97.28C107.25 96.82 105.96 97.21 104.51 98.72C103.42 99.87 102.85 101.37 103.24 102.06C103.64 102.78 102.48 104.92 100.54 107.03C98.66 109.05 97.12 111.16 97.13 111.7C97.14 112.25 96.46 112.68 95.61 112.67C94.76 112.66 93.85 112.2 93.55 111.65C93.26 111.1 92.22 110.65 91.24 110.66C90.26 110.66 88.9 111.42 88.23 112.34C87.55 113.26 87 115.24 87 116.73C87 118.69 86.28 119.71 84.44 120.39L81.89 121.33C86.69 125.98 88.09 127.77 88.09 128.31C88.09 128.84 89.02 129.3 90.15 129.32C91.28 129.34 92.45 130.13 92.75 131.07C93.04 132.01 93.05 132.89 92.76 133.02C92.47 133.15 91.42 132.86 90.43 132.37C89.34 131.84 87.6 131.86 86.06 132.43C84.65 132.95 81.75 133.28 79.64 133.18C77.53 133.07 75.79 133.42 75.8 133.96C75.8 134.5 74.99 134.68 74 134.34C72.7 133.92 71.44 134.89 69.35 137.92C67.78 140.21 66.73 142.63 67.05 143.3C67.35 143.98 69.24 145.33 71.24 146.3C73.78 147.54 74.78 148.61 74.56 149.9C74.39 150.91 73.47 152.2 72.51 152.78C71.18 153.58 70.3 153.42 68.67 152.09C66.67 150.42 66.44 150.44 63.45 152.48C61.33 153.93 60.51 155.16 60.89 156.33C61.21 157.27 60.76 158.57 59.89 159.22C59.03 159.88 58.33 160.96 58.36 161.63C58.38 162.3 59.32 163.4 60.45 164.08C62.25 165.18 62.31 165.47 60.95 166.51C59.77 167.42 59.45 169.39 59.62 174.75C59.81 180.87 59.53 182.15 57.46 184.63C55.67 186.82 54.22 187.52 51.45 187.6C48.89 187.67 47.27 188.38 45.99 189.99C44.72 191.59 44.36 193.15 44.78 195.19C45.11 196.79 46.14 198.67 47.08 199.37C48.02 200.06 48.64 201.37 48.47 202.28C48.29 203.18 48.4 204.89 48.71 206.09C49.01 207.28 49.92 208.26 50.74 208.25C51.61 208.25 52.21 209.14 52.21 210.42C52.21 211.62 51.46 213.68 50.56 215.01C49.27 216.91 49.06 218.61 49.56 222.97C49.95 226.44 49.82 228.5 49.21 228.51C48.68 228.51 48.02 229.61 47.76 230.93C47.44 232.55 46.63 233.35 45.36 233.37C43.82 233.39 43.52 233.91 43.82 236.04C44.03 237.49 43.66 240.86 43 243.52C42.35 246.17 41.88 251.88 41.96 256.2C42.02 260.51 42.43 264.39 42.86 264.83C43.28 265.25 44.02 264.85 44.5 263.92C44.96 262.99 45.78 262.21 46.3 262.21C46.81 262.2 47.25 263.16 47.25 264.35C47.26 265.54 46.67 268.24 45.94 270.37C44.91 273.33 44.8 275.89 45.42 281.4C45.87 285.35 46.76 290.45 47.4 292.74C48.05 295.04 49.09 297.29 49.72 297.75C50.5 298.32 51.19 297.88 51.87 296.42C52.55 294.93 53.5 294.35 54.89 294.57C56.54 294.84 57.28 294.06 58.83 290.44C59.89 287.99 61.09 285.98 61.47 285.97C61.86 285.96 62.39 287.05 62.62 288.36C62.86 289.69 63.69 290.76 64.48 290.76C65.26 290.75 65.91 290.41 65.93 290.01C65.96 289.62 66.63 288.41 67.42 287.34C68.86 285.4 68.88 285.41 70.24 287.55C71 288.74 72.15 289.72 72.81 289.73C73.47 289.75 74.55 288.53 75.23 287.04C75.9 285.55 76.89 281.47 77.42 278.01C77.94 274.56 78.38 267.93 78.36 263.3C78.35 257.67 78.89 253.4 80.02 250.32C80.97 247.74 81.5 244.4 81.22 242.65C80.95 240.95 81.26 237.72 81.93 235.48C82.6 233.24 83.57 230.65 84.09 229.73C84.62 228.8 85.07 227.62 85.08 227.09C85.1 226.57 87.05 223.65 89.42 220.61C93.29 215.69 93.69 214.69 93.19 211.31C92.79 208.67 93.03 207.32 93.98 206.83C94.73 206.46 96.51 206.36 97.93 206.64C99.55 206.94 101.12 206.57 102.12 205.63C103 204.81 104.9 203.9 106.34 203.62C107.8 203.33 110.9 201.4 113.25 199.31C117.2 195.82 118 195.51 123.34 195.45C126.55 195.41 129.88 194.99 130.76 194.51C131.88 193.91 132.74 194.12 133.58 195.2C134.62 196.52 136.85 196.75 147.89 196.65C159.24 196.54 161.42 196.77 164.12 198.35C166.37 199.68 169.3 200.23 174.71 200.33C178.81 200.42 184.08 200.55 186.41 200.62C188.74 200.7 198.48 200.36 208.01 199.86C217.49 199.39 226.94 199.04 229.06 199.08C231.53 199.13 234.12 198.4 236.26 197.05C239.2 195.18 240.96 194.92 252.21 194.69C261.53 194.51 265.01 194.11 266.1 193.1C267.26 192.02 269.22 191.87 275.56 192.37C283 192.98 283.66 193.21 287.1 196.53C289.08 198.47 291.44 200.07 292.34 200.09C293.24 200.09 295.23 200.97 296.76 202.02C298.29 203.07 300.36 203.73 301.37 203.48C302.38 203.23 304.02 203.25 305.02 203.53C306.56 203.95 306.75 204.55 306.27 207.56C305.74 210.76 306.09 211.65 309.93 216.86C312.22 220.05 314.68 224.17 315.4 226.03C316.12 227.9 317.1 230.5 317.57 231.83C318.04 233.16 318.66 237.28 318.94 240.99C319.19 244.7 320.07 249.07 320.91 250.7C322.01 252.83 322.29 255.38 321.95 259.94C321.64 263.66 321.98 269.48 322.77 274.12C323.5 278.46 324.16 283.34 324.25 284.97C324.33 286.6 325.15 288.72 326.07 289.69C327.68 291.37 327.82 291.35 329.43 289.01C330.34 287.68 331.39 286.6 331.77 286.61C332.14 286.62 333.05 287.96 333.77 289.6C334.49 291.21 335.53 292.33 336.07 292.07C336.6 291.82 337.14 290.51 337.26 289.17C337.37 287.84 337.78 286.74 338.15 286.75C338.52 286.76 339.69 288.79 340.75 291.27C342.31 294.84 343.11 295.64 344.61 295.22C346.01 294.84 346.76 295.38 347.57 297.37C348.64 299.9 348.73 299.94 349.76 298.11C350.34 297.06 351.23 290.6 351.7 283.76C352.37 273.42 352.28 270.78 351.23 268.14C350.53 266.38 350.01 263.65 350.06 262.07C350.11 260.48 350.51 259.2 350.95 259.23C351.4 259.25 351.83 259.79 351.93 260.43C352.03 261.06 352.56 261.31 353.12 260.97C353.86 260.53 354.11 257.89 354.04 251.47C353.98 246.57 353.56 241.56 353.1 240.34C352.64 239.12 352.3 236.39 352.34 234.27C352.4 231.43 352.07 230.27 351.09 229.85C350.35 229.54 349.34 228.18 348.83 226.83C348.32 225.48 347.64 224.37 347.32 224.34C347 224.32 346.92 222.26 347.14 219.76C347.45 216.17 347.11 214.22 345.54 210.54L343.52 205.89C346.55 203.33 348.06 200.19 349.09 196.69C350.37 192.27 350.64 190.18 350.08 188.73C349.66 187.65 348.61 186.32 347.75 185.76C346.87 185.21 345.26 184.74 344.14 184.71C343.03 184.69 341.93 184.23 341.71 183.69C341.49 183.16 342.04 182.53 342.94 182.27C343.84 182.02 344.58 181.06 344.59 180.13C344.6 179.21 345.07 177.08 345.63 175.41C346.49 172.86 346.46 172.09 345.45 170.69C344.78 169.76 342.92 168.29 341.31 167.41C339.05 166.18 338.05 164.81 336.99 161.48C336.23 159.08 335.12 155.72 334.53 154C333.94 152.27 333.06 150.86 332.57 150.86C332.09 150.87 331.04 150.11 330.22 149.19C328.81 147.58 328.62 147.58 326.23 149.21C324.09 150.66 323.71 150.7 323.67 149.46C323.65 148.68 322.81 147.82 321.81 147.55C320.81 147.29 320.17 146.55 320.39 145.88C320.6 145.21 322.18 143.9 323.9 142.96C325.61 142.02 327.2 140.58 327.42 139.78C327.64 138.99 326.76 136.37 325.43 133.99C323.75 130.98 322.21 129.48 320.44 129.07C319.03 128.76 316.42 128.8 314.64 129.15C311.53 129.78 311.35 129.66 309.8 125.84L308.17 121.87C312.73 117.79 314.04 116.27 314.02 115.87C313.99 115.47 313.33 115.15 312.55 115.16C311.78 115.17 310.65 114.09 310.05 112.74C309.05 110.46 308.66 110.35 304.46 111.03C301.98 111.43 298.5 112.82 296.72 114.12C294.95 115.41 292.53 116.47 291.33 116.47C290.13 116.46 289.14 116.25 289.12 115.98C289.1 115.7 289.62 113.82 290.27 111.79C290.94 109.7 292.69 107.31 294.27 106.31C295.81 105.33 297.05 103.98 297.02 103.29C297 102.61 296.04 101.28 294.89 100.34C293.11 98.87 292.96 98.31 293.89 96.54C294.82 94.76 294.68 94.25 292.93 93.02C291.8 92.22 289.89 91.59 288.67 91.61C287.45 91.63 285.84 92.68 285.08 93.94L283.71 96.21C279.83 91.71 278.06 90.74 276.29 90.75C274.8 90.76 272.72 91.22 271.67 91.79C270.63 92.36 269.2 94.19 268.52 95.86C267.84 97.53 267.35 99.79 267.43 100.89C267.53 102.11 266.92 102.91 265.87 102.95C264.83 102.98 262.67 100.9 260.46 97.74L256.77 92.42C261.05 87.65 262.25 85.45 262.18 84.46C262.11 83.38 260.94 82.32 259.27 81.81C257.71 81.33 254.94 81.37 253.05 81.88C250.43 82.61 249.26 82.46 248.02 81.25C247.14 80.4 246.06 79.67 245.65 79.66C245.24 79.64 244.09 80.69 243.09 81.98L241.28 84.31C236.69 79.94 234.34 78.66 233.1 78.65C231.86 78.64 230.57 79.38 230.23 80.29C229.89 81.19 227.84 82.26 225.67 82.65C222.09 83.3 221.73 83.68 221.74 86.72C221.75 88.6 221.11 90.28 220.29 90.57C219.49 90.86 218.36 90.87 217.79 90.58C217.21 90.3 216.89 88.57 217.06 86.72C217.34 83.86 216.97 83.13 214.62 81.8C212.37 80.53 211.51 80.48 210.01 81.55C208.45 82.65 208.05 82.57 207.39 81.03C206.96 80.03 207.02 77.31 207.53 74.99C208.35 71.19 208.23 70.61 206.51 69.39C205.44 68.65 204.23 68.04 203.82 68.05C203.41 68.06 203.12 68.79 203.19 69.68C203.25 70.56 202.62 71.28 201.8 71.28C200.98 71.28 200.05 70.8 199.73 70.21C199.4 69.63 198.03 69.14 196.65 69.14C195.09 69.14 194.19 69.75 194.26 70.75C194.33 71.63 193.71 72.58 192.91 72.88C192.11 73.17 190.28 72.7 188.84 71.81C187.4 70.93 186.18 69.5 186.11 68.61C186.05 67.72 185.32 67 184.49 67C183.65 67 182.71 67.85 182.42 68.88Z"  fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    curlyFade1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="shortfade" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.25)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.short_fade { fill: url(#shortfade);stroke: none} \t</style>\t<g id="short fade">\t\t<path id="Short Fade" class="short_fade" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t</g>\t<path id="curly-fade" d="M179.59 87.23C178.29 88.14 176.4 88.93 175.41 88.97C174.42 89.02 173.47 89.4 173.31 89.83C173.15 90.25 171.17 90.71 168.92 90.84C166.2 91.01 164.75 91.42 164.57 92.11C164.42 92.67 163.31 93.58 162.1 94.13C160.9 94.68 158.44 95.21 156.65 95.3C154.86 95.39 153.18 95.81 152.92 96.24C152.63 96.72 151.68 96.63 150.52 96.02C148.98 95.21 147.4 95.22 142.4 96.04C138.98 96.58 135.06 97.49 133.68 98.06C131.5 98.96 131.18 99.44 131.27 101.73C131.35 103.21 131.11 104.83 130.72 105.32C130.34 105.81 128.17 106.23 125.91 106.25C122.29 106.28 121.75 106.49 121.38 108.06C121.06 109.47 120.53 109.79 118.94 109.53C117.83 109.34 116.2 109.21 115.32 109.22C114.44 109.24 113.6 108.54 113.46 107.68C113.31 106.83 112.59 106.15 111.84 106.17C111.1 106.19 110.09 107 109.61 107.97C109.14 108.95 108.71 110 108.65 110.29C108.59 110.58 108.2 111.13 107.77 111.5C107.34 111.88 106.92 112.91 106.85 113.8C106.78 114.7 106.12 116.67 105.39 118.19C104.34 120.45 103.38 121.15 100.38 121.84C98.33 122.31 95.72 123.38 94.57 124.21C93.42 125.05 92.44 126.42 92.39 127.25C92.35 128.09 90.95 129.81 89.28 131.08C87.21 132.67 85.62 133.25 84.22 132.91C82.63 132.52 81.24 133.32 78.02 136.47C75.75 138.73 73.9 141.21 73.9 141.96C73.9 142.72 74.41 143.47 75.03 143.63C75.92 143.86 75.9 144.41 74.92 146.17C74.24 147.41 73.93 148.94 74.24 149.58C74.57 150.26 72.72 152.8 69.76 155.74C65.9 159.58 64.06 162.36 62.02 167.39C60.47 171.03 58.59 174.52 57.89 175.13C57.19 175.75 56.6 176.68 56.57 177.21C56.55 177.74 57.12 180 57.83 182.24C58.86 185.69 58.81 186.48 57.54 187.52C56.71 188.19 55.59 190.2 55.02 191.98C54.13 194.62 54.3 195.6 55.98 197.21C57.11 198.31 57.9 199.63 57.72 200.16C57.54 200.68 57.81 201.95 58.31 202.99C58.81 204.03 59.15 204.24 59.06 203.46C58.97 202.68 59.47 203.1 60.16 204.4C60.85 205.69 61.11 207.49 60.75 208.4C60.21 209.71 60.92 210.05 64.25 210.07C66.56 210.09 71.48 210.61 75.19 211.24L81.99 212.38C91.97 205.86 97.15 202.94 100.06 201.71C102.95 200.47 108.67 198.74 112.77 197.88C116.86 197.01 124.56 196.03 129.89 195.71C136.75 195.31 145.61 195.79 160.24 197.4C167.44 198.2 174.11 198.78 180.62 199.17C187.15 199.56 193.51 199.77 200.12 199.81C206.74 199.86 213.11 199.74 219.64 199.44C226.17 199.14 232.85 198.67 240.09 198.01C255.42 196.66 263.52 196.41 271.07 197C276.69 197.45 284.41 198.51 288.23 199.36C292.06 200.2 297.53 201.85 300.4 203.03C303.29 204.19 308.47 206.88 311.96 208.97C315.9 211.19 319.28 212.5 320.44 212.36C321.49 212.23 324.69 211.76 327.54 211.31C330.38 210.87 334.14 210.54 335.92 210.55C337.94 210.57 340.11 209.84 341.76 208.58C343.21 207.47 344.24 206.12 344.05 205.59C343.87 205.06 344.86 204.13 346.24 203.53C348.52 202.54 348.62 202.17 347.35 199.39C346.64 197.67 345.37 195.73 344.51 195.1C343.16 194.11 343.18 193.39 344.63 189.91C345.6 187.64 346.36 185.35 346.29 184.84C346.22 184.33 345.4 183.41 344.45 182.79C343.51 182.16 341.97 179.31 341.06 176.42C340.04 172.96 338 169.08 335.23 165.34C332.9 162.16 330.4 159.06 329.66 158.45C328.82 157.77 328.54 156.62 328.91 155.38C329.3 154.1 328.94 152.69 327.9 151.45C326.47 149.75 326.43 149.25 327.55 147.36C328.74 145.36 328.54 144.9 324.54 140.64C321.83 137.78 319.44 136.12 318.13 136.16C316.98 136.19 314.69 135.51 313.04 134.65C311.19 133.68 309.8 132.1 309.43 130.55C309.09 129.16 308.1 127.19 307.22 126.18C306.25 125.07 304.34 124.33 302.36 124.29C299.78 124.24 298.64 123.59 296.91 121.19C295.5 119.25 294.36 115.97 293.71 112.1L292.61 106.12C287.76 106.03 286.23 106.54 286.09 107.19C285.94 107.84 284.78 108.35 283.5 108.33C282.22 108.32 281.06 108.83 280.92 109.48C280.78 110.13 279.9 109.27 278.95 107.57C277.31 104.7 276.96 104.53 273.28 104.94C270.72 105.22 269.08 104.97 268.59 104.23C268.17 103.6 267.74 101.84 267.61 100.33C267.48 98.82 267.02 97.12 266.59 96.54C266.17 95.96 264.64 95.06 263.2 94.55C261.76 94.04 257.74 93.24 254.28 92.79C248.92 92.12 247.83 92.21 246.93 93.38C245.97 94.63 245.65 94.64 243.7 93.47C242.51 92.77 240.29 92.3 238.77 92.44C237.25 92.57 235.07 92.65 233.92 92.62C232.75 92.59 231.81 92 231.77 91.28C231.74 90.58 230.97 89.83 230.07 89.62C229.18 89.41 227.72 89.57 226.83 89.96C225.94 90.36 225.04 91.16 224.82 91.75C224.61 92.35 223.81 92.85 223.05 92.88C222.28 92.91 220.69 91.94 219.51 90.73C218.34 89.54 216.68 87.48 215.83 86.17C214.98 84.88 213.63 83.77 212.81 83.71C211.99 83.65 209.71 84.77 207.72 86.2L204.08 88.81C199.5 86.15 197.18 85.65 194.94 85.79C192.98 85.92 191.4 85.76 191.41 85.45C191.42 85.13 189.29 85.03 186.69 85.22C183.33 85.46 181.27 86.05 179.59 87.23Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    curly2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="grd1" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.3)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.cornrows { fill: url(#grd1);stroke: none} \t</style>\t\t<path id="hair" class="afro2" d="M198.45 65.22C197.55 66.44 196.87 68.81 196.95 70.47C197.02 72.14 197.77 75.3 198.61 77.5C199.45 79.7 200.33 82.29 200.57 83.25C200.85 84.41 200.41 85.01 199.25 85.02C198.29 85.03 196.6 84.37 195.5 83.55C194.4 82.73 192.82 82.03 192 82C191.18 81.96 189.6 82.86 188.5 84C187.4 85.14 185.94 86.05 185.25 86.03C184.56 86.01 183.89 84.55 183.75 82.77C183.52 79.78 183.17 79.49 179 78.76C176.51 78.33 173.38 76.92 172 75.61C170.63 74.31 167.58 71.96 165.23 70.38C161.39 67.79 160.69 67.63 158.23 68.77C156.73 69.46 154.21 71.04 152.64 72.27L149.78 74.5C159.25 93.49 161.55 99 161 99C160.45 99 156.29 96.98 151.75 94.52C147.21 92.06 142.71 90.03 141.75 90.02C140.79 90.01 139.79 90.34 139.54 90.75C139.29 91.16 140.19 93.19 141.54 95.25C142.89 97.31 144 99.22 144 99.5C144 99.78 140.85 100 137 100C132.21 100 128.34 100.67 124.75 102.1C121.86 103.26 117.47 104.82 115 105.57C111.13 106.74 110.19 106.73 108.25 105.47C107.01 104.66 105.44 104.01 104.75 104.02C104.06 104.03 101.36 105.83 98.75 108.02L94 112C85.09 108.88 81.04 107.98 79.25 107.98L76 108C78.91 113.81 81.6 118.42 83.86 122C86.12 125.58 87.75 128.84 87.48 129.25C87.22 129.66 83.74 130.01 79.75 130.02L72.5 130.05C46.31 145.12 36.86 151.17 34.6 153.21L30.5 156.92C34.76 156.98 38.25 156.1 41 155C43.75 153.9 46 153.45 46 154C46 154.55 44.64 157.14 42.99 159.75C41.33 162.36 39.98 165.06 39.99 165.75C40 166.66 41.5 166.86 45.5 166.5C48.52 166.22 51.02 166.34 51.04 166.75C51.06 167.16 49.13 169.3 46.74 171.5C44.34 173.7 38.48 178.54 33.69 182.25C27.92 186.74 25 189.67 25 191C25 192.1 25.68 193.68 26.5 194.5C27.32 195.32 28.56 196.01 29.25 196.01C29.94 196.02 32.64 194.67 35.25 193.01C37.86 191.36 40.45 190 41 190C41.55 190 42.01 190.79 42.03 191.75C42.04 192.71 41.03 194.44 39.78 195.6C38.52 196.75 33.31 200.57 28.19 204.1C23.07 207.62 18.68 211.29 18.44 212.25C18.2 213.21 18.45 214.9 19 216C19.57 217.14 22.05 218.63 24.75 219.46C27.36 220.27 30.4 221.86 31.5 223L33.5 225.07C23.56 234.96 22.02 237.24 22.01 239.25C22 241.1 22.9 242.67 24.75 244.04C26.26 245.16 27.95 246.2 28.5 246.36C29.05 246.51 28.05 248.86 26.27 251.57C24.5 254.28 23.04 257.29 23.02 258.25C23 259.66 23.87 260 27.5 260C30.83 260 32 260.39 32 261.5C32 262.32 31.44 265.01 30.75 267.48C29.6 271.59 29.66 272.07 31.5 273.38C33.33 274.68 33.4 275.21 32.34 279.65C31.7 282.32 31.36 284.84 31.59 285.25C31.81 285.66 32.9 285.77 34 285.5C35.52 285.12 36.12 285.6 36.5 287.5C36.83 289.17 38 290.33 40 291C41.65 291.55 43 292.23 43 292.5C43 292.77 41.7 294.91 40.11 297.25C38.52 299.59 37.06 302.4 36.86 303.5C36.54 305.27 37.11 305.53 41.75 305.75C44.64 305.89 47.01 306.11 47.02 306.25C47.03 306.39 46.38 308.3 45.58 310.5C44.19 314.29 44.23 314.62 46.31 316.73C47.51 317.95 48.95 318.96 49.5 318.97C50.05 318.98 53.09 316.4 56.26 313.24L62.02 307.5L62 284C67.76 274.31 70.62 270.15 72.07 268.5C73.52 266.85 75.22 264.49 75.85 263.25C76.48 262.01 78.35 252.34 80 241.75C81.66 231.16 83.87 219.57 84.92 216C86 212.35 88.08 208.13 89.67 206.38C91.39 204.48 94.66 202.56 98 201.49C103.08 199.85 110.59 199.7 195.5 199.48C246.3 199.34 290.64 199.64 294.5 200.14C298.35 200.64 303.52 202.05 305.98 203.27C308.45 204.5 311.24 206.85 312.2 208.5C313.15 210.15 314.85 215.1 315.98 219.5C317.1 223.9 319.15 235.04 320.51 244.25C321.88 253.46 323.68 262.35 324.5 264C325.32 265.65 326.45 267.23 327 267.5C327.55 267.77 330.26 271.49 333.03 275.75L338.07 283.5L337.98 307.5C346.91 316.4 350.18 318.99 351 319.01C351.82 319.02 353.32 318.46 354.33 317.77C355.96 316.64 356.04 316 355.02 312C354.11 308.41 354.14 307.35 355.19 306.77C355.91 306.36 358.19 306.02 360.25 306.02C362.57 306.01 364 305.52 364.01 304.75C364.01 304.06 362.44 301.02 360.52 298L357.01 292.5C361.65 290.56 363.45 289.1 364 288C364.55 286.9 365.9 286 367 286C368.84 286 368.95 285.54 368.38 280.25C367.89 275.63 368.09 274.25 369.38 273.25C370.86 272.11 370.87 271.55 369.44 266.75C368.16 262.46 368.11 261.37 369.19 260.77C369.91 260.36 372.19 260.02 374.25 260.02C377.66 260 377.94 259.79 377.36 257.75C377.01 256.51 375.44 253.59 373.86 251.25C372.29 248.91 371.11 246.87 371.25 246.7C371.39 246.54 372.74 245.86 374.25 245.2C375.76 244.54 377.38 242.99 377.85 241.75C378.32 240.51 378.46 238.6 378.17 237.5C377.87 236.4 375.24 233.14 372.31 230.25L367 225C372.04 221.25 374.63 219.9 376 219.58C377.38 219.26 379.31 218.22 380.29 217.25C381.29 216.27 381.95 214.41 381.79 213.03C381.57 211.15 378.89 208.76 370.5 202.96C361.56 196.78 359.45 194.85 359.25 192.68C359.11 191.21 359.34 190.01 359.75 190.02C360.16 190.04 362.64 191.39 365.25 193.02C367.86 194.66 370.73 195.89 371.63 195.75C372.53 195.61 373.87 194.6 374.62 193.5C375.75 191.83 375.75 191.17 374.64 189.5C373.91 188.4 368.63 183.85 362.91 179.39C357.18 174.93 351.6 170.3 350.5 169.11L348.5 166.93C359.08 166.99 360 166.72 359.97 165.25C359.96 164.29 358.61 161.36 356.97 158.75C355.34 156.14 354.34 153.99 354.75 153.98C355.16 153.98 358.2 154.88 361.5 155.99C364.8 157.1 367.86 157.67 368.31 157.25C368.76 156.84 367.12 154.7 364.67 152.5C362.22 150.3 354.22 145.13 346.89 141C339.57 136.88 332.66 132.76 331.54 131.85C329.57 130.25 329.56 130.09 331.23 126.85C332.18 125.01 334.78 120.58 337 117C339.22 113.42 341.03 109.94 341.02 109.25C341.01 108.56 339.99 108 338.75 107.99C337.51 107.99 333.57 108.92 330 110.08L323.5 112.17C316.14 105.84 313.55 104 313 104C312.45 104 310.81 104.79 309.36 105.75C307.13 107.23 306.16 107.32 303.11 106.35C301.12 105.72 296.8 104.04 293.5 102.63C289.06 100.72 285.75 100.04 280.75 100.02C277.04 100.01 274.01 99.66 274.02 99.25C274.03 98.84 274.92 97.38 276 96C277.08 94.63 277.97 92.71 277.98 91.75C278 90.28 277.39 90.1 274.25 90.61L270.5 91.22C271.66 84.07 271.66 81.99 271.25 81.97C270.84 81.96 269.54 82.97 268.37 84.22C267.21 85.48 265.74 87.51 265.12 88.75C264.37 90.26 263.1 91 261.25 91C259.74 91 257.15 90.59 255.5 90.08C253.06 89.33 250.4 89.89 241.25 93.08C235.06 95.24 229.55 96.78 229 96.5C228.45 96.22 226.54 93.98 224.75 91.52C222.35 88.21 220.65 86.9 218.25 86.52C216.14 86.18 214.03 84.8 212.25 82.59C210.74 80.71 207.68 75.53 205.45 71.09C203.23 66.64 201.11 63 200.75 63C200.39 63 199.36 64 198.45 65.22Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    curlyFade2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="shortfade" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.25)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.short_fade { fill: url(#shortfade);stroke: none} \t</style>\t<g id="short fade">\t\t<path id="Short Fade" class="short_fade" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t</g>\t<path id="curly-fade" d="M177 76.08C175.63 77.18 173.6 78.07 172.51 78.04C171.41 78.02 170.4 78.45 170.26 79C170.12 79.55 167.97 80 165.5 80C162.5 80 160.94 80.45 160.81 81.34C160.71 82.08 159.58 83.2 158.31 83.84C157.04 84.48 154.39 85 152.43 85C150.47 85 148.67 85.45 148.43 86C148.17 86.61 147.11 86.43 145.75 85.54C143.94 84.37 142.18 84.27 136.75 85.04C133.04 85.57 128.82 86.56 127.39 87.25C125.12 88.33 124.84 88.96 125.3 92C125.59 93.92 125.52 96 125.16 96.62C124.8 97.23 122.47 97.68 120 97.62C116.03 97.51 115.47 97.77 115.25 99.75C115.05 101.52 114.52 101.9 112.75 101.51C111.51 101.25 109.71 101.02 108.75 101.01C107.79 101.01 106.78 100.1 106.5 99C106.22 97.9 105.33 97 104.5 97C103.67 97 102.68 98.01 102.3 99.25C101.91 100.49 101.58 101.8 101.55 102.17C101.52 102.53 101.15 103.21 100.72 103.67C100.29 104.13 99.95 105.4 99.96 106.5C99.97 107.6 99.42 109.99 98.74 111.81C97.74 114.48 96.74 115.3 93.5 116.06C91.3 116.58 88.51 117.79 87.29 118.75C86.08 119.71 85.06 121.29 85.04 122.25C85.02 123.21 83.54 125.16 81.75 126.58C79.52 128.35 77.79 128.98 76.25 128.58C74.5 128.13 72.99 129.01 69.5 132.5C67.03 134.97 65 137.68 65 138.5C65 139.32 65.56 140.15 66.25 140.34C67.23 140.6 67.2 141.2 66.13 143.09C65.37 144.41 65.04 146.06 65.38 146.75C65.74 147.48 63.71 150.17 60.46 153.25C56.25 157.25 54.28 160.14 52.21 165.36C50.72 169.14 48.92 172.74 48.21 173.36C47.49 173.99 46.94 174.95 46.97 175.5C47 176.05 47.92 178.41 49.01 180.75C50.7 184.36 50.79 185.19 49.61 186.25C48.84 186.94 48.05 189.02 47.86 190.88C47.57 193.63 48.02 194.66 50.27 196.38C51.8 197.55 53.03 198.95 53 199.5C52.98 200.05 53.68 201.4 54.56 202.5C55.43 203.6 55.86 203.82 55.5 203C55.14 202.18 55.8 202.63 56.97 204C58.13 205.38 59.07 207.29 59.04 208.25C59.01 209.64 59.87 210.01 63.25 210.04C65.59 210.06 70.74 210.62 74.71 211.29L81.92 212.5C90.12 205.68 94.75 202.66 97.5 201.39C100.25 200.12 105.88 198.36 110 197.49C114.13 196.61 122 195.63 127.5 195.32C134.57 194.92 143.79 195.43 159 197.07C173.91 198.67 186.47 199.38 200 199.38C213.53 199.38 226.08 198.67 241 197.06C256.87 195.36 265.25 194.91 273 195.37C278.77 195.72 286.65 196.68 290.5 197.52C294.35 198.35 299.75 200.09 302.5 201.37C305.25 202.65 309.98 205.73 313 208.22C316.33 210.96 319.29 212.63 320.5 212.44C321.6 212.28 324.98 211.65 328 211.06C331.02 210.46 334.96 209.98 336.75 209.99C338.79 210 341.3 208.98 343.5 207.25C345.42 205.74 347 203.94 347 203.25C347 202.56 348.35 201.32 350 200.5C352.73 199.14 352.95 198.66 352.44 195.25C352.13 193.19 351.23 190.94 350.44 190.25C349.2 189.18 349.35 188.33 351.53 184.25C352.92 181.64 354.05 179.05 354.03 178.5C354.02 177.95 353.22 177.01 352.25 176.4C351.29 175.8 349.85 172.88 349.06 169.9C348.13 166.39 346.05 162.58 343.12 159C340.64 155.97 337.96 153.05 337.16 152.5C336.24 151.87 335.95 150.75 336.36 149.5C336.79 148.22 336.39 146.85 335.26 145.69C333.72 144.11 333.67 143.61 334.89 141.69C336.18 139.65 335.96 139.21 331.64 135.25C328.73 132.59 326.16 131.06 324.75 131.17C323.51 131.26 321.05 130.7 319.28 129.92C317.3 129.05 315.83 127.54 315.45 126C315.12 124.63 314.09 122.7 313.17 121.72C312.16 120.64 310.12 119.96 308 119.99C305.23 120.03 304.03 119.41 302.25 117.02C300.81 115.09 299.73 111.75 299.25 107.75L298.5 101.5C293.27 101.5 291.58 102.06 291.37 102.75C291.17 103.44 289.88 104 288.5 104C287.13 104 285.85 104.56 285.66 105.25C285.47 105.94 284.57 105.04 283.66 103.25C282.1 100.2 281.73 100.03 277.75 100.48C274.99 100.8 273.24 100.54 272.77 99.73C272.36 99.06 272.02 97.15 272 95.5C271.98 93.85 271.64 91.97 271.23 91.33C270.83 90.68 269.26 89.67 267.75 89.08C266.24 88.48 261.96 87.53 258.25 86.95C252.5 86.06 251.31 86.13 250.25 87.45C249.12 88.85 248.78 88.85 246.75 87.46C245.51 86.62 243.15 86.01 241.5 86.11C239.85 86.22 237.49 86.23 236.25 86.15C234.98 86.07 234 85.34 234 84.5C234 83.67 233.21 82.76 232.25 82.47C231.29 82.19 229.7 82.3 228.71 82.72C227.73 83.15 226.72 84.06 226.46 84.75C226.21 85.44 225.32 86 224.5 86C223.68 86 221.99 84.77 220.75 83.27C219.51 81.77 217.77 79.18 216.88 77.52C215.99 75.86 214.53 74.39 213.63 74.25C212.74 74.11 210.2 75.35 208 77L204 80C198.97 76.32 196.4 75.5 193.92 75.5C191.77 75.5 190 75.16 190 74.75C190 74.34 187.64 74.01 184.75 74.03C181.03 74.06 178.77 74.65 177 76.08Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    "fauxhawk-fade":
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="fauxhawk-fade.svg"   id="svg41"   version="1.1"   height="600"   width="400"   viewBox="0 0 400 600">  <metadata     id="metadata47">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs45">    <linearGradient       id="shortfade"       gradientUnits="userSpaceOnUse"       x1="200"       y1="100"       x2="200"       y2="310">      <stop         offset="0"         stop-color="rgba(0,0,0,.25)"         id="stop118" />      <stop         offset="1"         stop-color="rgba(0,0,0,0)"         id="stop120" />    </linearGradient>  </defs>  <sodipodi:namedview     inkscape:current-layer="layer2"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="139.97378"     inkscape:cx="178.2409"     inkscape:zoom="6.72"     showgrid="false"     id="namedview43"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff"     inkscape:document-rotation="0" />  <g     style="display:inline"     inkscape:label="Layer 1"     id="layer1"     inkscape:groupmode="layer">    <path       id="Short Fade"       class="short_fade"       d="M 60,310 H 50 v -10 c 0,-140 50,-200 150,-200 100,0 150,60 150,200 v 10 h -10 v -20 c 0,-5 -10,-20 -15,-25 -5,-5 -5,-55 -15,-65 C 270,160 253.57143,161.90476 203.57143,161.90476 153.57143,161.90476 130,160 90,200 c -10,10 -10,60 -15,65 -5,5 -15,20 -15,25 z"       sodipodi:nodetypes="ccsssccsssssssc"       style="display:inline;opacity:1;fill:url(#shortfade);stroke:none;stroke-width:1;stroke-miterlimit:4;stroke-dasharray:none" />  </g>  <g     inkscape:label="Layer 2"     id="layer2"     inkscape:groupmode="layer">    <path       id="faux-hawk"       d="m 186.57427,63.308307 c -1.38057,0.913794 -3.04787,2.223251 -3.70627,2.901532 -0.65844,0.697121 -2.64434,2.110204 -4.42845,3.137044 -1.79471,1.036262 -4.00365,2.995737 -4.92755,4.352297 -0.91331,1.34714 -2.76115,3.023999 -4.12046,3.739962 -1.35932,0.715962 -4.37728,3.134017 -6.97911,4.839137 -2.63371,1.695701 -3.69803,3.691435 -4.77061,5.048001 -1.08321,1.33771 -1.98502,2.0848 -3.31246,2.951489 -1.31685,0.847857 -2.34912,2.437267 -2.34912,2.437267 -0.5468,0.602729 -3.46377,0.794317 -5.21604,1.905945 -1.75224,1.111627 -2.50925,3.2252 -3.47565,3.667966 -0.95579,0.442767 -2.93104,1.761643 -4.40719,2.920373 -1.47615,1.1493 -2.99478,2.13847 -3.36645,2.20441 -0.36109,0.066 -1.8266,1.07394 -3.24964,2.23266 -1.42305,1.1399 -2.75053,2.10079 -2.93105,2.12905 -0.19115,0.0282 -2.03902,1.27178 -4.12047,2.74138 1.2065,0.29352 -4.28941,2.36203 -5.43634,3.46423 -1.14694,1.09278 -3.02701,2.11038 -3.6111,3.16549 -1.01951,1.78989 -2.03966,1.62417 -5.56541,1.97273 -3.16469,0.35798 -2.24709,2.16025 -4.87017,3.98784 -2.10273,1.4602 -3.65367,2.45792 -4.30149,3.88985 -0.52038,1.15873 -2.102726,4.032 -3.515143,6.37772 -2.187655,3.66459 -1.961322,5.04941 -8.205703,10.20246 -3.939935,3.23125 -2.727061,4.18581 -4.69169,5.75905 -2.55936,2.04426 -3.918699,3.6175 -4.831986,5.58639 -0.690274,1.50728 -1.528839,5.23766 -2.399666,7.38554 -0.870813,2.14789 -1.688536,4.29578 -1.837202,4.78564 -0.138069,0.48987 -1.709777,2.09137 -3.472653,3.56098 -2.569979,2.18556 -3.207171,3.0711 -3.589472,4.97405 -0.244256,1.27177 -0.45665,2.69427 -0.477888,3.16531 -0.01069,0.4616 -0.211735,2.01215 -1.326806,3.07668 -13.916806,26.9305 0.055,20.43389 20.173859,19.79291 6.615603,-2.29521 23.16677,-11.0483 33.22599,-13.3542 24.88387,-5.70421 49.90359,-4.27667 77.69979,-4.13382 25.58786,0.1315 50.83302,-0.51795 75.14099,4.69287 13.98886,2.99874 30.48237,11.73859 39.34492,13.95517 20.81121,0.15022 27.74436,1.09154 26.42775,-2.90817 -0.11681,-1.44134 -1.20046,-5.15863 -1.80582,-7.90942 -0.6059,-2.67767 -1.03999,-2.93247 -2.06049,-6.34754 -0.20862,-0.69812 -1.48676,-1.97832 -2.56999,-2.94864 -1.10441,-0.97031 -2.02833,-2.17615 -2.06018,-2.66601 -0.0212,-0.48988 -0.26553,-1.97832 -0.54162,-3.30662 -0.42478,-2.07252 -1.47655,-2.67736 -4.57753,-5.10785 -2.0496,-1.58266 -0.90005,-5.269 -1.00626,-5.76828 -0.11681,-0.51813 -0.74335,-1.5544 -1.423,-2.31746 -0.67969,-0.76306 -1.77353,-2.7979 -2.47442,-4.52187 -0.82834,-2.1102 -2.02837,-3.82475 -3.55762,-5.08709 -1.2956,-1.09278 -2.79298,-3.06169 -3.44079,-4.54071 -0.61595,-1.45077 -0.94422,-3.7719 -1.96373,-4.61032 -1.0195,-0.83844 0.38517,-0.41371 -0.79361,-0.87532 -1.1788,-0.48045 -2.54874,-1.61091 -3.06909,-2.52471 -0.50977,-0.92321 -1.97528,-2.42108 -3.24965,-3.33487 l -1.23013,-2.4395 c -0.56283,-0.51814 -1.52924,-1.93122 -2.15581,-3.13705 -0.61592,-1.21526 -2.88856,-3.7588 -5.03374,-5.6806 -2.15582,-1.94063 -2.69034,-5.19499 -4.84613,-7.35228 -2.1558,-2.18558 -4.5665,-4.23926 -5.34174,-4.5313 -0.79648,-0.29204 -3.03724,-2.21382 -5.00188,-4.3146 -2.36822,-2.58123 -1.74459,-4.22383 -4.89863,-5.96663 -2.55936,-1.43193 -5.84086,-3.01458 -7.29577,-3.49503 -1.46552,-0.48045 -3.12152,-1.970641 -4.58706,-2.592391 -1.46554,-0.612341 -3.69577,-1.906792 -4.77902,-3.253936 -1.07259,-1.356554 -2.88908,-2.198828 -3.30327,-2.227094 -0.42479,-0.02823 -1.9434,-1.912362 -3.37708,-4.220404 -1.42303,-2.326874 -3.38769,-4.91753 -4.38595,-5.727699 -0.99826,-0.81959 -3.52575,-1.535551 -5.67092,-1.592074 -3.82312,-0.06594 -3.92933,-0.131887 -7.0834,-4.889269 -2.51688,-3.956633 -3.46202,-4.889268 -4.90631,-4.719698 -1.42304,0.16957 -2.27262,-0.66886 -4.30099,-4.333456 -2.03898,-3.834167 -2.8036,-4.616072 -4.59834,-4.616072 -1.48676,0.01884 -2.59119,0.866691 -3.57885,2.703699 -1.43365,2.590653 -1.45491,2.600074 -2.2089,0.442766 -0.4248,-1.19641 -2.10271,-3.268932 -3.73814,-4.57839 l -3.52631,-2.066941 c -3.75306,1.148523 -3.36435,2.987339 -4.96989,4.493782 -4.58774,-3.457344 -5.26697,-3.161644 -7.66705,-2.229009 -1.67791,0.640598 -3.91868,0.885533 -4.99129,0.527551 -1.30621,-0.405083 -2.77175,-0.06594 -4.44966,1.055102 z"       fill="$[hairColor]"       stroke="#000000"       stroke-width="4.00087"       sodipodi:nodetypes="ccccsccccscccccccccccccccsccccccssscccscccccscccsccccccccccccccccccccccccccccc" />  </g></svg>',
    dreads:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="grd1" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.3)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.cornrows { fill: url(#grd1);stroke: none} \t</style>\t<path id="Short Fade" class="cornrows" d="M60 300L50 300C50 160 100 100 200 100C300 100 350 160 350 300L340 300C340 300 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 300 60 300Z" />\t<path id="ponytail" fill-rule="evenodd" class="dreads-pony" d="M217.4 2.49C218.56 2.89 222.09 3.73 225.26 4.36C230.23 5.34 231.02 5.81 231.01 7.75C231 9.03 230.24 10.22 229.25 10.51C228.29 10.79 227.83 11.35 228.22 11.76C228.62 12.17 228.51 13.29 227.97 14.25C227.09 15.84 226.77 15.86 224.5 14.5C222.72 13.43 222.12 13.36 222.42 14.25C222.65 14.94 223.1 16.74 223.42 18.25C223.9 20.52 223.57 21.17 221.5 22C219.32 22.87 219.14 23.29 220.1 25.25C220.98 27.06 220.78 28.28 219.08 31.5C217.83 33.87 215.75 36.01 213.99 36.75C211.38 37.84 211 38.51 211 42C211 44.89 211.42 46 212.5 46C213.32 46 214.22 45.55 214.5 45C214.78 44.45 216.35 44 218 44C220.67 44 221.06 43.61 221.5 40.5C221.86 37.95 222.61 36.84 224.25 36.39C225.49 36.06 226.84 35.83 227.25 35.89C227.66 35.95 228 35.33 228 34.5C228 33.32 228.81 33.13 231.75 33.63C235.14 34.19 235.42 34.07 234.72 32.38C234.3 31.34 234.19 29.71 234.47 28.75C234.76 27.79 235.45 27.23 236 27.5C236.55 27.77 237 27.55 237 27C237 26.45 238.34 26.11 239.98 26.25C241.63 26.39 243.19 25.94 243.48 25.25C243.76 24.56 244.34 24.05 244.75 24.12C245.16 24.18 246.06 24.18 246.75 24.12C247.44 24.05 248.22 23.1 248.5 22C248.95 20.2 249.33 20.12 252.25 21.13C255 22.09 255.62 22.01 256.25 20.63C256.66 19.73 257.9 19 259 19C260.1 19 261 19.34 261.01 19.75C261.01 20.16 261.87 20.5 262.91 20.5C263.96 20.5 265.2 20.19 265.66 19.8C266.12 19.42 267.18 19.37 268 19.7C268.82 20.03 269.95 19.67 270.5 18.9C271.06 18.13 272.07 17.39 272.75 17.25C273.44 17.11 274.69 17.56 275.54 18.25C276.39 18.94 276.84 20.29 276.54 21.25C276.24 22.21 276.45 23.23 277 23.5C277.55 23.77 278.68 23.55 279.5 23C280.32 22.45 281.18 22.34 281.41 22.75C281.63 23.16 281.63 25.98 281.4 29C281.17 32.02 280.42 34.83 279.74 35.23C279.03 35.65 277.94 35.22 277.19 34.23C275.95 32.6 275.81 32.6 274.69 34.21C274.03 35.15 272.94 35.94 272.25 35.96C271.56 35.98 270.1 35.1 269 34C267.9 32.9 267 31.55 267 31C267 30.45 265.76 29.81 264.25 29.57C262.74 29.33 259.81 28.88 257.75 28.57C254.41 28.06 253.97 28.24 253.75 30.25C253.56 31.92 252.38 32.89 249.17 34C245.42 35.29 244.91 35.81 245.42 37.75C245.87 39.5 245.45 40.22 243.5 41C242.13 41.55 241 42.45 241 43C241 43.55 241.79 45.65 242.75 47.66C244.07 50.42 244.19 51.41 243.25 51.66C242.44 51.88 242.88 52.88 244.5 54.5C245.88 55.88 247.56 57 248.25 56.99C248.94 56.99 250.29 57.89 251.25 58.99C252.21 60.1 253.68 61 254.5 61C255.32 61 256.23 61.79 256.51 62.75C256.79 63.71 257.35 64.17 257.76 63.76C258.17 63.36 259.03 63.81 259.67 64.76C260.56 66.09 260.56 66.81 259.67 67.79C258.77 68.79 258.79 69.08 259.75 69.04C260.44 69.02 262.13 68.55 263.5 68C265.43 67.23 266.23 67.34 267 68.5C267.69 69.54 267.61 70.51 266.75 71.65C266.06 72.55 265.64 74.47 265.82 75.9C266.06 77.81 265.52 78.81 263.82 79.67C262.54 80.32 260.6 80.62 259.5 80.34C258.38 80.06 256.84 80.54 256 81.43C254.79 82.72 254.25 82.78 253.21 81.76C252.49 81.07 251.93 79.71 251.96 78.75C251.98 77.63 251.46 77.18 250.5 77.5C249.68 77.78 248.32 77.78 247.5 77.5C246.68 77.22 246.01 76.21 246.03 75.25C246.04 74.29 245.82 73.28 245.53 73C245.24 72.72 243.32 73.02 241.25 73.66C239.19 74.3 237.5 75.47 237.5 76.26C237.5 77.05 237 78.33 236.39 79.1C235.78 79.87 235.22 82.19 235.14 84.25C235.06 86.31 234.78 88.45 234.5 89C234.22 89.55 233.21 89.77 232.25 89.49C230.95 89.1 230.31 89.74 229.75 91.99C229.13 94.46 228.54 94.96 226.44 94.75C225.03 94.61 223.68 94.84 223.44 95.25C223.2 95.66 222.1 96 221 96C219.55 96 219.15 96.48 219.55 97.75C219.86 98.71 220.31 102.54 220.55 106.25C220.99 112.9 220.96 113 218.5 113C216.67 113 216 113.53 216 115C216 116.76 215.55 116.92 212.25 116.36C210.19 116 208.39 115.33 208.25 114.86C208.11 114.39 207.55 114 207 114C206.45 114 206.01 114.56 206.03 115.25C206.05 115.94 205.03 117.78 203.78 119.34C201.97 121.59 200.98 122.04 199 121.52C197.33 121.09 196 121.4 195 122.45C194.03 123.47 192.85 123.76 191.66 123.26C190.46 122.77 190.03 121.89 190.41 120.75C190.8 119.6 190.49 119 189.5 119C188.68 119 187.71 119.56 187.35 120.25C186.87 121.18 186.42 121.07 185.6 119.82C184.99 118.9 183.6 118.13 182.5 118.12C181.4 118.1 178.81 118.07 176.75 118.05C173.48 118.01 172.92 117.64 172.41 115.25C172.09 113.74 171.3 110.92 170.67 109C170.04 107.08 169.51 105.05 169.49 104.5C169.47 103.95 168.79 101.99 167.98 100.14C166.66 97.15 166.13 96.82 163.16 97.14C160.74 97.4 159.57 97.02 158.91 95.75C158.41 94.79 156.99 93.49 155.75 92.86C154.51 92.24 153.84 92.13 154.25 92.61C154.67 93.1 154.22 94.29 153.25 95.25C151.59 96.91 151.34 96.89 148.25 95C146.46 93.9 144.55 93.22 144 93.5C143.45 93.78 143 95.13 143 96.5C143 98.1 142.37 99.11 141.25 99.3C140.29 99.47 138.71 99.47 137.75 99.3C136.43 99.07 136 98.03 136 95C136 91.38 135.78 91.04 133.75 91.46C132.45 91.72 130.74 91.19 129.72 90.21C128.74 89.27 127.95 87.94 127.97 87.25C127.99 86.56 127.44 85.82 126.75 85.6C125.97 85.35 125.69 84.14 126 82.42C126.28 80.85 127.33 79.39 128.4 79.07C129.44 78.76 130.68 77.49 131.15 76.25C131.69 74.82 133.09 73.82 135 73.5C136.65 73.22 138 72.55 138 72C138 71.45 138.68 71 139.5 71C140.32 71 141.79 72.11 142.75 73.47C144.49 75.93 144.51 75.93 149.5 72.12L146.77 69.31C145.27 67.76 144.04 65.38 144.03 64C144.03 62.63 143.46 60.97 142.77 60.31C142.07 59.66 140.94 59.32 140.25 59.56C139.56 59.8 138.3 59.44 137.46 58.75C136.61 58.06 135.93 56.04 136 51L131.75 51.62C127.87 52.18 127.39 52 126.25 49.62C125.11 47.23 125.22 46.89 127.53 45.75C128.92 45.06 130.06 44.05 130.06 43.5C130.06 42.95 129.82 42.16 129.53 41.75C129.24 41.34 127.87 41.56 126.49 42.25C124.3 43.34 123.8 43.25 122.53 41.5C121.71 40.37 121.36 38.63 121.72 37.5C122.07 36.4 122.44 34.38 122.55 33C122.66 31.63 122.8 29.94 122.87 29.25C122.94 28.56 123.8 28 124.77 28C125.8 28 127.06 26.74 127.77 25C128.77 22.56 129.42 22.12 131.25 22.62C132.49 22.97 134.4 24.15 135.5 25.26C137.25 27.02 137.33 27.54 136.16 29.39C135.03 31.15 135.03 31.62 136.16 32.25C136.9 32.67 139.3 33.55 141.5 34.22C143.7 34.88 145.95 35.9 146.5 36.49C147.05 37.07 147.65 38.21 147.83 39.02C148.01 39.84 148.91 41.32 149.83 42.32C151.44 44.07 151.54 44.07 152.72 42.32C153.54 41.09 153.62 39.94 152.97 38.75C152.43 37.79 152 35.88 152 34.5C152 33.13 152.72 31.66 153.59 31.25C154.56 30.79 154.95 29.82 154.59 28.75C154.2 27.6 154.6 26.82 155.75 26.48C156.71 26.19 157.95 26.39 158.5 26.92C159.13 27.53 160.33 27.54 161.75 26.94C163.51 26.21 164.27 26.4 165.25 27.83C166.19 29.21 167.24 29.51 172.5 28.43L168.23 26.46C165.04 24.99 163.97 23.93 163.98 22.25C163.99 21.01 164.45 19.77 165 19.5C165.55 19.23 165.76 18.44 165.46 17.75C165.16 17.06 165.85 15.6 166.99 14.5C168.13 13.4 169.05 11.82 169.04 11C169.03 10.18 170.25 8.93 171.76 8.24C173.27 7.55 175.06 6.98 175.75 6.99C176.44 7 177.11 8.01 177.25 9.25C177.39 10.49 178.51 11.95 179.75 12.5C180.99 13.05 182.01 14.29 182 15.25C182 16.21 181.48 17.11 180.85 17.25C179.98 17.44 179.98 18.05 180.85 19.75C181.72 21.44 182.62 21.88 184.5 21.5C186.49 21.1 187.28 21.57 188.36 23.75C189.11 25.26 190.46 26.84 191.36 27.25C192.26 27.66 192.84 28.56 192.64 29.25C192.44 29.94 192 31.4 191.66 32.5C191.14 34.17 191.5 34.5 193.77 34.48C195.27 34.47 197.06 34.13 197.75 33.73C198.51 33.29 199 30.84 199 22L204.25 19.62C207.14 18.32 209.8 16.63 210.18 15.87C210.61 15 209.97 14.04 208.43 13.25C206.54 12.28 206.17 11.53 206.75 9.9C207.35 8.22 208.05 7.92 210.25 8.4C212.41 8.87 212.89 8.68 212.5 7.5C212.22 6.67 212.68 5.78 213.5 5.5C214.32 5.22 215.07 4.27 215.15 3.38C215.26 2.19 215.86 1.96 217.4 2.49ZM154.49 54.25C155.86 54.94 157.09 56.23 157.24 57.12C157.44 58.36 158.75 58.77 162.75 58.87C165.64 58.94 168.01 58.66 168.02 58.25C168.04 57.84 166.91 56.49 165.52 55.25C164.14 54.01 162.32 53.23 161.5 53.5C160.68 53.77 159.44 53.4 158.75 52.67C158.06 51.94 156.49 50.82 155.25 50.17C154.01 49.53 152.78 49 152.5 49C152.22 49 152 49.9 152 51C152 52.13 153.08 53.54 154.49 54.25ZM232.83 53.67C232.94 54.54 233.78 54.8 235.25 54.41C236.63 54.05 237.77 54.34 238.19 55.16C238.58 55.9 239.14 56.16 239.44 55.75C239.75 55.34 239.21 54.1 238.25 52.99C237.29 51.89 236.01 50.99 235.42 50.99C234.82 51 233.96 51.3 233.5 51.67C233.04 52.03 232.74 52.93 232.83 53.67ZM224 72C225.33 72 225.75 71.58 225.27 70.75C224.86 70.06 224.41 69.16 224.27 68.75C224.12 68.34 224 67.55 224 67C224 66.45 223.55 66 223 66C222.45 66 222 67.35 222 69C222 71.33 222.44 72 224 72ZM170.5 72.09C171.05 72.09 172.08 71.39 172.78 70.54C173.48 69.7 173.64 69 173.14 69C172.64 69 171.61 69.7 170.86 70.54C170.11 71.39 169.95 72.09 170.5 72.09Z" fill="$[hairColor]" stroke="#000" stroke-width="4" />\t<path id="dreads" fill-rule="evenodd" class="dreads" d="M176.78 95.02C179.26 95.04 181.26 95.78 182.78 97.27C184.05 98.52 185.04 98.95 185.03 98.25C185.01 97.56 185.68 97 186.5 97C187.32 97 188 97.67 188 98.5C188 99.33 188.89 100 190 100C191.1 100 192.68 98.88 193.5 97.5C194.32 96.13 195.56 94.99 196.25 94.98C196.94 94.97 198.51 95.87 199.75 96.98C201.09 98.18 202.65 98.74 203.61 98.35C204.6 97.94 205.56 98.33 206.11 99.35C206.6 100.26 207.45 100.78 208 100.5C208.55 100.22 209.15 100.9 209.32 102C209.5 103.1 209.95 104 210.32 104C210.7 104 211.89 103.44 212.97 102.75C214.7 101.65 215.37 101.93 218.39 105C221.76 108.41 221.86 108.44 222.42 106.25C222.74 105.01 222.78 103.55 222.5 103C222.22 102.45 222.79 101.56 223.75 101.03C224.71 100.5 225.05 100.05 224.5 100.05C223.95 100.04 224.4 99.39 225.5 98.6C227.03 97.5 227.8 97.44 228.79 98.33C229.51 98.97 230.07 100.06 230.04 100.75C230.02 101.44 230.22 102 230.5 102C230.78 102 233.03 100.65 235.5 99C237.97 97.35 240.68 96.22 241.5 96.5C242.32 96.78 243 97.67 243 98.5C243 99.33 242.55 100.22 242 100.5C241.45 100.78 241 101.45 241 102C241 102.55 242.13 103 243.5 103C244.88 103 246.05 103.56 246.12 104.25C246.18 104.94 246.18 106.06 246.12 106.75C246.05 107.44 246.68 108 247.5 108C248.32 108 249.44 108.79 249.98 109.75C250.84 111.28 251.09 111.31 251.96 110C252.51 109.17 252.74 107.71 252.48 106.75C252.21 105.79 252.45 104.78 253 104.5C253.55 104.22 254 103.1 254 102C254 100.2 254.53 100.04 259.25 100.42C262.14 100.65 265.29 100.88 266.25 100.92C267.21 100.96 268.24 101.79 268.54 102.75C268.84 103.76 268.42 104.82 267.54 105.25C266.69 105.66 266 106.67 266 107.5C266 108.33 266.68 109.22 267.5 109.5C268.32 109.78 268.98 110.56 268.96 111.25C268.93 111.94 269.63 113.17 270.5 114C271.63 115.07 272.08 115.14 272.04 114.25C272.02 113.56 273.01 113.01 274.25 113.03C275.49 113.04 277.18 113.74 278 114.58C279.02 115.62 280.55 115.94 282.75 115.56C284.54 115.25 286 114.55 286 114C286 113.45 287.46 113 289.25 113C291.51 112.99 292.96 113.68 294 115.25C294.82 116.49 295.5 119.3 295.5 121.5C295.5 125.05 295.77 125.5 297.89 125.5C299.65 125.5 300.65 126.37 301.64 128.75C302.39 130.54 303.34 131.99 303.75 131.97C304.16 131.96 305.03 132.97 305.68 134.22C306.6 135.98 306.6 136.78 305.68 137.71C304.77 138.64 304.77 139.27 305.69 140.46C306.35 141.31 307.36 142 307.94 142C308.52 142 309.45 140.88 310 139.5C310.6 138 311.8 137 313 137C314.33 137 315.17 137.83 315.5 139.5C315.77 140.88 316.68 142 317.5 142C318.32 142 319.11 143.01 319.25 144.25C319.43 145.9 320.23 146.57 322.25 146.75C324.04 146.91 325.17 147.7 325.5 149C325.83 150.33 325.33 151.33 324 152C322.16 152.92 322.12 153.18 323.53 155.25C324.36 156.49 324.97 157.95 324.86 158.5C324.76 159.05 325.23 160.85 325.91 162.5C327.07 165.3 326.95 165.66 324.1 168C322.42 169.38 321.04 170.95 321.03 171.5C321.02 172.05 322.35 174.07 324 176C325.64 177.93 327.4 179.5 327.91 179.5C328.42 179.5 329.1 179.84 329.42 180.25C329.74 180.66 329.32 182.35 328.5 184C327.68 185.65 327.34 187.11 327.76 187.25C328.18 187.39 328.41 190.09 328.26 193.25C328.04 198.12 327.54 199.46 325 202C323.35 203.65 322 205.45 322 206C322 206.55 321.55 207.22 321 207.5C320.45 207.78 319.26 207.44 318.36 206.75C317.45 206.06 315.43 205.61 313.86 205.75C312.04 205.91 310.82 205.46 310.5 204.5C310.23 203.68 310.23 202.55 310.5 202C310.77 201.45 311.56 201.02 312.25 201.04C312.94 201.07 314.06 200.51 314.75 199.79C315.5 199.02 315.7 197.76 315.25 196.66C314.75 195.42 313.85 195 312.5 195.36C311.4 195.66 308.25 195.43 305.5 194.84C302.75 194.25 299.94 193.37 299.25 192.88C298.39 192.28 298.3 191.45 298.95 190.25C299.64 188.98 299.43 188.08 298.2 186.98C297.26 186.15 295.71 185.58 294.75 185.73C293.79 185.88 293.01 185.66 293.03 185.25C293.04 184.84 291.92 183.94 290.53 183.25C289.14 182.56 287.89 181.02 287.75 179.83C287.61 178.63 286.82 177.42 286 177.14C284.84 176.74 284.67 177.11 285.25 178.81C285.87 180.62 285.37 181.39 282.4 183.25C279.99 184.76 278.58 185.14 278.15 184.4C277.79 183.79 276.49 182.78 275.25 182.15C273.68 181.35 273.2 180.47 273.66 179.25C274.04 178.25 273.93 177.82 273.41 178.24C272.91 178.65 271.94 178.54 271.25 177.99C270.56 177.45 268.65 177.22 267 177.5C264.34 177.94 264.06 178.31 264.54 180.75C264.88 182.45 264.59 183.78 263.79 184.23C263.08 184.64 260.59 184.98 258.25 184.98C255.47 184.99 253.45 184.4 252.39 183.25C250.88 181.6 250.63 181.6 248.14 183.19C246.69 184.11 244.82 185.82 244 186.98C242.6 188.95 242.65 189.09 244.75 189.05C246.1 189.02 247 189.6 247 190.5C247 191.32 246.32 192.22 245.5 192.5C244.68 192.78 242.76 193.01 241.25 193.01C239.74 193.02 236.98 192.68 235.13 192.26C233.27 191.84 231.36 190.71 230.88 189.75C230.26 188.52 230.61 187.18 232.03 185.25C233.15 183.74 234.05 182.16 234.03 181.75C234.02 181.34 232.43 181 230.5 181C228.06 181 227 181.45 227 182.5C227 183.32 227.34 184 227.75 184.01C228.16 184.01 228.43 185.02 228.33 186.26C228.24 187.49 228.13 188.84 228.08 189.25C228.04 189.66 226.99 190.12 225.75 190.27C224.34 190.45 223.64 191.1 223.87 192.02C224.08 192.84 224.41 194.29 224.62 195.25C224.9 196.52 224.1 197.24 221.75 197.88C219.96 198.36 217.2 198.48 215.61 198.13C213.89 197.76 212.37 196.58 211.86 195.25C211.39 194.01 210.55 192.78 210 192.5C209.45 192.22 209 190.65 209 189C209 187.35 208.55 185.78 208 185.5C207.33 185.17 207.33 184.33 208 183C208.55 181.9 209.79 181.02 210.75 181.04C212.31 181.08 212.34 180.92 211 179.5C210.18 178.63 208.94 177.93 208.25 177.96C207.56 177.98 206.55 178.9 206 180C205.45 181.1 205 182.9 205 184C205 185.1 204.55 186 204 186C203.45 186 203.17 186.79 203.37 187.75C203.58 188.71 203.12 190.4 202.36 191.5C201.59 192.6 200.97 194.29 200.98 195.25C200.99 196.21 201.45 197 202 197C202.55 197 203 197.68 203 198.5C203 199.32 201.99 200.21 200.75 200.47C199.51 200.73 197.6 201.04 196.5 201.16C195.4 201.28 193.6 201.08 192.5 200.71C191.19 200.26 190.41 199 190.25 197.02C190.06 194.74 190.43 193.98 191.75 193.92C193.14 193.86 193.19 193.73 192 193.29C191.18 192.98 189.92 192.23 189.22 191.62C188.19 190.73 188.4 190.05 190.22 188.28C192.05 186.49 192.25 185.81 191.24 184.78C190.55 184.08 189.9 181.93 189.8 180C189.65 177.29 188.97 176.16 186.8 175C185.26 174.18 184.22 172.94 184.5 172.25C184.77 171.56 184.32 171 183.5 171C182.68 171 181.78 171.45 181.5 172C181.22 172.55 181.68 174.35 182.5 176C183.37 177.75 183.72 179.94 183.33 181.25C182.96 182.49 181.94 184.02 181.08 184.66C180.21 185.3 179.16 185.64 178.75 185.41C178.34 185.19 177.34 185.79 176.54 186.75C175.74 187.71 175.31 189.18 175.58 190C175.85 190.82 175.5 192.01 174.79 192.64C174.08 193.26 171.7 194.09 169.5 194.49C166.97 194.94 164.58 194.75 160.5 192.76L163 190.99C164.74 189.76 165.27 188.73 164.75 187.61C164.26 186.55 162.72 186 160.25 186C157.58 185.99 156.14 186.57 155.25 188C154.44 189.3 153.3 189.82 152 189.5C150.9 189.22 149.32 189.45 148.5 190C147.68 190.55 145.88 190.78 144.5 190.5C143.07 190.21 141.93 189.25 141.85 188.25C141.76 187.29 141.65 185.92 141.6 185.21C141.54 184.51 140.82 183.5 140 182.98C139.18 182.46 137.26 182.02 135.75 182.02C134.24 182.01 133 181.55 133 181C133 180.45 132.55 180 132 180C131.45 180 130.78 180.9 130.5 182C130.22 183.1 129.21 184.06 128.25 184.14C127.29 184.22 125.6 184.31 124.5 184.34C123.4 184.37 120.92 183.58 119 182.59C117.08 181.6 114.71 181.07 113.75 181.4C112.79 181.73 112.02 182.79 112.04 183.75C112.07 184.71 111.32 186.18 110.38 187C109.42 187.84 106.67 188.52 104.09 188.56C101.56 188.59 98.83 188.99 98 189.45C96.71 190.17 96.74 190.4 98.25 191.14C99.21 191.61 100 192.9 100 194C100 195.1 99.55 196.22 99 196.5C98.45 196.78 97.55 198.13 97 199.5C96.4 201 95.2 202 94 202C92.9 202 91.21 202.9 90.25 204.01C89.28 205.12 87.27 206.01 85.75 206.01C84.24 206 82.78 205.55 82.5 205C82.2 204.4 81.29 204.61 80.25 205.52C78.83 206.76 78.26 206.81 77.25 205.77C76.56 205.07 76.22 203.71 76.5 202.75C76.81 201.67 76.33 200.76 75.25 200.38C74.29 200.04 71.59 198.91 69.25 197.88C66.16 196.51 64.82 195.25 64.35 193.25C63.99 191.74 64.22 189.26 64.85 187.75C65.73 185.64 65.71 184.48 64.75 182.75C64.06 181.51 63.05 180.19 62.5 179.82C61.85 179.37 61.94 178.24 62.75 176.57C63.65 174.71 64.48 174.19 65.75 174.68C66.71 175.06 68.85 175.34 70.5 175.3C72.15 175.27 73.83 175.75 74.23 176.37C74.72 177.12 74.96 176.99 74.94 176C74.92 175.18 75.61 173.82 76.47 173C77.33 172.18 78.14 170.38 78.26 169.01C78.42 167.4 79.21 166.4 80.5 166.19C81.6 166 82.83 166.45 83.23 167.18C83.78 168.17 83.97 168.19 83.98 167.25C83.99 166.56 82.99 165.33 81.75 164.5C79.63 163.1 79.58 162.78 80.84 159.25C82.04 155.92 81.98 155.13 80.34 152.14C78.51 148.8 78.51 148.78 80.8 147.14C82.06 146.24 83.07 144.71 83.05 143.75C83.02 142.79 83.9 141.55 85 141C86.1 140.45 88.13 140 89.5 140C90.88 140 92.22 139.32 92.5 138.5C92.83 137.5 93.83 137.17 95.5 137.5C97.56 137.91 97.89 137.69 97.35 136.25C96.99 135.29 95.76 133.47 94.6 132.2C92.93 130.37 92.73 129.56 93.63 128.2C94.25 127.27 95.72 126.5 96.88 126.5C98.05 126.5 99.23 125.71 99.5 124.75C99.78 123.79 100.45 123 101 123C101.55 123 102.67 124.01 103.48 125.25C104.35 126.57 104.72 128.53 104.37 130C103.99 131.6 104.27 132.75 105.14 133.2C105.9 133.59 107.29 133.14 108.28 132.2C109.26 131.26 109.82 129.71 109.53 128.75C109.24 127.79 109.9 125.42 111 123.5C112.19 121.43 112.59 119.8 112 119.5C111.37 119.19 111.46 118.4 112.25 117.37C112.94 116.47 114.4 115.35 115.5 114.87C116.6 114.39 118.4 113.44 119.5 112.75C120.6 112.06 121.72 111.15 122 110.72C122.28 110.3 123.29 110.18 124.25 110.47C125.41 110.82 126 112.01 126 114C126 116.5 126.33 116.92 128 116.5C129.13 116.22 131.2 116.89 132.75 118.03C134.26 119.15 136.18 120.02 137 119.97C137.96 119.9 137.67 119.44 136.2 118.68C134.93 118.03 134.03 116.83 134.21 116C134.38 115.17 135.42 114.39 136.51 114.25C137.6 114.11 139.06 112.87 139.75 111.5C140.44 110.12 140.78 108.55 140.5 108C140.22 107.45 140.7 106.44 141.54 105.75C142.39 105.06 143.07 103.94 143.04 103.25C143.02 102.56 143.79 102.01 144.75 102.02C145.71 102.02 147.01 102.36 147.63 102.77C148.26 103.17 148.93 104.35 149.13 105.39C149.39 106.73 150.53 107.4 153 107.65C155.85 107.95 156.69 107.59 157.54 105.76C158.11 104.52 159.01 103.56 159.54 103.63C160.07 103.71 161.63 104.13 163 104.56C165.11 105.23 165.38 105.09 164.75 103.67C164.26 102.57 164.51 101.83 165.5 101.5C166.32 101.22 167 100.33 167 99.5C167 98.5 167.67 98.17 169 98.5C170.33 98.83 171.34 98.33 172.03 97C172.78 95.54 174.05 95.01 176.78 95.02ZM252.83 116.04C252.92 116.57 254.24 117.84 255.75 118.87C257.26 119.9 259.4 121.03 260.5 121.38C262.09 121.9 262.64 121.47 263.19 119.26C263.69 117.26 263.41 116.14 262.19 115.18C261.26 114.45 260.61 113.44 260.75 112.93C260.89 112.42 260.1 111.83 259 111.61C257.9 111.4 256.02 112.09 254.83 113.15C253.64 114.21 252.74 115.51 252.83 116.04ZM148.34 118.56C147.69 119.65 147.53 121.16 147.98 122C148.42 122.83 149.28 123.16 149.89 122.75C150.5 122.34 151 120.88 151 119.5C151 117.5 151.5 117 153.5 117C155.5 117 156 116.5 156 114.5C156 113.13 155.62 112 155.15 112C154.69 112 153.22 113.04 151.9 114.31C150.58 115.58 148.98 117.49 148.34 118.56ZM233 117C233 117.55 233.68 118 234.5 118C235.32 118 236 118.45 236 119C236 119.55 236.5 119.89 237.12 119.75C237.74 119.61 238.64 118.49 239.12 117.25C239.75 115.63 239.65 115.04 238.75 115.14C238.06 115.21 236.49 115.44 235.25 115.64C234.01 115.84 233 116.45 233 117ZM180 122C180.55 122 181 121.33 181 120.5C181 119.67 180.55 119 180 119C179.45 119 179 119.67 179 120.5C179 121.33 179.45 122 180 122ZM279.25 123.45C279.94 123.7 280.85 123.58 281.28 123.2C281.71 122.81 282.04 121.71 282.03 120.75C282.01 119.79 281.64 119 281.2 119C280.76 119 279.86 119.9 279.2 121C278.26 122.57 278.27 123.1 279.25 123.45ZM245.5 125C246.52 125.96 247.16 126.1 247.28 125.37C247.38 124.75 246.79 123.68 245.97 123C245.14 122.32 244.34 122.15 244.19 122.63C244.04 123.11 244.63 124.17 245.5 125ZM202.5 129C203.88 129.55 205.22 130 205.5 130C205.78 130 205.61 129.21 205.13 128.25C204.65 127.29 203.25 126.2 202.01 125.84C200.4 125.38 199.79 125.59 199.88 126.59C199.94 127.37 201.13 128.45 202.5 129ZM139.82 129.47C139.92 129.76 140.56 130.19 141.25 130.42C141.94 130.66 143.25 129.98 144.17 128.92C145.09 127.87 145.54 127.03 145.17 127.06C144.8 127.1 143.41 127.53 142.07 128.03C140.73 128.53 139.72 129.18 139.82 129.47ZM153 139C152.45 139 152.25 139.56 152.56 140.25C152.86 140.94 152.41 142.06 151.56 142.75C150.45 143.63 149.42 143.71 148 143C146.67 142.33 145.83 142.33 145.5 143C145.22 143.55 146.01 144.86 147.25 145.91C148.49 146.96 149.72 147.45 150 146.99C150.28 146.54 151.63 145.89 153 145.54C155.19 144.99 155.5 144.37 155.5 140.54C155.5 138.13 155.15 135.79 154.72 135.33C154.29 134.88 153.96 135.51 153.97 136.75C153.99 137.99 153.55 139 153 139ZM167.25 146.75C165.83 146.91 164.83 147.83 164.55 149.25C164.3 150.49 164.53 151.95 165.05 152.5C165.58 153.05 165.78 154.29 165.5 155.25C165.14 156.53 164.39 156.83 162.75 156.35C160.78 155.78 160.66 155.91 161.75 157.35C162.44 158.26 162.7 159.79 162.34 160.75C161.98 161.71 161.75 162.84 161.84 163.25C161.93 163.66 160.88 164.9 159.5 166C158.13 167.1 157 168.9 157 170C157 171.1 157.45 172.22 158 172.5C158.55 172.78 159.39 174.01 159.86 175.25C160.35 176.54 161.83 177.71 163.34 178C165.21 178.36 165.98 178.07 166.02 177C166.06 176.18 165.51 174.99 164.79 174.38C164.08 173.76 163.16 172.3 162.75 171.13C162.14 169.4 162.77 168.39 166.11 165.75C169.43 163.12 170.12 162.02 169.72 160C169.44 158.6 169.93 156.4 170.84 155C171.73 153.63 172.72 152.28 173.05 152C173.38 151.72 173.95 150.71 174.32 149.75C174.77 148.58 174.17 147.17 172.5 145.5C170.24 143.24 170.15 142.83 171.5 141.25C172.33 140.29 172.67 139.15 172.25 138.72C171.84 138.29 171.02 137.96 170.44 137.97C169.86 137.99 169.41 139.91 169.44 142.25C169.49 145.94 169.2 146.53 167.25 146.75ZM278.5 143C279.32 143 279.77 142.55 279.5 142C279.23 141.45 278.55 141 278 141C277.45 141 277 141.45 277 142C277 142.55 277.68 143 278.5 143ZM203.5 146.5C204.32 146.78 205.45 146.78 206 146.5C206.55 146.22 207 145.55 207 145C207 144.45 206.12 144 205.05 144C203.98 144 202.85 144.45 202.55 145C202.25 145.55 202.68 146.22 203.5 146.5ZM301.86 148.5C302.45 149.05 303.62 149.16 304.46 148.75C305.71 148.14 305.77 147.71 304.75 146.46C304.06 145.61 303.18 144.93 302.8 144.96C302.41 144.98 301.8 145.56 301.44 146.25C301.08 146.94 301.27 147.95 301.86 148.5ZM235 152C236.65 152 238 151.55 238 151C238 150.45 236.99 149.32 235.75 148.49C234.51 147.66 233.16 146.99 232.75 146.99C232.34 147 232 148.13 232 149.5C232 151.61 232.47 152 235 152ZM93.6 152.79C95.15 153.84 95.56 153.84 95.84 152.79C96.03 152.08 95.91 150.94 95.59 150.25C95.27 149.56 94.57 149 94.05 149C93.53 149 92.78 149.56 92.4 150.25C92 150.97 92.51 152.05 93.6 152.79ZM108.76 152.07C108.89 152.58 109.67 153.22 110.5 153.5C111.33 153.78 112.45 154 113 154C113.55 154 113.89 153.37 113.75 152.6C113.61 151.82 113.23 151.02 112.89 150.81C112.56 150.6 111.44 150.59 110.4 150.78C109.36 150.98 108.63 151.56 108.76 152.07ZM185.93 156.07C185.97 156.58 187.24 156.71 188.75 156.36C190.26 156.01 191.72 155.55 192 155.34C192.28 155.12 191.81 154.26 190.96 153.4C189.58 152.01 189.25 152.02 187.64 153.5C186.66 154.4 185.89 155.56 185.93 156.07ZM220.01 161.5C222.38 164.7 222.73 165.76 221.74 166.79C220.75 167.83 220.8 168.08 222 168.06C222.9 168.05 223.8 166.62 224.25 164.52C224.66 162.58 224.75 160.44 224.45 159.75C224.15 159.06 222.26 157.77 220.25 156.88C217.94 155.85 216.68 155.67 216.83 156.38C216.95 156.99 218.39 159.3 220.01 161.5ZM203.36 162C204.65 163.31 204.66 163.95 203.42 167C202.14 170.17 202.17 170.61 203.75 171.64C204.71 172.27 206.11 172.5 206.85 172.14C207.68 171.75 208.02 170.53 207.72 169C207.44 167.63 207.67 165.6 208.21 164.5C208.93 163.05 208.76 161.6 207.6 159.25C206.72 157.46 205.35 156 204.55 156C203.76 156 202.83 157.01 202.49 158.25C202.11 159.63 202.45 161.08 203.36 162ZM238.5 162C239.32 162 240.18 161.66 240.4 161.25C240.63 160.84 239.62 160.44 238.17 160.36C236.71 160.28 235.86 160.61 236.26 161.11C236.67 161.6 237.68 162 238.5 162ZM317.8 187.7C317.92 189.13 318.66 190.01 319.75 190.03C320.71 190.04 321.99 189.03 322.6 187.78C323.2 186.53 323.54 184.94 323.35 184.25C323.16 183.56 322.42 183 321.7 183C320.98 183 319.77 183.54 319 184.2C318.23 184.86 317.69 186.44 317.8 187.7Z" fill="$[hairColor]" stroke="#000" stroke-width="4" /></svg>',
    "messy-short":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="messy_short" d="M60 310L50 310C50 310 50 305 50 300C50 255 50 235 50 235L45 235L55 210L40 215L60 185L45 185L70 160L55 155L85 137.05L70 130L102.5 122.05L90 115L125 110L117.5 97.55L155 100L140 85L180 92.55L175 75L205 90L200 70L225 90L260 80L245 95L275 95L260 105L300 107.55L285 115L320 120L302.5 127.55L340 145L322.5 150L350 170L335 180L360 215L347.5 215L355 235L350 235C350 235 350 255 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 199.7 310 189.7L303.67 200.7C303.67 200.7 299.33 192 299.33 191.7C299.33 191.41 287.67 204.37 287.67 204.37L285 189.7L264 210.37L264.33 192.37L237.67 216.7L241 191.7L210.67 213.7L211 193.37L183.67 221.37L187.5 195L166 213.7L167 198.04L143.67 217.37L147.67 194.04L123 208.37L125 191.7L102 213.37L102.33 191.7L89.67 200.04L90 190C80 200 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    emo: '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="emo.svg"   id="svg366"   version="1.1"   height="600"   width="400"   viewBox="0 0 400 600">  <metadata     id="metadata372">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs370" />  <sodipodi:namedview     inkscape:current-layer="svg366"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="181.80147"     inkscape:cx="262.75748"     inkscape:zoom="3.36"     showgrid="false"     id="namedview368"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <path     sodipodi:nodetypes="ccsssscccssccsc"     stroke-width="4"     stroke="#000000"     fill="$[hairColor]"     d="M 60,310 H 50 V 300 C 50,166.62457 95.380119,105.85732 186.14036,100.40514 190.64829,100.13434 195.26817,100 200,100 c 100,0 150,60 150,200 v 10 h -10 c -5.86524,-19.53506 -9.39694,-26.98445 -15,-45 -2.91667,-4.70238 -25.53571,-47.02381 -35.53571,-57.02381 -10,-10 -53.45239,7.5 -84.10715,19.10714 -10.73269,4.06384 -108.964499,32.47469 -119.95712,32.1897 0,0 -7.085635,5.75527 -10.40002,5.72697 -5,5 -15,20 -15,25 z"     id="Short" /></svg>',
    messy:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="messy" d="M150.74 72.13C150.71 72.56 153.9 74.79 157.93 77.14L165.18 81.37C162.45 83.01 160.01 84.07 157.99 84.79C155.97 85.51 152.55 86.47 150.37 86.92C148.2 87.38 141.86 89.08 136.27 90.7C130.69 92.32 123.08 94.52 119.35 95.59C115.63 96.65 110.43 98.1 107.79 98.8C105.16 99.5 100.08 100.78 96.51 101.64C92.94 102.49 88 103.83 85.51 104.61C83.03 105.38 80.29 106.31 79.42 106.66C78.49 107.04 77.9 107.66 78.01 108.16C78.11 108.63 79.68 109.48 81.57 110.08C83.43 110.68 86.04 111.57 87.37 112.06C88.7 112.55 89.77 113.27 89.76 113.66C89.75 114.04 88.11 115.95 86.1 117.89C84.1 119.83 80.5 122.94 78.1 124.8C75.7 126.66 72.46 129.21 70.89 130.47C69.32 131.74 66.61 134.15 64.89 135.83C63.16 137.52 60.57 140.42 59.14 142.28C57.71 144.14 54.37 149.92 51.71 155.11C49.05 160.31 46.88 164.94 46.88 165.4C46.88 165.87 46.62 166.31 46.3 166.39C45.99 166.47 45.54 167.47 45.32 168.62C44.94 170.54 45.03 170.76 46.46 171.3C47.71 171.78 48.01 172.24 48.01 173.72C48.01 174.73 47.64 179.36 47.19 184.02C46.74 188.67 45.96 195.02 45.47 198.12C44.97 201.22 44.19 206.04 43.74 208.83C43.29 211.63 42.67 217.21 42.37 221.24C42.07 225.27 41.37 231.66 40.82 235.44C39.91 241.78 39.9 242.39 40.74 243.34C41.3 243.97 41.9 246.34 42.29 249.44C42.64 252.23 42.93 257.06 42.93 260.16C42.94 263.26 43.19 268.72 43.5 272.28C43.8 275.85 44.42 280.42 44.87 282.44C45.32 284.45 45.83 287.82 46.01 289.91C46.31 293.62 46.37 293.74 48.29 294.56C49.38 295.03 50.26 295.66 50.26 295.97C50.26 296.28 51.34 297.3 52.66 298.24C54.23 299.37 55.74 299.95 57.03 299.95C58.35 299.95 59.41 299.52 60.22 298.67C60.89 297.96 62.89 294.46 64.67 290.9C66.45 287.33 68.34 283.78 68.87 283C69.4 282.22 70.98 279.43 72.38 276.8C73.78 274.16 75.6 269.84 76.42 267.21C77.24 264.57 78.15 261.02 78.44 259.31C78.73 257.61 79.38 251.13 79.89 244.93C80.39 238.73 81.31 231.11 81.94 228.01C82.56 224.91 83.74 220.35 84.57 217.88C86.06 213.45 86.11 213.39 88.62 212.6C90.01 212.16 94.83 211.64 99.33 211.44L107.51 211.09C108.95 203.25 109.54 201.59 110.33 200.96C111.15 200.31 112.16 200.15 114 200.37C115.39 200.53 118.95 201.27 121.89 202.01C124.84 202.74 129.79 204.54 132.89 206.01C135.99 207.47 139.67 208.8 141.07 208.96C143.55 209.25 143.62 209.22 144.19 207.35C144.66 205.82 145.1 205.41 146.44 205.27C147.37 205.17 149.64 205.65 151.5 206.32C153.36 207 158.19 209.23 162.22 211.28C166.25 213.32 172.09 216.67 175.19 218.72C178.29 220.77 181.72 223.21 182.81 224.14C183.89 225.07 186.43 227.01 188.45 228.45C190.46 229.89 192.56 231.08 193.1 231.09C193.75 231.1 194.09 230.68 194.09 229.84C194.1 229.14 192.83 225.46 191.27 221.66C189.72 217.86 188.61 214.63 188.82 214.47C189.03 214.32 189.79 214.19 190.51 214.19C191.24 214.19 193.73 214.7 196.06 215.32C198.39 215.94 201.62 216.97 203.25 217.61C204.88 218.25 206.85 218.69 207.62 218.6C208.97 218.43 209.04 218.23 209.21 214.19C209.3 211.86 209.69 209.63 210.05 209.23C210.42 208.83 211.87 208.51 213.26 208.52C214.66 208.53 218.46 209.02 221.72 209.6C224.98 210.19 229.55 211.43 231.87 212.36C234.2 213.29 239.02 215.38 242.59 217C246.16 218.63 250.47 220.47 252.18 221.1C253.88 221.72 255.53 222.45 255.84 222.73C256.15 223.01 257.3 223.23 258.38 223.24C260.31 223.24 260.35 223.19 259.99 221.39C259.79 220.38 258.37 217.27 256.84 214.47C255.3 211.68 252.99 207.56 251.7 205.31C250.41 203.06 249.36 201.09 249.36 200.94C249.36 200.78 250.56 200.5 252.04 200.3C253.51 200.11 255.03 199.66 255.41 199.32C255.8 198.97 256.24 196.71 256.4 194.31L256.69 189.94C259.97 189.37 263.84 189.37 267.41 189.57C270.97 189.77 274.62 190.13 275.51 190.36C276.74 190.68 278.09 192.17 281.01 196.43C283.15 199.53 285.34 203.02 285.88 204.19C286.42 205.36 287.18 206.31 287.57 206.31C287.99 206.3 288.27 205.55 288.27 204.46C288.26 203.45 288.6 201.49 289.01 200.09C289.43 198.7 290.89 195.35 292.27 192.66C294.39 188.48 294.91 187.84 295.75 188.28C296.29 188.57 298.89 190.97 301.53 193.61C304.17 196.24 307.43 200.11 308.78 202.21C310.13 204.3 312.41 208.61 313.85 211.79C315.29 214.97 316.97 219.42 317.57 221.66C318.18 223.91 319.05 227.66 319.5 229.98C319.96 232.31 320.75 239.29 321.25 245.49C321.76 251.7 322.41 258.17 322.7 259.88C322.99 261.58 323.9 265.14 324.72 267.77C325.54 270.41 327.36 274.72 328.76 277.36C330.16 280 331.74 282.79 332.27 283.56C332.8 284.34 334.69 287.89 336.47 291.46C338.25 295.03 340.25 298.52 340.92 299.23C341.73 300.09 342.79 300.51 344.11 300.51C345.41 300.52 346.91 299.93 348.48 298.81C349.8 297.87 350.88 296.85 350.88 296.54C350.88 296.23 351.77 295.59 352.85 295.13C354.78 294.3 354.84 294.18 355.14 290.47C355.31 288.38 355.82 285.02 356.27 283C356.72 280.98 357.34 276.42 357.65 272.85C357.95 269.28 358.2 263.82 358.21 260.72C358.21 257.62 358.5 252.8 358.85 250.01C359.24 246.9 359.84 244.53 360.4 243.9C361.24 242.95 361.24 242.34 360.32 236.01C359.77 232.23 359.08 225.84 358.78 221.81C358.47 217.77 357.86 212.19 357.4 209.4C356.95 206.61 356.17 201.78 355.68 198.68C355.18 195.58 354.41 189.23 353.96 184.58C353.51 179.93 353.14 175.3 353.14 174.29C353.14 172.81 353.43 172.34 354.69 171.86C356.11 171.32 356.2 171.11 355.83 169.19C355.6 168.04 355.16 167.03 354.84 166.96C354.52 166.88 354.26 166.43 354.26 165.97C354.26 165.5 352.01 160.74 349.26 155.39C346.51 150.04 342.51 143.16 340.38 140.09C338.24 137.03 334.54 131.7 332.15 128.25C329.76 124.8 326.68 120.07 325.32 117.75C323.95 115.42 322.51 112.63 322.11 111.54C321.48 109.82 321.55 109.09 322.6 105.76C323.26 103.67 323.82 101.26 323.83 100.4C323.85 99.55 323.53 98.57 323.13 98.22C322.73 97.88 320.37 96.82 317.88 95.87C315.4 94.92 311.47 93.27 309.14 92.2C306.82 91.14 304.09 89.6 303.08 88.78L301.25 87.29C303.09 81.51 303.5 78.67 303.5 75.87C303.5 72.07 303.37 71.5 302.52 71.52C301.97 71.53 300.51 72.36 299.27 73.38C298.03 74.4 294.99 76.65 292.5 78.39C290.02 80.14 285.58 82.71 282.63 84.12C279.69 85.53 275.75 87.22 273.89 87.88C272.03 88.55 269.24 89.43 267.69 89.86C265.11 90.56 264.72 90.53 263.18 89.56C262.25 88.97 260.47 87.44 259.23 86.15C257.99 84.87 256.27 83.45 255.42 83.01C254.57 82.57 253.17 82.22 252.32 82.22C251.28 82.23 250.02 82.96 248.51 84.43L246.26 86.62C237.08 82.84 231.3 80.83 227.5 79.72C222.71 78.32 219.47 77.7 216.93 77.7C214.38 77.7 213.26 77.92 213.25 78.41C213.25 78.79 214.28 80.13 215.55 81.37C216.82 82.61 218.06 84 218.31 84.47C218.66 85.13 217.95 85.03 215.02 84C212.97 83.28 206.34 81.45 200.29 79.94C194.24 78.43 185.23 76.55 180.27 75.77C175.3 74.98 169.72 74.05 167.86 73.69C166 73.33 162.7 72.82 160.53 72.55C158.36 72.28 155.28 71.9 153.69 71.71C151.47 71.44 150.79 71.53 150.74 72.13Z" fill="$[hairColor]" stroke="#000" stroke-width="4" /></svg>',
    "faux-hawk":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="faux-hawk" d="M185.17 46.93C183.87 47.9 182.3 49.29 181.68 50.01C181.06 50.75 179.19 52.25 177.51 53.34C175.82 54.44 173.74 56.52 172.87 57.96C172.01 59.39 170.27 61.17 168.99 61.93C167.71 62.69 164.67 64.81 162.22 66.62C159.74 68.42 156.87 71.05 155.86 72.49C154.84 73.91 153 75.82 151.75 76.74C150.51 77.64 148.97 78.26 148.35 78.12C147.73 77.97 145.88 78.83 144.23 80.01C142.58 81.19 140.48 82.54 139.57 83.01C138.67 83.48 136.81 84.88 135.42 86.11C134.03 87.33 132.6 88.38 132.25 88.45C131.91 88.52 130.53 89.59 129.19 90.82C127.85 92.03 126.6 93.05 126.43 93.08C126.25 93.11 124.51 94.43 122.55 95.99C120.59 97.54 118.09 99.76 117.01 100.93C115.93 102.09 114.58 103.96 114.03 105.08C113.07 106.98 112.81 107.12 109.49 107.49C106.51 107.87 105.48 108.31 103.01 110.25C101.03 111.8 99.78 113.28 99.17 114.8C98.68 116.03 97.19 119.08 95.86 121.57C93.8 125.46 92.54 126.93 86.66 132.4C82.95 135.83 78.41 140 76.56 141.67C74.15 143.84 72.87 145.51 72.01 147.6C71.36 149.2 70.15 152.37 69.33 154.65C68.51 156.93 67.74 159.21 67.6 159.73C67.47 160.25 65.99 161.95 64.33 163.51C61.91 165.83 61.31 166.77 60.95 168.79C60.72 170.14 60.52 171.65 60.5 172.15C60.49 172.64 59.6 173.97 58.55 175.1C57.5 176.23 56.4 177.73 56.09 178.43C55.79 179.12 55.06 182.04 54.5 184.89C53.95 187.76 53.45 191.31 53.36 192.8C53.23 195.08 52.76 196.27 50.44 200.28C49 202.89 47.68 205.97 47.46 207.13C47.24 208.31 47.26 210.7 47.51 212.49C47.91 215.45 47.85 215.96 46.93 218.34C46.39 219.77 45.94 221.94 45.92 223.18C45.9 224.4 46.12 226.21 46.4 227.18C46.85 228.74 46.79 229.24 45.86 231.68C45.3 233.17 44.84 235.14 44.84 236.04C44.83 236.95 45.01 238.42 45.24 239.31C45.47 240.2 45.92 241.33 46.25 241.82C46.63 242.4 46.88 244.45 46.97 247.79C47.05 250.67 46.89 254.05 46.6 255.58C46.24 257.45 46.21 258.64 46.5 259.47C46.74 260.13 46.76 261.07 46.57 261.57C46.37 262.07 46.08 264.28 45.91 266.5C45.72 269.03 45.79 271.05 46.09 271.89C46.37 272.67 46.54 276.03 46.48 279.83C46.4 284.87 46.57 287.09 47.25 289.4C47.76 291.06 48.33 293.76 48.51 295.41C48.7 297.05 49.26 298.89 49.75 299.49C50.26 300.09 51.24 300.6 51.92 300.62C52.61 300.62 54.28 299.86 55.62 298.9C56.96 297.95 58.32 297.17 58.64 297.18C58.97 297.18 59.81 296.53 60.52 295.71C61.22 294.9 61.75 293.74 61.69 293.16C61.63 292.57 62.52 290.88 63.65 289.39C64.79 287.89 65.81 286.19 65.92 285.6C66.03 285.01 66.43 284.53 66.82 284.55C67.21 284.56 68.52 283.18 69.72 281.49C70.94 279.78 72.01 277.61 72.1 276.68C72.19 275.75 72.59 274.86 72.99 274.7C73.39 274.55 74.14 273.91 74.67 273.29C75.24 272.61 75.68 270.73 75.78 268.6C75.88 266.64 76.43 263.93 76.99 262.55C77.55 261.18 77.89 259.71 77.74 259.28C77.6 258.86 78.28 257.32 79.29 255.84C80.79 253.68 81.09 252.78 80.76 251.31C80.54 250.29 80.39 249.05 80.4 248.54C80.42 248.03 80.6 246.63 80.8 245.44C81 244.24 81.39 242 81.65 240.47C81.94 238.87 82.85 236.9 83.74 235.9C84.65 234.88 85.39 233.33 85.45 232.27C85.52 231.25 85.21 229.38 84.77 228.14C84.33 226.88 84.01 225.5 84.05 225.08C84.09 224.65 84.92 223.43 85.89 222.36C87.2 220.95 87.74 219.72 87.92 217.79C88.07 216.15 88.6 214.77 89.31 214.16C89.95 213.62 90.54 212.4 90.64 211.46C90.74 210.52 90.59 209.27 90.31 208.69C89.98 207.96 90.31 206.64 91.39 204.44C92.26 202.7 94.13 200.02 95.54 198.49C97.79 196.08 98.38 195.77 99.96 196.04C100.97 196.22 101.95 196.45 102.12 196.54C102.3 196.63 103.42 196.39 104.63 196C105.84 195.62 107.49 195.14 108.29 194.96C109.1 194.78 110.93 194.27 112.37 193.84C113.82 193.4 115.87 192.67 116.93 192.21C118.59 191.48 119.21 191.53 121.24 192.56C122.72 193.31 124.35 193.62 125.53 193.37C126.58 193.16 129.57 193.33 132.18 193.77C136.41 194.45 137.37 194.91 140.07 197.51C142.29 199.61 144.11 200.63 146.43 201.05C148.79 201.49 150.32 201.47 151.94 200.96C153.17 200.57 155.23 199.58 156.51 198.76C158.21 197.66 159.18 197.4 160.16 197.79C160.9 198.09 162.92 198.49 164.65 198.7C166.4 198.9 168.18 199.23 168.59 199.45C169.02 199.67 170.99 200.01 172.97 200.23C174.95 200.45 177.84 200.87 179.38 201.18C181.38 201.58 183.13 201.51 185.48 200.93C187.28 200.49 190.04 199.98 191.62 199.78C193.83 199.51 194.81 199.71 196.05 200.66C196.93 201.32 199.11 202.03 200.9 202.23C203.12 202.47 205.01 202.28 206.81 201.64C208.26 201.12 210.08 199.91 210.85 198.95C211.75 197.84 212.9 197.22 214.05 197.23C215.05 197.23 215.99 197.43 216.17 197.68C216.35 197.92 217.7 198.29 219.2 198.5C220.91 198.73 223.43 198.49 226.05 197.85C228.32 197.29 230.61 196.84 231.16 196.86C231.69 196.87 233.33 196 234.77 194.93C237.03 193.23 237.63 193.05 239.35 193.59C240.44 193.93 242.2 194.16 243.26 194.11C244.31 194.05 247.05 194.74 249.34 195.62C251.63 196.52 254.35 197.26 255.4 197.29C256.45 197.31 258.03 197.05 258.93 196.71C259.83 196.38 261.57 195.39 262.8 194.53C264.05 193.65 265.46 193.13 265.99 193.36C266.53 193.59 269.61 193.92 272.83 194.08C277.43 194.34 279.04 194.21 280.61 193.43C282.28 192.59 282.87 192.55 284.44 193.2C285.47 193.61 287.44 194.28 288.83 194.67C290.2 195.07 291.97 195.51 292.74 195.68C293.51 195.85 295.09 196.27 296.25 196.61C297.4 196.96 298.49 197.17 298.66 197.09C298.83 197 299.77 196.79 300.75 196.62C302.28 196.34 302.83 196.63 304.96 198.81C306.29 200.19 308.03 202.63 308.83 204.24C309.82 206.25 310.11 207.45 309.76 208.13C309.48 208.66 309.3 209.81 309.37 210.67C309.44 211.53 309.98 212.65 310.58 213.14C311.26 213.71 311.73 214.97 311.83 216.48C311.94 218.27 312.42 219.41 313.65 220.72C314.57 221.72 315.34 222.86 315.37 223.26C315.39 223.66 315.04 224.94 314.56 226.1C314.08 227.26 313.7 229 313.73 229.96C313.75 230.97 314.42 232.44 315.28 233.41C316.13 234.38 316.95 236.27 317.17 237.78C317.38 239.27 317.67 241.43 317.83 242.6C317.98 243.75 318.1 245.12 318.09 245.62C318.09 246.11 317.87 247.33 317.61 248.32C317.22 249.76 317.48 250.66 318.89 252.84C319.86 254.34 320.5 255.91 320.32 256.33C320.15 256.75 320.43 258.25 320.95 259.66C321.47 261.07 321.89 263.88 321.9 265.9C321.9 268.12 322.27 270.09 322.84 270.82C323.36 271.49 324.12 272.17 324.53 272.35C324.94 272.52 325.33 273.48 325.37 274.47C325.42 275.45 326.45 277.79 327.67 279.64C328.89 281.5 330.24 283.01 330.65 283C331.08 282.99 331.5 283.51 331.59 284.14C331.68 284.78 332.72 286.63 333.9 288.27C335.09 289.88 336.01 291.72 335.92 292.35C335.83 292.98 336.39 294.22 337.16 295.1C337.94 295.97 338.87 296.67 339.22 296.65C339.57 296.63 341.07 297.43 342.56 298.41C344.07 299.36 345.97 300.09 346.76 300.04C347.56 299.99 348.7 299.42 349.29 298.78C349.86 298.15 350.53 296.26 350.75 294.58C350.97 292.92 351.64 290.2 352.22 288.56C352.99 286.28 353.19 284.08 353.08 279.07C353.01 275.3 353.19 271.97 353.5 271.24C353.83 270.44 353.89 268.44 353.67 265.92C353.47 263.69 353.15 261.44 352.92 260.92C352.71 260.39 352.73 259.47 352.99 258.85C353.3 258.07 353.27 256.87 352.88 254.95C352.56 253.38 352.37 249.99 352.45 247.12C352.53 243.79 352.79 241.76 353.2 241.23C353.55 240.79 354.03 239.7 354.26 238.82C354.49 237.94 354.67 236.35 354.64 235.26C354.62 234.17 354.12 232.12 353.52 230.72C352.51 228.37 352.46 228 352.98 226.25C353.29 225.21 353.51 223.38 353.48 222.21C353.45 221.03 352.96 218.85 352.39 217.37C351.43 214.93 351.38 214.4 351.78 211.37C352.01 209.51 352.02 207.04 351.78 205.83C351.55 204.64 350.21 201.53 348.75 198.95C346.43 195 345.96 193.82 345.81 191.48C345.7 189.95 345.16 186.32 344.59 183.4C344 180.47 343.24 177.51 342.93 176.82C342.62 176.13 341.53 174.72 340.51 173.69C339.47 172.66 338.6 171.38 338.57 170.86C338.55 170.34 338.32 168.76 338.06 167.35C337.66 165.15 337.09 164.35 334.17 161.77C332.24 160.09 330.56 158.28 330.46 157.75C330.35 157.2 329.76 156.1 329.12 155.29C328.48 154.48 327.45 152.32 326.79 150.49C326.01 148.25 324.88 146.43 323.44 145.09C322.22 143.93 320.81 141.84 320.2 140.27C319.62 138.73 318.33 136.74 317.37 135.85C316.41 134.96 314.71 133.82 313.6 133.33C312.49 132.82 311.2 131.62 310.71 130.65C310.23 129.67 308.85 128.08 307.65 127.11C306.44 126.12 304.67 125.31 303.71 125.32C302.76 125.31 301.54 124.86 301.02 124.31C300.49 123.76 299.58 122.26 298.99 120.98C298.41 119.69 296.27 116.99 294.25 114.95C292.22 112.89 288.91 109.33 286.88 107.04C284.85 104.72 282.58 102.54 281.85 102.23C281.1 101.92 278.99 99.88 277.14 97.65C274.91 94.91 272.34 92.64 269.37 90.79C266.96 89.27 263.87 87.59 262.5 87.08C261.12 86.57 258.86 85.62 257.48 84.96C256.1 84.31 254.14 82.62 253.12 81.19C252.11 79.75 250.96 78.54 250.57 78.51C250.17 78.48 248.74 76.48 247.39 74.03C246.05 71.56 244.2 68.81 243.26 67.95C242.32 67.08 239.94 66.32 237.92 66.26C234.32 66.19 234.22 66.12 231.25 61.07C228.88 56.87 227.99 55.88 226.63 56.06C225.29 56.24 224.49 55.35 222.58 51.46C220.66 47.39 219.94 46.56 218.25 46.56C216.85 46.58 215.81 47.48 214.88 49.43C213.53 52.18 213.51 52.19 212.8 49.9C212.4 48.63 210.82 46.43 209.28 45.04L206.52 42.53L201.7 48.09C197.38 44.42 196.32 44.26 194.06 45.25C192.48 45.93 190.37 46.19 189.36 45.81C188.13 45.38 186.75 45.74 185.17 46.93Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    hair: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="hair-01" d="M185 76.42C182.52 77.13 179.37 78.16 178 78.72C176.62 79.28 174.15 80.85 172.5 82.2C170.85 83.56 166.8 86.54 163.5 88.84C160.2 91.14 155.25 94.61 152.5 96.55C148.99 99.03 146.46 100.06 144 100.02C142.07 99.99 138.7 100.59 136.5 101.36C134.3 102.14 127.55 103.54 121.5 104.48C115.45 105.43 107.57 106.87 104 107.69C100.42 108.51 95.47 110.21 93 111.47C90.5 112.74 86.82 115.92 84.7 118.63C82.31 121.7 80.16 126.09 78.89 130.5C77.79 134.35 75.56 141.55 73.94 146.5C72.32 151.45 70.09 160.22 68.99 166C67.7 172.71 66.12 177.76 64.62 180C63.33 181.92 58.37 188 53.61 193.5C47.65 200.37 43.65 206.16 40.8 212C37.78 218.22 36.55 222.11 36.23 226.5C35.93 230.71 36.58 235.94 38.43 244C40.61 253.54 40.88 256.27 40.05 260C39.5 262.47 38.14 266.86 37.03 269.75C35.91 272.64 34.72 277.36 34.38 280.25C34.05 283.14 34.26 287.97 34.87 291C35.62 294.73 37.18 298.04 39.74 301.29C41.81 303.92 43.95 306.24 44.5 306.44C45.05 306.64 47.97 305.98 51 304.97C54.02 303.96 57.42 302.09 58.55 300.82C59.67 299.54 61.63 295.8 62.89 292.5C64.15 289.2 65.82 283.57 66.6 280C67.48 275.96 69.05 272.23 70.76 270.16C72.27 268.32 74.26 265.62 75.18 264.16C76.27 262.45 77.98 253.82 79.97 240C81.68 228.17 83.53 216.7 84.09 214.5C84.64 212.3 85.51 209.37 86.02 208C86.53 206.62 89.55 203.22 92.72 200.44C95.9 197.66 102.55 192.64 107.5 189.29C114.41 184.61 117.66 183.05 121.5 182.54C124.69 182.12 129.21 182.45 134 183.45C138.12 184.32 147.57 187.26 155 189.98C162.42 192.71 172.77 195.88 178 197.04C183.22 198.2 188.4 199.31 189.5 199.51C190.6 199.71 193.64 201.7 196.25 203.94C200.07 207.21 201.33 209.12 202.68 213.75C203.61 216.91 205.18 220.29 206.18 221.25C207.18 222.21 208.79 223.01 209.75 223.02C210.71 223.02 215.55 221.05 220.5 218.62C225.45 216.2 233.11 212.03 237.52 209.36C241.93 206.69 249.81 201.27 255.02 197.32C261.12 192.69 265.12 188.86 266.25 186.57C267.57 183.87 268.79 182.86 271.25 182.42C273.04 182.1 277.2 182.33 280.5 182.92C283.8 183.51 289.42 185.44 293 187.21C297.02 189.19 302.02 192.91 306.11 196.96C311.48 202.27 313.03 204.53 314.33 209C315.21 212.02 316.61 218.1 317.45 222.5C318.29 226.9 319.9 237.47 321.04 246C322.35 255.87 323.75 262.59 324.88 264.5C325.86 266.15 326.96 270.54 327.33 274.25C327.7 277.96 329.36 284.71 331.03 289.25C332.69 293.79 335.14 299.07 336.46 301C337.78 302.92 340.44 305.4 342.38 306.5C345.46 308.25 346.37 308.35 349.7 307.3C352.75 306.34 354.34 304.8 357.75 299.55C360.09 295.95 362.45 290.97 363 288.5C363.55 286.02 364.67 282.65 365.5 281C366.47 279.06 367 275.09 367 269.75C366.99 262.28 366.66 260.86 363.5 254.75C361.06 250.04 360.01 246.71 360.04 243.75C360.07 241.41 360.74 237.7 361.53 235.5C362.32 233.3 362.98 228.57 363 225C363.02 221.42 363.68 215.8 364.48 212.5C365.28 209.2 365.95 204.92 365.98 203C366.02 200.33 365.26 198.74 362.77 196.29C360.97 194.53 355.68 190.48 351.01 187.29C344.27 182.69 341.45 179.96 337.3 174C334.42 169.87 331.41 164.7 330.61 162.5C329.8 160.3 328.91 157.37 328.63 156C328.35 154.62 325.23 149.22 321.7 144C318.17 138.77 313.06 130 310.34 124.5C307.62 119 304.17 112.7 302.67 110.5C301.16 108.3 297.81 104.76 295.22 102.62C292.62 100.49 288.56 97.79 286.2 96.62C282.17 94.64 281.42 94.58 274.45 95.75C267.58 96.9 266.63 96.84 262.25 94.98C259.64 93.86 255.92 92.96 254 92.97C252.07 92.98 248.7 92.5 246.5 91.91C244.3 91.31 238.67 89.11 234 87.01C229.32 84.92 221.9 82.05 217.5 80.63C213.1 79.21 206.24 77.36 202.25 76.52C198.26 75.69 193.76 75.03 192.25 75.07C190.74 75.1 187.47 75.71 185 76.42Z" fill="$[hairColor]" stroke="#000" stroke-width="5"/></svg>',
    high: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="High" d="M60 310L50 310C50 310 50 305 50 300C50 110 40 90 60 90C90 90 200 90 200 90C200 90 310 90 340 90C360 90 350 110 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C300 190 250 200 200 200C150 200 100 190 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    juice:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Hair">\t\t<path id="juice" d="M60 310L50 310C50 310 49.81 305 50 300C60 40 -10 145 200 80C234.77 69.24 243.79 58.79 265 80C270 85 270 125 270 125C270 125 273.04 98.74 280 100C390 120 340 80 350 300C350.23 304.99 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 200 310 190C300 180 250 200 200 200C150 200 100 180 90 190C80 200 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/>\t</g></svg>',
    parted:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Hair">\t\t<path id="parted" d="M61.7 299.46L50.91 298.23C50.91 298.23 40.36 290.76 40.92 276.9C41.12 270.28 41.47 263.65 41.95 257.08C42.43 250.33 43.05 243.73 43.82 237.32C44.59 230.82 45.53 224.57 46.61 218.58C47.73 212.54 49 206.78 50.42 201.3C53.37 190.2 56.92 180.16 60.97 171.06C65.11 161.67 69.69 153.11 74.61 145.33C79.54 137.17 84.78 129.81 90.27 123.27C95.74 116.45 101.48 110.59 107.46 105.77C113.45 100.86 119.75 97.15 126.31 94.71C132.93 92.34 139.88 91.34 147.08 91.72L150.66 102.57C150.66 102.57 149.91 89.02 156.54 83.57C166.29 81.85 176.02 80.98 185.63 80.89C195.33 80.98 204.87 81.8 214.13 83.26C223.42 84.8 232.4 86.88 240.94 89.4C249.47 91.91 257.53 94.79 265.02 97.95C272.47 101.02 279.34 104.34 285.52 107.85C291.67 111.25 297.14 114.85 301.84 118.63C311.16 125.87 317.46 134.01 320 143.2C329.94 151.78 337.34 156.21 342.88 160.07C348.39 163.81 352.06 167.14 354.54 173.31C357.01 179.45 358.3 188.56 358.98 204C359.31 211.78 359.47 221.19 359.53 232.61C359.55 238.33 359.54 244.55 359.51 251.31C359.47 258.05 359.41 265.31 359.34 273.12C359.12 290.75 349.12 300.39 349.12 300.39L339.29 301.3C339.29 301.3 339.35 289.25 339.37 285.13C339.4 280.96 329.46 270.1 324.43 266.79C321.91 265.13 320.68 253.51 318.85 241.12C317.03 228.41 314.61 214.94 309.55 211.15C307.02 209.22 301.26 209 293.39 209.83C285.48 210.59 275.44 212.35 264.37 214.46C253.28 216.44 241.2 218.71 229.28 220.64C217.37 222.39 205.66 223.8 195.3 224.33C179.83 224.83 170.45 219.95 164.62 213.58C158.85 207.02 156.59 198.98 155.26 193.51C155.07 198.97 142.38 204.06 128.6 208.67C115.04 212.75 100.55 216.13 95.71 220.31C90.91 224.32 86.07 237.18 82.09 248.82C78.38 259.78 75.48 269.74 73.26 271.22C68.82 274.14 60.06 283.35 60.33 286.76C60.62 290.07 61.7 299.46 61.7 299.46Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/>\t</g></svg>',
    shaggy1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.shaggyLines { fill: none;stroke: #000000;stroke-width: 5 } \t</style>\t<path id="shaggy" class="shaggy" d="M37.17 332.53C43.83 321.86 47.5 296.2 47.5 296.2C47.5 296.2 35.83 303.33 24.83 305.86C34.83 292.53 47.75 253.8 47.75 253.8C47.75 253.8 37.5 261.86 26.83 261.53C57.17 211.86 37.58 177.27 92.17 138.53C92.17 138.53 79.08 136.27 66.5 128.2C104.38 125.8 131.25 81.3 195.75 89.8C195.75 89.8 190.25 79.3 168.75 68.3C238.25 67.3 255.25 104.8 255.25 104.8C255.25 104.8 271.75 97.3 280.25 118.8C344.75 128.3 338.75 215.8 363.25 258.8C354.37 257.4 346.75 251.3 346.75 251.3C346.75 251.3 350.62 278.4 366.12 301.9C356.62 299.15 344.83 291.86 344.83 291.86C344.83 291.86 353.12 314.15 356.38 320.65C344.12 315.9 333.75 300 333.75 300C333.75 300 328.17 324.86 311.75 341.8C321.5 315.86 320.25 283.8 320.25 283.8L305.25 252.8L310 200C270 160 239.75 198.3 177.75 197.3C96.22 195.98 77.75 283.8 77.75 283.8C77.75 283.8 77.83 305.53 85.5 340.53C68.5 328.86 61.17 292.2 61.17 297.2C61.17 302.2 48.5 328.2 37.17 332.53Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/>\t<path id="shaggyLines" class="shaggyLines" d="M114 190C114 190 146.25 185.2 190 135M147 178C147 178 203.75 180.7 250 142M140 139C140 139 178.75 84.7 233 105" /></svg>',
    "short-fade":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<defs>\t\t<linearGradient id="shortfade" gradientUnits="userSpaceOnUse"  x1="200" y1="100" x2="200" y2="310">\t\t\t<stop offset="0" stop-color="rgba(0,0,0,.25)"  />\t\t\t<stop offset="1" stop-color="rgba(0,0,0,0)"  />\t\t</linearGradient>\t</defs>\t<style>\t\ttspan { white-space:pre }\t\t.short_fade { fill: url(#shortfade);stroke: none} \t</style>\t<g id="short fade">\t\t<path id="Short Fade" class="short_fade" d="M60 310L50 310C50 310 50 305 50 300C50 160 100 100 200 100C300 100 350 160 350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 210 310 200C270 160 250 200 200 200C150 200 130 160 90 200C80 210 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" />\t</g></svg>',
    "middle-part":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="Hair">\t\t<path id="middle_part" d="M60.7 303.6L50.52 306.33C50.52 306.33 40.18 299.58 40.05 280.08C38.93 269.01 38.32 258.62 38.08 249C37.88 239.41 38.05 230.66 38.5 222.69C39.01 214.77 39.81 207.61 40.86 201.13C41.97 194.65 43.31 188.82 44.82 183.57C48 172.99 51.73 164.66 55.36 158.29C59.07 151.81 62.56 147.35 65.25 144.71C70.63 139.34 78.38 133.58 87.42 126.28C96.36 118.88 106.49 110.1 116.71 99.11C127.39 88.13 139.22 82.49 149.56 79.56C159.94 76.92 168.81 76.65 173.41 76.44C182.61 76.17 199.02 93.13 199.02 93.13C199.02 93.13 219.64 76.8 228.95 77.4C233.62 77.77 242.72 78.38 252.82 81.26C262.99 84.39 274.36 90.08 283.84 100.66C293.43 111.33 303.57 120.04 312.76 127.43C322.19 134.78 330.39 140.63 336.01 146.01C338.82 148.66 342.43 153.21 346.15 159.76C349.81 166.2 353.49 174.58 356.48 185.1C357.89 190.33 359.12 196.12 360.09 202.53C361.01 208.94 361.68 216.02 362.04 223.82C362.38 231.67 362.43 240.28 362.16 249.7C361.86 259.16 361.22 269.34 360.1 280.17C359.88 299.59 349.41 306.39 349.41 306.39L339.18 303.74C339.18 303.74 340.9 292.51 341.35 288.56C341.73 284.52 333.32 272.35 328.87 268.51C326.6 266.61 323.21 255.15 318.59 242.44C313.36 228.83 306.9 213.68 301.3 208.65C295.64 203.42 281.51 201.24 268.76 200.25C256 199.13 244.66 199.39 244.66 199.39C244.66 199.39 237.37 190.29 235.86 188.75C235.1 187.98 235.76 189.14 239.52 194.3C243.3 199.38 250.21 208.18 261.88 222.1C251.55 222.53 235.5 217.37 222.1 211.79C208.86 205.93 198.35 199.86 198.35 199.86C198.35 199.86 188.4 205.92 175.75 211.72C162.98 217.19 147.55 222.2 137.3 221.7C147.64 208.01 153.74 199.35 157.07 194.34C160.39 189.25 160.97 188.09 160.28 188.86C158.89 190.38 152.39 199.38 152.39 199.38C152.39 199.38 141.25 199.1 128.87 200.17C116.53 201.08 102.95 203.14 97.72 208.25C92.53 213.18 86.91 228.09 82.27 241.53C77.99 254.16 74.67 265.63 72.35 267.56C67.75 271.49 58.91 283.94 59.19 288.04C59.51 292.07 60.7 303.6 60.7 303.6Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/>\t</g></svg>',
    spike4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="spike-straight-02" d="M60.24 310L50.26 310C50.26 310 50.19 305.34 50.11 300.75C49.98 293.42 49.76 286.04 49.48 278.75C49.21 271.62 48.87 264.59 48.51 257.78C48.15 251.12 47.76 244.67 47.36 238.57C46.96 232.58 46.54 226.92 46.13 221.7C45.31 211.56 44.49 203.1 43.85 197.1C43.19 191.3 42.74 187.7 42.71 186.91C42.43 180.72 47.31 170.48 47.31 170.48L57.65 169.41L64.42 150.36L78.92 147.33L85.79 128.5L101.03 126.26L108.62 109.07L123.27 108.19L134.38 92.42L145 94.35L155.35 84.07L165.25 87.6L176.59 79.55L184.52 85.07L194.71 78.14L203.48 84.27L212.57 78.14L222.33 85.06L230.46 79.55L241.25 87.57L251.12 84.04L260.78 94.24L271.2 92.29L281.55 109.61L290.43 105.99L302.18 125.54L313.7 125.47L322.8 146.01L336.63 148.62L342.68 167.37L352.57 168.05C352.57 168.05 357.08 178.1 356.75 184.35C356.71 185.15 356.25 188.8 355.58 194.7C354.94 200.83 354.13 209.49 353.32 219.9C352.92 225.26 352.53 231.09 352.15 237.26C351.78 243.54 351.42 250.18 351.1 257.03C350.78 264.01 350.49 271.21 350.26 278.48C350.03 285.88 349.87 293.35 349.78 300.73C349.73 305.34 349.68 310 349.68 310L339.7 310C339.7 310 339.95 297.4 340.04 293.14C340.15 288.87 330.71 277.69 325.97 274.15C323.6 272.33 322.89 259.92 321.59 246.33C320.24 232.06 318.22 216.47 313.48 210.48C303.84 197.52 295.27 189.76 287.06 185.65C278.79 181.53 270.94 181.66 262.67 183.69C254.32 186.06 245.54 190.51 235.47 194.33C225.34 198.48 213.94 201.93 200.47 201.85C187.26 202.01 176.11 198.63 166.17 194.54C156.27 190.78 147.59 186.39 139.22 184.09C130.88 182.15 122.85 182.13 114.23 186.37C105.68 190.61 96.67 198.49 86.55 211.53C81.63 217.54 79.32 232.96 77.81 247.02C76.46 260.39 75.78 272.61 73.45 274.42C68.77 277.92 59.55 288.97 59.7 293.2C59.84 297.43 60.24 310 60.24 310Z" fill="$[hairColor]" stroke="#000" stroke-width="5"/></svg>',
    "tall-fade":
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   viewBox="0 0 400 600"   width="400"   height="600"   version="1.1"   id="svg41"   sodipodi:docname="tall-fade.svg"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)">  <metadata     id="metadata47">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs45">    <linearGradient       y2="310"       x2="200"       y1="100"       x1="200"       gradientUnits="userSpaceOnUse"       id="shortfade">      <stop         id="stop118"         stop-color="rgba(0,0,0,.25)"         offset="0" />      <stop         id="stop120"         stop-color="rgba(0,0,0,0)"         offset="1" />    </linearGradient>  </defs>  <sodipodi:namedview     inkscape:document-rotation="0"     pagecolor="#ffffff"     bordercolor="#666666"     borderopacity="1"     objecttolerance="10"     gridtolerance="10"     guidetolerance="10"     inkscape:pageopacity="0"     inkscape:pageshadow="2"     inkscape:window-width="2560"     inkscape:window-height="1417"     id="namedview43"     showgrid="false"     inkscape:zoom="9.5035152"     inkscape:cx="306.48272"     inkscape:cy="192.21249"     inkscape:window-x="1912"     inkscape:window-y="-8"     inkscape:window-maximized="1"     inkscape:current-layer="layer2" />  <g     inkscape:groupmode="layer"     id="layer1"     inkscape:label="Layer 1"     style="display:inline">    <path       style="display:inline;opacity:1;fill:url(#shortfade);stroke:none;stroke-width:1;stroke-miterlimit:4;stroke-dasharray:none"       sodipodi:nodetypes="ccsssccsssssssc"       d="M 60,310 H 50 v -10 c 0,-140 50,-200 150,-200 100,0 150,60 150,200 v 10 h -10 v -20 c 0,-5 -10,-20 -15,-25 -5,-5 -5,-55 -15,-65 C 270,160 253.57143,161.90476 203.57143,161.90476 153.57143,161.90476 130,160 90,200 c -10,10 -10,60 -15,65 -5,5 -15,20 -15,25 z"       class="short_fade"       id="Short Fade" />  </g>  <g     inkscape:groupmode="layer"     id="layer2"     inkscape:label="Layer 2">    <path       id="short-01"       d="m 176.95813,80.329259 c -1.66624,0.356728 -3.65591,0.695091 -4.42041,1.006086 -0.76453,0.320141 -2.05479,0.283343 -4.15231,0.685804 -2.09748,0.402464 -4.8171,-0.357289 -5.76782,0.356172 -0.96055,0.722606 -4.67301,-1.60177 -5.58048,1.43591 -1.51923,0.30185 -5.91893,-1.098403 -8.74172,-0.275183 -2.81301,0.83237 -5.96905,2.176977 -6.97859,2.972727 -1.02916,0.81409 -2.96002,1.85684 -4.30281,2.33247 -1.3526,0.46649 -3.07763,0.71346 -3.84215,0.53967 -0.7547,-0.1738 -3.00385,-1.701956 -4.73869,-1.089096 -1.73484,0.62198 -3.7297,3.202036 -4.69023,3.430696 -0.96055,0.21952 -3.2731,-1.107474 -4.6355,-0.394014 -1.3624,0.72261 -2.39743,3.271281 -2.74495,3.430779 -2.98944,1.37204 -1.80043,0.57867 -2.98944,1.37204 -1.27634,0.755543 -2.65616,1.381163 -2.65616,1.381163 -0.0505,-0.26379 -4.43046,-2.651862 -4.96763,0.475231 -2.8554,0.45895 -4.32063,1.567665 -4.01506,2.972656 -0.94094,0.79579 -2.851073,-1.446399 -2.802636,2.54269 -2.751375,1.23477 -1.102374,2.36017 -4.572062,2.23212 -3.087438,-0.1189 -4.077377,-0.32028 -5.010199,3.49482 -1.754446,1.03359 -4.016879,2.31422 -4.340324,3.53076 -0.264637,0.98786 -0.564423,3.21049 -1.436747,5.19536 -5.571364,1.42636 -2.371937,6.33949 -7.360842,10.36411 -3.156047,2.56112 -1.890481,5.49687 -3.488107,6.74085 -2.087694,1.63729 -3.748185,11.39981 -4.287261,13.18346 -0.421459,1.37202 -0.965718,8.11463 -1.896288,12.83533 -2.044859,9.63261 -1.917783,6.55735 -2.955847,12.80557 -0.413957,6.97668 -1.539701,6.94228 -2.291264,14.79071 -1.650099,9.9307 -4.069658,25.69148 -4.153683,27.3047 13.069175,-1.57481 15.468087,-0.45656 24.76716,-0.59778 2.687664,-7.23926 12.988277,-17.01721 31.38775,-17.38593 26.67623,-0.17645 68.99479,0.36422 90.95949,0.39062 24.42608,-0.18001 49.48134,0.89381 73.73348,1.77799 17.40157,0.59062 34.28831,6.4772 39.77486,16.26489 11.66906,-1.34021 14.10561,0.88982 24.67593,0.23251 -0.98508,-8.53574 -3.08677,-26.77275 -4.30522,-32.29486 -1.12964,-4.08473 -0.63524,-7.33364 -2.47622,-10.75855 -1.32825,-6.78459 -1.60778,-7.97983 -2.86775,-15.26862 -2.67802,-8.71803 -1.72361,-10.96868 -2.99369,-12.87439 -0.2332,-2.26437 -0.1069,-4.02284 -0.45978,-5.54123 -0.41166,-1.83852 0.20877,-3.33861 -1.0556,-4.44538 -1.07816,-0.94213 -1.31162,-1.85516 -1.61547,-3.10831 -0.30384,-1.22567 -0.20358,-2.20316 -1.02695,-2.89832 -0.83313,-0.69516 -0.94348,-4.64903 -2.03145,-5.02404 -1.06832,-0.38417 -1.22887,-1.81584 -1.52291,-2.55673 0.24187,-1.25788 -1.46632,-2.25943 -2.03925,-2.94997 -0.7832,-0.944 -2.67506,-1.54555 -4.29761,-1.88855 -0.29616,-1.69993 -1.16177,-2.39694 -2.55007,-3.61369 -0.33323,-0.92383 -3.58766,-2.05324 -5.30289,-3.42527 -1.72504,-1.37203 -1.59177,-4.73844 -5.19124,-4.94839 -1.70546,-1.46351 -5.5511,-2.97273 -5.5511,-2.97273 0,0 -1.22223,-4.135313 -4.70407,-4.198921 -1.93088,-1.60985 -3.95053,-3.521764 -7.02816,-4.518778 -2.50917,-0.79577 -6.0325,-0.19158 -7.57129,-0.43855 -1.52903,-0.24697 -2.36439,-4.291072 -6.43838,-2.296289 -1.52903,-0.32928 -4.15635,-0.07254 -4.15635,-0.07254 -0.97035,-0.76833 -2.15633,-1.39032 -2.64637,-1.39947 -0.47048,-0.009 -1.49038,0.640858 -2.75476,-0.612272 -3.09003,-2.418662 -4.23704,-0.163816 -6.75957,-1.151884 -1.06837,-0.42076 -4.00878,-2.223189 -6.60615,-2.214029 -4.62626,0.009 -4.73408,1.445639 -8.01755,-1.033107 -2.66596,-2.01231 -5.23686,1.721019 -7.05012,1.803339 -1.81326,0.0823 -2.79339,-0.34759 -5.0379,-2.195251 -2.31315,-1.90255 -3.24427,-2.295866 -5.5574,-2.332454 -1.91127,-0.02744 -3.37165,0.347583 -4.72428,1.216537 -1.94065,1.262266 -1.96025,1.262266 -2.84237,0.155497 -0.48027,-0.603694 -2.56799,-1.683027 -4.63605,-2.396483 l -5.42773,0.174281 -4.90295,0.841021 c -5.92004,-2.058047 -7.58108,-1.161301 -10.60971,-0.877748 -2.09751,0.20123 -6.00195,1.189445 -7.38394,0.905892 -1.67604,-0.338434 -5.33716,-1.125648 -5.33716,-1.125648 z"       fill="$[hairColor]"       stroke="#000000"       stroke-width="3.7874"       sodipodi:nodetypes="ccscccccccccscsccccccccccccccccccccccccccccccscccccccccccccccsccccccccccc" />  </g></svg>',
    short3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="short-01" d="M178.27 84.63C176.57 85.02 174.54 85.62 173.76 85.96C172.98 86.31 170.59 86.96 168.45 87.4C166.31 87.84 163.75 88.85 162.78 89.63C161.8 90.42 159.73 91.33 158.16 91.66C156.61 91.99 152.98 92.99 150.1 93.89C147.23 94.8 144.01 96.27 142.98 97.14C141.93 98.03 139.96 99.17 138.59 99.69C137.21 100.2 135.45 100.47 134.67 100.28C133.9 100.09 131.82 100.49 130.05 101.16C128.28 101.84 126.03 102.59 125.05 102.84C124.07 103.08 122.14 103.93 120.75 104.71C119.36 105.5 117.91 106.15 117.52 106.16C117.13 106.17 115.75 106.85 114.47 107.66C113.17 108.49 111.96 109.17 111.76 109.17C111.56 109.17 109.86 110.03 107.98 111.07C106.09 112.12 103.76 113.69 102.81 114.55C101.85 115.42 100.76 116.88 100.38 117.79C99.72 119.37 99.47 119.45 95.93 119.31C92.78 119.18 91.77 119.42 89.53 120.83C87.74 121.96 86.72 123.13 86.39 124.46C86.12 125.54 85.17 128.2 84.28 130.37C82.89 133.77 81.86 135 76.77 139.4C73.55 142.2 69.58 145.62 67.95 146.98C65.82 148.77 64.77 150.24 64.22 152.19C63.79 153.69 63.02 156.69 62.5 158.86C61.98 161.03 61.51 163.21 61.43 163.71C61.36 164.21 60.02 165.72 58.46 167.05C56.16 169.06 55.63 169.93 55.49 171.92C55.39 173.25 55.34 174.75 55.39 175.25C55.43 175.75 54.61 176.98 53.57 177.99C52.53 178.99 51.46 180.36 51.19 181.03C50.91 181.7 50.36 184.57 49.97 187.4C49.59 190.24 49.28 193.79 49.29 195.29C49.3 197.59 48.82 198.74 46.3 202.59C44.7 205.1 43.2 208.12 42.98 209.29C42.74 210.46 42.87 212.91 43.24 214.74C43.87 217.78 43.81 218.3 42.7 220.67C42.05 222.09 41.52 224.28 41.52 225.53C41.54 226.78 41.87 228.62 42.27 229.61C42.89 231.23 42.83 231.74 41.66 234.18C40.94 235.68 40.37 237.66 40.38 238.58C40.38 239.5 40.65 241.01 40.97 241.91C41.3 242.83 41.92 243.98 42.37 244.49C42.9 245.07 43.27 247.16 43.44 250.55C43.59 253.47 43.43 256.89 43.07 258.44C42.64 260.33 42.62 261.54 43.01 262.38C43.32 263.05 43.38 264.01 43.13 264.51C42.88 265.01 42.54 267.27 42.36 269.52C42.16 272.07 42.29 274.14 42.68 274.98C43.06 275.76 43.33 279.18 43.32 283.03C43.33 288.15 43.59 290.41 44.44 292.74C45.08 294.41 45.78 297.15 46.02 298.82C46.26 300.49 46.91 302.35 47.47 302.95C48.04 303.54 49.13 304.03 49.88 304.02C50.65 304.02 52.49 303.19 53.99 302.19C55.48 301.19 57 300.37 57.36 300.37C57.72 300.37 58.67 299.68 59.49 298.85C60.29 298.01 60.92 296.84 60.88 296.26C60.84 295.67 61.89 293.95 63.22 292.45C64.56 290.94 65.77 289.22 65.92 288.63C66.06 288.04 66.54 287.57 66.98 287.58C67.41 287.59 68.93 286.21 70.36 284.52C71.79 282.83 73.08 280.69 73.21 279.77C73.35 278.85 73.83 277.96 74.28 277.81C74.73 277.67 75.59 277.04 76.2 276.44C76.86 275.78 77.41 273.93 77.58 271.82C77.74 269.9 78.41 267.21 79.05 265.88C79.69 264.53 80.08 263.09 79.92 262.67C79.76 262.25 80.53 260.74 81.65 259.32C83.27 257.24 83.6 256.35 83.24 254.89C83 253.89 82.82 252.65 82.83 252.15C82.85 251.65 83.01 250.28 83.21 249.11C83.4 247.94 83.77 245.75 84.02 244.24C84.28 242.69 85.19 240.78 86.12 239.82C87.05 238.87 87.77 237.36 87.79 236.32C87.82 235.32 87.39 233.47 86.86 232.23C86.33 230.98 85.91 229.61 85.94 229.19C85.96 228.77 86.76 227.61 87.72 226.61C89.02 225.27 89.5 224.09 89.56 222.2C89.6 220.6 90.06 219.27 90.75 218.7C91.37 218.2 91.9 217.04 91.93 216.12C91.95 215.2 91.7 213.98 91.36 213.4C90.94 212.67 91.17 211.4 92.1 209.31C92.85 207.64 94.51 205.11 95.83 203.69C97.9 201.45 98.46 201.15 100.12 201.49C101.17 201.69 102.19 201.95 102.38 202.05C102.57 202.15 103.69 201.95 104.88 201.62C106.07 201.29 107.7 200.89 108.49 200.73C109.29 200.58 111.08 200.15 112.5 199.78C113.91 199.39 115.89 198.75 116.91 198.33C118.51 197.67 119.13 197.74 121.26 198.78C122.8 199.53 124.46 199.88 125.6 199.67C126.63 199.48 129.61 199.72 132.23 200.18C136.45 200.94 137.43 201.41 140.27 204C142.6 206.1 144.45 207.14 146.73 207.61C149.04 208.08 150.53 208.07 152.07 207.6C153.23 207.23 155.16 206.28 156.35 205.47C157.93 204.41 158.85 204.16 159.82 204.55C160.55 204.85 162.52 205.28 164.21 205.5C165.91 205.72 167.63 206.07 168.05 206.29C168.47 206.51 170.38 206.88 172.29 207.11C174.2 207.35 176.99 207.8 178.48 208.12C180.41 208.52 182.1 208.47 184.33 207.9C186.04 207.46 188.68 206.93 190.18 206.74C192.31 206.46 193.26 206.66 194.47 207.63C195.33 208.32 197.43 209.04 199.16 209.25C201.29 209.5 203.09 209.3 204.83 208.64C206.22 208.1 207.98 206.84 208.72 205.84C209.58 204.68 210.7 204.03 211.82 204.03C212.78 204.03 213.7 204.23 213.87 204.48C214.04 204.73 215.35 205.1 216.79 205.3C218.45 205.53 220.91 205.27 223.47 204.55C225.69 203.95 227.95 203.45 228.48 203.45C229.01 203.46 230.64 202.53 232.09 201.38C234.37 199.56 234.98 199.37 236.66 199.9C237.72 200.23 239.45 200.44 240.49 200.36C241.55 200.29 244.22 200.96 246.46 201.85C248.69 202.75 251.37 203.49 252.41 203.49C253.44 203.49 255.06 203.18 255.97 202.8C256.89 202.42 258.7 201.34 260 200.39C261.32 199.43 262.77 198.85 263.31 199.08C263.82 199.3 266.94 199.56 270.2 199.67C274.89 199.82 276.54 199.64 278.23 198.77C280.04 197.84 280.65 197.78 282.23 198.42C283.24 198.83 285.23 199.48 286.64 199.86C288.04 200.24 289.84 200.67 290.64 200.83C291.43 200.98 293.06 201.38 294.25 201.72C295.44 202.05 296.56 202.24 296.76 202.14C296.94 202.04 297.96 201.79 299.02 201.58C300.67 201.25 301.23 201.54 303.31 203.78C304.61 205.2 306.28 207.73 307.03 209.4C307.95 211.5 308.18 212.76 307.75 213.49C307.42 214.07 307.16 215.3 307.18 216.21C307.2 217.13 307.72 218.29 308.35 218.79C309.05 219.36 309.5 220.69 309.54 222.29C309.58 224.18 310.07 225.36 311.36 226.69C312.33 227.69 313.13 228.86 313.15 229.27C313.17 229.69 312.75 231.06 312.21 232.31C311.68 233.55 311.25 235.4 311.27 236.4C311.29 237.44 312 238.94 312.94 239.89C313.86 240.85 314.75 242.76 315.02 244.31C315.27 245.81 315.63 248 315.82 249.16C316.01 250.33 316.17 251.7 316.19 252.2C316.2 252.7 316 253.93 315.76 254.93C315.4 256.39 315.71 257.28 317.34 259.35C318.46 260.78 319.22 262.28 319.05 262.7C318.9 263.12 319.28 264.55 319.92 265.9C320.56 267.23 321.21 269.9 321.36 271.83C321.52 273.93 322.07 275.77 322.74 276.43C323.35 277.03 324.21 277.65 324.65 277.8C325.11 277.95 325.59 278.83 325.72 279.75C325.85 280.66 327.14 282.8 328.57 284.49C329.99 286.17 331.53 287.55 331.96 287.54C332.4 287.53 332.88 288 333.02 288.58C333.17 289.17 334.39 290.89 335.73 292.39C337.07 293.9 338.13 295.61 338.08 296.2C338.04 296.78 338.68 297.94 339.5 298.79C340.34 299.62 341.3 300.31 341.65 300.31C341.99 300.31 343.51 301.13 345.02 302.13C346.53 303.13 348.4 303.96 349.17 303.97C349.93 303.99 351.03 303.51 351.61 302.92C352.17 302.32 352.84 300.47 353.08 298.8C353.32 297.13 354.04 294.39 354.67 292.72C355.54 290.4 355.81 288.14 355.81 283.02C355.81 279.18 356.08 275.76 356.45 274.98C356.85 274.14 356.98 272.07 356.79 269.52C356.61 267.27 356.27 265.01 356.02 264.51C355.77 264.01 355.82 263.05 356.14 262.38C356.53 261.55 356.51 260.34 356.07 258.45C355.71 256.9 355.56 253.48 355.71 250.55C355.88 247.17 356.25 245.08 356.79 244.49C357.23 243.99 357.86 242.83 358.18 241.91C358.51 241.01 358.77 239.37 358.77 238.28C358.76 237.19 358.18 235.21 357.45 233.88C356.23 231.64 356.18 231.29 356.89 229.47C357.32 228.39 357.66 226.55 357.66 225.38C357.66 224.21 357.11 222.1 356.45 220.68C355.33 218.32 355.29 217.8 355.91 214.75C356.29 212.92 356.41 210.47 356.18 209.3C355.96 208.13 354.46 205.12 352.86 202.61C350.34 198.77 349.86 197.62 349.87 195.32C349.88 193.81 349.57 190.27 349.19 187.43C348.8 184.59 348.25 181.73 347.98 181.06C347.7 180.39 346.63 179.03 345.59 178.02C344.55 177.01 343.73 175.78 343.77 175.28C343.81 174.78 343.78 173.29 343.69 171.95C343.56 169.88 343.05 169.1 340.2 166.64C338.35 165.05 336.8 163.34 336.78 162.84C336.76 162.34 336.3 161.31 335.75 160.56C335.19 159.81 334.46 157.83 334.1 156.17C333.68 154.16 332.81 152.52 331.52 151.31C330.42 150.28 329.34 148.44 329.03 147.07C328.72 145.73 327.77 144.03 326.93 143.27C326.08 142.51 324.49 141.56 323.38 141.15C322.29 140.73 321.16 139.74 320.86 138.93C320.57 138.13 319.44 136.83 318.35 136.05C317.26 135.27 315.5 134.64 314.45 134.65C313.4 134.67 312.16 134.33 311.71 133.89C311.26 133.46 310.62 132.3 310.29 131.3C309.95 130.29 308.24 128.25 306.49 126.75C304.73 125.25 301.86 122.72 300.12 121.11C298.38 119.51 296.32 118.05 295.53 117.86C294.75 117.67 292.78 116.33 291.16 114.88C289.19 113.12 286.7 111.72 283.56 110.63C281 109.76 277.62 108.81 276.05 108.54C274.49 108.27 271.92 107.76 270.34 107.41C268.78 107.05 266.67 106.08 265.67 105.26C264.68 104.42 263.47 103.74 262.97 103.73C262.49 103.72 261.02 102.59 259.73 101.22C258.43 99.83 256.49 98.33 255.41 97.89C254.32 97.43 251.32 97.07 248.67 97.08C243.95 97.09 243.84 97.05 240.49 94.34C237.77 92.14 236.65 91.62 234.8 91.71C232.95 91.8 231.95 91.33 229.66 89.31C227.3 87.23 226.35 86.8 223.99 86.76C222.04 86.73 220.55 87.14 219.17 88.09C217.19 89.47 217.17 89.47 216.27 88.26C215.78 87.6 213.65 86.42 211.54 85.64L207.72 84.22L201 86.75C194.96 84.5 193.48 84.33 190.39 84.64C188.25 84.86 185.34 84.79 183.93 84.48C182.22 84.11 180.34 84.15 178.27 84.63Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
    spike2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="spike2" d="M60 310L50 310C50 310 50 305 50 300L50 275L48 264L50 255L48 244L50 235L48 224L50 215L48 200L55 190L52 174.37L65 165L64 148L80 145L80 124L100 124L104 104L124 108L136 88L156 100L168 80L184 96L200 76L216 96L232 80L244 100L264 88L276 108L296 104L300 124L320 124L320 145L336 148L335 165L348 174.04L345 190L352 200L350 215L352 224L350 235L352 244L350 255L352 264L350 275L350 300C350 305 350 310 350 310L340 310C340 310 340 295 340 290C340 285 330 270 325 265C320 260 320 215 310 205C300 195 250 200 200 200C150 200 100 195 90 205C80 215 80 260 75 265C70 270 60 285 60 290C60 295 60 310 60 310Z" fill="$[hairColor]" stroke="#000" stroke-width="4"/></svg>',
  },
  accessories: {
    none: "",
    headband:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -20)">\t<path id="headband" class="headband" d="M350 300C340 300 320 250 200 250C80 250 60 300 50 300C40 290 40 260 50 250C50 250 80 200 200 200C320 200 350 250 350 250C360 260 360 290 350 300Z" fill="$[primary]" stroke="#000" stroke-width="4"/>\t<path id="stripe" class="stripe" d="M45 280L45 270C45 270 80 220 200 220C320 220 355 270 355 270L355 280C350 280 320 230 200 230C80 230 50 280 45 280Z" fill="$[secondary]" stroke="#000" stroke-width="1"/>    </g></svg>',
    "headband-high":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="headband-high" transform="translate(0 -20)">\t\t<path id="headband" d="M350 300C340 300 320 210 200 210C80 210 60 300 50 300C40 290 40 260 50 250C50 250 80 160 200 160C320 160 350 250 350 250C360 260 360 290 350 300Z" fill="$[primary]" stroke="#000" stroke-width="4"/>\t\t<path id="stripe" d="M45 280L45 270C45 270 80 180 200 180C320 180 355 270 355 270L355 280C350 280 320 190 200 190C80 190 50 280 45 280Z" fill="$[secondary]" stroke="#000" stroke-width="1"/>\t</g></svg>',
  },
  glasses: {
    none: "",
    "glasses1-primary":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -15)">\t<path id="frame" class="frame" d="M195 300L205 300C205 300 240 290 270 290C300 290 320 300 320 300C320 300 320 305 330 305L330 335C320 335 320 340 320 340C320 340 300 360 270 360C210 360 205 325 205 325C205 320 195 320 195 325C195 325 190 360 130 360C100 360 80 340 80 340C80 340 80 335 70 335L70 305C80 305 80 300 80 300C80 300 100 290 130 290C160 290 195 300 195 300ZM90 310C90 330 90 350 130 350C180 350 180 320 180 320L180 310C180 310 160 300 130 300C90 300 90 310 90 310ZM220 320C220 320 220 350 270 350C310 350 310 330 310 310C310 310 310 300 270 300C240 300 220 310 220 310L220 320Z" fill="#333" stroke="#000000" stroke-width="2"/>\t<path id="lens" class="lens" d="M90 310C90 310 90 300 130 300C160 300 180 310 180 310L180 320C180 320 180 350 130 350C90 350 90 330 90 310ZM270 350C220 350 220 320 220 320L220 310C220 310 240 300 270 300C310 300 310 310 310 310C310 330 310 350 270 350Z" fill="rgba(150,150,175,.5)"/>\t<path id="straps" class="straps" d="M350 335L350 305L330 305L330 335L350 335ZM70 335L70 305L50 305L50 335L70 335Z" fill="$[primary]" stroke="#000" stroke-width="2"/>\t<path id="glare" class="glare" d="M280 330L290 310M290 330L300 310M140 330L150 310M150 330L160 310" fill="none" stroke="#fff" stroke-width="2"/>\t</g></svg>',
    "glasses1-secondary":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -15)">\t<path id="frame" class="frame" d="M195 300L205 300C205 300 240 290 270 290C300 290 320 300 320 300C320 300 320 305 330 305L330 335C320 335 320 340 320 340C320 340 300 360 270 360C210 360 205 325 205 325C205 320 195 320 195 325C195 325 190 360 130 360C100 360 80 340 80 340C80 340 80 335 70 335L70 305C80 305 80 300 80 300C80 300 100 290 130 290C160 290 195 300 195 300ZM90 310C90 330 90 350 130 350C180 350 180 320 180 320L180 310C180 310 160 300 130 300C90 300 90 310 90 310ZM220 320C220 320 220 350 270 350C310 350 310 330 310 310C310 310 310 300 270 300C240 300 220 310 220 310L220 320Z" fill="#333" stroke="#000000" stroke-width="2"/>\t<path id="lens" class="lens" d="M90 310C90 310 90 300 130 300C160 300 180 310 180 310L180 320C180 320 180 350 130 350C90 350 90 330 90 310ZM270 350C220 350 220 320 220 320L220 310C220 310 240 300 270 300C310 300 310 310 310 310C310 330 310 350 270 350Z" fill="rgba(150,150,175,.5)"/>\t<path id="straps" class="straps" d="M350 335L350 305L330 305L330 335L350 335ZM70 335L70 305L50 305L50 335L70 335Z" fill="$[secondary]" stroke="#000" stroke-width="2"/>\t<path id="glare" class="glare" d="M280 330L290 310M290 330L300 310M140 330L150 310M150 330L160 310" fill="none" stroke="#fff" stroke-width="2"/>    </g></svg>',
  },
  eyeLine: {
    none: "",
    line1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -20)">\t<path id="eyeline1" class="eyeline1" d="M220 290C220 290 210 290 210 270M180 290C180 290 190 290 190 270" fill="none" stroke="#000" stroke-width="2"/>    </g></svg>',
    line2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -20)">\t<path id="eyeline2" class="eyeline2" d="M300 340C300 340 305 345 310 345M296.75 342.53C296.75 342.53 300 355 305 355M100 340C100 340 95 345 90 345M103.25 342.53C103.25 342.53 100 355 95 355" fill="none" stroke="#000" stroke-width="2"/>    </g></svg>',
  },
  smileLine: {
    none: "",
    line1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 38" width="11" height="38">\t<path id="Shape 9" class="smileLine-shp0-$[player_id]" d="M9 2C9 2 -3.5 10.95 5 36" fill="none" stroke="#000" stroke-width="2"/></svg>',
    line4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 22" width="12" height="22">\t<path id="Shape 10" class="smileLine-shp0-$[player_id]" d="M0 20L6 10L0 1" fill="none" stroke="#000" stroke-width="2"/></svg>',
  },
  miscLine: {
    none: "",
    chin2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="chin2" d="M200 467.37L200 480" fill="none" stroke="#000" stroke-width="2"/></svg>',
    forehead2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -15)">\t<path id="forehead2" d="M170 250C170 250 185 250 200 255C215 250 230 250 230 250M155 235C155 235 190 235 200 240C210 235 245 235 245 235" fill="none" stroke="#000" stroke-width="2"/>    </g></svg>',
    forehead3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -15)">\t<path id="forehead3" d="M170 250C170 250 185 250 200 255C215 250 230 250 230 250" fill="none" stroke="#000" stroke-width="2"/>    </g></svg>',
    forehead4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g transform="translate(0 -15)">\t<path id="forehead4" d="M155 235C155 235 190 235 200 240C210 235 245 235 245 235" fill="none" stroke="#000" stroke-width="2"/>    </g></svg>',
    freckles1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.miscLine-shp0-$[player_id] { opacity: 0.251;mix-blend-mode: multiply;fill: #8b6135 } \t</style>\t<path id="freckles1" class="miscLine-shp0-$[player_id]" d="M144 363C142.34 363 141 361.66 141 360C141 358.34 142.34 357 144 357C145.66 357 147 358.34 147 360C147 361.66 145.66 363 144 363ZM129 362C127.89 362 127 361.11 127 360C127 358.89 127.89 358 129 358C130.11 358 131 358.89 131 360C131 361.11 130.11 362 129 362ZM114 363C112.34 363 111 361.66 111 360C111 358.34 112.34 357 114 357C115.66 357 117 358.34 117 360C117 361.66 115.66 363 114 363ZM99 362C97.89 362 97 361.11 97 360C97 358.89 97.89 358 99 358C100.11 358 101 358.89 101 360C101 361.11 100.11 362 99 362ZM104 373C102.34 373 101 371.66 101 370C101 368.34 102.34 367 104 367C105.66 367 107 368.34 107 370C107 371.66 105.66 373 104 373ZM114 372C112.89 372 112 371.11 112 370C112 368.89 112.89 368 114 368C115.11 368 116 368.89 116 370C116 371.11 115.11 372 114 372ZM124 373C122.34 373 121 371.66 121 370C121 368.34 122.34 367 124 367C125.66 367 127 368.34 127 370C127 371.66 125.66 373 124 373ZM134 372C132.89 372 132 371.11 132 370C132 368.89 132.89 368 134 368C135.11 368 136 368.89 136 370C136 371.11 135.11 372 134 372ZM144 383C142.34 383 141 381.66 141 380C141 378.34 142.34 377 144 377C145.66 377 147 378.34 147 380C147 381.66 145.66 383 144 383ZM129 382C127.89 382 127 381.11 127 380C127 378.89 127.89 378 129 378C130.11 378 131 378.89 131 380C131 381.11 130.11 382 129 382ZM119 382C117.89 382 117 381.11 117 380C117 378.89 117.89 378 119 378C120.11 378 121 378.89 121 380C121 381.11 120.11 382 119 382ZM109 383C107.34 383 106 381.66 106 380C106 378.34 107.34 377 109 377C110.66 377 112 378.34 112 380C112 381.66 110.66 383 109 383ZM99 382C97.89 382 97 381.11 97 380C97 378.89 97.89 378 99 378C100.11 378 101 378.89 101 380C101 381.11 100.11 382 99 382ZM144 372C142.89 372 142 371.11 142 370C142 368.89 142.89 368 144 368C145.11 368 146 368.89 146 370C146 371.11 145.11 372 144 372ZM94 372C92.89 372 92 371.11 92 370C92 368.89 92.89 368 94 368C95.11 368 96 368.89 96 370C96 371.11 95.11 372 94 372ZM154 377C152.89 377 152 376.11 152 375C152 373.89 152.89 373 154 373C155.11 373 156 373.89 156 375C156 376.11 155.11 377 154 377ZM154 367C152.89 367 152 366.11 152 365C152 363.89 152.89 363 154 363C155.11 363 156 363.89 156 365C156 366.11 155.11 367 154 367ZM106 352C104.89 352 104 351.11 104 350C104 348.89 104.89 348 106 348C107.11 348 108 348.89 108 350C108 351.11 107.11 352 106 352ZM121 354C118.79 354 117 352.21 117 350C117 347.79 118.79 346 121 346C123.21 346 125 347.79 125 350C125 352.21 123.21 354 121 354ZM136 352C134.89 352 134 351.11 134 350C134 348.89 134.89 348 136 348C137.11 348 138 348.89 138 350C138 351.11 137.11 352 136 352ZM121 393C119.34 393 118 391.66 118 390C118 388.34 119.34 387 121 387C122.66 387 124 388.34 124 390C124 391.66 122.66 393 121 393ZM136 392C134.89 392 134 391.11 134 390C134 388.89 134.89 388 136 388C137.11 388 138 388.89 138 390C138 391.11 137.11 392 136 392ZM106 392C104.89 392 104 391.11 104 390C104 388.89 104.89 388 106 388C107.11 388 108 388.89 108 390C108 391.11 107.11 392 106 392ZM256 363C254.34 363 253 361.66 253 360C253 358.34 254.34 357 256 357C257.66 357 259 358.34 259 360C259 361.66 257.66 363 256 363ZM271 362C269.89 362 269 361.11 269 360C269 358.89 269.89 358 271 358C272.11 358 273 358.89 273 360C273 361.11 272.11 362 271 362ZM286 363C284.34 363 283 361.66 283 360C283 358.34 284.34 357 286 357C287.66 357 289 358.34 289 360C289 361.66 287.66 363 286 363ZM301 362C299.89 362 299 361.11 299 360C299 358.89 299.89 358 301 358C302.11 358 303 358.89 303 360C303 361.11 302.11 362 301 362ZM296 373C294.34 373 293 371.66 293 370C293 368.34 294.34 367 296 367C297.66 367 299 368.34 299 370C299 371.66 297.66 373 296 373ZM286 372C284.89 372 284 371.11 284 370C284 368.89 284.89 368 286 368C287.11 368 288 368.89 288 370C288 371.11 287.11 372 286 372ZM276 373C274.34 373 273 371.66 273 370C273 368.34 274.34 367 276 367C277.66 367 279 368.34 279 370C279 371.66 277.66 373 276 373ZM266 372C264.89 372 264 371.11 264 370C264 368.89 264.89 368 266 368C267.11 368 268 368.89 268 370C268 371.11 267.11 372 266 372ZM256 383C254.34 383 253 381.66 253 380C253 378.34 254.34 377 256 377C257.66 377 259 378.34 259 380C259 381.66 257.66 383 256 383ZM271 382C269.89 382 269 381.11 269 380C269 378.89 269.89 378 271 378C272.11 378 273 378.89 273 380C273 381.11 272.11 382 271 382ZM281 382C279.89 382 279 381.11 279 380C279 378.89 279.89 378 281 378C282.11 378 283 378.89 283 380C283 381.11 282.11 382 281 382ZM291 383C289.34 383 288 381.66 288 380C288 378.34 289.34 377 291 377C292.66 377 294 378.34 294 380C294 381.66 292.66 383 291 383ZM301 382C299.89 382 299 381.11 299 380C299 378.89 299.89 378 301 378C302.11 378 303 378.89 303 380C303 381.11 302.11 382 301 382ZM256 372C254.89 372 254 371.11 254 370C254 368.89 254.89 368 256 368C257.11 368 258 368.89 258 370C258 371.11 257.11 372 256 372ZM306 372C304.89 372 304 371.11 304 370C304 368.89 304.89 368 306 368C307.11 368 308 368.89 308 370C308 371.11 307.11 372 306 372ZM246 377C244.89 377 244 376.11 244 375C244 373.89 244.89 373 246 373C247.11 373 248 373.89 248 375C248 376.11 247.11 377 246 377ZM246 367C244.89 367 244 366.11 244 365C244 363.89 244.89 363 246 363C247.11 363 248 363.89 248 365C248 366.11 247.11 367 246 367ZM294 352C292.89 352 292 351.11 292 350C292 348.89 292.89 348 294 348C295.11 348 296 348.89 296 350C296 351.11 295.11 352 294 352ZM279 354C276.79 354 275 352.21 275 350C275 347.79 276.79 346 279 346C281.21 346 283 347.79 283 350C283 352.21 281.21 354 279 354ZM264 352C262.89 352 262 351.11 262 350C262 348.89 262.89 348 264 348C265.11 348 266 348.89 266 350C266 351.11 265.11 352 264 352ZM279 393C277.34 393 276 391.66 276 390C276 388.34 277.34 387 279 387C280.66 387 282 388.34 282 390C282 391.66 280.66 393 279 393ZM264 392C262.89 392 262 391.11 262 390C262 388.89 262.89 388 264 388C265.11 388 266 388.89 266 390C266 391.11 265.11 392 264 392ZM294 392C292.89 392 292 391.11 292 390C292 388.89 292.89 388 294 388C295.11 388 296 388.89 296 390C296 391.11 295.11 392 294 392Z" /></svg>',
    freckles2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<style>\t\ttspan { white-space:pre }\t\t.miscLine-shp0-$[player_id] { opacity: 0.251;mix-blend-mode: multiply;fill: none;stroke: #8b6135;stroke-width: 4.4 } \t</style>\t<path id="Shape 1" class="miscLine-shp0-$[player_id]" d="M102 385L111.08 360M124.7 360L115.62 385M129.24 385L138.31 360M151.93 360L142.85 385M249.07 385L258.15 360M271.76 360L262.69 385M276.3 385L285.38 360M299 360L289.92 385" /></svg>',
  },
  facialHair: {
    none: "",
    "beard-point":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard-point" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 410C255 410 255 425 255 440C325 440 340 405 340 300L350 300C350 430 336.97 437.37 320 460C290 500 210 580 200 580C190 580 110 500 80 460C63.03 437.37 50 430 50 300L60 300C60 405 75 440 145 440C145 425 145 410 200 410ZM155 440C155 460 160 470 180 470C190 470 190 460 200 460C210 460 210 470 220 470C240 470 245 460 245 440C245 420 230 420 200 420C170 420 155 420 155 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    beard1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard1" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 410C245 410 250 420 250 420C280 420 340 405 340 300L350 300C350 430 320 450 310 460C300 470 250 520 200 520C150 520 100 470 90 460C80 450 50 430 50 300L60 300C60 405 120 420 150 420C150 420 155 410 200 410ZM155 440C155 460 160 470 180 470C190 470 190 460 200 460C210 460 210 470 220 470C240 470 245 460 245 440C245 420 230 420 200 420C170 420 155 420 155 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    beard2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard2" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 410C255 410 255 425 255 440C325 440 340 405 340 300L350 300C350 430 320 450 310 460C300 470 250 520 200 520C150 520 100 470 90 460C80 450 50 430 50 300L60 300C60 405 75 440 145 440C145 425 145 410 200 410ZM155 440C155 460 160 470 180 470C190 470 190 460 200 460C210 460 210 470 220 470C240 470 245 460 245 440C245 420 230 420 200 420C170 420 155 420 155 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    beard3:
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)"   sodipodi:docname="beard3.svg"   id="svg216"   version="1.1"   height="600"   width="400"   viewBox="0 0 400 600">  <metadata     id="metadata222">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title></dc:title>      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs220" />  <sodipodi:namedview     inkscape:current-layer="svg216"     inkscape:window-maximized="1"     inkscape:window-y="-8"     inkscape:window-x="1912"     inkscape:cy="445.26369"     inkscape:cx="224.47007"     inkscape:zoom="4.7517576"     showgrid="false"     id="namedview218"     inkscape:window-height="1417"     inkscape:window-width="2560"     inkscape:pageshadow="2"     inkscape:pageopacity="0"     guidetolerance="10"     gridtolerance="10"     objecttolerance="10"     borderopacity="1"     bordercolor="#666666"     pagecolor="#ffffff" />  <path     sodipodi:nodetypes="scccssssssssssssssssssscccssssssss"     stroke-width="1"     stroke="#000000"     fill="$[hairColor]"     d="m 200,410 c 55,0 55,15 55,30 70,0 85,-35 85,-140 h 10 c 0,85.95474 -6.62095,123.27593 -13.03091,142.3056 -3.28461,9.75126 -6.33176,14.67773 -7.13742,19.401 -1.06724,6.2567 -8.83751,9.62791 -10.95774,17.54281 -3.01693,11.26232 -8.55604,10.73421 -10.66443,17.83404 -2.63787,8.88282 -7.95225,7.49311 -9.42603,12.68163 -2.07563,7.30739 -10.41253,7.82107 -13.19739,13.59919 -3.54835,7.36225 -10.62959,5.88784 -14.53282,10.15687 -6.30096,6.89148 -15.08845,3.93704 -20.90039,8.55957 -4.79315,3.81224 -10.78054,1.49311 -15.71016,3.42182 -10.58169,4.14007 -20.60433,2.06622 -30.0233,2.06622 -8.63361,0 -19.0183,1.29523 -28.21459,-1.69217 -5.6956,-1.85021 -12.19815,1.07867 -17.97214,-3.63909 -5.88055,-4.80484 -15.90721,-0.8707 -21.48116,-8.59843 -3.31598,-4.59727 -11.25751,-2.68908 -14.29003,-9.81928 -2.19277,-5.15573 -10.91869,-4.41877 -12.12076,-12.14664 C 109.30683,505.0264 98.646817,503.26763 97.033866,496.2678 95.339748,488.91571 86.904941,485.17366 85.08388,479.0923 82.030144,468.89448 76.162979,467.64573 75.489633,460.52302 75.021778,455.57401 70.097959,449.56396 65.932263,439.4659 58.247039,420.83615 50,384.30393 50,300 h 10 c 0,105 15,140 85,140 0,-15 0,-30 55,-30 z m -45,30 c 0,20 5,30 25,30 10,0 9.70238,-5.83333 19.70238,-5.83333 10,0 10.29762,5.83333 20.29762,5.83333 20,0 25,-10 25,-30 0,-20 -15,-20 -45,-20 -30,0 -45,0 -45,20 z"     class="facialHair-shp0-$[player_id]"     fill-rule="evenodd"     id="beard2" /></svg>',
    beard4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard2" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 410C255 410 255 425 255 450C255 450 285 450 300 430C300 490 265 500 255 505C245 510 215 515 200 515C185 515 155 510 145 505C135 500 100 490 100 430C115 450 145 450 145 450C145 425 145 410 200 410ZM155 440C155 460 160 470 180 470C190 470 180 450 200 450C220 450 210 470 220 470C240 470 245 460 245 440C245 420 230 420 200 420C170 420 155 420 155 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    beard5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard-point" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M60 300L50 300C50 300 40 370 60 430C70 450 90 485 150 485C160 475 150 440 140 430C130 420 110 430 80 400C60 380 60 330 60 300ZM321 400C291 430 271 420 261 430C251 440 241 475 251 485C311 485 331 450 341 430C361 370 351 300 351 300L341 300C341 330 341 380 321 400Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 266.12 486.94 250 495C240 500 230 500 220 520L220 550L215 560L210 550L205 565C205 565 200.14 555.35 200 555.01C199.98 555.35 195 565 195 565C195 565 190 549.68 190 550C190 550.32 185 560 185 560L180 550L180 520C170 500 160 500 150 495C133.88 486.94 135 455 135 440C135 425 145 405 200 405ZM200 555.01C200 555 200 555 200 555C200 555 200 555 200 555.01ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="band" class="facialHairBand" d="M180 520L220 520L220 540L180 540L180 520Z" fill="$[primary]" stroke="#000" stroke-width="1"/></svg>',
    beard6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="beard-point" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M60 300L50 300C50 300 40 370 60 430C70 450 90 485 150 485C160 475 150 440 140 430C130 420 110 430 80 400C60 380 60 330 60 300ZM321 400C291 430 271 420 261 430C251 440 241 475 251 485C311 485 331 450 341 430C361 370 351 300 351 300L341 300C341 330 341 380 321 400Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 265 480 255 495C250 505 250 510 250 510L250 540L245 550L240 540L235 550L230 540L230 510L215 510L215 540L210 550L205 540L200 555L195 540L190 550L185 540L185 510L170 510L170 540L165 550L160 540L155 550L150 540L150 510C150 510 150 505 145 495C136.94 478.88 135 455 135 440C135 425 145 405 200 405ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="band" class="facialHairBand" d="M150 510L170 510L170 530L150 530L150 510ZM185 510L215 510L215 530L185 530L185 510ZM230 510L250 510L250 530L230 530L230 510Z" fill="$[primary]" stroke="#000" stroke-width="1"/></svg>',
    "chin-strap":
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   viewBox="0 0 400 600"   width="400"   height="600"   version="1.1"   id="svg3"   sodipodi:docname="chin-strap.svg"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)">  <metadata     id="metadata9">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs7" />  <sodipodi:namedview     inkscape:document-rotation="0"     pagecolor="#ffffff"     bordercolor="#666666"     borderopacity="1"     objecttolerance="10"     gridtolerance="10"     guidetolerance="10"     inkscape:pageopacity="0"     inkscape:pageshadow="2"     inkscape:window-width="2560"     inkscape:window-height="1417"     id="namedview5"     showgrid="false"     inkscape:zoom="9.5035151"     inkscape:cx="247.89175"     inkscape:cy="448.22416"     inkscape:window-x="1912"     inkscape:window-y="-8"     inkscape:window-maximized="1"     inkscape:current-layer="svg3"     showguides="true"     inkscape:guide-bbox="true">    <sodipodi:guide       position="203.27381,87.797619"       orientation="0,-1"       id="guide11" />  </sodipodi:namedview>  <path     id="honest_abe"     class="facialHair-shp0-$[player_id]"     d="m 341.86012,329.762 c -18.78031,98.41546 -39.49186,102.78604 -40.73136,106.121 -16.85944,17.71681 -52.85512,38.71951 -62.4861,41.411 -18.04976,5.04421 -27.16555,6.53087 -27.22214,4.59572 -0.0831,-2.84151 4.8e-4,-14.94672 4.8e-4,-14.94672 0,0 -7.23229,-0.0193 -11.188,0 -3.98527,0.0195 -11.47,0 -11.47,0 0,0 0.0302,11.26309 -4.8e-4,14.94672 -0.0212,2.55163 -15.6219,-0.99537 -29.0782,-4.59572 -9.6602,-2.58467 -48.65399,-24.4962 -61.946181,-42.67369 C 95.65535,432.1473 75.039055,421.16617 58.214286,329.762 h -10 c 6.249562,93.09217 30.022418,116.40888 32.350714,120.951 0,0 44.86095,57.48396 119.668,57.54828 74.99997,0.0645 117.78784,-57.54828 117.78784,-57.54828 2.59611,-5.71552 23.22041,-21.70403 33.83928,-120.951 z"     fill="$[hairColor]"     stroke="#000000"     stroke-width="1"     sodipodi:nodetypes="ccsscscssccccsccc" /></svg>',
    "chin-strapStache":
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?><svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   viewBox="0 0 400 600"   width="400"   height="600"   version="1.1"   id="svg3"   sodipodi:docname="chin-strap.svg"   inkscape:version="1.0 (4035a4fb49, 2020-05-01)">  <metadata     id="metadata9">    <rdf:RDF>      <cc:Work         rdf:about="">        <dc:format>image/svg+xml</dc:format>        <dc:type           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />        <dc:title />      </cc:Work>    </rdf:RDF>  </metadata>  <defs     id="defs7" />  <sodipodi:namedview     inkscape:document-rotation="0"     pagecolor="#ffffff"     bordercolor="#666666"     borderopacity="1"     objecttolerance="10"     gridtolerance="10"     guidetolerance="10"     inkscape:pageopacity="0"     inkscape:pageshadow="2"     inkscape:window-width="2560"     inkscape:window-height="1417"     id="namedview5"     showgrid="false"     inkscape:zoom="9.5035151"     inkscape:cx="247.89175"     inkscape:cy="448.22416"     inkscape:window-x="1912"     inkscape:window-y="-8"     inkscape:window-maximized="1"     inkscape:current-layer="svg3"     showguides="true"     inkscape:guide-bbox="true">    <sodipodi:guide       position="203.27381,87.797619"       orientation="0,-1"       id="guide11" />  </sodipodi:namedview>  <path     id="honest_abe"     class="facialHair-shp0-$[player_id]"     d="m 341.86012,329.762 c -18.78031,98.41546 -39.49186,102.78604 -40.73136,106.121 -16.85944,17.71681 -52.85512,38.71951 -62.4861,41.411 -18.04976,5.04421 -27.16555,6.53087 -27.22214,4.59572 -0.0831,-2.84151 4.8e-4,-14.94672 4.8e-4,-14.94672 0,0 -7.23229,-0.0193 -11.188,0 -3.98527,0.0195 -11.47,0 -11.47,0 0,0 0.0302,11.26309 -4.8e-4,14.94672 -0.0212,2.55163 -15.6219,-0.99537 -29.0782,-4.59572 -9.6602,-2.58467 -48.65399,-24.4962 -61.946181,-42.67369 C 95.65535,432.1473 75.039055,421.16617 58.214286,329.762 h -10 c 6.249562,93.09217 30.022418,116.40888 32.350714,120.951 0,0 44.86095,57.48396 119.668,57.54828 74.99997,0.0645 117.78784,-57.54828 117.78784,-57.54828 2.59611,-5.71552 23.22041,-21.70403 33.83928,-120.951 z"     fill="$[hairColor]"     stroke="#000000"     stroke-width="1"     sodipodi:nodetypes="ccsscscssccccsccc" />     <path id="mustache1" class="facialHair-shp0-$[player_id]" d="M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 410C255 410 255 425 255 440C255 440 260 480 250 495C245 500 215 510 200 510C185 510 153.33 500 150 495C140 480 145 440 145 440C145 425 145 410 200 410ZM155 440C155 460 160 470 180 470C190 470 190 460 200 460C210 460 210 470 220 470C240 470 245 460 245 440C245 420 230 420 200 420C170 420 155 420 155 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 260 480 250 495C245 500 215 510 200 510C185 510 153.33 500 150 495C140 480 135 455 135 440C135 425 145 405 200 405ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 275 425 275 440C275 455 260 480 250 495C245 500 215 510 200 510C185 510 153.33 500 150 495C140 480 125 455 125 440C125 425 145 405 200 405ZM145 440C150 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 250 460 255 440C259.85 420.6 230 420 200 420C170 420 140.15 420.6 145 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 266.12 486.94 250 495C240 500 220 510 200 540C180 510 160 500 150 495C133.88 486.94 135 455 135 440C135 425 145 405 200 405ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 266.12 486.94 250 495C240 500 230 500 220 520L220 550L215 560L210 550L205 565C205 565 200.14 555.35 200 555.01C199.98 555.35 195 565 195 565C195 565 190 549.68 190 550C190 550.32 185 560 185 560L180 550L180 520C170 500 160 500 150 495C133.88 486.94 135 455 135 440C135 425 145 405 200 405ZM200 555.01C200 555 200 555 200 555C200 555 200 555 200 555.01ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="band" class="facialHairBand" d="M180 520L220 520L220 540L180 540L180 520Z" fill="$[primary]" stroke="#000" stroke-width="1"/></svg>',
    fullgoatee6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="fullgoatee" fill-rule="evenodd" class="facialHair-shp0-$[player_id]" d="M200 405C255 405 265 425 265 440C265 455 265 480 255 495C250 505 250 510 250 510L250 540L245 550L240 540L235 550L230 540L230 510L215 510L215 540L210 550L205 540L200 555L195 540L190 550L185 540L185 510L170 510L170 540L165 550L160 540L155 550L150 540L150 510C150 510 150 505 145 495C136.94 478.88 135 455 135 440C135 425 145 405 200 405ZM150 440C155 460 160 470 180 470C190 470 190 455 200 455C210 455 210 470 220 470C240 470 245 460 250 440C254.85 420.6 230 420 200 420C170 420 145.15 420.6 150 440Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/>\t<path id="band" class="facialHairBand" d="M150 510L170 510L170 530L150 530L150 510ZM185 510L215 510L215 530L185 530L185 510ZM230 510L250 510L250 530L230 530L230 510Z" fill="$[primary]" stroke="#000" stroke-width="1"/></svg>',
    "goatee1-stache":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee1_stache" class="facialHair-shp0-$[player_id]" d="M200 457.82L210 460C210 460 210 480 220 480C230 480 250 475 250 480C250 500 220 510 200 510C180 510 150 500 150 480C150 475 170 480 180 480C190 480 190 460 190 460L200 457.82Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee1" class="facialHair-shp0-$[player_id]" d="M200 457.82L210 460C210 460 210 480 220 480C230 480 250 475 250 480C250 500 220 510 200 510C180 510 150 500 150 480C150 475 170 480 180 480C190 480 190 460 190 460L200 457.82Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee2:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee2" class="facialHair-shp0-$[player_id]" d="M200 458.02L190 460C180 470 170 500 170 500C170 500 180 510 200 510C220 510 230 500 230 500C230 500 220 470 210 460L200 458.02Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee3:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee3" class="facialHair-shp0-$[player_id]" d="M175 485C175 485 185 480 200 480C215 480 225 485 225 485C210 515 210 530 210 530L205 520L200 540L195 520L190 530C190 530 190 515 175 485Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee4:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee4" class="facialHair-shp0-$[player_id]" d="M220 480C230 480 250 475 250 480C250 500 220 510 200 510C180 510 150 500 150 480C150 475 170 480 180 480C190 480 210 480 220 480Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee5:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee5" d="M200 460C210 460 210 480 220 480C230 480 240 460 240 460C240 460 250 460 250 465C250 505 240 515 200 515C160 515 150 505 150 465C150 460 160 460 160 460C160 460 170 480 180 480C190 480 190 460 200 460Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee6:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee6" class="facialHair-shp0-$[player_id]" d="M188 454C190 452 210 452 212 454C214 456 204 470 200 470C196 470 186 456 188 454ZM200 475C210 475 210 480 220 480C230 480 240 460 240 460C240 460 250 460 250 465C250 505 240 515 200 515C160 515 150 505 150 465C150 460 160 460 160 460C160 460 170 480 180 480C190 480 190 475 200 475ZM150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee7:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee7" class="facialHair-shp0-$[player_id]" d="M250 485C240 505 220 505 200 505C180 505 160 505 150 485C155 480 160 495 200 495C240 495 245 480 250 485Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee8:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee8" class="facialHair-shp0-$[player_id]" d="M188 454C190 452 210 452 212 454C214 456 204 470 200 470C196 470 186 456 188 454ZM250 485C240 505 220 505 200 505C180 505 160 505 150 485C155 480 160 495 200 495C240 495 245 480 250 485Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee9:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee9" class="facialHair-shp0-$[player_id]" d="M188 454C185.85 452.16 214.15 452.16 212 454C205 460 200 480 200 480C200 480 195 460 188 454ZM250 485C240 505 220 505 200 505C180 505 160 505 150 485C155 480 185 505 200 480C215 505 245 480 250 485Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee10:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee9" class="facialHair-shp0-$[player_id]" d="M188 454C190 450 210 450 212 454C216.12 462.25 200 475 200 475C200 475 183.88 462.25 188 454ZM250 485C240 500 226.32 506.84 220 510C210 515 200 525 200 525C200 525 190 515 180 510C173.68 506.84 160 500 150 485C155 480 160 495 190 495C195 495 195 480 200 480C205 480 205 495 210 495C240 495 245 480 250 485Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee11:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee9" class="facialHair-shp0-$[player_id]" d="M188 454C190 450 210 450 212 454C216.12 462.25 200 475 200 475C200 475 183.88 462.25 188 454ZM250 485C240 500 226.32 506.84 220 510C210 515 200 525 200 525C200 525 190 515 180 510C173.68 506.84 160 500 150 485C155 480 160 495 190 495C195 495 195 480 200 480C205 480 205 495 210 495C240 495 245 480 250 485Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee12:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee2" class="facialHair-shp0-$[player_id]" d="M200 458.02L190 460C180 470 170 500 170 500C170 500 180 510 200 510C220 510 230 500 230 500C230 500 220 470 210 460L200 458.02Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee15:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee3" class="facialHair-shp0-$[player_id]" d="M175 485C175 485 185 480 200 480C215 480 225 485 225 485C210 515 210 530 210 530L205 520L200 540L195 520L190 530C190 530 190 515 175 485Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee16:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee3" class="facialHair-shp0-$[player_id]" d="M175 485C175 485 185 480 200 480C215 480 225 485 225 485C210 515 210 530 210 530L205 520L200 540L195 520L190 530C190 530 190 515 175 485Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z M188 458C190 456 210 456 212 458C214 460 204 474 200 474C196 474 186 460 188 458Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee17:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee3" class="facialHair-shp0-$[player_id]" d="M175 485C175 485 185 480 200 480C215 480 225 485 225 485C210 515 210 530 210 530L205 520L200 540L195 520L190 530C190 530 190 515 175 485Z M188 458C190 456 210 456 212 458C214 460 204 474 200 474C196 474 186 460 188 458Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee18:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee4" class="facialHair-shp0-$[player_id]" d="M220 480C230 480 250 475 250 480C250 500 220 510 200 510C180 510 150 500 150 480C150 475 170 480 180 480C190 480 210 480 220 480Z M188 458C190 456 210 456 212 458C214 460 204 474 200 474C196 474 186 460 188 458Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    goatee19:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="goatee4" class="facialHair-shp0-$[player_id]" d="M220 480C230 480 250 475 250 480C250 500 220 510 200 510C180 510 150 500 150 480C150 475 170 480 180 480C190 480 210 480 220 480Z M188 458C190 456 210 456 212 458C214 460 204 474 200 474C196 474 186 460 188 458Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    "honest-abe":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="honest_abe" class="facialHair-shp0-$[player_id]" d="M340 300C340 405 255 440 255 440C255 440 250 470 240 470C210 470 210 460 200 460C190 460 190 470 160 470C150 470 145 440 145 440C145 440 60 405 60 300L50 300C50 405 70 440 70 440C70 440 125 520 200 520C275 520 330 440 330 440C330 440 350 405 350 300L340 300Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    "honest-abe-stache":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="honest_abe_stache" d="M340 300C340 405 255 440 255 440C255 440 250 470 240 470C210 470 210 460 200 460C190 460 190 470 160 470C150 470 145 440 145 440C145 440 60 405 60 300L50 300C50 405 70 440 70 440C70 440 125 520 200 520C275 520 330 440 330 440C330 440 350 405 350 300L340 300Z M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    mustache1:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="mustache1" class="facialHair-shp0-$[player_id]" d="M150 425C145 420 175 405 185 405C190 405 195 410 200 410C205 410 210 405 215 405C225 405 255 420 250 425C245 430 245 420 200 420C155 420 155 430 150 425Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
    "mustache-thin":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="mustache_thin" d="M205.17 408L205 420M215 405L215 421.28M210 420M225 408.02L225 420M235 410L235 421.28M194.83 408L195 420M185 405L185 421.28M190 420M175 408.02L175 420M165 410L165 421.53" stroke="#000" stroke-width="3" /></svg>',
    soul: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<path id="soul_stache" class="facialHair-shp0-$[player_id]" d="M188 458C190 456 210 456 212 458C214 460 204 474 200 474C196 474 186 460 188 458Z" fill="$[hairColor]" stroke="#000" stroke-width="1"/></svg>',
  },
  jersey: {
    "football-standard":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="football-standard">\t\t<path id="footballPrimary" class="footballPrimary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580.41 5 550.41C9.93 520.82 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="$[primary]" stroke="#000000" stroke-width="6" />\t\t<path id="collarSecondary" class="collarSecondary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505L295 495C300 555 240 540 200 570C160 540 100 555 105 495L120 505Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t<path id="footballStroke" class="footballStroke" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580 5 550C9.93 520.41 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="none" stroke="#000000" stroke-width="6"/>\t\t<path id="shoulderpads" class="shp3" d="M19.5 570C19.5 570 92 567.89 101 550 M381 570C381 570 310 567.89 301 550" fill="none" stroke="#000000" stroke-width="2" />\t</g><g><text text-anchor="middle" alignment-baseline="top" x="200" y="$[font-y-pos]" style="font-family:\'SoccerLeague-Regular\', \'Soccer League\';font-size:$[font-size]px;fill:#$[jersey-lettering-color];letter-spacing: 2px;">$[jersey-lettering-text]</text></g></svg>',
    "football-sparta":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="football-sparta">\t\t<path id="footballPrimary" class="footballPrimary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580.41 5 550.41C9.93 520.82 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="$[primary]" stroke="#000000" stroke-width="6" />\t\t<path id="collarSecondary" class="collarSecondary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505L295 495C300 555 240 540 200 570C160 540 100 555 105 495L120 505Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t<g id="Sparta">\t\t\t<path id="Sparta" class="Sparta" d="M20 500L35 580L40 491.2L30 494.27L20 500ZM380 500L365 580L360 491.2L370 494.27L380 500Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t</g>\t\t<path id="footballStroke" class="footballStroke" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580 5 550C9.93 520.41 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="none" stroke="#000000" stroke-width="6"/>\t\t<path id="shoulderpads" class="shp3" d="M19.5 570C19.5 570 92 567.89 101 550 M381 570C381 570 310 567.89 301 550" fill="none" stroke="#000000" stroke-width="2" />\t</g><g><text text-anchor="middle" alignment-baseline="top" x="200" y="$[font-y-pos]" style="font-family:\'SoccerLeague-Regular\', \'Soccer League\';font-size:$[font-size]px;fill:#$[jersey-lettering-color];letter-spacing: 2px;">$[jersey-lettering-text]</text></g></svg>',
    "football-three-stripe":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="football-three-stripe">\t\t<path id="footballPrimary" class="footballPrimary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580.41 5 550.41C9.93 520.82 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="$[primary]" stroke="#000000" stroke-width="6" />\t\t<path id="collarSecondary" class="collarSecondary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505L295 495C300 555 240 540 200 570C160 540 100 555 105 495L120 505Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t<g id="Verticle Stripes">\t\t\t<path id="vStripes1" class="vStripes1" d="M55 490L30 495L20 500L20 580L55 580L55 490ZM345 490L370 495L380 500L380 580L345 580L345 490Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t\t<path id="vStripes2" class="vStripes2" d="M30 495L45 491.86L45 580L30 580L30 495ZM370 495L355 491.86L355 580L370 580L370 495Z" fill="$[accent]" stroke="#000000" stroke-width="2"/>\t\t</g>\t\t<path id="footballStroke" class="footballStroke" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580 5 550C9.93 520.41 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="none" stroke="#000000" stroke-width="6"/>\t\t<path id="shoulderpads" class="shp3" d="M19.5 570C19.5 570 92 567.89 101 550 M381 570C381 570 310 567.89 301 550" fill="none" stroke="#000000" stroke-width="2" />\t</g></svg>',
    "football-ponies":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="football-ponies">\t\t<path id="footballPrimary" class="footballPrimary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580.41 5 550.41C9.93 520.82 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="$[primary]" stroke="#000000" stroke-width="6" />\t\t<path id="collarSecondary" class="collarSecondary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505L295 495C300 555 240 540 200 570C160 540 100 555 105 495L120 505Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t<g id="Stallion">\t\t\t<path id="Stallion" class="Stallion" d="M120 540C80 566.67 60 620 60 620L100 620C100 620 100 566.67 120 540ZM280 540C320 566.67 340 620 340 620L300 620C300 620 300 566.67 280 540Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t</g>\t\t<path id="footballStroke" class="footballStroke" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580 5 550C9.93 520.41 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="none" stroke="#000000" stroke-width="6"/>\t\t<path id="shoulderpads" class="shp3" d="M19.5 570C19.5 570 92 567.89 101 550 M381 570C381 570 310 567.89 301 550" fill="none" stroke="#000000" stroke-width="2" />\t</g><g><text text-anchor="middle" alignment-baseline="top" x="200" y="$[font-y-pos]" style="font-family:\'SoccerLeague-Regular\', \'Soccer League\';font-size:$[font-size]px;fill:#$[jersey-lettering-color];letter-spacing: 2px;">$[jersey-lettering-text]</text></g></svg>',
    "football-two-stripe":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">\t<g id="football-three-stripe">\t\t<path id="footballPrimary" class="footballPrimary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580.41 5 550.41C9.93 520.82 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="$[primary]" stroke="#000000" stroke-width="6" />\t\t<path id="collarSecondary" class="collarSecondary" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505L295 495C300 555 240 540 200 570C160 540 100 555 105 495L120 505Z" fill="$[secondary]" stroke="#000000" stroke-width="2"/>\t\t<g id="Verticle Stripes">\t\t\t<path id="vStripes1" d="M30,580L20,580L20,500L30,495L30,580ZM355,492L355,580L345,580L345,490L355,492ZM380,500L380,580L370,580L370,495L380,500ZM45,492L55,490L55,580L45,580L45,492Z" style="fill:$[secondary];fill-rule:nonzero;stroke:black;stroke-width:2px;"/>\t\t</g>\t\t<path id="footballStroke" class="footballStroke" d="M120 505C120 540 170 530 200 550C230 530 280 540 280 505C310 480 370 490 380 500C390 510 390.07 520.41 395 550C400 580 400 570 400 610L0 610C0 570 0 580 5 550C9.93 520.41 10 511.03 20 500C29.5 489.52 90 480 120 505Z" fill="none" stroke="#000000" stroke-width="6"/>\t\t<path id="shoulderpads" class="shp3" d="M19.5 570C19.5 570 92 567.89 101 550 M381 570C381 570 310 567.89 301 550" fill="none" stroke="#000000" stroke-width="2" />\t</g></svg>',
    suit: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">    <g >        <g id="Apparel">            <path id="Shirt" d="M10,600C10,600 10,550 70,530C77.392,527.536 84.025,524.92 89.977,522.218C89.977,522.218 113.72,507.873 119.12,504.312C120.038,509.976 111.076,508.897 125.931,521.518C137.439,531.295 167.631,551 200,551C243.448,551 266.521,524.459 275.782,510.725C282.326,501.02 280.325,508.919 281,504.756C286.644,508.456 302.123,518.639 310.023,522.218L310.583,522.471C316.39,525.083 322.839,527.613 330,530C390,550 390,600 390,600L10,600Z" style="fill:white;stroke:black;stroke-width:6px;"/>            <g transform="matrix(1.53846,0,0,1.41245,-107.692,-235.987)">                <g transform="matrix(1.5,0,0,1.5,-100,-284.519)">                    <path d="M190,564.4L200.033,563.038L210,564.371L206.5,577L193.5,576.985L190,564.4Z" style="fill:$[primary];stroke:black;stroke-width:1.35px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                </g>                <g transform="matrix(1.5,0,0,1.5,-100,-279.993)">                    <path d="M193.5,573.985L187,597.362L200,657.5L213,598.237L206.5,574L193.5,573.985Z" style="fill:$[primary];stroke:black;stroke-width:1.35px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                </g>            </g>            <g id="Collar">                <g transform="matrix(1,0,0,1,0.457375,0)">                    <path d="M279.339,504.354C277.635,505.046 200,550 200,550L232.485,581.939C232.485,581.939 267.391,549.65 282.175,527.05C292.087,511.898 281.044,503.662 279.339,504.354Z" style="fill:white;stroke:black;stroke-width:4px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                </g>                <g transform="matrix(-1,0,0,1,400,0)">                    <path d="M279.339,504.354C277.635,505.046 200,550 200,550L232.485,581.939C232.485,581.939 267.391,549.65 282.175,527.05C292.087,511.898 281.044,503.662 279.339,504.354Z" style="fill:white;stroke:black;stroke-width:4px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                </g>            </g>            <g>                <path d="M10,600C10,600 10,550 70,530C77.392,527.536 84.025,524.92 89.977,522.218C89.977,522.218 98.137,518.738 105.915,513.971C111.965,510.263 117.638,505.286 120,503.728C121.629,513.781 126.44,651.317 200.592,651.317C274.744,651.317 278.371,514.269 280,504.216C282.739,506.011 288.028,510.108 293.651,513.592C299.616,517.288 305.956,520.375 310.023,522.218L310.583,522.471C316.39,525.083 322.839,527.613 330,530C390,550 390,600 390,600L10,600Z" style="fill:rgb(51,51,51);stroke:black;stroke-width:6px;"/>            </g>            <g transform="matrix(1.04986,0,0,1.04986,-9.97355,-23.9766)">                <path d="M306.649,520.978L314.327,553.707L293.092,570.684L311.588,579.277L284.725,634.469" style="fill:none;stroke:black;stroke-width:3.81px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                <g transform="matrix(-1,0,0,1,400.052,0)">                    <path d="M306.649,520.978L314.327,553.707L293.092,570.684L311.588,579.277L284.725,634.469" style="fill:none;stroke:black;stroke-width:3.81px;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"/>                </g>            </g>        </g>    </g></svg>',
  },
};
const drawFeature = async (svg, face, info) => {
  const feature = face[info.name];
  if (!feature) {
    return;
  }

  // @ts-ignore
  // var url = `/static/facesjs/${info.name}/${feature.id}.svg`;
  // var html = await fetch(url);
  // var featureSVGString = await html.text();

  var featureSVGString = svgs[info.name][feature.id];

  if (!featureSVGString) {
    return;
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[faceShave]", feature.shave);
  }

  // @ts-ignore
  if (feature.shave) {
    // @ts-ignore
    featureSVGString = featureSVGString.replace("$[headShave]", feature.shave);
  }

  const player_id = $(svg).parent().attr("player_id") || $(svg).parent().attr("coach_id");

  featureSVGString = featureSVGString.replaceAll(
    "$[player_id]",
    `${player_id}-${info.name}`
  );
  featureSVGString = featureSVGString.replace("$[skinColor]", face.body.color);
  featureSVGString = featureSVGString.replace(
    /\$\[hairColor\]/g,
    face.hair.color
  );
  featureSVGString = featureSVGString.replace(
    /\$\[primary\]/g,
    face.teamColors[0]
  );
  featureSVGString = featureSVGString.replace(
    /\$\[secondary\]/g,
    face.teamColors[1]
  );
  featureSVGString = featureSVGString.replace(
    /\$\[accent\]/g,
    face.teamColors[2]
  );
  featureSVGString = featureSVGString.replace(
    /\$\[jersey-lettering-text\]/g,
    face.jersey.lettering || ''
  );
  featureSVGString = featureSVGString.replace(
    /\$\[jersey-lettering-color\]/g,
    face.jersey.lettering_color
  );
  if ( face.jersey.lettering) {
    let font_size = Math.floor(80 - (5 * face.jersey.lettering.length))
    featureSVGString = featureSVGString.replace(
      /\$\[font-size\]/g,
      font_size
    );  

    let font_y_pos = Math.floor(645 - (5 * face.jersey.lettering.length));
    featureSVGString = featureSVGString.replace(
      /\$\[font-y-pos\]/g,
      font_y_pos
    );  
  }
  else {
    featureSVGString = featureSVGString.replace(
      /\$\[font-y-pos\]/g,
      0
    );  
  }



  //console.log('featureSVGString', info, feature, featureSVGString)

  for (let i = 0; i < info.positions.length; i++) {
    svg.insertAdjacentHTML("beforeend", addWrapper(featureSVGString));

    const position = info.positions[i];

    if (position !== null) {
      // Special case, for the pinocchio nose it should not be centered but should stick out to the left or right
      var xAlign;
      if (feature.id === "nose4" || feature.id === "pinocchio") {
        // @ts-ignore
        xAlign = feature.flip ? "right" : "left";
      } else {
        xAlign = "center";
      }

      translate(svg.lastChild, position[0], position[1], xAlign);
    }

    if (feature.hasOwnProperty("angle")) {
      // @ts-ignore
      rotateCentered(svg.lastChild, (i === 0 ? 1 : -1) * feature.angle);
    }

    // Flip if feature.flip is specified or if this is the second position (for eyes and eyebrows). Scale if feature.size is specified.
    // @ts-ignore
    const scale = feature.hasOwnProperty("size") ? feature.size : 1;
    // @ts-ignore
    if (feature.flip || i === 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, -scale, scale);
    } else if (scale !== 1) {
      // @ts-ignore
      scaleCentered(svg.lastChild, scale, scale);
    }

    if (info.scaleFatness && info.positions[0] !== null) {
      // Scale individual feature relative to the edge of the head. If fatness is 1, then there are 47 pixels on each side. If fatness is 0, then there are 78 pixels on each side.
      const distance = (78 - 47) * (1 - face.fatness);
      // @ts-ignore
      translate(svg.lastChild, distance, 0, "left", "top");
    }
  }

  if (
    info.scaleFatness &&
    info.positions.length === 1 &&
    info.positions[0] === null
  ) {
    // @ts-ignore
    scaleCentered(svg.lastChild, fatScale(face.fatness), 1);
  }
};

const override = (face, overrides) => {
  $.each(overrides, function (key, val) {
    face[key] = val;
  });

  return face;
};

const display_player_face = async (face, overrides, dom_id) => {
  if ("jersey" in overrides && overrides.jersey.id == "suit") {
    overrides["accessories"] = { id: "none" };
    face.glasses.id = 'none'
  }

  face = override(face, overrides);

  const container_element = $("#" + dom_id);

  $(container_element).html("");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("version", "1.2");
  svg.setAttribute("baseProfile", "tiny");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("viewBox", "0 0 400 600");
  svg.setAttribute("preserveAspectRatio", "xMinYMin meet");

  // Needs to be in the DOM here so getBBox will work
  $(container_element).append(svg);

  const featureInfos = [
    {
      name: "hairBg",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "body",
      positions: [null],
    },
    {
      name: "jersey",
      positions: [null],
    },
    {
      name: "ear",
      positions: [
        [55, 325],
        [345, 325],
      ],
      scaleFatness: true,
    },
    {
      name: "head",
      positions: [null], // Meaning it just gets placed into the SVG with no translation
      scaleFatness: true,
    },
    {
      name: "eyeLine",
      positions: [null],
    },
    {
      name: "smileLine",
      positions: [
        [150, 435],
        [250, 435],
      ],
    },
    {
      name: "miscLine",
      positions: [null],
    },
    {
      name: "facialHair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "eye",
      positions: [
        [140, 310],
        [260, 310],
      ],
    },
    {
      name: "eyebrow",
      positions: [
        [140, 270],
        [260, 270],
      ],
    },
    {
      name: "mouth",
      positions: [[200, 440]],
    },
    {
      name: "nose",
      positions: [[200, 370]],
    },
    {
      name: "hair",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "glasses",
      positions: [null],
      scaleFatness: true,
    },
    {
      name: "accessories",
      positions: [null],
      scaleFatness: true,
    },
  ];

  $.each(featureInfos, async function (ind, info) {
    drawFeature(svg, face, info);
  });
};

function download(filename, text, type = "text/json") {
  // Create an invisible A element
  const a = document.createElement("a");
  a.style.display = "none";
  document.body.appendChild(a);

  // Set the HREF to a Blob representation of the data to be downloaded
  a.href = window.URL.createObjectURL(new Blob([text], {type: type }));
  

  // Use download attribute to set set desired file name
  a.setAttribute("download", filename);

  // Trigger the download by simulating click
  a.click();

  // Cleanup
  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
}

const real_gauss = (mean, sigma) => {
  let radius = 0;
  let z1;
  let z2;

  do {
    z1 = 2 * Math.random() - 1;
    z2 = 2 * Math.random() - 1;
    radius = z1 * z1 + z2 * z2;
  } while (radius >= 1 || radius === 0); // only use inside the unit circle

  const marsaglia = Math.sqrt((-2 * Math.log(radius)) / radius);
  return z1 * marsaglia * sigma + mean;
};

const normal_trunc = (mean, sigma, min, max) => {
  var r = min;
  var loop_count = 0;
  while ((r <= min || r >= max) && loop_count < 100) {
    r = real_gauss(mean, sigma);
    loop_count += 1;
  }

  if (loop_count >= 100) {
    r = mean;
    if (r > max) {
      r = max;
    } else if (r < min) {
      r = min;
    }
  }

  return r;
};

const normal_trunc_bounce = (mean, sigma, min, max) => {
  var r = real_gauss(mean, sigma);

  if (r > max) {
    r = max;
  } else if (r < min) {
    r = min;
  }

  return r;
};

const inches_to_height = (all_inches) => {
  var feet = Math.floor(all_inches / 12);
  var inches = Math.floor(all_inches % 12);

  return `${feet}'${inches}"`;
};

const body_from_position = (position) => {
  const position_measurables = {
    coach: {
      height_avg: 72,
      height_std: 1,
      weight_avg: 230,
      weight_std: 25,
    },
    QB: {
      height_avg: 74.91,
      height_std: 1.79,
      weight_avg: 212.94,
      weight_std: 10.64,
    },
    RB: {
      height_avg: 70.24,
      height_std: 1.83,
      weight_avg: 212.94,
      weight_std: 13.65,
    },
    FB: { height_avg: 70, height_std: 2, weight_avg: 220, weight_std: 13.65 },
    WR: {
      height_avg: 72.7,
      height_std: 2.36,
      weight_avg: 202.91,
      weight_std: 15.36,
    },
    TE: {
      height_avg: 76.2,
      height_std: 1.34,
      weight_avg: 251.48,
      weight_std: 8.7,
    },
    OT: {
      height_avg: 77.61,
      height_std: 1.12,
      weight_avg: 313.74,
      weight_std: 10.95,
    },
    IOL: {
      height_avg: 76.07,
      height_std: 1.16,
      weight_avg: 314.75,
      weight_std: 11.76,
    },
    EDGE: {
      height_avg: 75.83,
      height_std: 1.44,
      weight_avg: 260,
      weight_std: 14.81,
    },
    DL: {
      height_avg: 74.92,
      height_std: 1.43,
      weight_avg: 307.49,
      weight_std: 15.8,
    },
    LB: {
      height_avg: 73.22,
      height_std: 1.27,
      weight_avg: 240.96,
      weight_std: 6.6,
    },
    CB: {
      height_avg: 71.35,
      height_std: 1.59,
      weight_avg: 193.42,
      weight_std: 8.76,
    },
    S: {
      height_avg: 72.15,
      height_std: 1.5,
      weight_avg: 206.38,
      weight_std: 9.08,
    },
    K: { height_avg: 71.89, height_std: 2, weight_avg: 195, weight_std: 17 },
    P: {
      height_avg: 74.31,
      height_std: 1.89,
      weight_avg: 213,
      weight_std: 14.6,
    },
  };

  var height_inches = Math.floor(
    normal_trunc(
      position_measurables[position]["height_avg"],
      position_measurables[position]["height_std"],
      66,
      81
    )
  );
  var body = { height_inches: height_inches };

  var height_variations = 0; //(height_inches - position_measurables[position]['height_avg']) / position_measurables[position]['height_std'];
  var weight = Math.floor(
    normal_trunc(
      position_measurables[position]["weight_avg"] *
        (1 + height_variations / 4),
      position_measurables[position]["weight_std"] * 0.8,
      150,
      390
    )
  );

  body.weight = weight;
  body.height = inches_to_height(body.height_inches);

  return body;
};

const initialize_scoreboard = () => {
  if ($(".MultiCarousel-inner").children().length == 0) {
    $(".scoreboard-slideshow").remove();
    return 0;
  }
  var itemsMainDiv = ".MultiCarousel";
  var itemsDiv = ".MultiCarousel-inner";
  var itemWidth = "";
  var initialOffset = 20;
  $(".leftLst, .rightLst").click(function () {
    var condition = $(this).hasClass("leftLst");
    if (condition) click(0, this);
    else click(1, this);
  });

  ResCarouselSize();

  $(window).resize(function () {
    ResCarouselSize();
  });

  //this function define the size of the items
  function ResCarouselSize() {
    var incno = 0;
    var dataItems = "data-items";
    var itemClass = ".scoreboard-carousel-item";
    var id = 0;
    var btnParentSb = "";
    var itemsSplit = "";
    var sampwidth = $(itemsMainDiv).width();
    var bodyWidth = $("body").width();
    $(itemsDiv).each(function () {
      id = id + 1;
      var itemNumbers = $(this).find(itemClass).length;
      btnParentSb = $(this).parent().attr(dataItems);
      console.log({});
      itemsSplit = btnParentSb.split(",");
      $(this)
        .parent()
        .attr("id", "MultiCarousel" + id);

      if (bodyWidth >= 1200) {
        incno = itemsSplit[3];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 992) {
        incno = itemsSplit[2];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 768) {
        incno = itemsSplit[1];
        itemWidth = sampwidth / incno;
      } else {
        incno = itemsSplit[0];
        itemWidth = sampwidth / incno;
      }
      $(this).css({
        transform: "translateX(" + initialOffset + "px)",
        width: itemWidth * itemNumbers,
      });
      $(this)
        .find(itemClass)
        .each(function () {
          $(this).outerWidth(itemWidth);
        });

      $(".leftLst").addClass("over");
      $(".rightLst").removeClass("over");
    });
  }

  //this function used to move the items
  function ResCarousel(e, el, s) {
    var leftBtn = ".leftLst";
    var rightBtn = ".rightLst";
    var translateXval = "";
    var divStyle = $(el + " " + itemsDiv).css("transform");
    var values = divStyle.match(/-?[\d\.]+/g);
    var xds = Math.abs(values[4]);
    if (e == 0) {
      translateXval = parseInt(xds) - parseInt(itemWidth * s);
      $(el + " " + rightBtn).removeClass("over");

      if (translateXval <= itemWidth / 2) {
        translateXval = -1 * initialOffset;
        $(el + " " + leftBtn).addClass("over");
      }
    } else if (e == 1) {
      var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
      translateXval = parseInt(xds) + parseInt(itemWidth * s);
      $(el + " " + leftBtn).removeClass("over");

      if (translateXval >= itemsCondition - itemWidth / 2) {
        translateXval = itemsCondition + initialOffset;
        $(el + " " + rightBtn).addClass("over");
      }
    }
    $(el + " " + itemsDiv).css(
      "transform",
      "translateX(" + -translateXval + "px)"
    );
  }

  //It is used to get some elements from btn
  function click(ell, ee) {
    var Parent = "#" + $(ee).parent().attr("id");
    var slide = $(Parent).attr("data-slide");
    ResCarousel(ell, Parent, slide);
  }

  $(".scoreboard-carousel-item.w3-hide").each(function (ind, obj) {
    $(obj).removeClass("w3-hide");
  });
};

const initialize_headlines = () => {
  if ($(".MultiCarousel-inner").children().length == 0) {
    $(".headline-slideshow").remove();
    return 0;
  }
  var itemsMainDiv = ".MultiCarousel";
  var itemsDiv = ".MultiCarousel-inner";
  var itemWidth = "";
  var initialOffset = 20;
  $(".leftLst, .rightLst").click(function () {
    var condition = $(this).hasClass("leftLst");
    if (condition) click(0, this);
    else click(1, this);
  });

  ResCarouselSize();

  $(window).resize(function () {
    ResCarouselSize();
  });

  //this function define the size of the items
  function ResCarouselSize() {
    var incno = 0;
    var dataItems = "data-items";
    var itemClass = ".headline-carousel-item";
    var id = 0;
    var btnParentSb = "";
    var itemsSplit = "";
    var sampwidth = $(itemsMainDiv).width();
    var bodyWidth = $("body").width();
    $(itemsDiv).each(function () {
      id = id + 1;
      var itemNumbers = $(this).find(itemClass).length;
      btnParentSb = $(this).parent().attr(dataItems);
      itemsSplit = btnParentSb.split(",");
      $(this)
        .parent()
        .attr("id", "MultiCarousel" + id);

      incno = 5;
      itemWidth = sampwidth / incno;
      if (bodyWidth >= 1200) {
        incno = itemsSplit[3];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 992) {
        incno = itemsSplit[2];
        itemWidth = sampwidth / incno;
      } else if (bodyWidth >= 768) {
        incno = itemsSplit[1];
        itemWidth = sampwidth / incno;
      } else {
        incno = itemsSplit[0];
        itemWidth = sampwidth / incno;
      }
      incno = 4;
      itemWidth = sampwidth / incno;
      console.log({
        this: this,
        itemClass: itemClass,
        width: itemWidth * itemNumbers,
        itemWidth: itemWidth,
        itemNumbers: itemNumbers,
        bodyWidth: bodyWidth,
        incno: incno,
        sampwidth: sampwidth,
        itemsMainDiv: $(itemsMainDiv),
        "$(itemsMainDiv).width()": $(itemsMainDiv).width(),
      });
      $(this).css({
        transform: "translateX(" + initialOffset + "px)",
        width: itemWidth * (itemNumbers + 1),
      });
      $(this)
        .find(itemClass)
        .each(function () {
          $(this).outerWidth(itemWidth);
          $(this).height(itemWidth * 2 * 0.67 + 0);
        });

      $(this)
        .find(`${itemClass}:first`)
        .each(function () {
          $(this).outerWidth(itemWidth * 2);
          $(this).height(itemWidth * 2 * 0.67 + 10);
        });

      $(".leftLst").addClass("over");
      $(".rightLst").removeClass("over");
    });
  }

  //this function used to move the items
  function ResCarousel(e, el, s) {
    var leftBtn = ".leftLst";
    var rightBtn = ".rightLst";
    var translateXval = "";
    var divStyle = $(el + " " + itemsDiv).css("transform");
    var values = divStyle.match(/-?[\d\.]+/g);
    var xds = Math.abs(values[4]);
    if (e == 0) {
      translateXval = parseInt(xds) - parseInt(itemWidth * s);
      $(el + " " + rightBtn).removeClass("over");

      if (translateXval <= itemWidth / 2) {
        translateXval = -1 * initialOffset;
        $(el + " " + leftBtn).addClass("over");
      }
    } else if (e == 1) {
      var itemsCondition = $(el).find(itemsDiv).width() - $(el).width();
      translateXval = parseInt(xds) + parseInt(itemWidth * s);
      $(el + " " + leftBtn).removeClass("over");

      if (translateXval >= itemsCondition - itemWidth / 2) {
        translateXval = itemsCondition + initialOffset;
        $(el + " " + rightBtn).addClass("over");
      }
    }
    $(el + " " + itemsDiv).css(
      "transform",
      "translateX(" + -translateXval + "px)"
    );
  }

  //It is used to get some elements from btn
  function click(ell, ee) {
    var Parent = "#" + $(ee).parent().attr("id");
    var slide = $(Parent).attr("data-slide");
    ResCarousel(ell, Parent, slide);
  }

  $(".headline-carousel-item.w3-hide").each(function (ind, obj) {
    $(obj).removeClass("w3-hide");
  });
};

const tier_placement = (tiers, population_size, distribution, rank_place) => {
  console.log({
    tiers: tiers,
    population_size: population_size,
    distribution: distribution,
    rank_place: rank_place,
  });
  var tier_list = Array(tiers)
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
    tier_obj.population_count = Math.ceil(
      tier_obj.segment_ratio * population_size
    );

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

const get = (obj, key) => {
  const keys = key.split(".");
  var drill_obj = obj;
  for (var new_key of keys) {
    drill_obj = drill_obj[new_key];
  }

  return drill_obj;
};

const set = (obj, key, val) => {
  const keys = key.split(".");
  var drill_obj = obj;

  for (var i = 0; i < keys.length; i++) {
    var new_key = keys[i];
    if (!(new_key in drill_obj)) {
      if (i == keys.length - 1) {
        drill_obj[new_key] = null;
        break;
      }
      drill_obj[new_key] = {};
    }
    drill_obj = drill_obj[new_key];
  }

  drill_obj[new_key] = val;
  return obj;
};

const distinct = (arr) => {
  return [...new Set(arr)];
};

const sum = (arr) => {
  return arr.reduce((a, b) => a + b, 0);
};

const nest_children = (parent_array, child_dict, join_key, store_key) => {
  if (Array.isArray(child_dict)) {
    console.log("********POTENTIAL BUG************");
    console.log("Array being passed to nest_children!!!!!!!");
  }

  for (const parent of parent_array) {
    parent[store_key] = child_dict[parent[join_key]];
  }

  return parent_array;
};

const change_archetypes = () => {
  for (const position in a) {
    var archetypes = a[position];
    for (var archetype in archetypes) {
      var rating_groups = archetypes[archetype];
      for (var rating_group_key in rating_groups) {
        var rating_group = rating_groups[rating_group_key];
        for (var rating_key in rating_group) {
          var rating_obj = rating_group[rating_group];
          a[position][archetype][rating_group_key][rating_key].rating_mean *= 5;
        }
      }
    }
  }
};

function NumberToGrade(number_value, scale) {
  if (!(scale)){
    if (number_value > 20){
      scale = 100
    }
    else {
      scale = scale || 20;
    }
  }

  let adj_number_value = Math.floor(number_value / ((scale) / 20));
  let grade_value_map = {
    20: 'Elite',
    19: 'A++',
    18: 'A+',
    17: 'A',
    16: 'A-',
    15: 'B+',
    14: 'B',
    13: 'B-',
    12: 'C+',
    11: 'C',
    10: 'C-',
    9: 'D+',
    8: 'D',
    7: 'D-',
    6: 'F',
    5: 'F',
    4: 'F-',
    3: 'F-',
    2: 'F--',
    1: 'F--',
  }

  return grade_value_map[adj_number_value];
}


const ordinal = (num) => {
  var s = ["th", "st", "nd", "rd"],
    v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
};

const geo_marker_action = async(common) => {
  console.log('Adding geo_marker_action')
  const db = common.ddb;
  $(".geo-marker").on("click", async function () {

    let city = $(this).attr('city');
    let state = $(this).attr('state');

    let location = await ddb.cities.get({city: city, state:state})

    const icon = L.divIcon({
      html: `<i class="fa fa-map-marker-alt" style="font-size: 40px; color: #${common.page.PrimaryColor};"></i>`,
      iconSize: [40,40],
      iconAnchor: [15, 40],
  });

    var modal_url = "/static/html_templates/common_templates/geography_modal_template.njk";
    var html = await fetch(modal_url);
    html = await html.text();
    let page = common.page;
    var renderedHtml = await common.nunjucks_env.renderString(html, {
      page: page,
      location:location
    });
    console.log({ renderedHtml: renderedHtml });
    $("#geography-modal").html(renderedHtml);
    $("#geography-modal").addClass("shown");

    let map = L.map('map-body').setView([location.lat, location.long], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
    let marker = L.marker([location.lat, location.long], {icon: icon}).addTo(map);


    $(window).on("click", function (event) {
      if ($(event.target)[0] == $("#geography-modal")[0]) {
        $("#geography-modal").removeClass("shown");
        $(window).unbind();
      }
    });
  });
}

const update_create_world_modal = async (completed_stage_id, started_stage_id) => {
  $('#' + completed_stage_id).html('<i class="fa fa-check-circle" style="color:green; font-size: 20px;"></i>');
  $('#' + started_stage_id).html('<div class="spinner-border spinner-border-sm" role="status"></div>');
}

const new_world_action = async (common, database_suffix) => {
  $('.conference-select-table').addClass('w3-hide');
  $('.create-progress-table').removeClass('w3-hide');

  await update_create_world_modal(null, 'create-world-table-new-world')

  const new_db = await create_new_db();

  const db = await new_db["db"];

  const new_season_info = new_db["new_season_info"];

  const world_id = new_season_info.world_id;
  const season = new_season_info.current_season;

  common.db = db;
  common.season = season;

  var teams_from_json = await get_teams();

  var conferences_from_json = await get_conferences(database_suffix);
  console.log({ conferences_from_json: conferences_from_json });

  var school_names_to_include = [];
  const conference_name_by_school_name = {};

  $.each(conferences_from_json, function (ind, conference) {
    conference.world_id = world_id;
    conference.conference_id = ind + 1;

    let school_names = conference.divisions.map((d) => d.teams);
    school_names = school_names.flat();
    school_names_to_include = school_names_to_include.concat(school_names);

    for (var school_name of school_names) {
      conference_name_by_school_name[school_name] = conference.conference_name;
    }
  });

  console.log('adding',{db:db,'db.conference':db.conference, conferences_from_json})
  const conferences_added = await db.conference.bulkAdd(conferences_from_json);
  var conferences = await db.conference.toArray();

  teams_from_json = teams_from_json.filter((t) =>
    school_names_to_include.includes(t.school_name)
  );
  const num_teams = teams_from_json.length;

  const season_data = {
    season: season,
    world_id: world_id,
    captains_per_team: 3,
    players_per_team: 70,
    num_teams: num_teams,
  };
  const new_season = new league_season(season_data, undefined);
  console.log({new_season:new_season})
  await db.league_season.add(new_season);

  console.log({season:season, common:common, db:db, new_season_info:new_season_info})
  const phases_created = await create_phase(season, common);
  await create_week(phases_created, common, season);

  const rivalries = await get_rivalries(teams_from_json);

  await create_conference_seasons({
    common: common,
    conferences: conferences,
    season: season,
    world_id: world_id,
  });
  var conference_seasons = index_group_sync(
    await db.conference_season.toArray(),
    "index",
    "conference_id"
  );

  conferences = nest_children(
    conferences,
    conference_seasons,
    "conference_id",
    "conference_season"
  );
  const conferences_by_conference_name = index_group_sync(
    conferences,
    "index",
    "conference_name"
  );
  const conferences_by_school_name = {};

  for ([school_name, conference_name] of Object.entries(
    conference_name_by_school_name
  )) {
    conferences_by_school_name[school_name] =
      conferences_by_conference_name[
        conference_name_by_school_name[school_name]
      ];
    console.log({
      school_name: school_name,
      conference_name: conference_name,
    });
  }

  console.log({
    conferences_by_school_name: conferences_by_school_name,
    conference_name_by_school_name: conference_name_by_school_name,
    conferences_by_conference_name:conferences_by_conference_name
  });

  var teams = [],
    rivals = [],
    rivals_team_1 = [],
    rivals_team_2 = [];
  var jersey_colors = [],
    jersey_lettering = {};
  const jersey_options = [
    "football-standard",
    "football-ponies",
    "football-sparta",
    "football-three-stripe",
    "football-two-stripe",
  ];

  teams_from_json = teams_from_json.sort((t_a, t_b) => t_a.school_name > t_b.school_name ? 1 : -1)

  var team_id_counter = 1;
  for (let team of teams_from_json){
    if (team.jersey.invert) {
      team.jersey.teamColors = [
        "#FFFFFF",
        `#${team.team_color_primary_hex}`,
        `#${team.team_color_secondary_hex}`,
      ];
    }
    else if (team.jersey.flip_primaries){
      team.jersey.teamColors = [
        `#${team.team_color_secondary_hex}`,
        `#${team.team_color_primary_hex}`,
        "#FFFFFF",
      ];
    }
    else {
      team.jersey.teamColors = [
        `#${team.team_color_primary_hex}`,
        `#${team.team_color_secondary_hex}`,
        "#FFFFFF",
      ];
    }

    if (team.jersey.lettering){
      team.jersey.lettering_color = team.jersey.lettering_color || 'FFFFFF';
    }

    team.jersey.id =
      team.jersey.id ||
      jersey_options[Math.floor(Math.random() * jersey_options.length)];

    rivals_team_1 = rivalries
      .filter((r) => r.team_name_1 == team.school_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_2,
          opponent_team_id: null,
          preferred_week_number: r.preferred_week_number,
          rivalry_name: r.rivalry_name,
        };
      });
    rivals_team_2 = rivalries
      .filter((r) => r.team_name_2 == team.school_name)
      .map(function (r) {
        return {
          opponent_name: r.team_name_1,
          opponent_team_id: null,
          preferred_week_number: r.preferred_week_number,
          rivalry_name: r.rivalry_name,
        };
      });

    rivals = rivals_team_1.concat(rivals_team_2);

    console.log({
      conferences_by_school_name: conferences_by_school_name,
      team: team,
    });

    teams.push({
      team_id: team_id_counter,
      school_name: team.school_name,
      team_name: team.team_name,
      world_id: world_id,
      team_logo_url: team.team_logo_url,
      team_abbreviation: team.team_abbreviation,
      team_color_primary_hex: team.team_color_primary_hex,
      team_color_secondary_hex: team.team_color_secondary_hex,
      rivals: rivals,
      jersey: team.jersey,
      team_ratings: team.team_ratings,
      location: team.location,
      starting_tendencies: team.starting_tendencies,
      conference: {
        conference_id:
          conferences_by_school_name[team.school_name].conference_id,
        conference_name:
          conferences_by_school_name[team.school_name].conference_name,
      },
    });

    team_id_counter += 1;
  }

  teams.push({
    team_id: -1,
    school_name: "Available",
    team_name: "Players",
    world_id: world_id,
    team_abbreviation: "AVAIL",
    team_color_primary_hex: "1763B2",
    team_color_secondary_hex: "FFFFFF",
    rivals: [],
    jersey: {
      invert: false,
      id: "football-standard",
      teamColors: ["#1763B2", "#000000", "#FFFFFF"]
    },
    team_ratings: {},
    location: {
      city: "Washington",
      state: "DC",
    },
    conference: {},
  });

  teams.push({
    team_id: -2,
    school_name: season,
    team_name: "Recruits",
    world_id: world_id,
    team_abbreviation: "RECRUIT",
    team_color_primary_hex: "1763B2",
    team_color_secondary_hex: "FFFFFF",
    rivals: [],
    jersey: {
      invert: false,
      id: "football-standard",
      teamColors: ["#1763B2", "#000000", "#FFFFFF"]
    },
    team_ratings: {},
    location: {
      city: "Washington",
      state: "DC",
    },
    conference: {},
  });

  const teams_by_team_name = index_group_sync(teams, "index", "school_name");

  let city_names = {}
  $.each(teams, function (ind, team) {
    $.each(team.rivals, function (ind, rival) {
      rival.opponent_team_id = teams_by_team_name[rival.opponent_name].team_id;
    });

    city_names[team.location.city] =  (city_names[team.location.city] || 0) + 1
  });

  for (let team of teams){
    team.location.unique_city_name = (city_names[team.location.city] == 1)
  }

  console.log({teams:teams, city_names:city_names})
  var teams_added = await db.team.bulkAdd(teams);

  await update_create_world_modal('create-world-table-new-world', 'create-world-table-create-teams')

  await create_team_season({
    common: common,
    season: season,
    world_id: world_id,
    conferences_by_conference_name: conferences_by_conference_name,
  });

  var team_seasons = await db.team_season
    .where({ season: season })
    .and((ts) => ts.team_id > 0)
    .toArray();

  teams = await db.team.where("team_id").above(0).toArray();
  // teams.forEach(t => delete t.starting_tendencies);
  // await db.team.bulkPut(teams);

  const teams_by_team_id = index_group_sync(
    teams,
    "index",
    "team_id"
  );

  await update_create_world_modal('create-world-table-create-teams', 'create-world-table-create-coaches')

  await create_coaches({
    common: common,
    team_seasons: team_seasons,
    teams_by_team_id: teams_by_team_id,
    world_id: world_id,
    season: season,
  });
  
  await update_create_world_modal('create-world-table-create-coaches', 'create-world-table-assign-coaches')

  var coaches = await db.coach.toArray();
  await create_coach_team_seasons({
    common: common,
    coaches: coaches,
    world_id: world_id,
    team_seasons: team_seasons,
    season: season,
  });

  await update_create_world_modal('create-world-table-assign-coaches', 'create-world-table-create-players')

  await create_new_players_and_player_team_seasons(
    common,
    world_id,
    season,
    team_seasons,
    teams_by_team_id,
    ['HS SR', 'FR', 'SO', 'JR', 'SR']
  );

  await generate_player_ratings(common, world_id, season);

  await update_create_world_modal('create-world-table-create-players', 'create-world-table-assign-players')

  await assign_players_to_teams(common, world_id, season, team_seasons);

  let a = [  
    {stage: 'Creating schedule', stage_row_id: 'create-world-table-create-schedule'},]


  await update_create_world_modal('create-world-table-assign-players', 'create-world-table-depth-charts')
  await populate_all_depth_charts(common);

  await update_create_world_modal('create-world-table-depth-charts', 'create-world-table-team-talent')
  await calculate_team_overalls(common);

  await update_create_world_modal('create-world-table-team-talent', 'create-world-table-recruiting-class')
  await calculate_team_needs(common);
  await create_recruiting_class(common);

  await update_create_world_modal('create-world-table-recruiting-class', 'create-world-table-rankings')
  const all_weeks = await db.week.where({ season: season }).toArray();
  const this_week = all_weeks.filter((w) => w.is_current)[0];

  this_week.phase = await db.phase.get({ phase_id: this_week.phase_id });
  this_week.phase.season = season;

  console.log("this_week", this_week, all_weeks, common);

  await calculate_national_rankings(this_week, all_weeks, common);
  await calculate_conference_rankings(this_week, all_weeks, common);

    await update_create_world_modal('create-world-table-rankings', 'create-world-table-create-schedule')
    await create_schedule({
    common: common,
    season: season,
    world_id: world_id,
  });

  await choose_preseason_all_americans(common);

  await update_create_world_modal('create-world-table-create-schedule', null)


  conferences = await db.conference.toArray();
  teams = await db.team.filter(t => t.team_id > 0).toArray();
  console.log({teams:teams});
  teams.sort(function(t_a, t_b){
    if (t_b.conference.conference_name > t_a.conference.conference_name){
      return -1;
    }
    else if (t_b.conference.conference_name < t_a.conference.conference_name){
      return 1;
    }
    else {
      if (t_b.school_name > t_a.school_name){
        return -1;
      }
      else if (t_b.school_name < t_a.school_name){
        return 1;
      }
    }
    return 0;
  })
  console.log({teams:teams})
  var url = "/static/html_templates/index/index/choose_team_table_template.njk";
  var html = await fetch(url);
  html = await html.text();

  let render_content = {
    teams: teams
  };

  const renderedHtml = common.nunjucks_env.renderString(html, render_content);

  $(".choose-team-table").html(renderedHtml);
  $('.create-progress-table').addClass('w3-hide');
  $('.choose-team-table').removeClass('w3-hide');

  const current_league_season = await db.league_season
    .where({ season: season })
    .first();
  const world = await ddb.world.get({ world_id: world_id });

  $('.choose-team-table button').on('click', async function(){
    let team_id = parseInt($(this).closest('[team-id]').attr('team-id'));
    const user_team = await db.team.get({
      team_id: team_id,
    });

    const user_team_season = await db.team_season.get({
      team_id: team_id,
      season: current_league_season.season
    });

    console.log({
      user_team: user_team,
      user_team_season:user_team_season,
      current_league_season: current_league_season,
      team_id:team_id, 
      teams:teams,
      this: $(this)
    });

    current_league_season.user_team_id = team_id;
    user_team_season.is_user_team = true;
    user_team.is_user_team = true;

    world.user_team.team_name = user_team.team_name;
    world.user_team.school_name = user_team.school_name;
    world.user_team.team_logo_url = user_team.team_logo;
    world.user_team.team_record = "0-0";
    world.user_team.team_id = user_team.team_id;
  
    await ddb.world.put(world);
    await db.league_season.put(current_league_season);
    await db.team_season.put(user_team_season);
    await db.team.put(user_team);
  
    window.location.href = `/World/${world_id}`;
  })


};