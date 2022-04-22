import mongoose from 'mongoose';
import { AccountSchema, OrderSchema } from '../models/model';

const Account = mongoose.model('Account', AccountSchema);
const Order = mongoose.model('Order', OrderSchema);

export const signupUser = (req, res) => {
    Account.findOne({"UserName" : req.body.UserName}, (err, account) => {
        if (err) {
            res.send(err);
        }

        if (account) {
            res.render("./pages/index", {login: true , error: true, msg: "Username already exists!"});
        }
        else{
            delete req.body['submitBtn']
            let newAccount = new Account(req.body);

            newAccount.save((err, contact) => {
                if (err) {
                    res.send(err);
                }
                res.render("./pages/index", {login:false, error: false, order:""});
            });
        }
    });
}

export const loginUser = (req, res, next) => {
    Account.findOne({"UserName" : req.body.UserName}, (err, account) => {
        if (err) {
            res.send(err);
        }
        if (account) {
            if(account.Password == req.body.Password){
                //next();
                req.app.set('UseName', req.body.UserName);
                res.redirect('/personal-page/');
            }
            else{ // Incorrect password
                res.render("./pages/index", {login: true , error: true, msg: "Incorrect password!"});
            }
        }
        else{ // UserName doesn't exist
            res.render("./pages/index", {login: true , error: true, msg: "Username doesn't exists!"});
        }
    });
}

export const getYourOrder = (req, res) => {
    // Order.find({"UserName" : req.body.UserName}, (err, userOrders) => {
    Order.find({"UserName" : req.app.get('UseName')}, (err, userOrders) => {
        if (err) {
            res.send(err);
        }
        res.render("./pages/personal", {orders:userOrders });
    });
}

export const getTrackingInfo = (req, res) => {
    Order.findOne({"TrackNum" : req.body.TrackNum}, (err, TrackingOrder) => {
        if (err) {
            res.send(err);
        }
        if (TrackingOrder) {
            res.render("./pages/index", {login: false , error: false, order: TrackingOrder});
        }
        else{
            res.render("./pages/index", {login: false , error: true, order:"", msg: "Tracking number doesn't exists!"});
        }
    });
}

export const editAddress = (req, res, next) => {
    Order.findOneAndUpdate({"TrackNum" : req.body.TrackNum, 'Status': "preparing"},
                            {"DeliverAddress" : req.body.DeliverAddress}, (err, contact) => {
        if (err) {
            res.send(err);
        }
        req.app.set('UseName', req.body.UserName);
        next();
    });
}

export async function addNewOrder(reqOrder, trackingNumber) {
    let newOrder = new Order({'WarehouseID': reqOrder.startDelivery.warehouseID,
                            'ItemType': reqOrder.startDelivery.item,
                            'DeliverAddress': reqOrder.startDelivery.address,
                            'UserName': reqOrder.startDelivery.UPS_account,
                            'TrackNum': trackingNumber,
                            'Status': "preparing",
                            'Priority': reqOrder.startDelivery.priority
                    });
    try {
        let result = await newOrder.save();
    } catch (err) {
        throw err;
    }
}

export async function editPackageAddress(trackingNumber, newAddress) {
    try {
        let result = await Order.findOneAndUpdate({"TrackNum" : trackingNumber, 'Status': "preparing"}, 
                                                    {"DeliverAddress" : newAddress});
        if (result) {
            return "ok";
        } else {
            return "Failed to edit address";
        }
    } catch (err) {
        throw err;
    }
}

export async function getPackageStatus(trackingNumber) {
    try {
        let result = await Order.findOne({'TrackNum': trackingNumber});
        if (result) {
            return result.Status;
        } else {
            return "Tracking number doesn't exists!";
        }
    } catch (err) {
        throw err;
    }
}

// export const addnewContact = (req, res) => {
//     let newContact = new Contact(req.body);

//     newContact.save((err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const getContacts = (req, res) => {
//     console.log(req.body.UserName)
//     Contact.findOne({"UserName" : req.body.UserName}, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const getContactWithID = (req, res) => {
//     Contact.findById(req.params.contactID, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const updateContact = (req, res) => {
//     Contact.findOneAndUpdate({ _id: req.params.contactID}, req.body, { new: true, useFindAndModify: false }, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json(contact);
//     });
// }

// export const deleteContact = (req, res) => {
//     Contact.remove({ _id: req.params.contactID}, (err, contact) => {
//         if (err) {
//             res.send(err);
//         }
//         res.json({ message: 'successfuly deleted contact'});
//     });
// }
