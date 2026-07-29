import { useNavigate } from "react-router-dom";
import { createContext, useContext, useState } from "react";
import axios from "axios";
import httpStatus from "http-status";

import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`,
})

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);
    const router = useNavigate();

    const [userData, setUserData] = useState(authContext);

    const getStoredToken = () => {
        const token = localStorage.getItem("token");

        if (!token || token === "undefined" || token === "null") {
            localStorage.removeItem("token");
            return null;
        }

        return token;
    }

    const handleRegister = async(name, username, password) => {
        try {
             let request = await client.post('/register', {
                name: name,
                username: username,
                password: password
             })

             if(request.status === httpStatus.CREATED){
                return request.data.message;
             }
        } catch(err){
             throw err;
        }
    }

    const handleLogin = async(username, password) => {
        try{
             let request = await client.post('/login', {
                username: username,
                password: password
             });

             console.log(request.data);

             if(request.status === httpStatus.OK){
                const token = typeof request.data === "string" ? request.data : request.data.token;
                localStorage.setItem('token', token);
                router('/home');
             }
             return 'Login successful';
        }
        catch(err){
             throw err;
        }
    }

      const getHistoryOfUser = async () => {
        try {
            const token = getStoredToken();

            if (!token) {
                router("/auth");
                return [];
            }

            let request = await client.get("/get_all_activity", {
                params: {
                    token
                }
            });
            return request.data
        } catch (err) {
            throw err;
        }
    }

     const addToUserHistory = async (meetingCode) => {
        try {
            const token = getStoredToken();

            if (!token) {
                router("/auth");
                return;
            }

            let request = await client.post("/add_to_activity", {
                token,
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            if (e.response?.status === httpStatus.NOT_FOUND) {
                localStorage.removeItem("token");
                router("/auth");
            }
            throw e;
        }
    }


    const data = {
        userData, setUserData,  getHistoryOfUser, addToUserHistory, handleRegister, handleLogin
    }

    

    return (
        <AuthContext.Provider value = {data}>
            {children}
        </AuthContext.Provider>
    )
}

