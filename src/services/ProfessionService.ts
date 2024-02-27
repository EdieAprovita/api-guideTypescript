import BaseService from "./BaseService";
import Profession from "../models/Profession";
import { IProfessionProfile } from "../types/modalTypes";

class ProfessionService extends BaseService<IProfessionProfile> {
	constructor() {
		super(Profession);
	}
}

export const professionService = new ProfessionService();
