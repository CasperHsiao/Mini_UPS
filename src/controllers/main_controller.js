import mongoose from 'mongoose';
import { AccountSchema, OrderSchema } from '../models/model';

const Account = mongoose.model('Account', AccountSchema);
const Order = mongoose.model('Order', OrderSchema);

export const signupUser = (req, res) => {
    Account.findOne({"UserName" : req.body.Username}, (err, account) => {
        if (err) {
            res.send(err);
        }
        
        if (account) {
            console.log("singup_fail");
            res.render("./pages/index", {login: true , msg: "Username already exists!"});
        }
        else{
            delete req.body['submitBtn']
            console.log(req.body)

            let newAccount = new Account(req.body);
            console.log(newAccount);

            newAccount.save((err, contact) => {
                if (err) {
                    res.send(err);
                }
                res.render("./pages/index", {login:false});
            });
        }
    });

    
}

export const loginUser = (req, res) => {
    console.log("login");
    Account.findOne({"UserName" : req.body.Username}, (err, account) => {
        if (err) {
            res.send(err);
        }
        res.json(account);
    });

    
}

export const addnewContact = (req, res) => {
    let newContact = new Contact(req.body);

    newContact.save((err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
}

export const getContacts = (req, res) => {
    console.log(req.body.UserName)
    Contact.findOne({"UserName" : req.body.UserName}, (err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
}

export const getContactWithID = (req, res) => {
    Contact.findById(req.params.contactID, (err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
}

export const updateContact = (req, res) => {
    Contact.findOneAndUpdate({ _id: req.params.contactID}, req.body, { new: true, useFindAndModify: false }, (err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
}

export const deleteContact = (req, res) => {
    Contact.remove({ _id: req.params.contactID}, (err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json({ message: 'successfuly deleted contact'});
    });
}
