import BaseService from "./BaseService";
import { Market, IMarket } from "../models/Market";


class MarketsService extends BaseService<IMarket> {
	constructor() {
		super(Market);
	}

	
}

export const marketsService = new MarketsService();
