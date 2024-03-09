import BaseServices from "./BaseService";
import { Profession, IProfession } from "../models/Profession";


class ProfessionService extends BaseServices<IProfession> {
	constructor() {
		super(Profession);
	}

	
}

export const professionService = new ProfessionService();
