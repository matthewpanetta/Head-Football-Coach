import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);
        this.team_id = params.team_id;
        this.setTitle("Viewing Team");
    }

    async getHtml(db) {
        const team_query = db.team.findOne({
          selector: {
            team_id: this.team_id
          }
        });

        const team = await team_query.exec();

        return `
            <h1>${team.school_name} ${team.team_name}</h1>
            <p>You are viewing team #${this.team_id}. They have prestige ${team.prestige}</p>
        `;
    }
}
