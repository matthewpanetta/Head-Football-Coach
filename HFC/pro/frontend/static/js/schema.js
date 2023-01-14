import { deep_copy, round_decimal, normal_trunc, sum } from "/common/js/utils.js";
import {day_of_week_map} from "./metadata.js";

export class headline {
  constructor(headline_id, week_id, headline_text, headline_type, headline_relevance) {
    this.headline_id = headline_id;
    this.week_id = week_id;
    this.headline_text = headline_text;
    this.headline_type = headline_type;
    this.headline_relevance = headline_relevance;
  }
}

export class award {
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
          award_name = `${this.season} ${this.award_group_type} Trophy`;
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
    console.log({ this: this });
    var award_group_name = "";
    var award_name = "";
    if (this.award_team_set == "conference") {
      if (this.award_timeframe == "week") {
        award_group_name = `${this.conference_season.conference.conference_abbreviation} ${this.award_group_type} Player of the Week`;
        award_name = `${this.week.week_name}, ${this.week.season}`;
      } else if (this.award_timeframe == "regular season") {
        if (this.award_group == "individual") {
          award_group_name = `${this.conference_season.conference.conference_abbreviation} POTY`;
          award_name = `${this.season}`;
        } else {
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
        if (this.award_group == "position") {
          if (this.award_team == "First") {
            award_group_name = `All-American ${this.award_group_type}`;
          } else {
            award_group_name = `${this.award_team} Team All-American ${this.award_group_type}`;
          }
          award_name = `${this.season}`;
        } else {
          award_group_name = this.award_group_type + " Trophy";
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

export class player_team_game {
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
        (this.game_stats.passing.completions * 100) / this.game_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(
        (this.game_stats.passing.completions * 100) / this.game_stats.passing.attempts,
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
      return this.completion_percentage;
    }

    return 0;
  }

  get passing_yards_per_attempt() {
    if (this.game_stats.passing.attempts) {
      return round_decimal(this.game_stats.passing.yards / this.game_stats.passing.attempts, 1);
    }

    return 0;
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(this.game_stats.rushing.yards / this.game_stats.rushing.carries, 1);
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

export class day {
  constructor(date, is_current) {
    
    this.date = new Date(date);
    this.is_current = is_current;
    this.date_display = this.date.toISOString().slice(0,10)
    this.day_of_week = day_of_week_map[this.date.getDay()];
    this.day_of_week_short = day_of_week_map[this.date.getDay()].slice(0,3);

    let next_date = new Date(this.date)
    next_date.setDate(next_date.getDate() + 1);
    this.next_date_display = next_date.toISOString().slice(0,10);
  }
}

export class week {
  constructor() {}

  get world_href() {
    return `/World/${this.world_id}/`;
  }

  get week_href() {
    return `/World/${this.world_id}/Week/${this.short_name}`;
  }
}

export class phase {
  constructor() {}
}

export class world {
  constructor() {}

  get world_href() {
    return `/World/${this.world_id}/`;
  }
}

export class team_game {
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
      ties: 0,
      conference_wins: 0,
      conference_losses: 0,
      conference_ties: 0,
      division_wins: 0,
      division_losses: 0,
      division_ties: 0,
    };
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

  get game_href() {
    return `World/${this.world_id}/Game/${this.game_id}`;
  }

  get game_location() {
    return this.is_home_team ? "home" : "away";
  }

  get game_location_char() {
    return this.is_home_team ? "vs." : "@";
  }

  get game_outcome_letter() {
    if (this.is_winning_team) {
      return "W";
    } else if (this.is_winning_team == false) {
      return "L";
    }
    return "";
  }

  get record_display() {
    if (this.record.ties){
      return `${this.record.wins} - ${this.record.losses} - ${this.record.ties}`;
    }
    return `${this.record.wins} - ${this.record.losses}`;
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

  get power_rank_display() {
    if (this.power_rank == null) {
      return null;
    }
    if (this.power_rank <= 25) {
      return `(${this.power_rank})`;
    }
    return "";
  }

  get rushing_yards_per_carry() {
    if (this.game_stats.rushing.carries) {
      return round_decimal(this.game_stats.rushing.yards / this.game_stats.rushing.carries, 1);
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
    return round_decimal(this.total_yards / this.plays, 1);
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

export class team {
  constructor(init_data) {
    for (let key in init_data) {
      this[key] = init_data[key];
    }
  }

  build_team_logo(size_obj) {
    var folder_prefix = "/static/img/team_logos/";
    var size_suffix = "";
    if ("img_size" in size_obj) {
      size_suffix = "_" + size_obj["img_size"];
    }

    if (this.team_id < 0) {
      var path = folder_prefix + "nfl.png";
    } else {
      var path = folder_prefix + this.team_name + "_" + this.team_nickname + size_suffix + ".png";
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
    if (this.team_name.length > 12) {
      if (this.team_nickname.length > 10) {
        return this.team_abbreviation;
      }
      return this.team_nickname;
    }
    return this.team_name;
  }

  get team_field_b_text() {
    if (this.team_nickname.length > 12) {
      if (this.team_name.length > 10) {
        return this.team_abbreviation;
      }
      return this.team_name;
    }
    return this.team_nickname;
  }

  get team_name() {
    return `${this.team_location_name} ${this.team_nickname}`;
  }

  get team_href() {
    if (this.team_id == -2) {
      return `/World/${this.world_id}/Recruiting`;
    }
    return `/World/${this.world_id}/Team/${this.team_id}`;
  }

  get team_logo() {
    if (false && this.team_logo_url && this.team_logo_url.length > 0) {
      return this.team_logo_url;
    } else {
      var folder_prefix = "/static/img/team_logos/";
      var size_suffix = "";

      if (this.team_id < 0) {
        var path = folder_prefix + "ncaa.png";
      } else {
        var path = folder_prefix + this.team_location_name + "_" + this.team_nickname + size_suffix;
      }

      path = path
        .toLowerCase()
        .replaceAll(" ", "_")
        .replaceAll("&", "_")
        .replaceAll("'", "")
        .replaceAll(".", "")
        .replaceAll("-", "_");

      path = path + ".png";

      return path;
    }
  }

  get team_logo_helmet(){
    return this.team_logo.replace('.png', '_helmet.png')
  }

  get team_helmet_svg(){
    
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

export class league_season {
  constructor(init_obj, previous_season) {
    this.season = init_obj.season;
    this.world_id = init_obj.world_id;
    this.is_season_complete = false;

    this.playoffs = {
      playoffs_started: false,
      playoffs_complete: false,
      number_playoff_rounds: 4,
      number_playoff_teams: 12,
      // playoff_rounds: [
      //   {
      //     playoff_round_number: 1,
      //     is_current_round: false,
      //     is_championship: false,
      //     week_name: "Bowl Week 1",
      //     next_week_name: "Bowl Week 2",
      //     round_name: "National Quarterfinals",
      //     playoff_games: [
      //       {
      //         team_objs: [{ seed: 1, team_game_id: null, team_season_id: null }],
      //         bye_game: true,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [
      //           { seed: 8, team_game_id: null, team_season_id: null },
      //           { seed: 9, team_game_id: null, team_season_id: null },
      //         ],
      //         bye_game: false,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [{ seed: 4, team_game_id: null, team_season_id: null }],
      //         bye_game: true,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [
      //           { seed: 5, team_game_id: null, team_season_id: null },
      //           { seed: 12, team_game_id: null, team_season_id: null },
      //         ],
      //         bye_game: false,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [{ seed: 2, team_game_id: null, team_season_id: null }],
      //         bye_game: true,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [
      //           { seed: 7, team_game_id: null, team_season_id: null },
      //           { seed: 10, team_game_id: null, team_season_id: null },
      //         ],
      //         bye_game: false,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [{ seed: 3, team_game_id: null, team_season_id: null }],
      //         bye_game: true,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [
      //           { seed: 6, team_game_id: null, team_season_id: null },
      //           { seed: 11, team_game_id: null, team_season_id: null },
      //         ],
      //         bye_game: false,
      //         seeds_set: true,
      //         game_id: null,
      //       },
      //     ],
      //   },
      //   {
      //     playoff_round_number: 2,
      //     is_current_round: false,
      //     is_championship: false,
      //     week_name: "Bowl Week 2",
      //     next_week_name: "Bowl Week 3",
      //     round_name: "National Quarterfinals",
      //     playoff_games: [
      //       {
      //         team_objs: [],
      //         bye_game: false,
      //         seeds_set: false,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [],
      //         bye_game: false,
      //         seeds_set: false,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [],
      //         bye_game: false,
      //         seeds_set: false,
      //         game_id: null,
      //       },
      //       {
      //         team_objs: [],
      //         bye_game: false,
      //         seeds_set: false,
      //         game_id: null,
      //       },
      //     ],
      //   },
      //   {
      //     playoff_round_number: 3,
      //     is_current_round: false,
      //     is_championship: false,
      //     week_name: "Bowl Week 3",
      //     next_week_name: "Bowl Week 4",
      //     round_name: "National Semifinals",
      //     playoff_games: [
      //       { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
      //       { team_objs: [], bye_game: false, seeds_set: false, game_id: null },
      //     ],
      //   },
      //   {
      //     playoff_round_number: 4,
      //     is_current_round: false,
      //     is_championship: true,
      //     week_name: "Bowl Week 4",
      //     next_week_name: null,
      //     round_name: "National Championship",
      //     playoff_games: [{ team_objs: [], bye_game: false, seeds_set: false, game_id: null }],
      //   },
      // ],
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

export class team_season_stats {
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

    return round_decimal(this.season_stats.team.points / this.season_stats.games.games_played, 1);
  }

  get kicking_field_goal_percentage() {
    if (this.season_stats.kicking.fga == 0) {
      return 0;
    }
    return round_decimal((this.season_stats.kicking.fgm * 100) / this.season_stats.kicking.fga, 1);
  }

  get kicking_extra_point_percentage() {
    if (this.season_stats.kicking.xpa == 0) {
      return 0;
    }
    return round_decimal((this.season_stats.kicking.xpm * 100) / this.season_stats.kicking.xpa, 1);
  }

  get punting_average_yards() {
    if (this.season_stats.punting.punts == 0) {
      return 0;
    }
    return round_decimal(this.season_stats.punting.yards / this.season_stats.punting.punts, 1);
  }

  get completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) / this.season_stats.passing.attempts,
        1
      );
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.season_stats.passing.attempts) {
      return round_decimal(
        (this.season_stats.passing.completions * 100) / this.season_stats.passing.attempts,
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
    return round_decimal(this.season_stats.passing.yards / this.season_stats.passing.attempts, 1);
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
      this.opponent_season_stats.passing.yards / this.opponent_season_stats.passing.attempts,
      1
    );
  }

  get points_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.team.points / this.season_stats.games.games_played,
      1
    );
  }

  get point_differential_per_game() {
    return round_decimal(this.points_per_game - this.points_allowed_per_game, 1);
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

  get sack_dropback_percent() {
    if (this.season_stats.passing.attempts == 0) {
      return 0;
    }

    return round_decimal(
      (this.season_stats.passing.sacks * 100) / this.season_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.season_stats.passing.yards / this.season_stats.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.season_stats.rushing.yards / this.season_stats.games.games_played, 1);
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

  get play_call_percent_rush() {
    if (this.plays == 0) {
      return 0;
    }

    return round_decimal((this.season_stats.rushing.carries * 100) / this.plays, 1);
  }

  get play_call_percent_pass() {
    if (this.plays == 0) {
      return 0;
    }

    return round_decimal((this.season_stats.passing.attempts * 100) / this.plays, 1);
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
        this.season_stats.receiving.yards / this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get receiving_yards_per_catch_qualified() {
    if (this.season_stats.receiving.receptions > 10) {
      return round_decimal(
        this.season_stats.receiving.yards / this.season_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }

  get rushing_yards_per_carry() {
    if (this.season_stats.rushing.carries) {
      return round_decimal(this.season_stats.rushing.yards / this.season_stats.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.season_stats.rushing.carries > 0 &&
      this.season_stats.rushing.carries / this.season_stats.games.games_played > 10
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
      this.opponent_season_stats.rushing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get opponent_receiving_yards_per_game() {
    if (this.opponent_season_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(
      this.opponent_season_stats.receiving.yards / this.opponent_season_stats.games.games_played,
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
        this.opponent_season_stats.rushing.yards / this.opponent_season_stats.rushing.carries,
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
    return round_decimal(this.yards / this.plays, 1);
  }

  get yards_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(this.yards / this.season_stats.team.field_position.total_drives, 1);
  }

  get points_per_drive() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(
      this.season_stats.team.points / this.season_stats.team.field_position.total_drives,
      1
    );
  }

  get drive_turnover_percent() {
    if (this.season_stats.team.field_position.total_drives == 0) {
      return 0;
    }
    return round_decimal(
      (this.turnovers * 100) / this.season_stats.team.field_position.total_drives,
      1
    );
  }

  get yards_per_game() {
    return round_decimal(this.passing_yards_per_game + this.rushing_yards_per_game, 1);
  }

  get yards_allowed() {
    return this.opponent_season_stats.passing.yards + this.opponent_season_stats.rushing.yards;
  }

  get yards_allowed_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(this.yards_allowed / this.season_stats.games.games_played, 1);
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
      this.third_down_conversion_percentage - this.defensive_third_down_conversion_percentage,
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
      this.opponent_season_stats.passing.yards / this.season_stats.games.games_played,
      1
    );
  }

  get opponent_rushing_yards_per_game() {
    if (this.season_stats.games.games_played == 0) {
      return 0;
    }

    return round_decimal(
      this.opponent_season_stats.rushing.yards / this.season_stats.games.games_played,
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

export class team_season {
  constructor(init_obj) {
    if (init_obj.team_id > 0) {
      this.record = {
        wins: 0,
        losses: 0,
        ties: 0,
        conference_wins: 0,
        conference_losses: 0,
        conference_ties: 0,
        division_wins: 0,
        division_losses: 0,
        division_ties: 0,
        conference_net_wins: 0,
        division_net_wins: 0,
        games_played: 0,
        conference_gb: 0,
        division_gb: 0,
        win_streak: 0,
        defeated_teams: [],
      };
      this.rankings = {
        division_rank: [],
        power_rank: [],
        srs_ratings: [],
        power_rank_delta: 0,
        power_rank_delta_abs: 0,
        stat_rankings: { offense: [], defense: [], overall: [] },
      };
      this.games = [];
      this.playoff = {};
      this.broadcast = {
        national_broadcast: 0,
        regional_broadcast: 0,
      };
      this.results = {
        made_playoff: false,
        division_champion: false,
        conference_champion: false,
        league_champion: false,
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
    return Math.min(...this.rankings.power_rank);
  }

  get worst_rank() {
    return Math.max(...this.rankings.power_rank);
  }

  get first_rank() {
    return this.rankings.power_rank[this.rankings.power_rank.length - 1];
  }

  get weeks_ranked_1() {
    return this.rankings.power_rank.filter((rank) => rank == 1).length;
  }

  get weeks_ranked_top_5() {
    return this.rankings.power_rank.filter((rank) => rank <= 5).length;
  }

  get weeks_ranked_top_10() {
    return this.rankings.power_rank.filter((rank) => rank <= 10).length;
  }

  get weeks_ranked_top_25() {
    return this.rankings.power_rank.filter((rank) => rank <= 25).length;
  }

  get power_rank() {
    return this.rankings.power_rank[0];
  }

  get division_rank() {
    return this.rankings.division_rank[0];
  }

  get power_rank_display() {
    if (this.rankings.power_rank[0] <= 25) {
      return `(${this.rankings.power_rank[0]})`;
    }
    return "";
  }

  get record_display() {
    if (this.record.ties){
      return `${this.record.wins} - ${this.record.losses} - ${this.record.ties}`;
    }
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

export class coach {
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

    let pass_tendency = round_decimal(normal_trunc(50, 50, 1, 100), 0);
    this.tendencies = {
      pass: pass_tendency,
      run: 100 - pass_tendency,
      playclock_urgency: round_decimal(normal_trunc(4, 2, 1, 7), 0),
    };

    this.personality = {
      leadership: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      work_ethic: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      desire_for_winner: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      loyalty: round_decimal(normal_trunc(10, 3, 1, 100), 0),
      desire_for_playtime: round_decimal(normal_trunc(10, 3, 1, 100), 0),
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

export class coach_team_season {
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

export class player {
  constructor(init_data) {
    for (let key in init_data){
      this[key] = init_data[key]
    }

    this.jersey_number = null;

    this.personality = {
      leadership: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      work_ethic: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      desire_for_winner: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      loyalty: round_decimal(normal_trunc(50, 15, 1, 100), 0),
      desire_for_playtime: round_decimal(normal_trunc(50, 15, 1, 100), 0),
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
    return (703.0 * this.weight) / this.height ** 2;
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
      "this.career_stats": this.career_stats,
      "this.career_stats.rushing.carries": this.career_stats.rushing.carries,
    });
    if (this.career_stats.rushing.carries) {
      return round_decimal(this.career_stats.rushing.yards / this.career_stats.rushing.carries, 1);
    }
    return 0;
  }

  get is_qualified_rusher() {
    if (
      this.career_stats.games.games_played > 0 &&
      this.career_stats.rushing.carries / this.career_stats.games.games_played > 10
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
      (this.career_stats.passing.completions * 100) / this.career_stats.passing.attempts,
      1
    );
  }

  get passing_completion_percentage() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(
      (this.career_stats.passing.completions * 100) / this.career_stats.passing.attempts,
      1
    );
  }

  get passing_yards_per_attempt() {
    if (this.career_stats.passing.attempts < 50) {
      return 0;
    }
    return round_decimal(this.career_stats.passing.yards / this.career_stats.passing.attempts, 1);
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
    return round_decimal(this.career_stats.passing.yards / this.career_stats.games.games_played, 1);
  }

  get rushing_yards_per_game() {
    if (this.career_stats.games.games_played == 0) {
      return 0;
    }
    return round_decimal(this.career_stats.rushing.yards / this.career_stats.games.games_played, 1);
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
      this.career_stats.rushing.carries / this.career_stats.games.games_played > 10
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
        this.career_stats.receiving.yards / this.career_stats.receiving.receptions,
        1
      );
    }
    return 0;
  }
}

export class player_team_season_stats {
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
      return round_decimal((this.passing.completions * 100) / this.passing.attempts, 1);
    }
    return 0;
  }

  get passing_completion_percentage() {
    if (this.passing.attempts) {
      return round_decimal((this.passing.completions * 100) / this.passing.attempts, 1);
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
      (this.passing.attempts * 1.0) / this.games.games_played > 10
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
    if (this.games.games_played > 0 && this.rushing.carries / this.games.games_played > 10) {
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
      sum(this.top_12_weighted_game_scores.slice(0, 12)) /
        this.top_12_weighted_game_scores.slice(0, 12).length,
      1
    );
  }
}

export class recruit_team_season {
  constructor(init_data) {
    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }
}

export class player_team_season {
  constructor(init_data) {
    this.player_id = init_data.player_id;
    this.player_team_season_id = init_data.player_team_season_id;
    this.is_recruit = false;
    this.post_season_movement = null; //[quit, graduate, draft, transfer]
    this.is_captain = false;
    this.ratings = init_data.ratings;

    for (const key in init_data) {
      this[key] = init_data[key];
    }
  }

  get player_award_rating() {
    let position_overall_map = {
      QB: 0,
      RB: -0.05,
      FB: -0.5,
      WR: -0.1,
      TE: -0.2,
      OT: -0.3,
      IOL: -0.3,
      EDGE: -0.2,
      DL: -0.2,
      LB: -0.25,
      CB: -0.25,
      S: -0.25,
      K: -0.5,
      P: -0.5,
    };
    return (
      (10 * this.season_stats.average_weighted_game_score +
        1 * this.ratings.overall.overall +
        0.5 * this.team_season.team.team_ratings.brand) *
      (1 / this.team_season.power_rank) ** 0.03 *
      // (1 / (this.team_season_average_weighted_game_score_rank || 1)) ** 0.05 *
      // (1 / (this.team_season_overall_rank || 1)) ** 0.03 *
      (1 + position_overall_map[this.position]) *
      (1 - 0.01 * ((this.player_team_overall_rank || 1) - 1)) ** 1.5
    );
  }
}

export class game {
  get game_href() {
    return `/World/${this.world_id}/Game/${this.game_id}`;
  }

  get score_display() {
    var points = `${this.outcome.winning_team.points} - ${this.outcome.losing_team.points}`;
    return points;
  }
}

export class conference_season {}

export class conference {
  constructor(init_data) {
    for (let key in init_data) {
      this[key] = init_data[key];
    }
  }

  get conference_href() {
    return `/World/${this.world_id}/Conference/${this.conference_id}`;
  }

  get conference_logo() {
    var folder_prefix = "/static/img/conference_logos/";

    if (this.conference_id < 0) {
      var path = folder_prefix + "ncaa.png";
    } else {
      var path = folder_prefix + this.conference_name + ".png";
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
    console.log({
      this: this,
      conference_color_secondary_hex: this.conference_color_secondary_hex,
    });
    if (this.luma(this.conference_color_secondary_hex) < 230) {
      return this.conference_color_secondary_hex;
    }
    return "000000";
  }
}
