import api from "../config/apiConfig";
import type ShortenResponse from "../types/api.type";

export const fetchShortenData = async () : Promise<ShortenResponse> => {
    try{
    const response = await api.get('/api/shorten')
    console.log(response.data)
    return response.data;
    }catch(err){
      console.error(err)
      throw err;
    }
}

export const createShortenUrl = async (originalUrl: string) : Promise<ShortenResponse> => {
    try{
        const response = await api.post('/api/shorten', { originalUrl });
        return response.data;
    }catch(err){
        console.error(err)
        throw err;
    }
}