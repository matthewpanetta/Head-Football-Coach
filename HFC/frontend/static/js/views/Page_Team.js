import AbstractView from "./AbstractView.js";

export default class extends AbstractView {
    constructor(params) {
        super(params);

        this.world_id = params.world_id;
        this.team_id = params.team_id;
        this.setTitle("Viewing Team");

    }


    async getHtml() {
        const db = this.db;

        const team = {
            school_name: 'blank', team_name: 'blank', team_id: 1, prestige: 1
        }
        return `
            <h1>${team.school_name} ${team.team_name}</h1>
            <p>You are viewing team #${this.team_id}. They have prestige ${team.prestige}</p>
        `;
    }
}
