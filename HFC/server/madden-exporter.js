const fs = require('fs');
const path = require('path');
const MaddenRosterHelper = require('madden-file-tools/helpers/MaddenRosterHelper');

const DEFAULT_ROSTER_SAVE_PATH = path.join(__dirname, '../data/M23_BaseRoster');
const ROSTER_OUTPUT_PATH = path.join(__dirname, '../data/RosterOutput');

module.exports.exportRoster = async (appData, outputPath) => {
    const helper = new MaddenRosterHelper();
    const maddenRoster = await helper.load(DEFAULT_ROSTER_SAVE_PATH);
    
    appData.teams.filter((appTeam) => {
        return appTeam.team_location_name !== null; 
    }).forEach((appTeam, index) => {
        maddenRoster.TEAM.records[index].TLNA = appTeam.team_location_name;
        maddenRoster.TEAM.records[index].TDNA = appTeam.team_nickname;
    });

    if (!outputPath) {
        outputPath = ROSTER_OUTPUT_PATH;
    }

    await helper.save(outputPath);
};