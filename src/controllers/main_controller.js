import mongoose from 'mongoose';
import { AccountSchema } from '../models/model';

const Contact = mongoose.model('Order', AccountSchema);

export const signupUser = (req, res) => {
    let newUser = new Contact(req.body);

    
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
