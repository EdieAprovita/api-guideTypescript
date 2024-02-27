import BaseService from "./BaseService";
import Business from "../models/Business";
import { IBusiness } from "../types/modalTypes";

class BusinessService extends BaseService<IBusiness> {
	constructor() {
		super(Business);
	}
}

export const businessService = new BusinessService();
