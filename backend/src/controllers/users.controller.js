import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

// Login route
const login = async (req, res) =>{
    const {username, password} = req.body;
    if(!username || !password){
        return res.status(400).send("please provide username and password");
    }

    try{
        const user = await User.findOne({username});
        if(!user) {
            return res.status(httpStatus.NOT_FOUND).send("User Not Found");
        }

        let isPasswordCorrect = await bcrypt.compare(password, user.password);

        if(isPasswordCorrect){
            let token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token });
        } else{
            return res.status(httpStatus.UNAUTHORIZED).send("Invalid Username and Password");
        }
       
    }
    catch (e){
       return res.status(500).send(`something went wrong ${e}`);   
    }
}
// registration rout 
const register = async (req , res) =>{
    const {name, username, password } = req.body;

    try{
        const existingUser = await User.findOne({ username});
        if(existingUser){
            return res.status(httpStatus.FOUND).send("User already exist");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "User registered" });

    } catch (e){
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(`Something went Wrong ${e}`);
    }
}

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).send("User not found");
        }

        const meetings = await Meeting.find({ user_id: user.username });
        return res.send(meetings);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(`Something went wrong ${e}`);
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).send("User not found");
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();

        return res.status(httpStatus.CREATED).send("Added code to history");
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send(`Something went wrong ${e}`);
    }
}

export {login, register, getUserHistory, addToHistory};
