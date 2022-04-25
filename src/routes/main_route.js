import {
    signupUser,
    loginUser,
    getYourOrder,
    getTrackingInfo,
    editAddress,
    verifyAndResetPassword,
    googleLoginUrl,
    getGoogleInfo
} from '../controllers/main_controller';

var path = require('path')

const routes = (app) => {
    app.route('/')
        .get((req, res) => {
            res.render("./pages/index", {login:false, error:false, order:""});
        })
        .post(getTrackingInfo);

    app.route('/login')
        .get((req, res) => {
            // res.sendFile(__dirname + "../../public/login.html");
            // res.sendFile( path.resolve("public/login.html"));
            res.render("./pages/index", {login:true, googleLink: googleLoginUrl ,error:false});
        })
    
    // for the next('route') purpose
    app.post('/login', (req, res, next) => {
        if(req.body.submitBtn == "Login" ){
            next('route')
        }
        else{
            next()
        }
    }, signupUser);
    app.post('/login', loginUser, getYourOrder);

    app.route('/personal-page')
        .get(getYourOrder)
        
        // Post endpoint
        .post(editAddress, getYourOrder);

    app.route('/reset')
        .get((req, res) => {
            res.render("./pages/personal", {reset:true, error:false});
        })
        
        // Post endpoint
        .post(verifyAndResetPassword);
    
    app.route('/authenticate')
        .get(getGoogleInfo, getYourOrder)
        
        // Post endpoint
        // .post(editAddress, getYourOrder);

    // app.route('/contact/:contactID')
    //     // get a specific contact
    //     .get(getContactWithID)

    //     // updating a specific contact
    //     .put(updateContact)

    //     // deleting a specific contact
    //     .delete(deleteContact);
    
}

export default routes;
