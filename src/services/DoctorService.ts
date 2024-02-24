import Doctor from "../models/Doctor";
import { IMedic } from "../types/modalTypes";
import { NotFoundError } from "../types/Errors";

class DoctorService {
	async getAllDoctors(): Promise<IMedic[]> {
		return await Doctor.find({});
	}

	async getDoctorById(id: string): Promise<IMedic> {
		const doctor = await Doctor.findById(id);
		if (!doctor) {
			throw new NotFoundError();
		}
		return doctor;
	}

	async createDoctor(data: IMedic): Promise<IMedic> {
		return await Doctor.create(data);
	}

	async updateDoctor(id: string, data: IMedic): Promise<IMedic> {
		const doctor = await Doctor.findByIdAndUpdate(id, data, {
			new: true,
			runValidators: true,
		});
		if (!doctor) {
			throw new NotFoundError();
		}
		return doctor;
	}

	async deleteDoctor(id: string): Promise<void> {
		const doctor = await Doctor.findById(id);
		if (!doctor) {
			throw new NotFoundError();
		}
		await doctor.deleteOne();
	}
}

export default new DoctorService();
