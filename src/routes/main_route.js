import { addnewContact,
    getContacts,
    getContactWithID,
    updateContact,
    deleteContact
} from '../controllers/main_controller';

const routes = (app) => {
    app.route('/')
        // .get((req, res) => {
        //     res.sendFile(__dirname + "/public/index.html");
        // });
        .get((req, res) => {
            const user = {
                firstName: 'Tim',
                lastName: 'Cook',
            }
            res.render("./pages/index", {
                user
            });
        });

    app.route('/login')
        .get((req, res) => {
            res.sendFile(__dirname + "../../public/login.html");
            // res.render(__dirname + "/public/login", {Title:"KKKK"});
        })
        // Post endpoint
        .post(getContacts);

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
