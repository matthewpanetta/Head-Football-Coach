export const page_export = async (common) => {
    let teams = common.db.team.find();
    teams = teams.filter((team) => {
        return team.team_id > 0;
    });

    await fetch('/export/roster', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            teams: teams
        })
    });
};