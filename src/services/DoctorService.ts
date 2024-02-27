import BaseService from "./BaseService";
import Doctor from "../models/Doctor";
import { IMedic } from "../types/modalTypes";
class DoctorService extends BaseService<IMedic> {
	constructor() {
		super(Doctor);
	}
}

export const doctorService = new DoctorService();
