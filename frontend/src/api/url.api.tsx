import { axiosClient } from "../config/axiosClient";
import type ShortenResponse from "../types/url.type";

export const fetchShortenData = async () : Promise<ShortenResponse> => {
    try{
    const response = await axiosClient.get('/shorten')
    console.log(response.data)
    return response.data;
    }catch(err){
      console.error(err)
      throw err;
    }
}

export const createShortenUrl = async (originalUrl: string) : Promise<ShortenResponse> => {
    try{
        const response = await axiosClient.post('/shorten', { originalUrl, userId: null });
        return response.data;
    }catch(err){
        console.error(err)
        throw err;
    }
}