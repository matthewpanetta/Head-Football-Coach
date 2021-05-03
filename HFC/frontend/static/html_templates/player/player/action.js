const getHtml = async (common) => {
  nunjucks.configure({ autoescape: true });

  var world_obj = {};
  const player_id = parseInt(common.params.player_id);
  const db = common.db;
  const query_to_dict = common.query_to_dict;
  const season = 1;

  const NavBarLinks = await common.nav_bar_links({
    path: 'Player',
    group_name: 'Player',
    db: db
  });

  const player = await db.player.get(player_id);
  const player_team_seasons = await db.player_team_season.where({player_id: player_id}).toArray();

  if (player.player_face == undefined){
    player.player_face = await common.create_player_face('single', player.player_id, db);
  }

  const team_season_ids = player_team_seasons.map(pts => pts.team_season_id);
  const team_seasons = await db.team_season.bulkGet(team_season_ids);

  const player_team_ids = team_seasons.map(ts => ts.team_id);
  const player_teams = await db.team.bulkGet(player_team_ids);

  var c = 0;
  $.each(player_team_seasons, function(ind, pts){
    pts.team_season = team_seasons[c];
    pts.team_season.team = player_teams[c];
    c+=1;
  });

  player.player_team_seasons = player_team_seasons;
  player.current_player_team_season = player_team_seasons.filter(pts => pts.season = season)[0];

  /*
  TODO BUILD FACE
  */


  var skill_set_rating_map = {
      'Overall': {'Overall': 'OverallRating'},
       'Physical': {'Agility': 'Agility_Rating', 'Speed': 'Speed_Rating', 'Acceleration': 'Acceleration_Rating', 'Strength': 'Strength_Rating', 'Jumping': 'Jumping_Rating'},
       'Passing': {'Throw Power': 'ThrowPower_Rating', 'Throw Accuracy (S)': 'ShortThrowAccuracy_Rating', 'Throw Accuracy (M)': 'MediumThrowAccuracy_Rating', 'Throw Accuracy (D)': 'DeepThrowAccuracy_Rating', 'Throw on Run': 'ThrowOnRun_Rating', 'Throw Under Pressure': 'ThrowUnderPressure_Rating', 'Play Action': 'PlayAction_Rating'},
       'Running': {'Carrying': 'Carrying_Rating', 'Elusiveness': 'Elusiveness_Rating', 'Ball Carrier Vision': 'BallCarrierVision_Rating', 'Break Tackle': 'BreakTackle_Rating'},
       'Receiving': { 'Catching': 'Catching_Rating', 'Catch In Traffic': 'CatchInTraffic_Rating', 'Route Running': 'RouteRunning_Rating', 'Release': 'Release_Rating'},
       'Blocking': {'Pass Block':'PassBlock_Rating', 'Run Block': 'RunBlock_Rating', 'Impact Block': 'ImpactBlock_Rating'},
       'Defense': {'Pass Rush':'PassRush_Rating', 'Block Shedding': 'BlockShedding_Rating','Tackle': 'Tackle_Rating','Hit Power': 'HitPower_Rating', 'Man Coverage': 'ManCoverage_Rating', 'Zone Coverage': 'ZoneCoverage_Rating', 'Press': 'Press_Rating',},
       'Kicking': {'Kick Power': 'KickPower_Rating','Kick Accuracy':  'KickAccuracy_Rating'},
  }

  const position_skill_set_map ={'QB': ['Overall','Physical', 'Passing', 'Running'],
                           'RB': ['Overall','Physical', 'Running'],
                           'FB': ['Overall','Physical', 'Running', 'Blocking'],
                           'WR': ['Overall','Physical', 'Receiving'],
                           'TE': ['Overall','Physical', 'Receiving', 'Blocking'],
                           'OT': ['Overall','Physical', 'Blocking'],
                           'OG': ['Overall','Physical', 'Blocking'],
                           'OC': ['Overall','Physical', 'Blocking'],
                           'DE': ['Overall','Physical', 'Defense'],
                           'DT': ['Overall','Physical', 'Defense'],
                           'MLB': ['Overall','Physical', 'Defense'],
                           'OLB': ['Overall','Physical', 'Defense'],
                           'CB': ['Overall','Physical', 'Defense'],
                           'S': ['Overall','Physical', 'Defense'],
                           'K': ['Overall','Kicking'],
                           'P': ['Overall','Kicking'],
      }

      const season_stat_groupings = [
          {
              'StatGroupName': 'Passing',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'PAS_CompletionsAndAttempts', 'DisplayName': 'C/ATT', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_CompletionPercentage', 'DisplayName': 'Pass %', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_YardsPerAttempt', 'DisplayName': 'YPA', 'DisplayColumn': true, 'DisplayOrder': 2.5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_Attempts', 'DisplayName': 'A', 'DisplayColumn': false, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_Yards', 'DisplayName': 'Pass Yards', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_YardsPerGame', 'DisplayName': 'Pass YPG', 'DisplayColumn': true, 'DisplayOrder': 4.5, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'PAS_TD', 'DisplayName': 'Pass TD', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'PAS_INT', 'DisplayName': 'INT', 'DisplayColumn': true, 'DisplayOrder': 6, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_SacksAndYards', 'DisplayName': 'Sck/Yrd', 'DisplayColumn': true, 'DisplayOrder': 7, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'PAS_SackYards', 'DisplayName': 'Sack Yards', 'DisplayColumn': false, 'DisplayOrder': 998, 'SeasonAggregateValue': false, 'SmallDisplay': false}
              ]
          },
          {
              'StatGroupName': 'Rushing',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'RUS_Carries', 'DisplayName': 'Car', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'RUS_Yards', 'DisplayName': 'Rush Yards', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'RUS_YardsPerGame', 'DisplayName': 'Rush YPG', 'DisplayColumn': true, 'DisplayOrder': 3.2, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'RUS_YardsPerCarry', 'DisplayName': 'YPC', 'DisplayColumn': true, 'DisplayOrder': 3.5, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'RUS_TD', 'DisplayName': 'Rush TDs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
              ],
          },
          {
              'StatGroupName': 'Receiving',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'REC_Receptions', 'DisplayName': 'Rec', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_Yards', 'DisplayName': 'Rec Yards', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_YardsPerGame', 'DisplayName': 'Rec YPG', 'DisplayColumn': true, 'DisplayOrder': 3.2, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'REC_YardsPerCatch', 'DisplayName': 'YPC', 'DisplayColumn': true, 'DisplayOrder': 3.5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'REC_TD', 'DisplayName': 'Rec TDs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'REC_Targets', 'DisplayName': 'Targets', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
              ],
          },
          {
              'StatGroupName': 'Defense',
              'Stats': [
                  {'FieldName': 'GamesPlayed', 'DisplayName': 'Games', 'DisplayColumn': true, 'DisplayOrder': 1, 'SeasonAggregateValue': true, 'SmallDisplay': false},
                  {'FieldName': 'DEF_Tackles', 'DisplayName': 'Tackles', 'DisplayColumn': true, 'DisplayOrder': 2, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_Sacks', 'DisplayName': 'Sacks', 'DisplayColumn': true, 'DisplayOrder': 3, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_INT', 'DisplayName': 'INTs', 'DisplayColumn': true, 'DisplayOrder': 4, 'SeasonAggregateValue': false, 'SmallDisplay': true},
                  {'FieldName': 'DEF_TacklesForLoss', 'DisplayName': 'TFL', 'DisplayColumn': true, 'DisplayOrder': 5, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'FUM_Forced', 'DisplayName': 'FF', 'DisplayColumn': true, 'DisplayOrder': 6, 'SeasonAggregateValue': false, 'SmallDisplay': false},
                  {'FieldName': 'FUM_Recovered', 'DisplayName': 'FR', 'DisplayColumn': true, 'DisplayOrder': 7, 'SeasonAggregateValue': false, 'SmallDisplay': false},
              ],
          },
      ]
      const position_rating_map = {'QB': ['OverallRating', 'Awareness_Rating', 'Speed_Rating',  'ShortThrowAccuracy_Rating', 'MediumThrowAccuracy_Rating', 'DeepThrowAccuracy_Rating', 'ThrowPower_Rating','ThrowOnRun_Rating', 'ThrowUnderPressure_Rating', 'PlayAction_Rating'],
                           'RB': ['OverallRating', 'Agility_Rating', 'Speed_Rating', 'Acceleration_Rating', 'Carrying_Rating', 'Elusiveness_Rating', 'BallCarrierVision_Rating', 'BreakTackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'FB': ['OverallRating', 'Agility_Rating', 'Speed_Rating', 'Acceleration_Rating', 'Carrying_Rating', 'Elusiveness_Rating', 'BallCarrierVision_Rating', 'BreakTackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'WR': ['OverallRating', 'Catching_Rating', 'CatchInTraffic_Rating', 'RouteRunning_Rating', 'Release_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'TE': ['OverallRating', 'Catching_Rating', 'CatchInTraffic_Rating', 'RouteRunning_Rating', 'Release_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'OT': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                           'OG': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                           'OC': ['OverallRating', 'PassBlock_Rating', 'RunBlock_Rating', 'ImpactBlock_Rating', 'Strength_Rating', 'Awareness_Rating'],
                           'DE': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'DT': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'OLB': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'MLB': ['OverallRating', 'PassRush_Rating', 'BlockShedding_Rating', 'Tackle_Rating', 'HitPower_Rating', 'Strength_Rating', 'PlayRecognition_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'CB': ['OverallRating', 'ManCoverage_Rating', 'ZoneCoverage_Rating', 'Press_Rating', 'Agility_Rating', 'Acceleration_Rating', 'Tackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'S': ['OverallRating', 'ManCoverage_Rating', 'ZoneCoverage_Rating', 'Press_Rating', 'Agility_Rating', 'Acceleration_Rating', 'Tackle_Rating', 'Awareness_Rating', 'Speed_Rating'],
                           'K': ['OverallRating', 'KickPower_Rating', 'KickAccuracy_Rating'],
                           'P': ['OverallRating', 'KickPower_Rating', 'KickAccuracy_Rating'],
      }

      const skill_name_map = {
          'OverallRating': 'Overall',
          'Awareness_Rating': 'Awareness',
          'Speed_Rating': 'Speed',
          'ShortThrowAccuracy_Rating': 'Short Throw Accuracy',
          'MediumThrowAccuracy_Rating': 'Medium Throw Accuracy',
          'DeepThrowAccuracy_Rating': 'Deep Throw Accuracy',
          'ThrowPower_Rating': 'Throw Power',
          'ThrowOnRun_Rating': 'Throw on Run',
          'ThrowUnderPressure_Rating': 'Throw Under Pressure',
          'PlayAction_Rating': 'Play Action',
          'Agility_Rating': 'Agility',
          'Acceleration_Rating': 'Acceleration',
          'Carrying_Rating': 'Carrying',
          'Elusiveness_Rating': 'Elusiveness',
          'BallCarrierVision_Rating': 'Ball Carrier Vision',
          'BreakTackle_Rating': 'Break Tackle',
          'Catching_Rating': 'Catching',
          'CatchInTraffic_Rating': 'Catch in Traffic',
          'RouteRunning_Rating': 'Route Running',
          'Release_Rating': 'Release',
          'PassBlock_Rating': 'Pass Block',
          'RunBlock_Rating': 'Run Block',
          'ImpactBlock_Rating': 'Impact Block',
          'Strength_Rating': 'Strength',
          'PassRush_Rating': 'Pass Rush',
          'BlockShedding_Rating': 'Block Shedding',
          'Tackle_Rating': 'Tackling',
          'HitPower_Rating': 'Hit Power',
          'PlayRecognition_Rating': 'Play Recognition',
          'ManCoverage_Rating': 'Man Coverage',
          'ZoneCoverage_Rating': 'Zone Coverage',
          'Press_Rating': 'Press',
          'KickPower_Rating': 'Kick Power',
          'KickAccuracy_Rating': 'Kick Accuracy'
      }

      //TODO add recruits
      // if (player.is_recruit) {
      //
      //
      //
      //   PlayerDict['OverallRating'] = RTSDict['Scouted_Overall']
      //   context['OverallRating'] = RTSDict['Scouted_Overall']
      //   PlayerSkills['OverallRating'] = RTSDict['Scouted_Overall']
      //   for key in PlayerSkills:
      //       ScoutedKey = 'Scouted_'+key
      //       if ScoutedKey in RTSDict:
      //           PlayerSkills[key] = RTSDict[ScoutedKey]
      //
      // }



      const all_player_team_seasons = db.player_team_season.where({season: season})

      //
      //
      // PositionAverageSkills = PlayerTeamSeasonSkill.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__playerteamseasondepthchart__PositionID = PlayerObject.PositionID,  PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = true, PlayerTeamSeasonID__playerteamseasondepthchart__IsStarter = true).values('PlayerTeamSeasonID__PlayerID__PositionID').annotate(
      //     PlayerCount = Count('PlayerTeamSeasonID'),
      //     OverallRating = Round(Avg('OverallRating'),1),
      //     Awareness_Rating = Round(Avg('Awareness_Rating'),1),
      //     Speed_Rating = Round(Avg('Speed_Rating'),1),
      //     Jumping_Rating = Round(Avg('Jumping_Rating'),1),
      //     ShortThrowAccuracy_Rating = Round(Avg('ShortThrowAccuracy_Rating'),1),
      //     MediumThrowAccuracy_Rating = Round(Avg('MediumThrowAccuracy_Rating'),1),
      //     DeepThrowAccuracy_Rating = Round(Avg('DeepThrowAccuracy_Rating'),1),
      //     ThrowPower_Rating = Round(Avg('ThrowPower_Rating'),1),
      //     ThrowOnRun_Rating = Round(Avg('ThrowOnRun_Rating'),1),
      //     ThrowUnderPressure_Rating = Round(Avg('ThrowUnderPressure_Rating'),1),
      //     PlayAction_Rating = Round(Avg('PlayAction_Rating'),1),
      //     Agility_Rating = Round(Avg('Agility_Rating'),1),
      //     Acceleration_Rating = Round(Avg('Acceleration_Rating'),1),
      //     Carrying_Rating = Round(Avg('Carrying_Rating'),1),
      //     Elusiveness_Rating = Round(Avg('Elusiveness_Rating'),1),
      //     BallCarrierVision_Rating = Round(Avg('BallCarrierVision_Rating'),1),
      //     BreakTackle_Rating = Round(Avg('BreakTackle_Rating'),1),
      //     Catching_Rating = Round(Avg('Catching_Rating'),1),
      //     CatchInTraffic_Rating = Round(Avg('CatchInTraffic_Rating'),1),
      //     RouteRunning_Rating = Round(Avg('RouteRunning_Rating'),1),
      //     Release_Rating = Round(Avg('Release_Rating'),1),
      //     PassBlock_Rating = Round(Avg('PassBlock_Rating'),1),
      //     RunBlock_Rating = Round(Avg('RunBlock_Rating'),1),
      //     ImpactBlock_Rating = Round(Avg('ImpactBlock_Rating'),1),
      //     Strength_Rating = Round(Avg('Strength_Rating'),1),
      //     PassRush_Rating = Round(Avg('PassRush_Rating'),1),
      //     BlockShedding_Rating = Round(Avg('BlockShedding_Rating'),1),
      //     Tackle_Rating = Round(Avg('Tackle_Rating'),1),
      //     HitPower_Rating = Round(Avg('HitPower_Rating'),1),
      //     PlayRecognition_Rating = Round(Avg('PlayRecognition_Rating'),1),
      //     ManCoverage_Rating = Round(Avg('ManCoverage_Rating'),1),
      //     ZoneCoverage_Rating = Round(Avg('ZoneCoverage_Rating'),1),
      //     Press_Rating = Round(Avg('Press_Rating'),1),
      //     KickPower_Rating = Round(Avg('KickPower_Rating'),1),
      //     KickAccuracy_Rating = Round(Avg('KickAccuracy_Rating'),1),
      // )
      //
      // if PositionAverageSkills.count() > 0:
      //     PositionAverageSkills = PositionAverageSkills[0]
      //
      //
      // if TS.DivisionSeasonID is not None:
      //     PositionConferenceAverageSkills = PlayerTeamSeasonSkill.objects.filter(WorldID_id = WorldID).filter(PlayerTeamSeasonID__TeamSeasonID__LeagueSeasonID__IsCurrent = true).filter(PlayerTeamSeasonID__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID = TS.DivisionSeasonID.ConferenceSeasonID.ConferenceID).filter(PlayerTeamSeasonID__playerteamseasondepthchart__IsStarter = true).filter(PlayerTeamSeasonID__playerteamseasondepthchart__PositionID = PlayerObject.PositionID).values('PlayerTeamSeasonID__TeamSeasonID__DivisionSeasonID__ConferenceSeasonID__ConferenceID').annotate(
      //         OverallRating = Round(Avg('OverallRating'),1),
      //         Awareness_Rating = Round(Avg('Awareness_Rating'),1),
      //         Speed_Rating = Round(Avg('Speed_Rating'),1),
      //         Jumping_Rating = Round(Avg('Jumping_Rating'),1),
      //         ShortThrowAccuracy_Rating = Round(Avg('ShortThrowAccuracy_Rating'),1),
      //         MediumThrowAccuracy_Rating = Round(Avg('MediumThrowAccuracy_Rating'),1),
      //         DeepThrowAccuracy_Rating = Round(Avg('DeepThrowAccuracy_Rating'),1),
      //         ThrowPower_Rating = Round(Avg('ThrowPower_Rating'),1),
      //         ThrowOnRun_Rating = Round(Avg('ThrowOnRun_Rating'),1),
      //         ThrowUnderPressure_Rating = Round(Avg('ThrowUnderPressure_Rating'),1),
      //         PlayAction_Rating = Round(Avg('PlayAction_Rating'),1),
      //         Agility_Rating = Round(Avg('Agility_Rating'),1),
      //         Acceleration_Rating = Round(Avg('Acceleration_Rating'),1),
      //         Carrying_Rating = Round(Avg('Carrying_Rating'),1),
      //         Elusiveness_Rating = Round(Avg('Elusiveness_Rating'),1),
      //         BallCarrierVision_Rating = Round(Avg('BallCarrierVision_Rating'),1),
      //         BreakTackle_Rating = Round(Avg('BreakTackle_Rating'),1),
      //         Catching_Rating = Round(Avg('Catching_Rating'),1),
      //         CatchInTraffic_Rating = Round(Avg('CatchInTraffic_Rating'),1),
      //         RouteRunning_Rating = Round(Avg('RouteRunning_Rating'),1),
      //         Release_Rating = Round(Avg('Release_Rating'),1),
      //         PassBlock_Rating = Round(Avg('PassBlock_Rating'),1),
      //         RunBlock_Rating = Round(Avg('RunBlock_Rating'),1),
      //         ImpactBlock_Rating = Round(Avg('ImpactBlock_Rating'),1),
      //         Strength_Rating = Round(Avg('Strength_Rating'),1),
      //         PassRush_Rating = Round(Avg('PassRush_Rating'),1),
      //         BlockShedding_Rating = Round(Avg('BlockShedding_Rating'),1),
      //         Tackle_Rating = Round(Avg('Tackle_Rating'),1),
      //         HitPower_Rating = Round(Avg('HitPower_Rating'),1),
      //         PlayRecognition_Rating = Round(Avg('PlayRecognition_Rating'),1),
      //         ManCoverage_Rating = Round(Avg('ManCoverage_Rating'),1),
      //         ZoneCoverage_Rating = Round(Avg('ZoneCoverage_Rating'),1),
      //         Press_Rating = Round(Avg('Press_Rating'),1),
      //         KickPower_Rating = Round(Avg('KickPower_Rating'),1),
      //         KickAccuracy_Rating = Round(Avg('KickAccuracy_Rating'),1),
      //     )
      //
      //     if PositionConferenceAverageSkills.count() > 0:
      //         PositionConferenceAverageSkills = PositionConferenceAverageSkills[0]
      //
      // PlayerDict['Skills'] = []
      //
      // for SkillGroup in SkillSetRatingMap:
      //     SkillObj = {'TopShow': false, 'Skills': [], 'SkillGroup': SkillGroup}
      //     for SkillSet in SkillSetRatingMap[SkillGroup]:
      //         RatingName = SkillSetRatingMap[SkillGroup][SkillSet]
      //         SkillValue = PlayerSkills[RatingName]
      //         SkillAttr = {'SkillName': SkillSet, 'SkillValue': SkillValue}
      //         if TS.DivisionSeasonID is not None and len(PositionConferenceAverageSkills) >0:
      //             SkillAttr['PositionConferenceAverage'] = PositionConferenceAverageSkills[RatingName]
      //         if len(PositionAverageSkills) > 0:
      //             SkillAttr['PositionAverage'] = PositionAverageSkills[RatingName]
      //
      //         SkillObj['Skills'].append(SkillAttr)
      //
      //     if SkillGroup in PositionSkillSetMap[PlayerDict['Position']]:
      //         SkillObj['TopShow'] = true
      //
      //     PlayerDict['Skills'].append(SkillObj)
      //
      // print("PlayerDict['Skills']", PlayerDict['Skills'])
      //
      // if PlayerDict['IsRecruit'] == false:
      //     PlayerDict['PlayerName'] = PlayerDict['PlayerFirstName'] + ' ' + PlayerDict['PlayerLastName']
      //
      //     if CurrentWeek.PhaseID.PhaseName == 'Preseason' and PlayerTeam.IsUserTeam:
      //         if not PlayerDict['WasPreviouslyRedshirted']:
      //             if not PTS.RedshirtedThisSeason:
      //                 context['Actions'].append({'Display': 'Redshirt player', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Add', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-tshirt w3-text-red"></i></span>'})
      //             else:
      //                 context['Actions'].append({'Display': 'Remove Redshirt'
      //                                          , 'ConfirmInfo': PlayerDict['PlayerName']
      //                                          , 'ResponseType': 'refresh'
      //                                          , 'Class': 'player-action'
      //                                          , 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerRedshirt/Remove'
      //                                          , 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-stack-2x fa-inverse fa-tshirt w3-text-red"></i></span>'})
      //
      //
      //         if not PTS.TeamCaptain:
      //             context['Actions'].append({'Display': 'Add as captain', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Add', 'Icon': '<span  class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-crown w3-text-green"></i></span>'})
      //         else:
      //             context['Actions'].append({'Display': 'Remove as Captain', 'ConfirmInfo': PlayerDict['PlayerName'],'ResponseType': 'refresh', 'Class': 'player-action', 'AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCaptain/Remove', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-crown fa-stack-2x w3-text-green"></i></span>'})
      //
      //         context['Actions'].append({'Display': 'Cut from team', 'ConfirmInfo': PlayerDict['PlayerName'], 'ResponseType': 'refresh','Class': 'player-action','AjaxLink': '/World/'+str(WorldID)+'/Player/'+str(PlayerID)+'/PlayerCut', 'Icon': '<span class="fa-stack fa-1x"><i class="fas fa-2x fa-stack-2x fa-cut"></i></span>'})
      //
      //
      //     context['RedshirtedThisSeason'] = PTS.RedshirtedThisSeason
      //     context['TeamCaptain'] = PTS.TeamCaptain
      //
      //     page = {'PageTitle': PlayerDict['FullName'] + ' - ' + PlayerTeam.TeamName, 'PlayerID': PlayerID, 'WorldID': WorldID, 'PrimaryColor': PlayerTeam.TeamColor_Primary_HEX, 'SecondaryColor': PlayerTeam.SecondaryColor_Display, 'SecondaryJerseyColor': PlayerTeam.TeamColor_Secondary_HEX}
      //     page['NavBarLinks'] = NavBarLinks(Path = 'Player', GroupName='Player', WeekID = CurrentWeek, WorldID = WorldID, UserTeam = UserTeam)
      //
      //     #PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__GameDateID')
      //     PlayerStats = PTS.playergamestat_set.all().order_by('TeamGameID__GameID__WeekID').values('RUS_Yards', 'RUS_TD', 'RUS_Carries', 'RUS_20', 'RUS_LNG', 'REC_LNG', 'PAS_Yards', 'PAS_TD', 'PAS_Completions', 'PAS_Attempts', 'PAS_Sacks', 'PAS_SackYards', 'PAS_INT', 'REC_Yards','REC_Receptions', 'REC_TD', 'REC_Targets', 'FUM_Forced', 'FUM_Lost', 'FUM_Recovered', 'DEF_TacklesForLoss',  'GameScore', 'PlayerTeamSeasonID__PlayerID__PlayerFirstName', 'PlayerTeamSeasonID__PlayerID__PlayerLastName', 'PlayerTeamSeasonID__PlayerID_id', 'PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation','PlayerTeamSeasonID__ClassID__ClassName','PlayerTeamSeasonID__TeamSeasonID__TeamID_id', 'GamesStarted', 'GamesPlayed', 'DEF_Tackles', 'DEF_Sacks', 'DEF_INT', 'DEF_Deflections', 'DEF_TacklesForLoss', 'FUM_Fumbles', 'TeamGameID', 'TeamGameID__GameID', 'TeamGameID__GameID__WeekID__WeekNumber', 'TeamGameID__GameID__WeekID__WeekName', 'TeamGameID__GameID__WeekID_id', 'BLK_Pancakes', 'BLK_Sacks', 'BLK_Blocks', 'KCK_FGA', 'KCK_FGM', 'KCK_XPM', 'KCK_XPA').annotate(  # call `annotate`
      //             PAS_CompletionPercentage=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(Sum(F('PAS_Completions'))* 100.0 / Sum(F('PAS_Attempts')),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerAttempt=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(Sum(F('PAS_Yards')) * 1.0 / Sum(F('PAS_Attempts')),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerCompletion=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('PAS_Completions')),1)),
      //                 output_field=FloatField()
      //             ),
      //             RUS_YardsPerCarry=Case(
      //                 When(RUS_Carries=0, then=0.0),
      //                 default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('RUS_Carries')),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_CompletionsAndAttempts=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
      //                 output_field=CharField()
      //             ),
      //             PAS_SacksAndYards=Case(
      //                 When(PAS_Attempts=0, then=0),
      //                 default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
      //                 output_field=CharField()
      //             ),
      //             REC_YardsPerCatch=Case(
      //                 When(REC_Receptions=0, then=0.0),
      //                 default=(Round(Sum(F('REC_Yards'))* 1.0 / Sum(F('REC_Receptions')),1)),
      //                 output_field=FloatField()
      //             ),
      //             REC_YardsPerGame=Case(
      //                 When(REC_Receptions=0, then=0.0),
      //                 default=(Round(Sum(F('REC_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
      //                 output_field=FloatField()
      //             ),
      //             RUS_YardsPerGame=Case(
      //                 When(RUS_Carries=0, then=0.0),
      //                 default=(Round(Sum(F('RUS_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerGame=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(Sum(F('PAS_Yards'))* 1.0 / Sum(F('GamesPlayed')),1)),
      //                 output_field=FloatField()
      //             ),
      //             Position = F('PlayerTeamSeasonID__PlayerID__PositionID__PositionAbbreviation'),
      //             GameOutcomeLetter = Case(
      //                 When(TeamGameID__IsWinningTeam = true, then=Value('W')),
      //                 When(Q(TeamGameID__IsWinningTeam = false) & Q(TeamGameID__GameID__WasPlayed = true), then=Value('L')),
      //                 default=Value(''),
      //                 output_field=CharField()
      //             ),
      //             OpponentTeamName = F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamName'),
      //             OpponentTeamLogoURL = F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamLogoURL'),
      //             OpponentTeamColor_Primary_HEX= F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID__TeamColor_Primary_HEX'),
      //             OpponentTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamGameID__OpposingTeamGameID__TeamSeasonID__TeamID'), output_field=CharField()),
      //             GameHref = Concat(Value('/World/'), Value(WorldID), Value('/Game/'), F('TeamGameID__GameID'), output_field=CharField()),
      //             GameScoreDisplay = Concat(F('TeamGameID__Points'), Value('-'), F('TeamGameID__OpposingTeamGameID__Points'), output_field=CharField()),
      //         ).order_by('-TeamGameID__GameID__WeekID__WeekNumber')
      //
      //
      //     PlayerStatsShow = {'Passing': false,
      //                       'Rushing': false,
      //                       'Receiving': false,
      //                       'Blocking': false,
      //                       'Defense': false,
      //                       'Kicking': false,}
      //
      //     PlayerStatsShowMap = {
      //                 'QB': 'Passing',
      //                 'RB': 'Rushing',
      //                 'FB': 'Rushing',
      //                 'WR': 'Receiving',
      //                 'TE': 'Receiving',
      //                 'OT': 'Blocking',
      //                 'OG': 'Blocking',
      //                 'OC': 'Blocking',
      //                 'DE': 'Defense',
      //                 'DT': 'Defense',
      //                 'OLB': 'Defense',
      //                 'MLB': 'Defense',
      //                 'CB': 'Defense',
      //                 'S': 'Defense',
      //                 'K': 'Kicking',
      //                 'P': 'Kicking'
      //                       }
      //     PrimaryStatShow = PlayerStatsShowMap[PlayerDict['PositionID__PositionAbbreviation']]
      //     for PS in PlayerStats:
      //         if PS['PAS_Attempts'] > 0:
      //             PlayerStatsShow['Passing'] = true
      //         if PS['RUS_Carries'] > 0:
      //             PlayerStatsShow['Rushing'] = true
      //         if PS['REC_Targets'] > 0:
      //             PlayerStatsShow['Receiving'] = true
      //         if PS['BLK_Blocks'] > 0:
      //             PlayerStatsShow['Blocking'] = true
      //         if PS['DEF_Tackles'] + PS['DEF_Deflections'] + PS['DEF_INT'] + PS['FUM_Forced'] > 0:
      //             PlayerStatsShow['Defense'] = true
      //         if PS['KCK_FGA'] + PS['KCK_XPA'] > 0:
      //             PlayerStatsShow['Kicking'] = true
      //
      //
      //     SeasonStats = PlayerObject.playerteamseason_set.all().order_by('TeamSeasonID__LeagueSeasonID').values('ClassID__ClassName', 'PlayerID__PlayerFirstName', 'PlayerID__PlayerLastName', 'PlayerID_id', 'PlayerID__PositionID__PositionAbbreviation','TeamSeasonID__TeamID_id', 'TeamSeasonID__LeagueSeasonID__SeasonStartYear', 'TeamSeasonID__LeagueSeasonID__IsCurrent').annotate(  # call `annotate`
      //             Position = F('PlayerID__PositionID__PositionAbbreviation'),
      //             GameScore=Sum('playergamestat__GameScore'),
      //             GamesPlayed=Sum('playergamestat__GamesPlayed'),
      //             RUS_Yards=Sum('playergamestat__RUS_Yards'),
      //             RUS_TD=Sum('playergamestat__RUS_TD'),
      //             RUS_Carries=Sum('playergamestat__RUS_Carries'),
      //             REC_Receptions=Sum('playergamestat__REC_Receptions'),
      //             REC_TD=Sum('playergamestat__REC_TD'),
      //             REC_Targets=Sum('playergamestat__REC_Targets'),
      //             PAS_Yards=Sum('playergamestat__PAS_Yards'),
      //             PAS_TD=Sum('playergamestat__PAS_TD'),
      //             PAS_Sacks=Sum('playergamestat__PAS_Sacks'),
      //             PAS_SackYards=Sum('playergamestat__PAS_SackYards'),
      //             PAS_Attempts=Sum('playergamestat__PAS_Attempts'),
      //             PAS_Completions=Sum('playergamestat__PAS_Completions'),
      //             PAS_INT=Sum('playergamestat__PAS_INT'),
      //             REC_Yards=Sum('playergamestat__REC_Yards'),
      //             DEF_Sacks=Sum('playergamestat__DEF_Sacks'),
      //             DEF_INT=Sum('playergamestat__DEF_INT'),
      //             DEF_Tackles=Sum('playergamestat__DEF_Tackles'),
      //             DEF_TacklesForLoss=Sum('playergamestat__DEF_TacklesForLoss'),
      //             FUM_Forced=Sum('playergamestat__FUM_Forced'),
      //             FUM_Recovered=Sum('playergamestat__FUM_Recovered'),
      //             PlayerPosition = F('PlayerID__PositionID__PositionAbbreviation'),
      //             PlayerName = Concat(F('PlayerID__PlayerFirstName'), Value(' '), F('PlayerID__PlayerLastName'), output_field=CharField()),
      //             PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID_id'), output_field=CharField()),
      //             PlayerTeamHref = Concat(Value('/World/'), Value(WorldID), Value('/Team/'), F('TeamSeasonID__TeamID_id'), output_field=CharField()),
      //             PlayerTeamLogoURL = F('TeamSeasonID__TeamID__TeamLogoURL'),
      //             SeasonYear = F('TeamSeasonID__LeagueSeasonID__SeasonStartYear'),
      //             PAS_CompletionPercentage=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(F('PAS_Completions')* 100.0 / F('PAS_Attempts'),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerAttempt=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(F('PAS_Yards') * 1.0 / F('PAS_Attempts'),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerCompletion=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(F('PAS_Yards')* 1.0 / F('PAS_Completions'),1)),
      //                 output_field=FloatField()
      //             ),
      //             RUS_YardsPerCarry=Case(
      //                 When(RUS_Carries=0, then=0.0),
      //                 default=(Round(F('RUS_Yards')* 1.0 / F('RUS_Carries'),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_CompletionsAndAttempts=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Concat('PAS_Completions', Value('-') ,'PAS_Attempts')),
      //                 output_field=CharField()
      //             ),
      //             PAS_SacksAndYards=Case(
      //                 When(PAS_Attempts=0, then=0),
      //                 default=(Concat('PAS_Sacks', Value('-') ,'PAS_SackYards')),
      //                 output_field=CharField()
      //             ),
      //             REC_YardsPerCatch=Case(
      //                 When(REC_Receptions=0, then=0.0),
      //                 default=(Round(F('REC_Yards')* 1.0 / F('REC_Receptions'),1)),
      //                 output_field=FloatField()
      //             ),
      //             REC_YardsPerGame=Case(
      //                 When(REC_Receptions=0, then=0.0),
      //                 default=(Round(F('REC_Yards')* 1.0 / F('GamesPlayed'),1)),
      //                 output_field=FloatField()
      //             ),
      //             RUS_YardsPerGame=Case(
      //                 When(RUS_Carries=0, then=0.0),
      //                 default=(Round(F('RUS_Yards')* 1.0 / F('GamesPlayed'),1)),
      //                 output_field=FloatField()
      //             ),
      //             PAS_YardsPerGame=Case(
      //                 When(PAS_Attempts=0, then=0.0),
      //                 default=(Round(F('PAS_Yards')* 1.0 / F('GamesPlayed'),1)),
      //                 output_field=FloatField()
      //             ),
      //         ).filter(GamesPlayed__gt = 0)
      //
      //     CareerHigh = {}
      //     if PlayerStats.count() >0:
      //         PAS_Yards_CareerHigh = PlayerStats.order_by('-PAS_Yards').first()
      //         RUS_Yards_CareerHigh = PlayerStats.order_by('-RUS_Yards').first()
      //         REC_Yards_CareerHigh = PlayerStats.order_by('-REC_Yards').first()
      //         CareerHigh = {'PAS_Yards': {'Stat': 'Passing Yards', 'Game': PAS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': PAS_Yards_CareerHigh['PAS_Yards']}, 'RUS_Yards':{'Stat': 'Rushing Yards', 'Game': RUS_Yards_CareerHigh['TeamGameID__GameID'], 'Value': RUS_Yards_CareerHigh['RUS_Yards']}, 'REC_Yards': {'Stat': 'Receiving Yards Yards', 'Game': REC_Yards_CareerHigh['TeamGameID__GameID'], 'Value': REC_Yards_CareerHigh['REC_Yards']}}
      //
      //         StatGrouping = []
      //         PlayerStatCategories = []
      //         for StatGrouping in SeasonStatGroupings:
      //             KeepGroup = false
      //             for u in SeasonStats:
      //                 u['SeasonStatVals'] = []
      //                 for Stat in StatGrouping['Stats']:
      //                     val = u[Stat['FieldName']]
      //
      //                     if Stat['DisplayColumn']:
      //                         u['SeasonStatVals'].append(val)
      //                         print(val)
      //                         if val is not None and str(val) not in ['0', '0.0', '-'] and Stat['FieldName'] != 'GamesPlayed':
      //                             KeepGroup = true
      //                             StatGrouping['KeepGroup'] = true
      //
      //
      //             if KeepGroup:
      //                 StatGrouping['SeasonStats'] = []
      //                 for u in SeasonStats:
      //
      //                     StatGrouping['SeasonStats'].append({'SeasonYear': u['SeasonYear'], 'Stats': u['SeasonStatVals']})
      //
      //
      //     PlayerStats = [u for u in PlayerStats]
      //     for G in PlayerStats:
      //         G['Stats'] = []
      //         for StatCategory in PlayerStatCategories:
      //             #print('StatCategory', StatCategory)
      //             if StatCategory['SeasonAggregateValue'] == true:
      //                 continue
      //             SC = {}
      //             SC['Value'] = G[StatCategory['FieldName']]
      //             SC['FieldName'] = StatCategory['FieldName']
      //             G['Stats'].append(SC)
      //
      //     RecentGameStats = PlayerStats[:5]
      //     GameStats = PlayerStats
      //
      //     CareerHighList = []
      //     for ch in CareerHigh:
      //         CareerHighList.append({'Stat': ch, 'Game': CareerHigh[ch]['Game'], 'Value': CareerHigh[ch]['Value']})
      //
      //
      //     PlayerListFlat = Player.objects.filter(playerteamseason__TeamSeasonID = TS).values(
      //         'PositionID__PositionAbbreviation', 'playerteamseason__playerteamseasonskill__OverallRating'
      //     ).annotate(
      //         PlayerName = Concat(F('PlayerFirstName'), Value(' '), F('PlayerLastName'), output_field=CharField()),
      //         PlayerHref = Concat(Value('/World/'), Value(WorldID), Value('/Player/'), F('PlayerID'), output_field=CharField()),
      //         PlayerTeamLogoURL = F('playerteamseason__TeamSeasonID__TeamID__TeamLogoURL'),
      //     ).order_by('PositionID__PositionSortOrder', '-playerteamseason__playerteamseasonskill__OverallRating')
      //
      //     print('PlayerListFlat', PlayerListFlat.query)
      //
      //     PlayerList = {}
      //     for P in list(PlayerListFlat):
      //         if P['PositionID__PositionAbbreviation'] not in PlayerList:
      //             PlayerList[P['PositionID__PositionAbbreviation']] = []
      //         PlayerList[P['PositionID__PositionAbbreviation']].append(P)
      //
      //
      //     context['GameStats'] = GameStats
      //     context['RecentGameStats'] = RecentGameStats
      //     context['careerHigh'] = CareerHighList
      //     context['SeasonStats'] = SeasonStats
      //     context['playerTeam'] = PlayerTeam
      //     context['CurrentPlayerTeamSeason'] = CurrentPlayerTeamSeason
      //     #context['PlayerStatCategories'] = PlayerStatCategories
      //     context['SeasonStatGroupings'] = SeasonStatGroupings
      //     context['PlayerStatsShow'] = PlayerStatsShow
      //     context['PrimaryStatShow'] = PrimaryStatShow
      //     context['PlayerList'] = PlayerList
      //
      //     Awards = []
      //     AwardQS = PlayerTeamSeasonAward.objects.filter(PlayerTeamSeasonID__PlayerID = PlayerDict['Player'])
      //     for Award in AwardQS.values('IsWeekAward', 'IsSeasonAward', 'IsPreseasonAward', 'IsConferenceAward', 'ConferenceID', 'IsNationalAward').annotate(AwardCount = Count('PlayerTeamSeasonAwardID')).order_by('-AwardCount'):
      //         s = ''
      //         if Award['IsNationalAward']:
      //             s += 'National Player of the '
      //         elif Award['IsConferenceAward']:
      //             Conf = CurrentWorld.conference_set.filter(ConferenceID = Award['ConferenceID']).first()
      //             s += Conf.ConferenceName + ' Player of the '
      //
      //         if Award['IsWeekAward']:
      //             s += 'Week'
      //         elif Award['IsSeasonAward']:
      //             s+= 'Year'
      //         elif Award['IsPreseasonAward']:
      //             s+= 'Preseason'
      //
      //         Award['AwardName'] = s
      //
      //         Awards.append(Award)
      //     context['Awards'] = Awards
      //
      //
      // else:
      //     page['PrimaryColor'] =  '1763B2'
      //     page['SecondaryColor'] = '000000'
      //
      //     RTS = RecruitTeamSeason.objects.filter(WorldID=WorldID).filter(PlayerTeamSeasonID__PlayerID = PlayerID).filter(Q(IsActivelyRecruiting=true) | Q(Signed=true)).select_related('TeamSeasonID__TeamID').order_by('-InterestLevel')
      //     context['RecruitTeamSeasons'] = RTS
      //
      //     if PlayerObject.RecruitSigned:
      //         SignedRTS = RTS.filter(Signed = true).first()
      //         SignedTeam = SignedRTS.TeamSeasonID.TeamID
      //         context['SignedTeam'] = SignedTeam



  var all_teams = await db.team.toArray();
  all_teams = all_teams.sort(function(teamA, teamB) {
    if ( teamA.school_name < teamB.school_name ){
      return -1;
    }
    if ( teamA.school_name > teamB.school_name ){
      return 1;
    }
    return 0;
  });


  const current_team = player.current_player_team_season.team_season.team;
  common.page = {PrimaryColor: current_team.team_color_primary_hex, SecondaryColor: current_team.secondary_color_display, NavBarLinks: NavBarLinks};
  var render_content = {
                        page:     common.page,
                        world_id: common.params.world_id,
                        all_teams: all_teams,
                        player: player,
                        current_team: current_team

                      }

  common.render_content = render_content;

  console.log('render_content', render_content)

  var url = '/static/html_templates/player/player/template.html'
  var html = await fetch(url);
  html = await html.text();

  var renderedHtml = await common.nunjucks_env.renderString(html, render_content)

  $('#body').html(renderedHtml)

}

    const action = async (common) => {

      common.display_player_face(common.render_content.player.player_face, {jersey: common.render_content.player.current_player_team_season.team_season.team.jersey, teamColors: common.render_content.player.current_player_team_season.team_season.team.jersey.teamColors}, 'PlayerFace');
      //
      //
      // const features = {
      //   // 'eye': {'eye1': .75, 'eye2': 1, 'eye3': 1, 'eye4': 1, 'eye5': 1, 'eye6': 1, 'eye7': 1, 'eye8': 1, 'eye9': 1, 'eye10': 1, 'eye11': 1, 'eye12': .1, 'eye13': 1, 'eye14': 1, 'eye15': 1, 'eye16': 1, 'eye17': 1, 'eye18': 1, 'eye19': 1, },
      //   // 'body': {'body': 1, 'body2': 1, 'body3': 1, 'body4': 1, 'body5': 1, },
      //   // 'ear': {'ear1': 1, 'ear2': 1, 'ear3': 1, },
      //   // 'head': {'head1': 1, 'head2': 1, 'head3': 1, 'head4': 1, 'head5': 1, 'head6': 1, 'head7': 1, 'head8': 1, 'head9': 1, 'head10': 1, 'head12': 1, 'head12': 1, 'head13': 1, 'head14': 1, 'head15': 1, 'head16': 1, 'head17': 1, 'head18': .1, },
      //   // 'mouth': {'straight': 1, 'angry': 1, 'closed': 1, 'mouth': 1, 'mouth2': 1, 'mouth3': 1, 'mouth4': 1, 'mouth5': 1, 'mouth6': 1, 'mouth7': 1, 'mouth8': 1, 'smile-closed': 1, 'smile': 1, 'smile2': 1, 'smile3': 1, },
      //   // 'nose': {'nose1': 1, 'nose2': .65, 'nose3': 1, 'nose4': 2, 'nose5': 1, 'nose6': .3, 'nose7': .2, 'nose8': .2, 'nose9': 2, 'nose10': 1, 'nose11': 1, 'nose12': 1, 'nose13': 1, 'nose14': 1, 'honker': 1, 'pinocchio': .1, },
      //   // 'eyebrow': {'eyebrow1': 1, 'eyebrow2': 1, 'eyebrow3': 1, 'eyebrow4': 1, 'eyebrow5': 1, 'eyebrow6': 1, 'eyebrow7': 1, 'eyebrow8': 1, 'eyebrow9': 1, 'eyebrow10': 1, 'eyebrow11': 1, 'eyebrow12': 1, 'eyebrow13': 1, 'eyebrow14': 1, 'eyebrow15': 1, 'eyebrow16': 1, 'eyebrow17': 1, 'eyebrow18': 1, 'eyebrow19': 1, 'eyebrow20': 1, },
      //   // 'hair': {'afro': 5, 'afro2': 15, 'bald': 10, 'blowoutFade': 15, 'cornrows': 7, 'crop-fade': 13, 'crop-fade2': 10,  'crop': 7, 'curly': 10,'curly2': 13, 'curly3': 15, 'curlyFade1': 7,'curlyFade2': 7, 'dreads': 12, 'emo': 1, 'faux-hawk': 5, 'fauxhawk-fade': 7, 'hair': 3, 'high': 10, 'juice': 15, 'messy-short': 15, 'messy': 15,  'middle-part': 12, 'parted': 10, 'shaggy1': 3, 'crop': 7, 'short-fade': 20, 'crop': 7, 'short3': 25, 'crop': 7, 'spike2': 10, 'spike4': 10, 'tall-fade': 20,  },
      //   // 'accessories': {'none': 80, 'headband': 10,  'headband-high': 10},
      //   // 'glasses': {'none': 95, 'glasses1-primary': 7,  'glasses1-secondary': 3},
      //   // 'eyeLine': {'none': 80, 'line1': 15, 'line2': 5},
      //   // 'smileLine': {'none': 85, 'line1': 5, 'line4': 10, },
      //   // 'miscLine': {'none': 85, 'chin2': 3, 'forehead2': 3, 'forehead3': 3,'forehead4': 3,'freckles1': 1, 'freckles2': 1, },
      //   // 'facialHair': {'none': 60, 'beard-point': 2, 'beard1': 2, 'beard2': 2, 'beard3': 1, 'beard4': 1, 'beard5': 1, 'beard6': 1 , 'chin-strap': 2, 'chin-strapStache': 3, 'fullgoatee': .5 , 'fullgoatee2': .5 , 'fullgoatee3': .5 , 'fullgoatee4': .5 , 'fullgoatee5': .5 , 'fullgoatee6': .5 , 'goatee1-stache':3, 'goatee1': .1, 'goatee2': .1, 'goatee3': .1, 'goatee4': .1, 'goatee5': .1, 'goatee6': .1, 'goatee7': .1, 'goatee8': .1, 'goatee9': .1, 'goatee10': .1, 'goatee11': .1, 'goatee12': .1,  'goatee15': .1, 'goatee16': .1, 'goatee17': .1, 'goatee18': .1, 'goatee19': .1, 'honest-abe': 3, 'honest-abe-stache': 1, 'mustache1': 4, 'mustache-thin': 3, 'soul': 5},
      //   'jersey': {'football': 1,'football2': 1,'football3': 1,'football4': 1,}
      // }
      //
      // let svgs2 = {};
      // var url = '', html = '';
      //
      // $.each(features, async function(group, group_obj){
      //   svgs2[group] = {}
      //   $.each(group_obj, async function(feature, odds){
      //     url = `/static/facesjs/${group}/${feature}.svg`;
      //     html = await fetch(url);
      //     html_text = await html.text();
      //     html_text = html_text.replace(/\n|\r/g, '');
      //     svgs2[group][feature] = html_text;
      //   })
      // })
      //
      //
      // console.log('svgs', JSON.stringify(svgs2))



    }




$(document).ready(async function(){
  var startTime = performance.now()

  const common = await common_functions('/World/:world_id/Player/:player_id/');

  await getHtml(common);
  await action(common);

  var endTime = performance.now()
  console.log(`Time taken to render HTML: ${parseInt(endTime - startTime)} ms` );

})
