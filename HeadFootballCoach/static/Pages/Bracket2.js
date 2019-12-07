function buildtree(teams, MaxRounds) {
  var round = MaxRounds + 1;
  var gid = (2 ** round) - 1;
  //var gid = 127;
  console.log(round, gid);
  var root = {
    gid: gid--,
    region: "south-east-west-midwest",
    round: round--,
    children: [],
  };

  var roundgames = {};
  roundgames[round + 1] = [root];
  // 1-16: south; 17-32: east; 33-48: west; 49-64: midwest
  // 65-72: south; 73-80: east; 81-88: west; 89-96; midwest
  // 97-100: south; 101-104: east; 105-108: west; 109-112: midwest
  // 113-114: s; 115-116: e; 117-118: w; 119-120: mw
  // 121: s; 122: e; 123: w; 124: mw
  // 125: s-e; 126: w-mw
  // 127: s-e-w-mw
  function region(gid) {
    if ((gid >= 1 && gid <= 16) || (gid >= 65 && gid <= 72) ||
        (gid >= 97 && gid <= 100) ||
        (gid == 113 || gid == 114 || gid == 121)) { return "south"; }
    if ((gid >= 17 && gid <= 32) || (gid >= 73 && gid <= 80) ||
        (gid >= 101 && gid <= 104) ||
        (gid == 115 || gid == 116 || gid == 122)) { return "east"; }
    if ((gid >= 33 && gid <= 48) || (gid >= 81 && gid <= 88) ||
        (gid >= 105 && gid <= 108) ||
        (gid == 117 || gid == 118 || gid == 123)) { return "midwest"; }
    if ((gid >= 49 && gid <= 64) || (gid >= 89 && gid <= 96) ||
        (gid >= 109 && gid <= 112) ||
        (gid == 119 || gid == 120 || gid == 124)) { return "west"; }
    if (gid == 125) { return "south-east"; }
    if (gid == 126) { return "west-midwest"; }
    if (gid == 127) { return "south-east-west-midwest"; }
    if (gid == 0) { return "south-east-west-midwest"; }

    // raise an error if we fall through
    throw new Error("undefined region for gid " + gid);
  }

  while (round > 0) {
    roundgames[round] = [];
    for (var i=0; i < roundgames[round+1].length; i++) {
      var left = {
        gid: gid,
        region: region(gid),
        round: round,
        children: [],
      };
      gid--;

      var right = {
        gid: gid,
        region: region(gid),
        round: round,
        children: [],
      };
      gid--;

      //console.log(left, right, gid)

      if (round < MaxRounds - 1) {
        roundgames[round+1][i].children.push(right);
        roundgames[round+1][i].children.push(left);
        roundgames[round].push(right);
        roundgames[round].push(left);
      }
      else {
        roundgames[round+1][i].children.push(left);
        roundgames[round+1][i].children.push(right);
        roundgames[round].push(left);
        roundgames[round].push(right);
      }

    }
    round--;
  }

  var r_to_l = ['1', '16', '8', '9', '5', '12', '4', '13',
           '6', '11', '3', '14', '7', '10', '2', '15'];

  var l_to_r = ["15", "2", "10", "7", "14", "3", "11", "6",
           "13", "4", "12", "5", "9", "8", "16", "1"];

  var TeamsPerRegion = (2 ** MaxRounds) / 4;
  r_to_l = $.grep(r_to_l, function(o){
    return o <= TeamsPerRegion;
  });

  l_to_r = $.grep(l_to_r, function(o){
    return o <= TeamsPerRegion;
  });

  var regions = ["south", "east", "midwest", "west"];
  //var regions = [ "east", "west"];
  function findgame(gid) {
    var found;

    $.each(roundgames, function(round, roundgamelist){
      $.each(roundgamelist, function(i, game) {
        if (game.gid == gid) {
          found = game;
          return false;
        }
      });
    });

    if (!found) throw new Error("Unable to find gid " + gid);

    return found;
  }

  var gid = 1;
  $.each(regions, function(i, region) {
    var order;
    if (region == "south" || region == "east") { order = r_to_l; }
    else                                       { order = l_to_r; }

    $.each(order, function(j, seed) {
      var game = findgame(gid);
      //game.team = teams[region][seed];
      game.team = teams[seed];
      gid++;
    });
  });

  return root;
}

function main(teams, WorldID) {
  console.log('main data', teams, WorldID);

  var MaxRounds = 0;

  $.each(teams, function(index,TeamObj){
    MaxRounds = (MaxRounds > TeamObj.round) ? MaxRounds : TeamObj.round;
  });

  var radius = 400,
      numRounds = MaxRounds + 1,
      segmentWidth = radius / (numRounds + 1),
      root = buildtree(teams, MaxRounds),
      logoheight = 30;

  var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, radius]) // x maps to angle, y to radius
    .value(function(d) { return 1; }); //Important!

  var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return d.y; })
    .outerRadius(function(d) { return d.y + d.dy; });

  function trans(x, y) {
    return 'translate('+x+','+y+')';
  }

  function rotate(a, x, y) {
    a = a * 180 / Math.PI;
    return 'rotate('+a+')';
  }

  var xCenter = radius, yCenter = radius;
  var svg = d3.select('#bracket')
              .append('svg')
                .attr('width', radius*2+25)
                .attr('height', radius*2+25)
              .append('g')
                .attr("id", "center")
                .attr('transform', trans(xCenter,yCenter));

  var chart = svg.append('g').attr("id", "chart");

  chart.datum(root).selectAll('.arc')
    .data(partition.nodes)
    .enter()
    .append('g')
      .attr("class", "arc")
      .attr("id", function(d) { return "game" + d.gid; });

  var arcs = d3.selectAll('.arc');

  function clamp(n) {
    if (n>1) { return 1; }
    return n;
  }

  function calcTextcolor(color, alpha) {
    // http://javascriptrules.com/2009/08/05/css-color-brightness-contrast-using-javascript/
    var brightness = color[0]*0.299 + color[1]*0.587 + color[2]*0.114;
    brightness /= alpha;

    if (brightness > 125 || alpha < 0.15) {
      return "#333"; //black
    }
    return "#FFF"; //white
  }

  function rgba(color, alpha) {
    // Very small alpha values mess up webkit
    if (alpha.toString().indexOf("e") > -1) { alpha = 0; }
    //return "rgba("+color[0]+","+color[1]+","+color[2]+","+alpha+")";
    return "#"+color;
  }

  var spots = {
    117: [65, 185],
    118: [165, 95],
    119: [178, -70],
    121: [-104, -104],
    122: [-104, 104],
    123: [100, 92],
    124: [96, -88],
    125: [-80,0],
    126: [80,0],
    127: [0,20],
  };

  function fillpath(game) {
    var par = game.parent;
    for (var round=game.round; round < 7; round++) {
      var sr = "round"+round;
      var gameg = d3.select("#game" + par.gid);
      if (gameg.datum().team) { par = par.parent; continue; }

      // color the main path
      var alpha = clamp(game.team[sr]*2);
      var color = rgba(game.team.color, alpha);
      gameg.select("path").style("fill", color);

      var x,y;
      if (spots.hasOwnProperty(par.gid)) {
        x = spots[par.gid][0];
        y = spots[par.gid][1];
      } else {
        var bb = gameg.node().getBBox();
        x = bb.x + bb.width/2;
        y = bb.y + bb.height/2;
      }

      var pct = (game.team[sr] * 100);
      if (pct > 1)      { pct = pct.toFixed(0).toString() + "%"; }
      else if (pct > 0) { pct = "<1%"; }
      else              { pct = ""; }
      gameg.append("text")
          .text(pct)
          .attr("class", "pcttext")
          //.attr("fill", calcTextcolor(game.team.color, alpha))
          .attr("fill", '#ff6600')
          .attr("text-anchor", "middle")
          .attr("x", x)
          .attr("y", y);
      par = par.parent;
    }

    var teamcolor = calcTextcolor(game.team.color, alpha);
    d3.select("#center")
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .style("fill", "#666")
      .attr("id", "teamname")
      .text(game.team.name);

    d3.selectAll("#game127 .logo").style("opacity", "1");
  }

  function getLogoColors(game) {
    RGBaster.colors(game.team.logourl, function(payload) {
      var colors = payload.dominant.match(/(\d{1,3}),(\d{1,3}),(\d{1,3})/);

      game.team.color = [colors[1], colors[2], colors[3]];

      fillpath(game);
    });
  }

  function hover(game) {
    if (!game.team) { return; }

    // If we don't yet know the team's color, parse the logo and save it.
    // Else, just fill the path with the cached value
    if (game.team.color === undefined) {
      getLogoColors(game);
    } else {
      //fillpath(game);
      console.log(game)

    }
  }

  function clear(team) {
    //d3.selectAll(".arc path").style("fill", "#fff");
    d3.selectAll(".pcttext").remove();
    d3.selectAll("#teamname").remove();
    d3.selectAll("#game127 .logo").style("opacity", "1");
  }

  arcs.on('mouseenter', function(d) { clear(d); /*hover(d);*/ })
    .on('mouseleave', function(d) { clear(d); })
    .on('touchstart', function(d) { clear(d); hover(d); })
    .append('path')
      .attr('d', arc)
      .attr("id", function(d) { return "path-game" + d.gid; });

  var multipliers = {
    4: 1.03,
    5: 1.07,
    6: 1.1,
  }

  multipliers = {
    3: 1.03,
    2: 1.07,
    1: 1.4,
  }

  var logoSizeMap = {
    1: 30,
    2: 40,
    3: 48,
    4: 56,
    5: 64,
    6:72,
    7:80
  }

  logoSizeMap = {
    7: 30,
    6: 40,
    5: 48,
    4: 56,
    3: 64,
    2:72,
    1:80,
    0:90
  }

  function logo(d) {
      var bb = d3.select("#game"+d+" path").node().getBBox();
      var x = bb.x + bb.width/2;
      var y = bb.y + bb.height/2;
      var m = 1;
      if (multipliers.hasOwnProperty(teams[d].round)) {
        m = multipliers[teams[d].round];
        x *= m;
        y *= m;
      }
      logoheight = logoSizeMap[teams[d].round];
      //console.log(i, logoheight, m,x,y, x / m, y / m)
    //  x *= (logoheight / 30)
    //  y *= (logoheight / 30)
      x -= logoheight/2;
      y -= logoheight/2;
      return {'trans': trans(x, y), 'logoheight': logoSizeMap[teams[d].round]/*logoheight * m*/};
  }

  arcs.append("clipPath")
    .attr("id", function(d) { return "text-clip-game" + d.gid; })
  .append("use")
    .attr("xlink:href", function(d) { return "#path-game" + d.gid; });

  logos = arcs.append('g')
    .attr("class", "logo")
    .attr("clip-path", function(d) { return "url(#text-clip-game"+d.gid+")"; })
    .attr("id", function(d) { return "logo" + d.gid; });


  function clipurl(d)  { return "url(#text-clip-game"+d.gid+")"; }
  function logoname(d) { return teams[i].logourl; }
  function logoid(d)   { return "logo" + d.gid; }

/*
  for (var i=1; i < 128; i++) {
    var game = d3.select("#game" + i).datum();
    if (game.team && game.team["round" + game.round] == 1) {
      var gid = game.parent.gid;
      var wingame = d3.select("#game" + gid);
      wingame.datum().team = game.team;
      wingame.append('g')
        .attr("class", "logo")
        .attr("clip-path", clipurl)
        .attr("id", logoid)
      .append('a')
        .attr('href', '/Team/'+game.team.teamid)
      .append("image")
        .attr("xlink:href", logoname)
        .attr("transform", logo)
        .attr("width", logoheight)
        .attr("height", logoheight);
    }
  }
  */

  for (var i=1; i < 128; i++) {
    var game = teams[i];
    if (i in teams) {
      var wingame = d3.select("#game" + i);
      var logoAttrs = logo(i);
      wingame.attr('fill', '#'+game.color);


      var link = '/World/'+WorldID+'/Game/'+game.GameID;
      if ((i % 2 == 1) && (game.round > 0)) {
        var pairTeam = teams[i + 1];
        var pairTeamClass = ''
        var gameClass = ''
        var gamePointString = ''
        var pairTeamPointString = ''
        if (game.points > 0) {
          gamePointString = ' - ' + game.points
          pairTeamPointString = ' - ' + pairTeam.points
          if (game.points > pairTeam.points){
            gameClass = 'bold';
          }
          else {
            pairTeamClass = 'bold'
          }
        }
        var tooltipText = '<div class='+gameClass+'>('+game.seed+') '+ game.name + gamePointString +'</div> vs <div class='+pairTeamClass+'>' + '('+pairTeam.seed+') '+ pairTeam.name + pairTeamPointString +'</div>'
      }
      else if ((i % 2 == 0) && (game.round > 0) ) {
        var pairTeam = teams[i - 1];
        var pairTeamClass = ''
        var gameClass = ''
        var gamePointString = ''
        var pairTeamPointString = ''
        if (game.points > 0) {
          gamePointString = ' - ' + game.points
          pairTeamPointString = ' - ' + pairTeam.points
          if (game.points > pairTeam.points){
            gameClass = 'bold';
          }
          else {
            pairTeamClass = 'bold'
          }
        }

        var tooltipText = '<div class='+pairTeamClass+'>('+pairTeam.seed+') '+ pairTeam.name + pairTeamPointString +'</div> vs <div class='+gameClass+'>' + '('+game.seed+') '+ game.name + gamePointString +'</div>'
      }
      else {
        var tooltipText = 'National Champions - '+ game.name
        link = '/World/'+WorldID+'/Team/'+game.teamid;
      }
      //console.log(game, pairTeam);

      wingame.append('g')
        .attr("class", "logo")
        .attr("clip-path", clipurl)
        .attr("id", logoid)
      .append('a')
        .attr('href', link)
      .append("image")
        .attr("xlink:href", logoname(i))
        .attr("transform", logoAttrs.trans)
        .attr('class', 'tooltipster bracketRound'+game.round)
        .attr('title', 'Tooltip title!!!')
        .attr('data-tooltip-teamname', tooltipText)
        .attr('data-tooltip-content', '#tooltip_content')
        .attr("width", logoAttrs.logoheight)
        .attr("height", logoAttrs.logoheight);
      }
  }

  var nradius = radius + 30;
  var arcmaker = d3.svg.arc().innerRadius(nradius).outerRadius(nradius);
  var regionarcs = [
    {region: "West", startAngle: 0, endAngle: Math.PI/2},
    {region: "Midwest", startAngle: Math.PI/2, endAngle: Math.PI},
    {region: "East", startAngle: Math.PI, endAngle: 3*Math.PI/2},
    {region: "South", startAngle: 3*Math.PI/2, endAngle: 2*Math.PI}
  ];

  var namearcs = d3.select("#center")
    .append("g")
      .attr("id", "namearcs");

  var namearc = namearcs.selectAll("g")
    .data(regionarcs)
    .enter()
    .append("g")
      .attr("class", "namearc");

  namearc.append("defs").append("path")
      .attr("d", arcmaker)
      .attr("id", function(d) { return "regionpath-" + d.region; })
      .attr("class", "regionpath")
      //.attr("style", "display:none");

  namearc.append("text")
    .append("textPath")
      .attr("text-anchor", "middle")
      .attr("startOffset", "25%")
      .attr("xlink:href", function(d) { return "#regionpath-" + d.region; })
      .style("fill", "#888")
      .style("font-weight", "bold")
      .style("font-size", "20px")
      .text(function(d) { return d.region; });
}
