import BaseServices from "./BaseService";
import { Profession, IProfession } from "../models/Profession";

/**
 * @description Profession service class
 * @name ProfessionService
 * @class
 * @returns
 * */

class ProfessionService extends BaseServices<IProfession> {
	constructor() {
		super(Profession);
	}
}

export const professionService = new ProfessionService();
