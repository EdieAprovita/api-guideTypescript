import BaseService from "./BaseService";
import { IBusiness, Business } from "../models/Business";

class BusinessService extends BaseService<IBusiness> {
	constructor() {
		super(Business);
	}

	
}

export const businessService = new BusinessService();
