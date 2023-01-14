import { generate_game_headlines } from "/static/js/headlines.js";
import {
  index_group_sync,
  get,
  set,
  distinct,
  sum,
  nest_children,
  intersect,
  set_intersect,
  union,
  weighted_random_choice,
  set_union,
  shuffle,
  except,
  set_except,
  get_from_dict,
  deep_copy,
  calculate_game_score,
  average,
  seconds_to_time,
  increment_parent,
} from "/common/js/utils.js";

export const sim_game = (game_dict, common) => {
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
  if (game_dict.teams[1].team_location_name == "SMU" || game_dict.teams[0].team_location_name == "TCU") {
    game_dict.home_field_advantage_modifier = 1.03;
  } else if (game_dict.teams[0].team_location_name == "SMU" || game_dict.teams[1].team_location_name == "TCU") {
    game_dict.home_field_advantage_modifier = 0.97;
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
    yards_to_go = 10,
    down = 1,
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

  Object.entries(game_dict.player_team_games).forEach(
    ([player_team_season_id, ptg]) => (ptg.game_attrs = { energy: 1.0 })
  );

  var home_team_players = pick_players_on_field(
    game_info[offensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,
    60 * 15,
    0
  );
  var away_team_players = pick_players_on_field(
    game_info[defensive_team_index].depth_chart,
    game_dict.player_team_seasons,
    game_dict.players,
    game_dict.player_team_games,
    "all",
    1,
    60 * 15,
    0
  );

  var all_players_both_teams = home_team_players.all_players.concat(away_team_players.all_players);
  for (var player_obj of all_players_both_teams) {
    player_obj.player_team_game.game_stats.games.games_started = 1;
  }

  for (const period of periods) {
    var scoring_period = { period_number: period, points: [0, 0] };

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

    var seconds_left_in_period = seconds_per_period;

    while (seconds_left_in_period > 0) {
      if (first_down) {
        yards_to_go = 10;
        down = 1;

        var offense_point_differential =
          scoring.final[offensive_team_index] - scoring.final[defensive_team_index];

        var offensive_team_players = pick_players_on_field(
          game_info[offensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "offense",
          period,
          seconds_left_in_period,
          offense_point_differential
        );
        var defensive_team_players = pick_players_on_field(
          game_info[defensive_team_index].depth_chart,
          game_dict.player_team_seasons,
          game_dict.players,
          game_dict.player_team_games,
          "defense",
          period,
          seconds_left_in_period,
          -1 * offense_point_differential
        );

        var all_players_both_teams = offensive_team_players.all_players.concat(
          defensive_team_players.all_players
        );
        for (var player_obj of all_players_both_teams) {
          player_obj.player_team_game.game_stats.games.games_played = 1;
        }

        update_player_energy(
          game_dict,
          offensive_team_players.all_players,
          offensive_team_players.bench_players,
          plays_since_last_sub,
          offensive_team_index
        );
        update_player_energy(
          game_dict,
          defensive_team_players.all_players,
          defensive_team_players.bench_players,
          plays_since_last_sub,
          defensive_team_index
        );

        var qb_ovrs_to_add = [];
        for (let i = 0; i <= 4; i++) {
          qb_ovrs_to_add.push(
            offensive_team_players.by_position.QB[0].player_team_game.game_attrs.adjusted_overall
          );
        }
        var offense_players_ovrs = offensive_team_players.all_players
          .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
          .concat(qb_ovrs_to_add);

        var offensive_player_average_overall = average(offense_players_ovrs);

        var defensive_player_average_overall = average(
          defensive_team_players.all_players.map(
            (player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall
          )
        );

        var offensive_player_average_overall_difference = Math.floor(
          offensive_player_average_overall - defensive_player_average_overall
        );

        plays_since_last_sub = 0;
      }

      first_down = false;
      var clock_running = true;
      var yards_this_play = 0;
      var points_this_drive = 0;
      plays_since_last_sub += 1;
      var play_details = { yards: null, description: null };
      var playcall_obj = game_sim_play_call_options(
        down,
        yards_to_go,
        field_position,
        period,
        offense_point_differential,
        seconds_left_in_period,
        false,
        false,
        false,
        false
      );

      var play_choice_options = playcall_obj.play_choice_options;
      play_choice_options.pass = parseInt(
        (play_choice_options.pass || 0) *
          (game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency / 50.0)
      );
      play_choice_options.run = parseInt(
        (play_choice_options.run || 0) *
          ((100 - game_dict.team_seasons[offensive_team_index].gameplan.offense.pass_tendency) /
            50.0)
      );
      var playclock_urgency = playcall_obj.playclock_urgency;
      var play_choice = weighted_random_choice(play_choice_options);
      if (play_choice == "qb_kneel") {
        play_choice = "run";
      }

      play_details.play_choice = play_choice;

      if (play_choice == "pass") {
        var chosen_qb_index = 0;

        var chosen_players = {
          QB: offensive_team_players.by_position["QB"][0],
          OT_List: offensive_team_players.by_position["OT"].concat(
            offensive_team_players.by_position["IOL"]
          ),
        };

        var valid_pass_catchers = offensive_team_players.by_position["WR"]
          .concat(offensive_team_players.by_position["TE"])
          .concat(offensive_team_players.by_position["RB"]);
        var valid_pass_catchers_weights = valid_pass_catchers.map(function (player_obj) {
          var odds = player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
          if (player_obj.player_team_season.position == "TE") {
            odds *= 0.9;
          } else if (player_obj.player_team_season.position != "WR") {
            odds *= 0.4;
          }
          return [player_obj, odds];
        });
        chosen_players.Pass_Catcher = weighted_random_choice(valid_pass_catchers_weights);

        for (var PTS of chosen_players.OT_List) {
          PTS.player_team_game.game_stats.blocking.blocks += 1;
        }

        var r = -1;
        while (r < 0 || r > 1) {
          r =
            Math.random() /
            (offensive_player_average_overall / defensive_player_average_overall) ** 1.1;
        }

        if (r < 0.6) {
          //completion
          yards_this_play = Math.min(Math.floor(Math.random() * 23), 100 - field_position);

          if (r < 0.03) {
            yards_this_play = 100 - field_position;
          }

          chosen_players.QB.player_team_game.game_stats.passing.attempts += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.targets += 1;

          chosen_players.QB.player_team_game.game_stats.passing.completions += 1;
          chosen_players.QB.player_team_game.game_stats.passing.yards += yards_this_play;

          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.receptions += 1;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.yards +=
            yards_this_play;
          chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.lng = Math.max(
            chosen_players.Pass_Catcher.player_team_game.game_stats.receiving.lng,
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
            chosen_players.OT_List[Math.floor(Math.random() * chosen_players.OT_List.length)];
          chosen_players.OL_Sack_Allowed.player_team_game.game_stats.blocking.sacks_allowed += 1;

          yards_this_play = Math.floor(Math.random() * 7) - 8;
        } else {
          //interception
          chosen_players.QB.player_team_game.game_stats.passing.ints += 1;

          var valid_interceptor = defensive_team_players.by_position["CB"]
            .concat(defensive_team_players.by_position["S"])
            .concat(defensive_team_players.by_position["LB"]);
          var valid_interceptor_weights = valid_interceptor.map(function (player_obj) {
            var odds = player_obj.player_team_game.game_attrs.adjusted_overall ** 3;
            if (player_obj.player_team_season.position == "S") {
              odds *= 0.8;
            } else if (player_obj.player_team_season.position != "CB") {
              odds *= 0.4;
            }
            return [player_obj, odds];
          });
          chosen_players.Interceptor = weighted_random_choice(valid_interceptor_weights);

          chosen_players.Interceptor.player_team_game.game_stats.defense.ints += 1;

          game_dict.team_games[offensive_team_index].game_stats.team.turnovers += 1;

          play_details.yards = 0;
          play_details.play_player_ids = [
            chosen_players.QB.player.player_id,
            chosen_players.Interceptor.player.player_id,
          ];
          //play_details.description = `<a href="${chosen_players.QB.player.player_href}">${chosen_players.QB.player.full_name}</a> intercepted by <a href="${chosen_players.Interceptor.player.player_href}">${chosen_players.Interceptor.player.full_name}</a>`;

          drive_summary.drive_end.play_type = "INT";
          drive_summary.drive_end.play_description = `{player_0} intercepted by {player_1}`;
          drive_summary.drive_end.play_player_ids = [
            chosen_players.QB.player.player_id,
            chosen_players.Interceptor.player.player_id,
          ];

          drive_end = true;
          yards_this_play = 0;
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [
          chosen_players.QB.player.player_id,
          chosen_players.Pass_Catcher.player.player_id,
        ];
        play_details.description = `{player_0} ${yards_this_play} yard pass to {player_1}`;
      } else if (play_choice == "run") {
        var offensive_front_7_average_overall = average(
          offensive_team_players.by_position["OT"]
            .concat(offensive_team_players.by_position["IOL"])
            .concat(offensive_team_players.by_position["RB"])
            .concat(offensive_team_players.by_position["TE"])
            .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
        );
        var defensive_front_7_average_overall = average(
          defensive_team_players.by_position["DL"]
            .concat(defensive_team_players.by_position["EDGE"])
            .concat(defensive_team_players.by_position["LB"])
            .map((player_obj) => player_obj.player_team_game.game_attrs.adjusted_overall)
        );

        yards_this_play = Math.min(
          Math.floor(
            Math.random() *
              (12.5 *
                (offensive_front_7_average_overall / defensive_front_7_average_overall) ** 1.4)
          ) - 2,
          100 - field_position
        );

        var runner_random = Math.random();

        if (runner_random < 0.92) {
          chosen_players = {
            Runner: offensive_team_players.by_position["RB"][0],
          };
        } else if (runner_random < 0.97) {
          chosen_players = {
            Runner: offensive_team_players.by_position["QB"][0],
          };
        } else {
          var chosen_wr_index = Math.floor(
            Math.random() * offensive_team_players.by_position["WR"].length
          );
          chosen_players = {
            Runner: offensive_team_players.by_position["WR"][chosen_wr_index],
          };
        }

        play_details.yards = yards_this_play;
        play_details.play_player_ids = [chosen_players.Runner.player.player_id];
        play_details.description = `{player_0} ${yards_this_play} yard run`;

        chosen_players.Runner.player_team_game.game_attrs.energy -= 0.01;

        chosen_players.Runner.player_team_game.game_stats.rushing.carries += 1;
        chosen_players.Runner.player_team_game.game_stats.rushing.yards += yards_this_play;
        //console.log('Lng run', {'chosen_players.Runner.player_team_game.game_stats.rushing.lng': chosen_players.Runner.player_team_game.game_stats.rushing.lng, 'yards_this_play': yards_this_play, 'Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)': Math.max(chosen_players.Runner.player_team_game.game_stats.rushing.lng, yards_this_play)})
        chosen_players.Runner.player_team_game.game_stats.rushing.lng = Math.max(
          chosen_players.Runner.player_team_game.game_stats.rushing.lng,
          yards_this_play
        );
      } else if (play_choice == "field_goal") {
        drive_end = true;
        var kick_distance = 117 - field_position;

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

        var kick_odds = 0.9;
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
        chosen_players.K.player_team_game.game_stats.kicking[`fga_${distance_key}`] += 1;

        play_details.yards = 0;
        play_details.description = `${kick_distance} yard field goal MISSED`;

        drive_summary.drive_end.play_type = "FG MISS";
        drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
        drive_summary.drive_end.play_description = `{player_0} MISSED ${kick_distance} yard field goal`;

        var kick_made = false;
        if (Math.random() < kick_odds) {
          kick_made = true;
          points_this_drive = 3;

          play_details.description = `${kick_distance} yard field goal MADE`;

          drive_summary.drive_end.play_type = "FG MADE";
          drive_summary.drive_end.play_player_ids = [chosen_players.K.player.player_id];
          drive_summary.drive_end.play_description = `{player_0} MADE ${kick_distance} yard field goal`;

          chosen_players.K.player_team_game.game_stats.kicking.fgm += 1;
          chosen_players.K.player_team_game.game_stats.kicking[`fgm_${distance_key}`] += 1;
          chosen_players.K.player_team_game.game_stats.kicking.lng = Math.max(
            chosen_players.K.player_team_game.game_stats.kicking.lng,
            kick_distance
          );
          chosen_players.K.player_team_game.game_stats.games.points += 3;
        }
      } else if (play_choice == "punt") {
        drive_end = true;
        yards_this_play = 0;

        var punt_distance = Math.min(Math.floor(Math.random() * 40) + 20, 99 - field_position);

        var chosen_p_index = 0;
        chosen_players = {
          P: offensive_team_players.by_position["P"][0],
        };

        chosen_players.P.player_team_game.game_stats.punting.punts += 1;
        chosen_players.P.player_team_game.game_stats.punting.yards += punt_distance;
        chosen_players.P.player_team_game.game_stats.punting.lng = Math.max(
          chosen_players.P.player_team_game.game_stats.punting.lng,
          punt_distance
        );

        play_details.yards = 0;
        play_details.description = `${punt_distance} yard punt`;

        drive_summary.drive_end.play_type = "PUNT";
        drive_summary.drive_end.play_player_ids = [chosen_players.P.player.player_id];
        drive_summary.drive_end.play_description = `{player_0} ${punt_distance} yard punt`;
      }

      if (down <= 3) {
        game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency[down].total += 1;
        game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency.all.total += 1;
        if (yards_this_play >= down_efficiency_map[down] * yards_to_go) {
          game_dict.team_games[offensive_team_index].game_stats.team.down_efficiency[
            down
          ].success += 1;
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

        game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.total += 1;

        if (play_choice == "pass") {
          game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.passing += 1;
        } else if (play_choice == "run") {
          game_dict.team_games[offensive_team_index].game_stats.team.downs.first_downs.rushing += 1;
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
              Math.floor(Math.random() * defensive_team_players.all_players.length)
            ];

          chosen_players = {
            Tackler: {
              player: game_dict.players[chosen_tackler_player_team_season.player_id],
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
        game_dict.team_games[offensive_team_index].game_stats.team.downs.third_downs.attempts += 1;
        if (first_down) {
          game_dict.team_games[
            offensive_team_index
          ].game_stats.team.downs.third_downs.conversions += 1;
        }
      } else if (down == 4 && ("pass" == play_choice || "run" == play_choice)) {
        game_dict.team_games[offensive_team_index].game_stats.team.downs.fourth_downs.attempts += 1;
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
        seconds_this_play = Math.floor(Math.random() * 10) + (33 - playclock_urgency * 4);
      } else {
        seconds_this_play = Math.floor(Math.random() * 4) + 1;
      }

      seconds_this_play = Math.min(seconds_this_play, seconds_left_in_period);

      seconds_left_in_period = seconds_left_in_period - seconds_this_play;
      seconds_this_drive += seconds_this_play;
      game_dict.team_games[offensive_team_index].game_stats.team.time_of_possession +=
        seconds_this_play;

      //drive_summary.plays.push(play_details);

      if (drive_end) {
        scoring_period.points[offensive_team_index] += points_this_drive;
        scoring.final[offensive_team_index] += points_this_drive;
        var seconds_in_to_game =
          (period - 1) * seconds_per_period + (seconds_per_period - seconds_left_in_period);

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
            drive_summary.drive_end.play_description = play_details.description + " for a TD";
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
        drive_summary.drive_end.display_team_id = game_dict.teams[offensive_team_index].team_id;

        game_dict.team_games[offensive_team_index].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[offensive_team_index].game_stats.team.biggest_lead,
          scoring.final[offensive_team_index] - scoring.final[defensive_team_index]
        );
        game_dict.team_games[defensive_team_index].game_stats.team.biggest_lead = Math.max(
          game_dict.team_games[defensive_team_index].game_stats.team.biggest_lead,
          scoring.final[defensive_team_index] - scoring.final[offensive_team_index]
        );

        //scoring_period.drives.push(drive_summary);
        scoring.drives.push(drive_summary);

        game_dict.team_games[offensive_team_index].game_stats.team.possessions += 1;
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

        game_dict.team_games[offensive_team_index].game_stats.team.field_position.total_drives += 1;
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

    if (period == Math.max(...periods) && scoring.final[0] == scoring.final[1]) {
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

  //   console.log('Done simming!',scoring, `${game_dict.teams[offensive_team_index].team_location_name} vs ${game_dict.teams[defensive_team_index].team_location_name}`)

  game_dict.game.was_played = true;
  game_dict.game.scoring = scoring;

  game_dict.team_games[0].points = scoring.final[0];
  game_dict.team_games[1].points = scoring.final[1];

  // game_dict.team_games[0].national_rank = game_dict.team_seasons[0].rankings.national_rank[0];
  // game_dict.team_games[1].national_rank = game_dict.team_seasons[1].rankings.national_rank[0];

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

  generate_game_headlines(game_dict, common);

  game_dict.team_games[winning_team_index].is_winning_team = true;
  game_dict.team_games[losing_team_index].is_winning_team = false;

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
    game_dict.team_seasons[0].record.wins - game_dict.team_seasons[0].record.losses;
  game_dict.team_seasons[1].record.net_wins =
    game_dict.team_seasons[1].record.wins - game_dict.team_seasons[1].record.losses;

  game_dict.team_seasons[0].record.games_played += 1;
  game_dict.team_seasons[1].record.games_played += 1;

  game_dict.team_games[0].record = game_dict.team_seasons[0].record;
  game_dict.team_games[1].record = game_dict.team_seasons[1].record;

  game_dict.team_seasons[0].top_stats = [];
  game_dict.team_seasons[1].top_stats = [];

  for (var player_team_season_id in game_dict.player_team_games) {
    var pts = game_dict.player_team_seasons[player_team_season_id];
    var ptg = game_dict.player_team_games[player_team_season_id];

    var player_team_index = 1;
    if (pts.team_season_id == game_dict.team_seasons[0].team_season_id) {
      player_team_index = 0;
    }

    var ts = game_dict.team_seasons[player_team_index];
    var tg = game_dict.team_games[player_team_index];
    var opponent_team_game = game_dict.team_games[(player_team_index + 1) % 2];

    for (var stat_group in ptg.game_stats) {
      if (stat_group == "top_stats") {
        continue;
      }

      for (var stat in ptg.game_stats[stat_group]) {
        var stat_value = ptg.game_stats[stat_group][stat];
        if (stat_value != 0) {
          if (stat == "lng") {
            tg.game_stats[stat_group][stat] = Math.max(tg.game_stats[stat_group][stat], stat_value);
            pts.season_stats[stat_group][stat] = Math.max(
              pts.season_stats[stat_group][stat],
              stat_value
            );
          } else {
            tg.game_stats[stat_group][stat] =
              (tg.game_stats[stat_group][stat] || 0) + (stat_value || 0);
            pts.season_stats[stat_group][stat] =
              (pts.season_stats[stat_group][stat] || 0) + (stat_value || 0);
          }
        }
      }
    }

    calculate_game_score(ptg, pts, tg, ts, opponent_team_game);
  }

  for (const team_index of [0, 1]) {
    var team_game = game_dict.team_games[team_index];
    var team_season = game_dict.team_seasons[team_index];

    var opponent_team_index = (team_index + 1) % 2;
    opponent_team_game = game_dict.team_games[opponent_team_index];
    var opponent_team_season = game_dict.team_seasons[opponent_team_index];

    opponent_team_game.opponent_game_stats = deep_copy(team_game.game_stats);

    // console.log({'team_game': team_game, 'team_season': team_season})
    // console.log({'team_game.game_stats': team_game.game_stats, 'team_season.stats.season_stats': team_season.stats.season_stats})
    increment_parent(team_game.game_stats, team_season.stats.season_stats);
    increment_parent(team_game.game_stats, opponent_team_season.stats.opponent_season_stats);
  }

  game_dict.team_seasons[0].top_stats = game_dict.team_seasons[0].top_stats.slice(0, 4);
  game_dict.team_seasons[1].top_stats = game_dict.team_seasons[1].top_stats.slice(0, 4);

  game_dict.team_games[0].top_stats = game_dict.team_games[0].top_stats.slice(0, 4);
  game_dict.team_games[1].top_stats = game_dict.team_games[1].top_stats.slice(0, 4);

  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-final-span`).text(
    "Final"
  );
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-home-score`).text(
    scoring.final[1]
  );
  $(`#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-away-score`).text(
    scoring.final[0]
  );

  var modal_winning_team_suffix = game_dict.team_games[winning_team_index].is_home_team
    ? "home"
    : "away";

  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-team-name`
  ).addClass("bold");
  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-score`
  ).prepend(
    `<i class="fas fa-caret-right" style="padding-right: .25rem; color:#${game_dict.teams[winning_team_index].team_color_primary_hex};"></i>`
  );
  $(
    `#game-modal-result-table-${game_dict.game.game_id} .game-modal-result-table-${modal_winning_team_suffix}-score`
  ).addClass("bold");

  return game_dict;
};

const game_sim_determine_go_for_two = (
  offensive_point_differential,
  period,
  seconds_left_in_period,
  coach
) => {
  var aggression = coach.fourth_down_aggressiveness;
  if (period <= 2) {
    return Math.random() < 0 + aggression;
  } else if (offensive_point_differential > 20) {
    return false;
  } else {
    if ([-18, -13, -10, -5, -2, 1, 4, 5, 12, 15, 19].includes(offensive_point_differential)) {
      return true;
    } else if (
      [-22, -17, -15, -12, -9, -8, -7, -4, -1, 0, 2, 3, 6, 8, 9, 16].includes(
        offensive_point_differential
      )
    ) {
      return false;
    } else {
      return Math.random() < 0.1 + aggression;
    }
  }
};

const play_call_serialize = (play) => {
  var quarter_seconds_remaining_desc = "";

  if (play.period == 1) {
    quarter_seconds_remaining_desc = "any_time";
  } else if (play.period == 2) {
    if (play.seconds_left_in_period <= 60) {
      quarter_seconds_remaining_desc = "<1m";
    } else if (play.seconds_left_in_period <= 180) {
      quarter_seconds_remaining_desc = "<3m";
    } else if (play.seconds_left_in_period <= 180) {
      quarter_seconds_remaining_desc = "+3m";
    }
  } else if (play.period == 3) {
    if (play.seconds_left_in_period <= 360) {
      quarter_seconds_remaining_desc = "<6m";
    } else {
      quarter_seconds_remaining_desc = "+6m";
    }
  } else if (play.seconds_left_in_period <= 60) {
    quarter_seconds_remaining_desc = "<1m";
  } else if (play.seconds_left_in_period <= 120) {
    quarter_seconds_remaining_desc = "<2m";
  } else if (play.seconds_left_in_period <= 300) {
    quarter_seconds_remaining_desc = "<5m";
  } else if (play.seconds_left_in_period <= 600) {
    quarter_seconds_remaining_desc = "<10m";
  } else {
    quarter_seconds_remaining_desc = "10-15m";
  }

  var score_diff_desc = "";
  if (play.offensive_point_differential == "NA") {
    score_diff_desc = "NA";
  } else if (play.offensive_point_differential >= 25) {
    score_diff_desc = "+4sc";
  } else if (play.offensive_point_differential >= 17) {
    score_diff_desc = "+3sc";
  } else if (play.offensive_point_differential >= 12) {
    score_diff_desc = "+2td";
  } else if (play.offensive_point_differential >= 9) {
    score_diff_desc = "+2sc";
  } else if (play.offensive_point_differential >= 4) {
    score_diff_desc = "+1td";
  } else if (play.offensive_point_differential >= 0) {
    score_diff_desc = "+1sc";
  } else if (play.offensive_point_differential <= -25) {
    score_diff_desc = "-4sc";
  } else if (play.offensive_point_differential <= -17) {
    score_diff_desc = "-3sc";
  } else if (play.offensive_point_differential <= -12) {
    score_diff_desc = "-2td";
  } else if (play.offensive_point_differential <= -9) {
    score_diff_desc = "-2sc";
  } else if (play.offensive_point_differential <= -4) {
    score_diff_desc = "-1td";
  } else if (play.offensive_point_differential < 0) {
    score_diff_desc = "-1sc";
  } else {
    score_diff_desc = "tie";
  }

  var yards_to_goal_line = 100 - play.ball_spot;
  var yard_desc = "";
  if (yards_to_goal_line <= 5) {
    yard_desc = "<5";
  } else if (yards_to_goal_line <= 10) {
    yard_desc = "<10";
  } else if (yards_to_goal_line <= 20) {
    yard_desc = "<20";
  } else if (yards_to_goal_line <= 30) {
    yard_desc = "<30";
  } else if (yards_to_goal_line <= 40) {
    yard_desc = "<40";
  } else if (yards_to_goal_line <= 50) {
    yard_desc = "<50";
  } else if (yards_to_goal_line <= 60) {
    yard_desc = "<60";
  } else if (yards_to_goal_line <= 70) {
    yard_desc = "<70";
  } else if (yards_to_goal_line <= 80) {
    yard_desc = "<80";
  } else if (yards_to_goal_line <= 100) {
    yard_desc = "<100";
  } else {
    yard_desc = "NA";
  }

  var yards_to_go_desc = "";
  if (play.yards_to_go <= 2) {
    yards_to_go_desc = "1-2";
  } else if (play.yards_to_go <= 5) {
    yards_to_go_desc = "3-5";
  } else if (play.yards_to_go <= 9) {
    yards_to_go_desc = "6-9";
  } else if (play.yards_to_go <= 14) {
    yards_to_go_desc = "10-13";
  } else {
    yards_to_go_desc = "13+";
  }

  var qtr_desc = "";
  if (play.period > 4) {
    qtr_desc = "OT";
  } else {
    qtr_desc = "q" + play.period;
  }

  return [
    qtr_desc,
    quarter_seconds_remaining_desc,
    "d" + play["down"],
    yards_to_go_desc,
    yard_desc,
    score_diff_desc,
  ].join("|");
};

const game_sim_play_call_options = (
  down,
  yards_to_go,
  ball_spot,
  period,
  offensive_point_differential,
  seconds_left_in_period,
  is_close_game,
  is_late_game,
  half_end_period,
  final_period
) => {
  var default_play_choice_options = { run: 50, pass: 50, punt: 0, field_goal: 0 };

  var play = {
    yards_to_go: yards_to_go,
    down: down,
    ball_spot: ball_spot,
    period: period,
    offensive_point_differential: offensive_point_differential,
    seconds_left_in_period: seconds_left_in_period,
  };

  var playcall_str = play_call_serialize(play);

  var play_choice_options = window.playcall[playcall_str];

  if (!window.playcall[playcall_str]) {
    var playcall_iteration_options = [
      { field: "down", option_set: [1, 2, 3, 4] },
      { field: "seconds_left_in_period", option_set: [30, 90, 150, 450, 600, 900] },
      { field: "period", option_set: [1, 2, 3, 4, 5] },
      { field: "ball_spot", option_set: [5, 15, 25, 35, 45, 55, 65, 75, 85, 95] },
      {
        field: "offensive_point_differential",
        option_set: [1, 0, -1, 6, -6, 9, -9, 17, -17, 25, -25],
      },
      { field: "yards_to_go", option_set: [1, 4, 7, 10, 15] },
    ];

    playcall_iteration_options.forEach(function (opt) {
      opt.option_set = opt.option_set.sort(
        (val_a, val_b) =>
          Math.abs(val_a - play[opt.field]) - Math.abs(val_b - play[opt.field]) ||
          Math.abs(val_a) - Math.abs(val_b)
      );
    });

    for (let radix = 2; radix < 6; radix++) {
      if (window.playcall[playcall_str]) {
        continue;
      }
      for (let i = 0; i < radix ** playcall_iteration_options.length; i++) {
        var b = i.toString(radix);
        b = b.padStart(6, "0");
        var s = b.split("");
        var adjusted_play = {};
        s.forEach(function (ch, ind) {
          adjusted_play[playcall_iteration_options[ind].field] =
            playcall_iteration_options[ind].option_set[parseInt(ch)];
        });

        playcall_str = play_call_serialize(adjusted_play);
      }
    }

    play_choice_options = window.playcall[playcall_str] || play_choice_options;
  }

  var playclock_urgency = 4;
  if (period == 2) {
    if (seconds_left_in_period < 120) {
      playclock_urgency = 6;
    }
  } else if (
    (period == 3 && seconds_left_in_period < 360) ||
    (period == 4 && seconds_left_in_period > 360)
  ) {
    if (offensive_point_differential <= -12) {
      playclock_urgency = 5;
    } else if (offensive_point_differential >= 12) {
      playclock_urgency = 3;
    } else if (offensive_point_differential >= 17) {
      playclock_urgency = 2;
    } else if (offensive_point_differential >= 25) {
      playclock_urgency = 1;
    }
  } else if (period == 4 && seconds_left_in_period < 360) {
    if (offensive_point_differential < 0) {
      playclock_urgency = 7;
    } else {
      playclock_urgency = 1;
    }
  }

  return {
    playclock_urgency: playclock_urgency,
    play_choice_options: play_choice_options || default_play_choice_options,
  };
};

const update_player_energy = (
  game_dict,
  players_on_field,
  bench_players,
  plays_since_last_sub,
  is_home_team
) => {
  var position_fatigue_rate_map = {
    QB: 0.005,
    RB: 0.015,
    FB: 0.025,
    WR: 0.015,
    TE: 0.015,
    OT: 0.005,
    IOL: 0.005,
    DL: 0.015,
    EDGE: 0.02,
    LB: 0.015,
    CB: 0.01,
    S: 0.01,
    K: 0.001,
    P: 0.001,
  };

  var home_field_advantage_modifier = game_dict.home_field_advantage_modifier;

  if (!is_home_team) {
    home_field_advantage_modifier = 1 / home_field_advantage_modifier;
  }

  for (let player_obj of players_on_field) {
    player_obj.player_team_game.game_attrs.energy -=
      position_fatigue_rate_map[player_obj.player.position] * plays_since_last_sub;
    player_obj.player_team_game.game_attrs.energy = Math.max(
      player_obj.player_team_game.game_attrs.energy,
      0.0
    );
  }
  for (let player_obj of bench_players) {
    player_obj.player_team_game.game_attrs.energy += 0.01 * plays_since_last_sub;
    player_obj.player_team_game.game_attrs.energy = Math.min(
      player_obj.player_team_game.game_attrs.energy,
      1.0
    );
  }

  players_on_field.forEach(
    (player_obj) =>
      (player_obj.player_team_game.game_attrs.adjusted_overall =
        player_obj.player_team_game.game_attrs.energy ** 0.25 *
        home_field_advantage_modifier *
        player_obj.player_team_season.ratings.overall.overall)
  );
  bench_players.forEach(
    (player_obj) =>
      (player_obj.player_team_game.game_attrs.adjusted_overall =
        player_obj.player_team_game.game_attrs.energy ** 0.25 *
        home_field_advantage_modifier *
        player_obj.player_team_season.ratings.overall.overall)
  );

  // console.log({bench_players:bench_players, players_on_field:players_on_field})
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
  var players_on_field_set = new Set();

  var abs_point_differential = Math.abs(point_differential);
  if (point_differential < -8) {
    abs_point_differential = Math.abs(point_differential + 10);
  }

  var depth_chart_skip = 0;
  if (abs_point_differential >= 45) {
    depth_chart_skip = 2;
  } else if (abs_point_differential >= 37) {
    depth_chart_skip = 1;
    if (period == 4) {
      depth_chart_skip = 2;
    }
  } else if (abs_point_differential >= 29) {
    // if(period == 4){
    //   depth_chart_skip = 2;
    // }
    // if (period == 3){
    depth_chart_skip = 1;
    // }
  } else if (period == 4 && abs_point_differential >= 24 && seconds_left_in_period < 5 * 60) {
    depth_chart_skip = 1;
  }

  if (point_differential < 0) {
    depth_chart_skip = Math.min(1, depth_chart_skip);
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
  for (let pos of shuffle(Object.keys(position_list))) {
    var count = position_list[pos];
    player_list.by_position[pos] = [];
    var ind = 0;
    var pos_depth_chart_skip = depth_chart_skip;
    if (depth_chart[pos].length > pos_depth_chart_skip) {
      ind = pos_depth_chart_skip;
    }

    var energy_threshold = 0.7 - 0.15 * pos_depth_chart_skip;
    var loop_count = 0;
    while (player_list.by_position[pos].length < count) {
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][ind];
      // console.log({'player_obj.player_team_season_id':player_obj.player_team_season_id, player_obj:player_obj, ind:ind, depth_chart:depth_chart, pos:pos})
      player_obj.player_team_season = player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game = player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      ind += 1;
      loop_count += 1;

      if (!players_on_field_set.has(player_obj.player_team_season.player_id)) {
        if (player_obj.player_team_game.game_attrs.energy >= energy_threshold) {
          player_list.all_players.push(player_obj);
          player_list.by_position[pos].push(player_obj);

          players_on_field_set.add(player_obj.player_team_season.player_id);
        } else {
          energy_threshold -= 0.15;
        }
      }

      if (ind >= depth_chart[pos].length && player_list.by_position[pos].length < count) {
        energy_threshold -= 0.1;
        pos_depth_chart_skip -= 1;
        pos_depth_chart_skip = Math.max(0, pos_depth_chart_skip);
        ind = pos_depth_chart_skip;
      }

      if (loop_count > 20) {
        console.log("might be stuck in picking players", {
          energy_threshold: energy_threshold,
          pos_depth_chart_skip: pos_depth_chart_skip,
          ind: ind,
          loop_count: loop_count,
          player_list: player_list,
          pos: pos,
          "player_list.by_position[pos]": player_list.by_position[pos],
          "depth_chart[pos].": depth_chart[pos],
        });
        return pick_players_on_field(
          depth_chart,
          player_team_seasons,
          players,
          player_team_games,
          side_of_ball,
          period,
          seconds_left_in_period,
          point_differential
        );
      }
    }
  }

  for (let pos in depth_chart) {
    for (var i = 0; i < depth_chart[pos].length; i++) {
      player_obj = {};

      player_obj.player_team_season_id = depth_chart[pos][i];
      player_obj.player_team_season = player_team_seasons[player_obj.player_team_season_id];
      player_obj.player_team_game = player_team_games[player_obj.player_team_season_id];
      player_obj.player = players[player_obj.player_team_season.player_id];

      if (!players_on_field_set.has(player_obj.player_team_season.player_id)) {
        player_list.bench_players.push(player_obj);
      }
    }
  }

  return player_list;
};
