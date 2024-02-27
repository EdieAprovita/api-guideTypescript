import BaseService from "./BaseService";
import Market from "../models/Market";
import { IMarket } from "../types/modalTypes";

class MarketsService extends BaseService<IMarket> {
	constructor() {
		super(Market);
	}
}

export const marketsService = new MarketsService();
