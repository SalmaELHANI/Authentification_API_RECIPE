const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY;

function verifyToken(req, res, next) {
    
    const bearerHeader = req.headers['authorization'];
      console.log(bearerHeader);
      const bearer = bearerHeader.split(' ');  
      const token = bearer[1];
      

    if (token) {
        try {
            const decoded = jwt.verify(token,secretKey)  // decoded = {id ,admin}
            req.user = decoded;
            console.log("Decoded Token:", decoded);
            next();
        } catch (error) {
            res.status(401).json({message:"No token provided"}) 
        }
    } else {
        res.status(401).json({message:"No token provided"})
    }
}

function verifyTokenAndAuth(req,res,next) {
    verifyToken(req,res, ()=>{
        const requestedUserId = req.params.id;
        const authenticatedUserId = req.user.id;
        console.log("Requested User ID:", requestedUserId);
        console.log("Authenticated User ID:", authenticatedUserId);
        if(requestedUserId === authenticatedUserId ){
            next();
        }else{
            return res.status(403) // forbidden
            .json({message: "You are not allowed"}) // Unauthorized
        }
    } );
}

module.exports = {verifyToken, verifyTokenAndAuth};
