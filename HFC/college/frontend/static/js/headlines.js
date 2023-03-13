import {headline} from '/js/schema.js'

export const generate_game_headlines = (game_dict, common) => {
  var game_headlines = [];

  let score_difference = Math.abs(
    game_dict.game.scoring.final[0] - game_dict.game.scoring.final[1]
  );

  game_dict.winning_team = game_dict.teams[game_dict.winning_team_index];
  game_dict.losing_team = game_dict.teams[game_dict.losing_team_index];

  game_dict.winning_team_game = game_dict.team_games[game_dict.winning_team_index];
  game_dict.losing_team_game = game_dict.team_games[game_dict.losing_team_index];

  game_dict.winning_team_season = game_dict.team_seasons[game_dict.winning_team_index];
  game_dict.losing_team_season = game_dict.team_seasons[game_dict.losing_team_index];

  let base_headline_relevance = 0;
  if (game_dict.losing_team_season.national_rank < 10) {
    base_headline_relevance = 10;
  } else if (game_dict.losing_team_season.national_rank < 20) {
    base_headline_relevance = 8;
  } else if (game_dict.losing_team_season.national_rank < 40) {
    base_headline_relevance = 6;
  } else if (game_dict.losing_team_season.national_rank < 80) {
    base_headline_relevance = 4;
  }

  if (score_difference <= 4) {
    game_headlines = game_headlines.concat([
      {
        text: "Time runs out for {{losing_team.school_name}}, falling to {{winning_team.school_name}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} sneaks by {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  } else if (score_difference > 19) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} blasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} OBLITERATES {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} cold clocks {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} banishes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} hammers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} brutalizes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} outmatches {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  } else {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} overcomes {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} beats {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} outlasts {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} overpowers {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (game_dict.losing_team.location.unique_city_name && game_dict.losing_team_game.is_home_team) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} wins in {{losing_team.location.city}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
      {
        text: "{{winning_team.school_name}} leaves {{losing_team.location.city}} with a win, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (game_dict.losing_team_game.is_home_team) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} beats {{losing_team.school_name}} at home, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance,
      },
    ]);
  }

  if (
    (game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank >
      25 &&
      game_dict.losing_team_season.national_rank <= 10) ||
    (game_dict.winning_team_season.national_rank - game_dict.losing_team_season.national_rank >
      50 &&
      game_dict.losing_team_season.national_rank <= 20)
  ) {
    game_headlines = game_headlines.concat([
      {
        text: "{{winning_team.school_name}} upset {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
      {
        text: "{{winning_team.school_name}} pull off the upset over {{losing_team.school_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
      {
        text: "{{winning_team.team_name}} upset {{losing_team.team_name}}, {{winning_team_game.points}}-{{losing_team_game.points}}",
        headline_relevance: base_headline_relevance + 2,
      },
    ]);
  }

  if (game_dict.game.bowl) {
    if (game_dict.game.bowl.bowl_name == "National Championship") {
      game_headlines = [
        { text: "{{winning_team.school_name}} crowned champions", headline_relevance: 20 },
        {
          text: "{{winning_team.school_name}} claim {{winning_team_season.season}} championship",
          headline_relevance: 20,
        },
      ];
    } else if (game_dict.game.bowl.bowl_name == "National Semifinal") {
      if (game_dict.winning_team_season.playoff.seed >= 9) {
        game_headlines = [
          {
            text: "Cinderella {{winning_team_season.national_rank_display}} {{winning_team.team_name}} to play for a shot at the title next week",
            headline_relevance: 10,
          },
        ];
      } else {
        game_headlines = [
          {
            text: "{{winning_team.school_name}} advance to National Championship",
            headline_relevance: 9,
          },
          {
            text: "{{winning_team.school_name}} takes down {{losing_team.school_name}} to play for championship",
            headline_relevance: 9,
          },
        ];
      }
    }
  }

  let max_headline_relevance = Math.max(...game_headlines.map((h) => h.headline_relevance));
  game_headlines = game_headlines.filter((h) => h.headline_relevance == max_headline_relevance);
  var game_headline = game_headlines[Math.floor(Math.random() * game_headlines.length)];

  var headline_text = nunjucks_env.renderString(game_headline.text, game_dict);

  const headline_obj = new headline(
    common.headline_id_counter,
    game_dict.game.week_id,
    headline_text,
    "game",
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

export const generate_ranking_headlines = async (
  common,
  team_seasons,
  this_week,
  headline_id_counter
) => {
  let ranking_headlines = [];
  let conference_sums = {};
  for (let ts of team_seasons) {
    console.log({ ts: ts, team_seasons: team_seasons });

    conference_sums[ts.conference_season.conference.conference_abbreviation] = conference_sums[
      ts.conference_season.conference.conference_abbreviation
    ] || { top_5: 0, top_10: 0, top_15: 0, conference_season: ts.conference_season };

    if (ts.rankings.national_rank[0] < 15) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_15 += 1;
    }
    if (ts.rankings.national_rank[0] < 10) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_10 += 1;
    }
    if (ts.rankings.national_rank[0] < 5) {
      conference_sums[ts.conference_season.conference.conference_abbreviation].top_5 += 1;
    }

    let ts_headline_options = [];
    if (ts.rankings.national_rank[0] == 1 && ts.rankings.national_rank[1] == 1) {
      ts_headline_options.push({
        headline_relevance: 3,
        text: "{{team_season.team.school_name}} remains at #1",
      });
    }

    if (ts.rankings.national_rank[0] == 1 && ts.rankings.national_rank[1] > 1) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} moves into #1 spot",
      });
    }

    if (ts.rankings.national_rank[0] <= 25 && ts.rankings.national_rank[1] > 25) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} cracks top 25",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -6) {
      ts_headline_options.push({
        headline_relevance: 3,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -12) {
      ts_headline_options.push({
        headline_relevance: 4,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts.rankings.national_rank[1] <= 25 && ts.rankings.national_rank_delta < -18) {
      ts_headline_options.push({
        headline_relevance: 5,
        text: "{{team_season.team.school_name}} stumbles from {{team_season.rankings.national_rank[1]}} to {{team_season.rankings.national_rank[0]}}",
      });
    }

    if (ts_headline_options.length) {
      let max_headline_relevance = Math.max(
        ...ts_headline_options.map((h) => h.headline_relevance)
      );
      ts_headline_options = ts_headline_options.filter(
        (h) => h.headline_relevance == max_headline_relevance
      );
      let ts_headline = ts_headline_options[Math.floor(Math.random() * ts_headline_options.length)];

      var headline_text = nunjucks_env.renderString(ts_headline.text, {
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
      headline_obj.team_season_ids = [ts.team_season_id];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  }

  Object.entries(conference_sums).forEach(function (conf_obj) {
    let conference_name = conf_obj[0];
    let conference_obj = conf_obj[1];
    let headline_options = [];

    if (conference_obj.top_5 >= 3) {
      headline_options.push({
        headline_relevance: 6,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_5}} of top 5 teams nationally",
      });
    } else if (conference_obj.top_10 >= 5) {
      headline_options.push({
        headline_relevance: 5,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_10}} of top 10 teams nationally",
      });
    } else if (conference_obj.top_15 >= 8) {
      headline_options.push({
        headline_relevance: 5,
        text: "{{conference_obj.conference_season.conference.conference_abbreviation}} domination - {{conference_obj.top_15}} of top 15 teams nationally",
      });
    }

    if (headline_options.length) {
      let max_headline_relevance = Math.max(...headline_options.map((h) => h.headline_relevance));
      headline_options = headline_options.filter(
        (h) => h.headline_relevance == max_headline_relevance
      );
      let conf_headline = headline_options[Math.floor(Math.random() * headline_options.length)];

      var headline_text = nunjucks_env.renderString(conf_headline.text, {
        conference_obj: conference_obj,
      });

      const headline_obj = new headline(
        headline_id_counter,
        this_week.week_id,
        headline_text,
        "ranking",
        conf_headline.headline_relevance
      );

      headline_obj.href = conference_obj.conference_season.conference.conference_href;
      headline_obj.team_season_ids = [];

      headline_id_counter += 1;
      ranking_headlines.push(headline_obj);
    }
  });

  return ranking_headlines;
};
