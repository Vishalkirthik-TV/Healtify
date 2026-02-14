import axios from "axios";
import { API_URL } from "../constants/Config";

export const getBaseUrl = () => API_URL;

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "multipart/form-data",
    },
});

export const triageService = {
    analyze: async (data: {
        imageUri: string;
        description: string;
        duration: string;
        painLevel: number;
        hasFever: boolean;
        hasHistory: boolean;
    }) => {
        const formData = new FormData();

        // Append image
        const filename = data.imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const type = match ? `image/${match[1]}` : `image`;

        // @ts-ignore: FormData expects Blob but React Native takes object with uri, name, type
        formData.append("image", {
            uri: data.imageUri,
            name: filename,
            type,
        });

        // Append other fields
        formData.append("description", data.description);
        formData.append("duration", data.duration);
        formData.append("painLevel", data.painLevel.toString());
        formData.append("hasFever", data.hasFever.toString());
        formData.append("hasHistory", data.hasHistory.toString());

        const response = await api.post("/triage", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data;
    },
};
