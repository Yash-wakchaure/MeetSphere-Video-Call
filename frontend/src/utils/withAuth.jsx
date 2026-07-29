import { useEffect } from "react";
import { useNavigate } from "react-router-dom"

const withAuth = (WrappedComponent) =>{
    const AuthComponent = (props) => {
        const router = useNavigate();

        const isAuthenticated = () =>{
            const token = localStorage.getItem("token");

            if(token && token !== "undefined" && token !== "null") {
                return true;
            }

            localStorage.removeItem("token");
            return false;
        }

        useEffect(() => {
            if(!isAuthenticated()) {
                router("/auth")
            }
        }, [])

    return <WrappedComponent {...props} />
    }
    return AuthComponent;
}

export default withAuth;
