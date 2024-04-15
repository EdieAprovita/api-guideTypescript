import BaseService from "./BaseService";
import { ISantuary, Santuary } from "../models/Santuary";

/**
 * @description Santuary service class
 * @name SantuaryService
 * @class
 * @returns {Object}
 */

class SantuaryService extends BaseService<ISantuary> {
	constructor() {
		super(Santuary);
	}
}

export const santuaryService = new SantuaryService();
