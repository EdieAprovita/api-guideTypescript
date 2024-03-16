import BaseService from "./BaseService";
import { ProfessionalProfile, IProfessionProfile } from "../models/ProfessionProfile";


class ProfessionProfileService extends BaseService<IProfessionProfile> {
	constructor() {
		super(ProfessionalProfile);
	}

	
}

export const professionProfileService = new ProfessionProfileService();
