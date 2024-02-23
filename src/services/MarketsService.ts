import Market from '../models/Market';
import { IMarket } from '../types/modalTypes';
import { NotFoundError } from '../types/Errors';

class MarketsService {
    async getAllMarkets(): Promise<IMarket[]> {
        return await Market.find({});
    }

    async getMarketById(id: string): Promise<IMarket> {
        const market = await Market.findById(id);
        if (!market) {
            throw new NotFoundError();
        }
        return market;
    }

    async createMarket(data: IMarket): Promise<IMarket> {
        return await Market.create(data);
    }

    async updateMarket(id: string, data: IMarket): Promise<IMarket> {
        const market = await Market.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });

        if (!market) {
            throw new NotFoundError();
        }
    return market;
}

async deleteMarket(id: string): Promise<void> {
    const market = await Market.findById(id);
    if (!market) {
        throw new NotFoundError();
    }
    await market.deleteOne();
    }
}

export default new MarketsService();