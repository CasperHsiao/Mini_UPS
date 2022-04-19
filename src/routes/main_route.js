import { addnewContact,
    getContacts,
    getContactWithID,
    updateContact,
    deleteContact,
    signupUser,
    loginUser
} from '../controllers/main_controller';

var path = require('path')

const routes = (app) => {
    app.route('/')
        .get((req, res) => {
            res.render("./pages/index", {login:false});
        });
        // .get((req, res) => {
        //     const user = {
        //         firstName: 'Tim',
        //         lastName: 'Cook',
        //     }
        //     const type = {
        //         first: 'KKK',
        //         second: 'YYY',
        //     }
        //     res.render("./pages/index", {
        //         login:false,
        //         user:user,
        //         Q:type
        //     });
        //});

    app.route('/login')
        .get((req, res) => {
            // res.sendFile(__dirname + "../../public/login.html");
            // res.sendFile( path.resolve("public/login.html"));
            res.render("./pages/index", {login:true, error:false});
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
    app.post('/login', loginUser);

    app.route('/contact')
        .get((req,res, next) => {
            // middleware
            console.log(`Request from: ${req.originalUrl}`)
            console.log(`Request type: ${req.method}`)
            next();
        }, getContacts)
        
        // Post endpoint
        .post(addnewContact);
    
    app.route('/hello')
        .get((req, res) => {
            // res.set("Content-Type", "application/json");
            res.type("json");
            res.send({ "msg" : "Hello" });
        });

    app.route('/contact/:contactID')
        // get a specific contact
        .get(getContactWithID)

        // updating a specific contact
        .put(updateContact)

        // deleting a specific contact
        .delete(deleteContact);
    
}

export default routes;
